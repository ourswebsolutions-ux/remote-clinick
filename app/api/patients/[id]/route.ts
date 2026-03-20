import { getPrismaClient, isDatabaseConfigured } from "@/lib/db/prisma";
import { requireAuth, logActivity } from "@/lib/auth/auth";
import { validateRequest, successResponse, errorResponse } from "@/lib/api/utils";
import { updatePatientSchema } from "@/lib/validations";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/patients/[id] - Get patient by ID
export async function GET(request: Request, { params }: RouteParams) {
  try {
         const prisma = await getPrismaClient(); // ✅ ADD THIS // <-- await the lazy client
    const auth = await requireAuth([{ module: "patients", action: "read" }]);
    if ("error" in auth) return errorResponse(auth.error, auth.status);

    const { id } = await params;

    const patient = await prisma.patient.findUnique({
      where: { id },
      include: {
        medicalHistory: {
          orderBy: { createdAt: "desc" },
        },
        appointments: {
          orderBy: { date: "desc" },
          take: 10,
          include: {
            doctor: {
              include: {
                user: {
                  select: { name: true },
                },
              },
            },
          },
        },
        emrRecords: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        labTests: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        billings: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    if (!patient) {
      return errorResponse("Patient not found", 404);
    }

    return successResponse(patient);
  } catch (error) {
    console.error("Get patient error:", error);
    return errorResponse("Failed to fetch patient", 500);
  }
}

// PATCH /api/patients/[id] - Update patient
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
         const prisma = await getPrismaClient(); // ✅ ADD THIS // <-- await the lazy client
    const auth = await requireAuth([{ module: "patients", action: "update" }]);
    if ("error" in auth) return errorResponse(auth.error, auth.status);

    const { id } = await params;

    const validation = await validateRequest(request, updatePatientSchema);
    if ("error" in validation) return validation.error;

    const existingPatient = await prisma.patient.findUnique({
      where: { id },
    });

    if (!existingPatient) {
      return errorResponse("Patient not found", 404);
    }

    const data = validation.data;

    // Check for duplicate CNIC if changing
    if (data.cnic && data.cnic !== existingPatient.cnic) {
      const cnicExists = await prisma.patient.findUnique({
        where: { cnic: data.cnic },
      });
      if (cnicExists) {
        return errorResponse("Patient with this CNIC already exists", 409);
      }
    }

    const updateData: Record<string, unknown> = {};
    if (data.firstName) updateData.firstName = data.firstName;
    if (data.lastName) updateData.lastName = data.lastName;
    if (data.dateOfBirth) updateData.dateOfBirth = new Date(data.dateOfBirth);
    if (data.gender) updateData.gender = data.gender;
    if (data.cnic !== undefined) updateData.cnic = data.cnic;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.phone) updateData.phone = data.phone;
    if (data.alternatePhone !== undefined) updateData.alternatePhone = data.alternatePhone;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.city !== undefined) updateData.city = data.city;
    if (data.photo !== undefined) updateData.photo = data.photo;
    if (data.bloodGroup !== undefined) updateData.bloodGroup = data.bloodGroup;
    if (data.allergies !== undefined) updateData.allergies = data.allergies;
    if (data.emergencyName !== undefined) updateData.emergencyName = data.emergencyName;
    if (data.emergencyPhone !== undefined) updateData.emergencyPhone = data.emergencyPhone;
    if (data.emergencyRelation !== undefined)
      updateData.emergencyRelation = data.emergencyRelation;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const patient = await prisma.patient.update({
      where: { id },
      data: updateData,
    });

    await logActivity(
      auth.user.id,
      "UPDATE",
      "patients",
      patient.id,
      "Patient",
      existingPatient,
      patient
    );

    return successResponse(patient);
  } catch (error) {
    console.error("Update patient error:", error);
    return errorResponse("Failed to update patient", 500);
  }
}

// DELETE /api/patients/[id] - Delete patient (soft delete)
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
         const prisma = await getPrismaClient(); // ✅ ADD THIS // <-- await the lazy client
    const auth = await requireAuth([{ module: "patients", action: "delete" }]);
    if ("error" in auth) return errorResponse(auth.error, auth.status);

    const { id } = await params;

    const patient = await prisma.patient.findUnique({
      where: { id },
    });

    if (!patient) {
      return errorResponse("Patient not found", 404);
    }

    // Soft delete by setting isActive to false
    await prisma.patient.update({
      where: { id },
      data: { isActive: false },
    });

    await logActivity(
      auth.user.id,
      "DELETE",
      "patients",
      id,
      "Patient",
      patient,
      null
    );

    return successResponse({ message: "Patient deactivated successfully" });
  } catch (error) {
    console.error("Delete patient error:", error);
    return errorResponse("Failed to delete patient", 500);
  }
}
