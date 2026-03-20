import { getPrismaClient, isDatabaseConfigured } from "@/lib/db/prisma";
import { requireAuth, logActivity } from "@/lib/auth/auth";
import { validateRequest, successResponse, errorResponse } from "@/lib/api/utils";
import { updateDoctorSchema } from "@/lib/validations";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/doctors/[id] - Get doctor by ID
export async function GET(request: Request, { params }: RouteParams) {
  try {
             const prisma = await getPrismaClient(); // ✅ ADD THIS // <-- await the lazy client
    
    const auth = await requireAuth([{ module: "doctors", action: "read" }]);
    if ("error" in auth) return errorResponse(auth.error, auth.status);

    const { id } = await params;

    const doctor = await prisma.doctor.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatar: true,
            isActive: true,
            lastLogin: true,
          },
        },
        availability: {
          where: { isActive: true },
          orderBy: { dayOfWeek: "asc" },
        },
        _count: {
          select: {
            appointments: true,
            emrRecords: true,
          },
        },
      },
    });

    if (!doctor) {
      return errorResponse("Doctor not found", 404);
    }

    return successResponse(doctor);
  } catch (error) {
    console.error("Get doctor error:", error);
    return errorResponse("Failed to fetch doctor", 500);
  }
}

// PATCH /api/doctors/[id] - Update doctor
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
             const prisma = await getPrismaClient(); // ✅ ADD THIS // <-- await the lazy client
    
    const auth = await requireAuth([{ module: "doctors", action: "update" }]);
    if ("error" in auth) return errorResponse(auth.error, auth.status);

    const { id } = await params;

    const validation = await validateRequest(request, updateDoctorSchema);
    if ("error" in validation) return validation.error;

    const existingDoctor = await prisma.doctor.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!existingDoctor) {
      return errorResponse("Doctor not found", 404);
    }

    const data = validation.data;

    // Check email uniqueness if changing
    if (data.email && data.email !== existingDoctor.user.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email: data.email },
      });
      if (emailExists) {
        return errorResponse("Email already exists", 409);
      }
    }

    // Update in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update user
      if (data.email || data.name || data.phone) {
        await tx.user.update({
          where: { id: existingDoctor.userId },
          data: {
            ...(data.email && { email: data.email }),
            ...(data.name && { name: data.name }),
            ...(data.phone !== undefined && { phone: data.phone }),
          },
        });
      }

      // Update doctor
      const doctor = await tx.doctor.update({
        where: { id },
        data: {
          ...(data.specialization && { specialization: data.specialization }),
          ...(data.qualification !== undefined && { qualification: data.qualification }),
          ...(data.licenseNumber !== undefined && { licenseNumber: data.licenseNumber }),
          ...(data.experience !== undefined && { experience: data.experience }),
          ...(data.consultationFee !== undefined && { consultationFee: data.consultationFee }),
          ...(data.bio !== undefined && { bio: data.bio }),
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              avatar: true,
            },
          },
        },
      });

      return doctor;
    });

    await logActivity(
      auth.user.id,
      "UPDATE",
      "doctors",
      result.id,
      "Doctor",
      existingDoctor,
      result
    );

    return successResponse(result);
  } catch (error) {
    console.error("Update doctor error:", error);
    return errorResponse("Failed to update doctor", 500);
  }
}

// DELETE /api/doctors/[id] - Deactivate doctor
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
             const prisma = await getPrismaClient(); // ✅ ADD THIS // <-- await the lazy client
    
    const auth = await requireAuth([{ module: "doctors", action: "delete" }]);
    if ("error" in auth) return errorResponse(auth.error, auth.status);

    const { id } = await params;

    const doctor = await prisma.doctor.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!doctor) {
      return errorResponse("Doctor not found", 404);
    }

    // Soft delete by deactivating user
    await prisma.user.update({
      where: { id: doctor.userId },
      data: { isActive: false },
    });

    await logActivity(
      auth.user.id,
      "DELETE",
      "doctors",
      id,
      "Doctor",
      doctor,
      null
    );

    return successResponse({ message: "Doctor deactivated successfully" });
  } catch (error) {
    console.error("Delete doctor error:", error);
    return errorResponse("Failed to delete doctor", 500);
  }
}
