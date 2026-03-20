import { getPrismaClient, isDatabaseConfigured } from "@/lib/db/prisma";
import { requireAuth, logActivity } from "@/lib/auth/auth";
import {
  validateRequest,
  successResponse,
  errorResponse,
  paginatedResponse,
  getPaginationParams,
  generateInvoiceNumber,
} from "@/lib/api/utils";
import { createBillingSchema } from "@/lib/validations";
import { Decimal } from "@prisma/client/runtime/library";

// GET /api/billing - List all billing records
export async function GET(request: Request) {
  try {
    const prisma = await getPrismaClient(); // ✅ ADD THIS // <-- await the lazy client
    const auth = await requireAuth([{ module: "billing", action: "read" }]);
    if ("error" in auth) return errorResponse(auth.error, auth.status);

    const { page, limit, sortBy, sortOrder } = getPaginationParams(request);
    const skip = (page - 1) * limit;

    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get("patientId");
    const paymentStatus = searchParams.get("paymentStatus");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    // Build where clause
    const where: Record<string, unknown> = {};

    if (patientId) where.patientId = patientId;
    if (paymentStatus) where.paymentStatus = paymentStatus;

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom)
        (where.createdAt as Record<string, Date>).gte = new Date(dateFrom);
      if (dateTo)
        (where.createdAt as Record<string, Date>).lte = new Date(dateTo);
    }

    const [billings, total] = await Promise.all([
      prisma.billing.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
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
          appointment: {
            select: {
              id: true,
              appointmentNumber: true,
            },
          },
        },
      }),
      prisma.billing.count({ where }),
    ]);

    return paginatedResponse(billings, page, limit, total);
  } catch (error) {
    console.error("Get billing records error:", error);
    return errorResponse("Failed to fetch billing records", 500);
  }
}

// POST /api/billing - Create a new billing record
export async function POST(request: Request) {
  try {
    const prisma = await getPrismaClient(); // ✅ ADD THIS // <-- await the lazy client
    const auth = await requireAuth([{ module: "billing", action: "create" }]);
    if ("error" in auth) return errorResponse(auth.error, auth.status);

    const validation = await validateRequest(request, createBillingSchema);
    if ("error" in validation) return validation.error;

    const data = validation.data;

    // Verify patient exists
    const patient = await prisma.patient.findUnique({
      where: { id: data.patientId },
    });
    if (!patient) {
      return errorResponse("Patient not found", 404);
    }

    // Verify appointment if provided
    if (data.appointmentId) {
      const existingBilling = await prisma.billing.findUnique({
        where: { appointmentId: data.appointmentId },
      });
      if (existingBilling) {
        return errorResponse("Billing already exists for this appointment", 409);
      }
    }

    // Calculate totals
    const subtotal = data.items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );
    const discount = data.discount || 0;
    const tax = data.tax || 0;
    const totalAmount = subtotal - discount + tax;
    const dueAmount = totalAmount;

    // Generate invoice number
    const invoiceNumber = generateInvoiceNumber();

    const billing = await prisma.billing.create({
      data: {
        invoiceNumber,
        patientId: data.patientId,
        appointmentId: data.appointmentId,
        subtotal: new Decimal(subtotal),
        discount: new Decimal(discount),
        tax: new Decimal(tax),
        totalAmount: new Decimal(totalAmount),
        dueAmount: new Decimal(dueAmount),
        paymentMethod: data.paymentMethod as
          | "CASH"
          | "CARD"
          | "BANK_TRANSFER"
          | "INSURANCE"
          | "OTHER"
          | undefined,
        notes: data.notes,
        items: {
          create: data.items.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: new Decimal(item.unitPrice),
            totalPrice: new Decimal(item.quantity * item.unitPrice),
          })),
        },
      },
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
      "CREATE",
      "billing",
      billing.id,
      "Billing",
      null,
      billing
    );

    return successResponse(billing, 201);
  } catch (error) {
    console.error("Create billing error:", error);
    return errorResponse("Failed to create billing record", 500);
  }
}
