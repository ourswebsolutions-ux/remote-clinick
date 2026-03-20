import { getPrismaClient, isDatabaseConfigured } from "@/lib/db/prisma";
import { requireAuth, logActivity, hashPassword } from "@/lib/auth/auth";
import {
  validateRequest,
  successResponse,
  errorResponse,
  paginatedResponse,
  getPaginationParams,
} from "@/lib/api/utils";
import { createDoctorSchema } from "@/lib/validations";

// GET /api/doctors - List all doctors
export async function GET(request: Request) {
  try {
         const prisma = await getPrismaClient(); // ✅ ADD THIS // <-- await the lazy client

    const auth = await requireAuth([{ module: "doctors", action: "read" }]);
    if ("error" in auth) return errorResponse(auth.error, auth.status);

    const { page, limit, sortBy, sortOrder, search } = getPaginationParams(request);
    const skip = (page - 1) * limit;

    const { searchParams } = new URL(request.url);
    const specialization = searchParams.get("specialization");

    // Build where clause
    const where: Record<string, unknown> = {
      user: { isActive: true },
    };

    if (search) {
      where.OR = [
        { user: { name: { contains: search } } },
        { specialization: { contains: search } },
      ];
    }

    if (specialization) where.specialization = specialization;

    const [doctors, total] = await Promise.all([
      prisma.doctor.findMany({
        where,
        skip,
        take: limit,
        orderBy:
          sortBy === "name"
            ? { user: { name: sortOrder } }
            : { [sortBy]: sortOrder },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              avatar: true,
              isActive: true,
            },
          },
          availability: {
            where: { isActive: true },
            orderBy: { dayOfWeek: "asc" },
          },
          _count: {
            select: {
              appointments: true,
            },
          },
        },
      }),
      prisma.doctor.count({ where }),
    ]);

    return paginatedResponse(doctors, page, limit, total);
  } catch (error) {
    console.error("Get doctors error:", error);
    return errorResponse("Failed to fetch doctors", 500);
  }
}

// POST /api/doctors - Create a new doctor
export async function POST(request: Request) {
  try {
         const prisma = await getPrismaClient(); // ✅ ADD THIS // <-- await the lazy client
    
    const auth = await requireAuth([{ module: "doctors", action: "create" }]);
    if ("error" in auth) return errorResponse(auth.error, auth.status);

    const validation = await validateRequest(request, createDoctorSchema);
    if ("error" in validation) return validation.error;

    const data = validation.data;

    // Check for existing email
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      return errorResponse("Email already exists", 409);
    }

    // Get or create doctor role
    let doctorRole = await prisma.role.findUnique({
      where: { name: "Doctor" },
    });

    if (!doctorRole) {
      doctorRole = await prisma.role.create({
        data: {
          name: "Doctor",
          description: "Doctor with access to patients and EMR",
          isSystem: true,
        },
      });
    }

   const password = Math.floor(10000 + Math.random() * 90000);

    // Hash password
    const hashedPassword = await hashPassword(password.toString());

    // Create user and doctor in transaction
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: data.email,
          password: hashedPassword,
          name: data.name,
          phone: data.phone,
          roleId: doctorRole.id,
        },
      });

      const doctor = await tx.doctor.create({
        data: {
          userId: user.id,
          specialization: data.specialization,
          qualification: data.qualification,
          licenseNumber: data.licenseNumber,
          experience: data.experience,
          consultationFee: data.consultationFee,
          bio: data.bio,
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
      "CREATE",
      "doctors",
      result.id,
      "Doctor",
      null,
      result
    );

    return successResponse(result, 201);
  } catch (error) {
    console.error("Create doctor error:", error);
    return errorResponse("Failed to create doctor", 500);
  }
}
