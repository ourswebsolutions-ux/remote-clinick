import { getPrismaClient, isDatabaseConfigured } from "@/lib/db/prisma";
import { requireAuth, logActivity } from "@/lib/auth/auth";
import {
  validateRequest,
  successResponse,
  errorResponse,
  paginatedResponse,
  getPaginationParams,
  generatePatientNumber,
} from "@/lib/api/utils";
import { createPatientSchema } from "@/lib/validations";

// GET /api/patients - List all patients
export async function GET(request: Request) {
  try {
         const prisma = await getPrismaClient(); // ✅ ADD THIS // <-- await the lazy client
    const auth = await requireAuth([{ module: "patients", action: "read" }]);
    if ("error" in auth) return errorResponse(auth.error, auth.status);

    const { page, limit, sortBy, sortOrder, search } = getPaginationParams(request);
    const skip = (page - 1) * limit;

    const { searchParams } = new URL(request.url);
    const gender = searchParams.get("gender");
    const bloodGroup = searchParams.get("bloodGroup");
    const isActive = searchParams.get("isActive");

    // Build where clause
    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { phone: { contains: search } },
        { patientNumber: { contains: search } },
        { cnic: { contains: search } },
      ];
    }

    if (gender) where.gender = gender;
    if (bloodGroup) where.bloodGroup = bloodGroup;
    if (isActive !== null) where.isActive = isActive === "true";

    const [patients, total] = await Promise.all([
      prisma.patient.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          _count: {
            select: {
              appointments: true,
              emrRecords: true,
            },
          },
        },
      }),
      prisma.patient.count({ where }),
    ]);

    return paginatedResponse(patients, page, limit, total);
  } catch (error) {
    console.error("Get patients error:", error);
    return errorResponse("Failed to fetch patients", 500);
  }
}

// POST /api/patients - Create a new patient
export async function POST(request: Request) {
  try {
         const prisma = await getPrismaClient(); // ✅ ADD THIS // <-- await the lazy client
    const auth = await requireAuth([{ module: "patients", action: "create" }]);
    if ("error" in auth) return errorResponse(auth.error, auth.status);

    const validation = await validateRequest(request, createPatientSchema);
    if ("error" in validation) return validation.error;

    const data = validation.data;

    // Check for duplicate CNIC
    if (data.cnic) {
      const existingPatient = await prisma.patient.findUnique({
        where: { cnic: data.cnic },
      });
      if (existingPatient) {
        return errorResponse("Patient with this CNIC already exists", 409);
      }
    }

    // Generate patient number
    const patientNumber = generatePatientNumber();

    const patient = await prisma.patient.create({
      data: {
        patientNumber,
        firstName: data.firstName,
        lastName: data.lastName,
        dateOfBirth: new Date(data.dateOfBirth),
        gender: data.gender,
        cnic: data.cnic,
        email: data.email,
        phone: data.phone,
        alternatePhone: data.alternatePhone,
        address: data.address,
        city: data.city,
        photo: data.photo,
        bloodGroup: data.bloodGroup as
          | "A_POSITIVE"
          | "A_NEGATIVE"
          | "B_POSITIVE"
          | "B_NEGATIVE"
          | "AB_POSITIVE"
          | "AB_NEGATIVE"
          | "O_POSITIVE"
          | "O_NEGATIVE"
          | undefined,
        allergies: data.allergies,
        emergencyName: data.emergencyName,
        emergencyPhone: data.emergencyPhone,
        emergencyRelation: data.emergencyRelation,
        notes: data.notes,
      },
    });

    await logActivity(
      auth.user.id,
      "CREATE",
      "patients",
      patient.id,
      "Patient",
      null,
      patient
    );

    return successResponse(patient, 201);
  } catch (error) {
    console.error("Create patient error:", error);
    return errorResponse("Failed to create patient", 500);
  }
}
