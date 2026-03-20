import { getPrismaClient, isDatabaseConfigured } from "@/lib/db/prisma";
import { requireAuth, logActivity } from "@/lib/auth/auth";
import { validateRequest, successResponse, errorResponse } from "@/lib/api/utils";
import { updateRoleSchema } from "@/lib/validations";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/roles/[id] - Get role by ID
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const auth = await requireAuth([{ module: "roles", action: "read" }]);
    if ("error" in auth) return errorResponse(auth.error, auth.status);

    const { id } = await params;

    const role = await prisma.role.findUnique({
      where: { id },
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
    });

    if (!role) {
      return errorResponse("Role not found", 404);
    }

    return successResponse(role);
  } catch (error) {
    console.error("Get role error:", error);
    return errorResponse("Failed to fetch role", 500);
  }
}

// PATCH /api/roles/[id] - Update role
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const auth = await requireAuth([{ module: "roles", action: "update" }]);
    if ("error" in auth) return errorResponse(auth.error, auth.status);

    const { id } = await params;

    const validation = await validateRequest(request, updateRoleSchema);
    if ("error" in validation) return validation.error;

    const { name, description, permissions } = validation.data;

    // Check if role exists
    const existingRole = await prisma.role.findUnique({
      where: { id },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!existingRole) {
      return errorResponse("Role not found", 404);
    }

    if (existingRole.isSystem) {
      return errorResponse("Cannot modify system roles", 403);
    }

    // Check name uniqueness if changing
    if (name && name !== existingRole.name) {
      const nameExists = await prisma.role.findUnique({
        where: { name },
      });
      if (nameExists) {
        return errorResponse("Role name already exists", 409);
      }
    }

    // Update role
    const updateData: Record<string, unknown> = {};
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;

    // Handle permissions update
    if (permissions) {
      // Delete existing permissions
      await prisma.rolePermission.deleteMany({
        where: { roleId: id },
      });

      // Add new permissions
      await prisma.rolePermission.createMany({
        data: permissions.map((permId) => ({
          roleId: id,
          permissionId: permId,
        })),
      });
    }

    const role = await prisma.role.update({
      where: { id },
      data: updateData,
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
      "UPDATE",
      "roles",
      role.id,
      "Role",
      existingRole,
      role
    );

    return successResponse(role);
  } catch (error) {
    console.error("Update role error:", error);
    return errorResponse("Failed to update role", 500);
  }
}

// DELETE /api/roles/[id] - Delete role
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const auth = await requireAuth([{ module: "roles", action: "delete" }]);
    if ("error" in auth) return errorResponse(auth.error, auth.status);

    const { id } = await params;

    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });

    if (!role) {
      return errorResponse("Role not found", 404);
    }

    if (role.isSystem) {
      return errorResponse("Cannot delete system roles", 403);
    }

    if (role._count.users > 0) {
      return errorResponse("Cannot delete role with assigned users", 409);
    }

    await prisma.role.delete({
      where: { id },
    });

    await logActivity(auth.user.id, "DELETE", "roles", id, "Role", role, null);

    return successResponse({ message: "Role deleted successfully" });
  } catch (error) {
    console.error("Delete role error:", error);
    return errorResponse("Failed to delete role", 500);
  }
}
