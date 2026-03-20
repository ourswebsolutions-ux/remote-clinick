import { cookies } from "next/headers";
import { getPrismaClient, isDatabaseConfigured } from "@/lib/db/prisma";
import { validateSession } from "@/lib/auth/auth";
import { successResponse, errorResponse } from "@/lib/api/utils";

export async function GET() {
  try {
    // Check database configuration
    if (!isDatabaseConfigured()) {
      return errorResponse(
        "Database not configured. Please set DATABASE_URL in your .env.local file.",
        503
      );
    }

    const cookieStore = await cookies();
    const token = cookieStore.get("auth-token")?.value;

    if (!token) {
      return errorResponse("Not authenticated", 401);
    }

    let session;
    try {
      session = await validateSession(token);
    } catch (error: any) {
      console.error("Session validation error:", error.message);
      return errorResponse("Session validation failed", 401);
    }

    if (!session) {
      return errorResponse("Session expired", 401);
    }

    let prisma;
    try {
      prisma = await getPrismaClient();
    } catch (error: any) {
      console.error("Prisma initialization error:", error.message);
      return errorResponse(
        "Database connection failed. Please ensure you have run: pnpm db:generate && pnpm db:push",
        503
      );
    }

    // Get user with full details
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
        doctor: true,
        staff: true,
      },
    });

    if (!user) {
      return errorResponse("User not found", 404);
    }

    if (!user.isActive) {
      return errorResponse("Account deactivated", 403);
    }

    // Build permissions array
    const permissions = user.role.permissions.map(
      (rp: any) => `${rp.permission.module}:${rp.permission.action}`
    );

    // Parse name into firstName and lastName for frontend
    const nameParts = user.name.split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    return successResponse({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        firstName,
        lastName,
        role: user.role.name.toLowerCase().replace(/\s+/g, "_"),
        permissions,
        phone: user.phone,
        avatar: user.avatar,
        doctorId: user.doctor?.id || null,
        staffId: user.staff?.id || null,
      },
    });
  } catch (error: any) {
    console.error("Get current user error:", error);
    return errorResponse(error.message || "An error occurred", 500);
  }
}
