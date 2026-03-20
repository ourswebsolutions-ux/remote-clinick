import { getPrismaClient, isDatabaseConfigured } from "@/lib/db/prisma";
import { requireAuth, logActivity } from "@/lib/auth/auth";
import {
  validateRequest,
  successResponse,
  errorResponse,
  paginatedResponse,
  getPaginationParams,
} from "@/lib/api/utils";
import { createEMRSchema } from "@/lib/validations";

// GET /api/emr - List all EMR records
export async function GET(request: Request) {
  try {
      const prisma = await getPrismaClient(); // ✅ ADD THIS // <-- await the lazy client
    const auth = await requireAuth([{ module: "emr", action: "read" }]);
    if ("error" in auth) return errorResponse(auth.error, auth.status);

    const { page, limit, sortBy, sortOrder } = getPaginationParams(request);
    const skip = (page - 1) * limit;

    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get("patientId");
    const doctorId = searchParams.get("doctorId");
    const appointmentId = searchParams.get("appointmentId");

    // Build where clause
    const where: Record<string, unknown> = {};

    if (patientId) where.patientId = patientId;
    if (doctorId) where.doctorId = doctorId;
    if (appointmentId) where.appointmentId = appointmentId;

    const [emrRecords, total] = await Promise.all([
      prisma.eMR.findMany({
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
          attachments: true,
        },
      }),
      prisma.eMR.count({ where }),
    ]);

    return paginatedResponse(emrRecords, page, limit, total);
  } catch (error) {
    console.error("Get EMR records error:", error);
    return errorResponse("Failed to fetch EMR records", 500);
  }
}

// POST /api/emr - Create a new EMR record
export async function POST(request: Request) {
  try {
      const prisma = await getPrismaClient(); // ✅ ADD THIS // <-- await the lazy client
    const auth = await requireAuth([{ module: "emr", action: "create" }]);
    if ("error" in auth) return errorResponse(auth.error, auth.status);

    const validation = await validateRequest(request, createEMRSchema);
    if ("error" in validation) return validation.error;

    const data = validation.data;

    // Verify patient exists
    const patient = await prisma.patient.findUnique({
      where: { id: data.patientId },
    });
    if (!patient) {
      return errorResponse("Patient not found", 404);
    }

    // Verify doctor exists
    const doctor = await prisma.doctor.findUnique({
      where: { id: data.doctorId },
    });
    if (!doctor) {
      return errorResponse("Doctor not found", 404);
    }

    // Verify appointment if provided
    if (data.appointmentId) {
      const appointment = await prisma.appointment.findUnique({
        where: { id: data.appointmentId },
      });
      if (!appointment) {
        return errorResponse("Appointment not found", 404);
      }
    }

    const emr = await prisma.eMR.create({
      data: {
        patientId: data.patientId,
        doctorId: data.doctorId,
        appointmentId: data.appointmentId,
        bloodPressure: data.bloodPressure,
        heartRate: data.heartRate,
        temperature: data.temperature,
        weight: data.weight,
        height: data.height,
        oxygenLevel: data.oxygenLevel,
        chiefComplaint: data.chiefComplaint,
        symptoms: data.symptoms,
        examination: data.examination,
        diagnosis: data.diagnosis,
        treatment: data.treatment,
        notes: data.notes,
        followUpDate: data.followUpDate ? new Date(data.followUpDate) : null,
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
        doctor: {
          include: {
            user: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    // Update appointment status if linked
    if (data.appointmentId) {
      await prisma.appointment.update({
        where: { id: data.appointmentId },
        data: { status: "COMPLETED" },
      });
    }

    await logActivity(
      auth.user.id,
      "CREATE",
      "emr",
      emr.id,
      "EMR",
      null,
      emr
    );

    return successResponse(emr, 201);
  } catch (error) {
    console.error("Create EMR error:", error);
    return errorResponse("Failed to create EMR record", 500);
  }
}
