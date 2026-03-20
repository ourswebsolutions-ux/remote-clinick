import { getPrismaClient, isDatabaseConfigured } from "@/lib/db/prisma";
import { requireAuth, logActivity, hashPassword } from "@/lib/auth/auth";
import {
  validateRequest,
  successResponse,
  errorResponse,
  paginatedResponse,
  getPaginationParams,
} from "@/lib/api/utils";
import { createStaffSchema } from "@/lib/validations";

// GET /api/staff - List all staff
export async function GET(request: Request) {
  try {
         const prisma = await getPrismaClient(); // ✅ ADD THIS // <-- await the lazy client

    const auth = await requireAuth([{ module: "staff", action: "read" }]);
    if ("error" in auth) return errorResponse(auth.error, auth.status);

    const { page, limit, sortBy, sortOrder, search } = getPaginationParams(request);
    const skip = (page - 1) * limit;

    const { searchParams } = new URL(request.url);
    const department = searchParams.get("department");

    // Build where clause
    const where: Record<string, unknown> = {
      user: { isActive: true },
    };

    if (search) {
      where.OR = [
        { user: { name: { contains: search } } },
        { department: { contains: search } },
        { position: { contains: search } },
      ];
    }

    if (department) where.department = department;

    const [staff, total] = await Promise.all([
      prisma.staff.findMany({
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
              role: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          shifts: {
            where: {
              date: {
                gte: new Date(),
              },
            },
            orderBy: { date: "asc" },
            take: 5,
          },
        },
      }),
      prisma.staff.count({ where }),
    ]);

    return paginatedResponse(staff, page, limit, total);
  } catch (error) {
    console.error("Get staff error:", error);
    return errorResponse("Failed to fetch staff", 500);
  }
}

// POST /api/staff - Create a new staff member
export async function POST(request: Request) {
  try {
         const prisma = await getPrismaClient(); // ✅ ADD THIS // <-- await the lazy client

    const auth = await requireAuth([{ module: "staff", action: "create" }]);
    if ("error" in auth) return errorResponse(auth.error, auth.status);

    const validation = await validateRequest(request, createStaffSchema);
    if ("error" in validation) return validation.error;

    const data = validation.data;

    // Check for existing email
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      return errorResponse("Email already exists", 409);
    }

    // Verify role exists
    const role = await prisma.role.findUnique({
      where: { id: data.roleId },
    });

    if (!role) {
      return errorResponse("Invalid role", 400);
    }

    // Hash password
    const hashedPassword = await hashPassword(data.password);

    // Create user and staff in transaction
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: data.email,
          password: hashedPassword,
          name: data.name,
          phone: data.phone,
          roleId: data.roleId,
        },
      });

      const staff = await tx.staff.create({
        data: {
          userId: user.id,
          department: data.department,
          position: data.position,
          hireDate: new Date(data.hireDate),
          salary: data.salary,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              role: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      return staff;
    });

    await logActivity(
      auth.user.id,
      "CREATE",
      "staff",
      result.id,
      "Staff",
      null,
      result
    );

    return successResponse(result, 201);
  } catch (error) {
    console.error("Create staff error:", error);
    return errorResponse("Failed to create staff member", 500);
  }
}
