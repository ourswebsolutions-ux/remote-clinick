import { getPrismaClient, isDatabaseConfigured } from "@/lib/db/prisma";
import { requireAuth, logActivity } from "@/lib/auth/auth";
import { validateRequest, successResponse, errorResponse } from "@/lib/api/utils";
import { updateStaffSchema } from "@/lib/validations";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/staff/[id] - Get staff member by ID
export async function GET(request: Request, { params }: RouteParams) {
  try {
             const prisma = await getPrismaClient(); // ✅ ADD THIS // <-- await the lazy client
    
    const auth = await requireAuth([{ module: "staff", action: "read" }]);
    if ("error" in auth) return errorResponse(auth.error, auth.status);

    const { id } = await params;

    const staff = await prisma.staff.findUnique({
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
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
        shifts: {
          orderBy: { date: "desc" },
          take: 30,
        },
      },
    });

    if (!staff) {
      return errorResponse("Staff member not found", 404);
    }

    return successResponse(staff);
  } catch (error) {
    console.error("Get staff error:", error);
    return errorResponse("Failed to fetch staff member", 500);
  }
}

// PATCH /api/staff/[id] - Update staff member
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
             const prisma = await getPrismaClient(); // ✅ ADD THIS // <-- await the lazy client
    
    const auth = await requireAuth([{ module: "staff", action: "update" }]);
    if ("error" in auth) return errorResponse(auth.error, auth.status);

    const { id } = await params;

    const validation = await validateRequest(request, updateStaffSchema);
    if ("error" in validation) return validation.error;

    const existingStaff = await prisma.staff.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!existingStaff) {
      return errorResponse("Staff member not found", 404);
    }

    const data = validation.data;

    // Check email uniqueness if changing
    if (data.email && data.email !== existingStaff.user.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email: data.email },
      });
      if (emailExists) {
        return errorResponse("Email already exists", 409);
      }
    }

    // Verify role if changing
    if (data.roleId && data.roleId !== existingStaff.user.roleId) {
      const role = await prisma.role.findUnique({
        where: { id: data.roleId },
      });
      if (!role) {
        return errorResponse("Invalid role", 400);
      }
    }

    // Update in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update user
      if (data.email || data.name || data.phone || data.roleId) {
        await tx.user.update({
          where: { id: existingStaff.userId },
          data: {
            ...(data.email && { email: data.email }),
            ...(data.name && { name: data.name }),
            ...(data.phone !== undefined && { phone: data.phone }),
            ...(data.roleId && { roleId: data.roleId }),
          },
        });
      }

      // Update staff
      const staff = await tx.staff.update({
        where: { id },
        data: {
          ...(data.department && { department: data.department }),
          ...(data.position && { position: data.position }),
          ...(data.hireDate && { hireDate: new Date(data.hireDate) }),
          ...(data.salary !== undefined && { salary: data.salary }),
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
      "UPDATE",
      "staff",
      result.id,
      "Staff",
      existingStaff,
      result
    );

    return successResponse(result);
  } catch (error) {
    console.error("Update staff error:", error);
    return errorResponse("Failed to update staff member", 500);
  }
}

// DELETE /api/staff/[id] - Deactivate staff member
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
             const prisma = await getPrismaClient(); // ✅ ADD THIS // <-- await the lazy client
    
    const auth = await requireAuth([{ module: "staff", action: "delete" }]);
    if ("error" in auth) return errorResponse(auth.error, auth.status);

    const { id } = await params;

    const staff = await prisma.staff.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!staff) {
      return errorResponse("Staff member not found", 404);
    }

    // Soft delete by deactivating user
    await prisma.user.update({
      where: { id: staff.userId },
      data: { isActive: false },
    });

    await logActivity(
      auth.user.id,
      "DELETE",
      "staff",
      id,
      "Staff",
      staff,
      null
    );

    return successResponse({ message: "Staff member deactivated successfully" });
  } catch (error) {
    console.error("Delete staff error:", error);
    return errorResponse("Failed to delete staff member", 500);
  }
}
