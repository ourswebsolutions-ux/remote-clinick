import { getPrismaClient, isDatabaseConfigured } from "@/lib/db/prisma";
import { requireAuth, logActivity } from "@/lib/auth/auth";
import {
  validateRequest,
  successResponse,
  errorResponse,
  paginatedResponse,
  getPaginationParams,
} from "@/lib/api/utils";
import { createPrescriptionSchema } from "@/lib/validations";

// GET /api/prescriptions - List all prescriptions
export async function GET(request: Request) {
  try {
    const auth = await requireAuth([{ module: "emr", action: "read" }]);
    if ("error" in auth) return errorResponse(auth.error, auth.status);

    const { page, limit, sortBy, sortOrder } = getPaginationParams(request);
    const skip = (page - 1) * limit;

    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get("patientId");
    const emrId = searchParams.get("emrId");

    // Build where clause
    const where: Record<string, unknown> = {};

    if (patientId) where.patientId = patientId;
    if (emrId) where.emrId = emrId;

    const [prescriptions, total] = await Promise.all([
      prisma.prescription.findMany({
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
            },
          },
          emr: {
            select: {
              id: true,
              diagnosis: true,
            },
          },
          items: {
            include: {
              medicine: {
                select: {
                  id: true,
                  name: true,
                  dosageForm: true,
                  strength: true,
                },
              },
            },
          },
        },
      }),
      prisma.prescription.count({ where }),
    ]);

    return paginatedResponse(prescriptions, page, limit, total);
  } catch (error) {
    console.error("Get prescriptions error:", error);
    return errorResponse("Failed to fetch prescriptions", 500);
  }
}

// POST /api/prescriptions - Create a new prescription
export async function POST(request: Request) {
  try {
    const auth = await requireAuth([{ module: "emr", action: "create" }]);
    if ("error" in auth) return errorResponse(auth.error, auth.status);

    const validation = await validateRequest(request, createPrescriptionSchema);
    if ("error" in validation) return validation.error;

    const data = validation.data;

    // Verify patient exists
    const patient = await prisma.patient.findUnique({
      where: { id: data.patientId },
    });
    if (!patient) {
      return errorResponse("Patient not found", 404);
    }

    // Verify EMR if provided
    if (data.emrId) {
      const emr = await prisma.eMR.findUnique({
        where: { id: data.emrId },
      });
      if (!emr) {
        return errorResponse("EMR record not found", 404);
      }
    }

    const prescription = await prisma.prescription.create({
      data: {
        patientId: data.patientId,
        emrId: data.emrId,
        notes: data.notes,
        items: {
          create: data.items.map((item) => ({
            medicineId: item.medicineId,
            medicineName: item.medicineName,
            dosage: item.dosage,
            frequency: item.frequency,
            duration: item.duration,
            instructions: item.instructions,
            quantity: item.quantity,
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
          },
        },
        items: {
          include: {
            medicine: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    await logActivity(
      auth.user.id,
      "CREATE",
      "prescriptions",
      prescription.id,
      "Prescription",
      null,
      prescription
    );

    return successResponse(prescription, 201);
  } catch (error) {
    console.error("Create prescription error:", error);
    return errorResponse("Failed to create prescription", 500);
  }
}
