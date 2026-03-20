import { getPrismaClient, isDatabaseConfigured } from "@/lib/db/prisma";
import { requireAuth } from "@/lib/auth/auth";
import { successResponse, errorResponse } from "@/lib/api/utils";

// GET /api/permissions - List all permissions
export async function GET() {
  try {
        const prisma = await getPrismaClient(); // ✅ ADD THIS // <-- await the lazy client

    const auth = await requireAuth([{ module: "roles", action: "read" }]);
    if ("error" in auth) return errorResponse(auth.error, auth.status);

    const permissions = await prisma.permission.findMany({
      orderBy: [{ module: "asc" }, { action: "asc" }],
    });

    // Group by module
    const groupedPermissions = permissions.reduce(
      (acc, perm) => {
        if (!acc[perm.module]) {
          acc[perm.module] = [];
        }
        acc[perm.module].push(perm);
        return acc;
      },
      {} as Record<string, typeof permissions>
    );

    return successResponse({
      permissions,
      grouped: groupedPermissions,
    });
  } catch (error) {
    console.error("Get permissions error:", error);
    return errorResponse("Failed to fetch permissions", 500);
  }
}
