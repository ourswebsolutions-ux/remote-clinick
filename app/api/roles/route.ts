import { getPrismaClient, isDatabaseConfigured } from "@/lib/db/prisma";
import { requireAuth, logActivity } from "@/lib/auth/auth";
import {
  validateRequest,
  successResponse,
  errorResponse,
  paginatedResponse,
  getPaginationParams,
} from "@/lib/api/utils";
import { createRoleSchema } from "@/lib/validations";

// GET /api/roles - List all roles
export async function GET(request: Request) {
  try {
    const auth = await requireAuth([{ module: "roles", action: "read" }]);
    if ("error" in auth) return errorResponse(auth.error, auth.status);

    const { page, limit, sortBy, sortOrder } = getPaginationParams(request);
    const skip = (page - 1) * limit;

    const [roles, total] = await Promise.all([
      prisma.role.findMany({
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
          _count: {
            select: { users: true },
          },
        },
      }),
      prisma.role.count(),
    ]);

    return paginatedResponse(roles, page, limit, total);
  } catch (error) {
    console.error("Get roles error:", error);
    return errorResponse("Failed to fetch roles", 500);
  }
}

// POST /api/roles - Create a new role
export async function POST(request: Request) {
  try {
    const auth = await requireAuth([{ module: "roles", action: "create" }]);
    if ("error" in auth) return errorResponse(auth.error, auth.status);

    const validation = await validateRequest(request, createRoleSchema);
    if ("error" in validation) return validation.error;

    const { name, description, permissions } = validation.data;

    // Check if role name already exists
    const existingRole = await prisma.role.findUnique({
      where: { name },
    });

    if (existingRole) {
      return errorResponse("Role name already exists", 409);
    }

    // Create role with permissions
    const role = await prisma.role.create({
      data: {
        name,
        description,
        permissions: {
          create: permissions.map((permId) => ({
            permissionId: permId,
          })),
        },
      },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    await logActivity(
      auth.user.id,
      "CREATE",
      "roles",
      role.id,
      "Role",
      null,
      role
    );

    return successResponse(role, 201);
  } catch (error) {
    console.error("Create role error:", error);
    return errorResponse("Failed to create role", 500);
  }
}
