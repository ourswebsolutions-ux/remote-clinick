import { getPrismaClient, isDatabaseConfigured } from "@/lib/db/prisma";
import { requireAuth, logActivity } from "@/lib/auth/auth";
import { validateRequest, successResponse, errorResponse } from "@/lib/api/utils";
import { updateEMRSchema } from "@/lib/validations";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/emr/[id] - Get EMR record by ID
export async function GET(request: Request, { params }: RouteParams) {
  try {
      const prisma = await getPrismaClient(); // ✅ ADD THIS // <-- await the lazy client
    const auth = await requireAuth([{ module: "emr", action: "read" }]);
    if ("error" in auth) return errorResponse(auth.error, auth.status);

    const { id } = await params;

    const emr = await prisma.eMR.findUnique({
      where: { id },
      include: {
        patient: {
          include: {
            medicalHistory: true,
          },
        },
        doctor: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
        appointment: true,
        prescriptions: {
          include: {
            items: {
              include: {
                medicine: true,
              },
            },
          },
        },
        attachments: true,
      },
    });

    if (!emr) {
      return errorResponse("EMR record not found", 404);
    }

    return successResponse(emr);
  } catch (error) {
    console.error("Get EMR error:", error);
    return errorResponse("Failed to fetch EMR record", 500);
  }
}

// PATCH /api/emr/[id] - Update EMR record
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
      const prisma = await getPrismaClient(); // ✅ ADD THIS // <-- await the lazy client
    const auth = await requireAuth([{ module: "emr", action: "update" }]);
    if ("error" in auth) return errorResponse(auth.error, auth.status);

    const { id } = await params;

    const validation = await validateRequest(request, updateEMRSchema);
    if ("error" in validation) return validation.error;

    const existingEMR = await prisma.eMR.findUnique({
      where: { id },
    });

    if (!existingEMR) {
      return errorResponse("EMR record not found", 404);
    }

    const data = validation.data;

    const updateData: Record<string, unknown> = {};
    if (data.bloodPressure !== undefined) updateData.bloodPressure = data.bloodPressure;
    if (data.heartRate !== undefined) updateData.heartRate = data.heartRate;
    if (data.temperature !== undefined) updateData.temperature = data.temperature;
    if (data.weight !== undefined) updateData.weight = data.weight;
    if (data.height !== undefined) updateData.height = data.height;
    if (data.oxygenLevel !== undefined) updateData.oxygenLevel = data.oxygenLevel;
    if (data.chiefComplaint !== undefined) updateData.chiefComplaint = data.chiefComplaint;
    if (data.symptoms !== undefined) updateData.symptoms = data.symptoms;
    if (data.examination !== undefined) updateData.examination = data.examination;
    if (data.diagnosis !== undefined) updateData.diagnosis = data.diagnosis;
    if (data.treatment !== undefined) updateData.treatment = data.treatment;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.followUpDate !== undefined)
      updateData.followUpDate = data.followUpDate ? new Date(data.followUpDate) : null;

    const emr = await prisma.eMR.update({
      where: { id },
      data: updateData,
      include: {
        patient: {
          select: {
            id: true,
            patientNumber: true,
            firstName: true,
            lastName: true,
          },
        },
        doctor: {
          include: {
            user: {
              select: {
                name: true,
              },
            },
          },
        },
        prescriptions: {
          include: {
            items: true,
          },
        },
      },
    });

    await logActivity(
      auth.user.id,
      "UPDATE",
      "emr",
      emr.id,
      "EMR",
      existingEMR,
      emr
    );

    return successResponse(emr);
  } catch (error) {
    console.error("Update EMR error:", error);
    return errorResponse("Failed to update EMR record", 500);
  }
}

// DELETE /api/emr/[id] - Delete EMR record
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
      const prisma = await getPrismaClient(); // ✅ ADD THIS // <-- await the lazy client
    const auth = await requireAuth([{ module: "emr", action: "delete" }]);
    if ("error" in auth) return errorResponse(auth.error, auth.status);

    const { id } = await params;

    const emr = await prisma.eMR.findUnique({
      where: { id },
    });

    if (!emr) {
      return errorResponse("EMR record not found", 404);
    }

    await prisma.eMR.delete({
      where: { id },
    });

    await logActivity(auth.user.id, "DELETE", "emr", id, "EMR", emr, null);

    return successResponse({ message: "EMR record deleted successfully" });
  } catch (error) {
    console.error("Delete EMR error:", error);
    return errorResponse("Failed to delete EMR record", 500);
  }
}
