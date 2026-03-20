import { getPrismaClient, isDatabaseConfigured } from "@/lib/db/prisma";
import { requireAuth, logActivity } from "@/lib/auth/auth";
import {
  validateRequest,
  successResponse,
  errorResponse,
  paginatedResponse,
  getPaginationParams,
  generateAppointmentNumber,
} from "@/lib/api/utils";
import { createAppointmentSchema } from "@/lib/validations";

// GET /api/appointments - List all appointments
export async function GET(request: Request) {
  try {
      const prisma = await getPrismaClient(); // ✅ ADD THIS // <-- await the lazy client
    const auth = await requireAuth([{ module: "appointments", action: "read" }]);
    if ("error" in auth) return errorResponse(auth.error, auth.status);

    const { page, limit, sortBy, sortOrder } = getPaginationParams(request);
    const skip = (page - 1) * limit;

    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get("patientId");
    const doctorId = searchParams.get("doctorId");
    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const today = searchParams.get("today");

    // Build where clause
    const where: Record<string, unknown> = {};

    if (patientId) where.patientId = patientId;
    if (doctorId) where.doctorId = doctorId;
    if (status) where.status = status;
    if (type) where.type = type;

    if (today === "true") {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      where.date = {
        gte: startOfDay,
        lte: endOfDay,
      };
    } else {
      if (dateFrom || dateTo) {
        where.date = {};
        if (dateFrom) (where.date as Record<string, Date>).gte = new Date(dateFrom);
        if (dateTo) (where.date as Record<string, Date>).lte = new Date(dateTo);
      }
    }

    const [appointments, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ date: sortOrder }, { time: sortOrder }],
        include: {
          patient: {
            select: {
              id: true,
              patientNumber: true,
              firstName: true,
              lastName: true,
              phone: true,
              photo: true,
            },
          },
          doctor: {
            include: {
              user: {
                select: {
                  name: true,
                  avatar: true,
                },
              },
            },
          },
        },
      }),
      prisma.appointment.count({ where }),
    ]);

    return paginatedResponse(appointments, page, limit, total);
  } catch (error) {
    console.error("Get appointments error:", error);
    return errorResponse("Failed to fetch appointments", 500);
  }
}

// POST /api/appointments - Create a new appointment
export async function POST(request: Request) {
  try {
      const prisma = await getPrismaClient(); // ✅ ADD THIS // <-- await the lazy client
    const auth = await requireAuth([{ module: "appointments", action: "create" }]);
    if ("error" in auth) return errorResponse(auth.error, auth.status);

    const validation = await validateRequest(request, createAppointmentSchema);
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

    // Check for conflicting appointments
    const appointmentDate = new Date(data.date);
    const conflictingAppointment = await prisma.appointment.findFirst({
      where: {
        doctorId: data.doctorId,
        date: appointmentDate,
        time: data.time,
        status: {
          notIn: ["CANCELLED", "NO_SHOW"],
        },
      },
    });

    if (conflictingAppointment) {
      return errorResponse("Doctor already has an appointment at this time", 409);
    }

    // Generate appointment number
    const appointmentNumber = generateAppointmentNumber();

    const appointment = await prisma.appointment.create({
      data: {
        appointmentNumber,
        patientId: data.patientId,
        doctorId: data.doctorId,
        date: appointmentDate,
        time: data.time,
        duration: data.duration || 30,
        type: data.type || "CONSULTATION",
        reason: data.reason,
        notes: data.notes,
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

    await logActivity(
      auth.user.id,
      "CREATE",
      "appointments",
      appointment.id,
      "Appointment",
      null,
      appointment
    );

    return successResponse(appointment, 201);
  } catch (error) {
    console.error("Create appointment error:", error);
    return errorResponse("Failed to create appointment", 500);
  }
}
