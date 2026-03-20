import { getPrismaClient, isDatabaseConfigured } from "@/lib/db/prisma";
import { requireAuth, logActivity } from "@/lib/auth/auth";
import { validateRequest, successResponse, errorResponse } from "@/lib/api/utils";
import { updateAppointmentSchema } from "@/lib/validations";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/appointments/[id] - Get appointment by ID
export async function GET(request: Request, { params }: RouteParams) {
  try {
      const prisma = await getPrismaClient(); // ✅ ADD THIS // <-- await the lazy client
    const auth = await requireAuth([{ module: "appointments", action: "read" }]);
    if ("error" in auth) return errorResponse(auth.error, auth.status);

    const { id } = await params;

    const appointment = await prisma.appointment.findUnique({
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
                avatar: true,
              },
            },
          },
        },
        emrRecords: {
          orderBy: { createdAt: "desc" },
        },
        billing: {
          include: {
            items: true,
          },
        },
      },
    });

    if (!appointment) {
      return errorResponse("Appointment not found", 404);
    }

    return successResponse(appointment);
  } catch (error) {
    console.error("Get appointment error:", error);
    return errorResponse("Failed to fetch appointment", 500);
  }
}

// PATCH /api/appointments/[id] - Update appointment
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
      const prisma = await getPrismaClient(); // ✅ ADD THIS // <-- await the lazy client
    const auth = await requireAuth([{ module: "appointments", action: "update" }]);
    if ("error" in auth) return errorResponse(auth.error, auth.status);

    const { id } = await params;

    const validation = await validateRequest(request, updateAppointmentSchema);
    if ("error" in validation) return validation.error;

    const existingAppointment = await prisma.appointment.findUnique({
      where: { id },
    });

    if (!existingAppointment) {
      return errorResponse("Appointment not found", 404);
    }

    const data = validation.data;

    // Check for conflicting appointments if changing date/time
    if (data.date || data.time) {
      const appointmentDate = data.date
        ? new Date(data.date)
        : existingAppointment.date;
      const appointmentTime = data.time || existingAppointment.time;
      const doctorId = data.doctorId || existingAppointment.doctorId;

      const conflictingAppointment = await prisma.appointment.findFirst({
        where: {
          id: { not: id },
          doctorId,
          date: appointmentDate,
          time: appointmentTime,
          status: {
            notIn: ["CANCELLED", "NO_SHOW"],
          },
        },
      });

      if (conflictingAppointment) {
        return errorResponse("Doctor already has an appointment at this time", 409);
      }
    }

    const updateData: Record<string, unknown> = {};
    if (data.patientId) updateData.patientId = data.patientId;
    if (data.doctorId) updateData.doctorId = data.doctorId;
    if (data.date) updateData.date = new Date(data.date);
    if (data.time) updateData.time = data.time;
    if (data.duration) updateData.duration = data.duration;
    if (data.type) updateData.type = data.type;
    if (data.status) updateData.status = data.status;
    if (data.reason !== undefined) updateData.reason = data.reason;
    if (data.notes !== undefined) updateData.notes = data.notes;

    const appointment = await prisma.appointment.update({
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
      "UPDATE",
      "appointments",
      appointment.id,
      "Appointment",
      existingAppointment,
      appointment
    );

    return successResponse(appointment);
  } catch (error) {
    console.error("Update appointment error:", error);
    return errorResponse("Failed to update appointment", 500);
  }
}

// DELETE /api/appointments/[id] - Cancel appointment
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
      const prisma = await getPrismaClient(); // ✅ ADD THIS // <-- await the lazy client
    const auth = await requireAuth([{ module: "appointments", action: "delete" }]);
    if ("error" in auth) return errorResponse(auth.error, auth.status);

    const { id } = await params;

    const appointment = await prisma.appointment.findUnique({
      where: { id },
    });

    if (!appointment) {
      return errorResponse("Appointment not found", 404);
    }

    // Cancel instead of delete
    await prisma.appointment.update({
      where: { id },
      data: { status: "CANCELLED" },
    });

    await logActivity(
      auth.user.id,
      "CANCEL",
      "appointments",
      id,
      "Appointment",
      appointment,
      null
    );

    return successResponse({ message: "Appointment cancelled successfully" });
  } catch (error) {
    console.error("Cancel appointment error:", error);
    return errorResponse("Failed to cancel appointment", 500);
  }
}
