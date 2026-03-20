import { getPrismaClient, isDatabaseConfigured } from "@/lib/db/prisma";
import { requireAuth, logActivity } from "@/lib/auth/auth";
import { validateRequest, successResponse, errorResponse } from "@/lib/api/utils";
import { updateLabTestSchema } from "@/lib/validations";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/lab-tests/[id] - Get lab test by ID
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const prisma = await getPrismaClient(); // ✅ ADD THIS // <-- await the lazy client
    const auth = await requireAuth([{ module: "lab", action: "read" }]);
    if ("error" in auth) return errorResponse(auth.error, auth.status);

    const { id } = await params;

    const labTest = await prisma.labTest.findUnique({
      where: { id },
      include: {
        patient: true,
        billing: {
          include: {
            billing: true,
          },
        },
      },
    });

    if (!labTest) {
      return errorResponse("Lab test not found", 404);
    }

    return successResponse(labTest);
  } catch (error) {
    console.error("Get lab test error:", error);
    return errorResponse("Failed to fetch lab test", 500);
  }
}

// PATCH /api/lab-tests/[id] - Update lab test
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const prisma = await getPrismaClient(); // ✅ ADD THIS // <-- await the lazy client
    const auth = await requireAuth([{ module: "lab", action: "update" }]);
    if ("error" in auth) return errorResponse(auth.error, auth.status);

    const { id } = await params;

    const validation = await validateRequest(request, updateLabTestSchema);
    if ("error" in validation) return validation.error;

    const existingLabTest = await prisma.labTest.findUnique({
      where: { id },
    });

    if (!existingLabTest) {
      return errorResponse("Lab test not found", 404);
    }

    const data = validation.data;

    const updateData: Record<string, unknown> = {};
    if (data.testName) updateData.testName = data.testName;
    if (data.testCategory !== undefined) updateData.testCategory = data.testCategory;
    if (data.orderedBy !== undefined) updateData.orderedBy = data.orderedBy;
    if (data.price !== undefined) updateData.price = data.price;
    if (data.status) {
      updateData.status = data.status;
      if (data.status === "COMPLETED") {
        updateData.completedAt = new Date();
      }
    }
    if (data.resultFile !== undefined) updateData.resultFile = data.resultFile;
    if (data.resultNotes !== undefined) updateData.resultNotes = data.resultNotes;

    const labTest = await prisma.labTest.update({
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
      },
    });

    await logActivity(
      auth.user.id,
      "UPDATE",
      "lab",
      labTest.id,
      "LabTest",
      existingLabTest,
      labTest
    );

    return successResponse(labTest);
  } catch (error) {
    console.error("Update lab test error:", error);
    return errorResponse("Failed to update lab test", 500);
  }
}

// DELETE /api/lab-tests/[id] - Cancel lab test
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const prisma = await getPrismaClient(); // ✅ ADD THIS // <-- await the lazy client
    const auth = await requireAuth([{ module: "lab", action: "delete" }]);
    if ("error" in auth) return errorResponse(auth.error, auth.status);

    const { id } = await params;

    const labTest = await prisma.labTest.findUnique({
      where: { id },
    });

    if (!labTest) {
      return errorResponse("Lab test not found", 404);
    }

    if (labTest.status === "COMPLETED") {
      return errorResponse("Cannot cancel completed lab test", 400);
    }

    await prisma.labTest.update({
      where: { id },
      data: { status: "CANCELLED" },
    });

    await logActivity(
      auth.user.id,
      "CANCEL",
      "lab",
      id,
      "LabTest",
      labTest,
      null
    );

    return successResponse({ message: "Lab test cancelled successfully" });
  } catch (error) {
    console.error("Cancel lab test error:", error);
    return errorResponse("Failed to cancel lab test", 500);
  }
}
