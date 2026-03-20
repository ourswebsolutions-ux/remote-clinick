import { getPrismaClient, isDatabaseConfigured } from "@/lib/db/prisma";
import { requireAuth, logActivity } from "@/lib/auth/auth";
import { validateRequest, successResponse, errorResponse } from "@/lib/api/utils";
import { updateBillingSchema } from "@/lib/validations";
import { Decimal } from "@prisma/client/runtime/library";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/billing/[id] - Get billing record by ID
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const prisma = await getPrismaClient(); // ✅ ADD THIS // <-- await the lazy client
    const auth = await requireAuth([{ module: "billing", action: "read" }]);
    if ("error" in auth) return errorResponse(auth.error, auth.status);

    const { id } = await params;

    const billing = await prisma.billing.findUnique({
      where: { id },
      include: {
        patient: true,
        appointment: true,
        items: true,
        labTests: {
          include: {
            labTest: true,
          },
        },
      },
    });

    if (!billing) {
      return errorResponse("Billing record not found", 404);
    }

    return successResponse(billing);
  } catch (error) {
    console.error("Get billing error:", error);
    return errorResponse("Failed to fetch billing record", 500);
  }
}

// PATCH /api/billing/[id] - Update billing record
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const prisma = await getPrismaClient(); // ✅ ADD THIS // <-- await the lazy client
    const auth = await requireAuth([{ module: "billing", action: "update" }]);
    if ("error" in auth) return errorResponse(auth.error, auth.status);

    const { id } = await params;

    const validation = await validateRequest(request, updateBillingSchema);
    if ("error" in validation) return validation.error;

    const existingBilling = await prisma.billing.findUnique({
      where: { id },
    });

    if (!existingBilling) {
      return errorResponse("Billing record not found", 404);
    }

    const data = validation.data;

    const updateData: Record<string, unknown> = {};

    // Handle amount updates
    let totalAmount = Number(existingBilling.totalAmount);
    let subtotal = Number(existingBilling.subtotal);

    if (data.discount !== undefined) {
      updateData.discount = new Decimal(data.discount);
      totalAmount =
        subtotal - data.discount + Number(existingBilling.tax);
    }

    if (data.tax !== undefined) {
      updateData.tax = new Decimal(data.tax);
      totalAmount =
        subtotal -
        Number(data.discount ?? existingBilling.discount) +
        data.tax;
    }

    if (data.discount !== undefined || data.tax !== undefined) {
      updateData.totalAmount = new Decimal(totalAmount);
    }

    // Handle payment
    if (data.paidAmount !== undefined) {
      const newPaidAmount = data.paidAmount;
      const currentTotal = updateData.totalAmount
        ? Number(updateData.totalAmount)
        : totalAmount;
      const newDueAmount = currentTotal - newPaidAmount;

      updateData.paidAmount = new Decimal(newPaidAmount);
      updateData.dueAmount = new Decimal(Math.max(0, newDueAmount));

      // Update payment status
      if (newDueAmount <= 0) {
        updateData.paymentStatus = "PAID";
        updateData.paidAt = new Date();
      } else if (newPaidAmount > 0) {
        updateData.paymentStatus = "PARTIAL";
      }
    }

    if (data.paymentMethod) {
      updateData.paymentMethod = data.paymentMethod;
    }

    if (data.paymentStatus) {
      updateData.paymentStatus = data.paymentStatus;
      if (data.paymentStatus === "PAID") {
        updateData.paidAt = new Date();
        updateData.dueAmount = new Decimal(0);
        updateData.paidAmount = updateData.totalAmount || existingBilling.totalAmount;
      }
    }

    if (data.notes !== undefined) {
      updateData.notes = data.notes;
    }

    const billing = await prisma.billing.update({
      where: { id },
      data: updateData,
      include: {
        patient: {
          select: {
            id: true,
            patientNumber: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        items: true,
      },
    });

    await logActivity(
      auth.user.id,
      "UPDATE",
      "billing",
      billing.id,
      "Billing",
      existingBilling,
      billing
    );

    return successResponse(billing);
  } catch (error) {
    console.error("Update billing error:", error);
    return errorResponse("Failed to update billing record", 500);
  }
}

// DELETE /api/billing/[id] - Cancel billing
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const prisma = await getPrismaClient(); // ✅ ADD THIS // <-- await the lazy client
    const auth = await requireAuth([{ module: "billing", action: "delete" }]);
    if ("error" in auth) return errorResponse(auth.error, auth.status);

    const { id } = await params;

    const billing = await prisma.billing.findUnique({
      where: { id },
    });

    if (!billing) {
      return errorResponse("Billing record not found", 404);
    }

    if (billing.paymentStatus === "PAID") {
      return errorResponse("Cannot cancel paid invoice", 400);
    }

    await prisma.billing.update({
      where: { id },
      data: { paymentStatus: "CANCELLED" },
    });

    await logActivity(
      auth.user.id,
      "CANCEL",
      "billing",
      id,
      "Billing",
      billing,
      null
    );

    return successResponse({ message: "Billing cancelled successfully" });
  } catch (error) {
    console.error("Cancel billing error:", error);
    return errorResponse("Failed to cancel billing", 500);
  }
}
