import { cookies } from "next/headers";
import { getPrismaClient, isDatabaseConfigured } from "@/lib/db/prisma";
import { verifyPassword, createSession, logActivity } from "@/lib/auth/auth";
import { validateRequest, errorResponse, successResponse } from "@/lib/api/utils";
import { loginSchema } from "@/lib/validations";

export async function POST(request: Request) {
  try {
    // Check database configuration
    if (!isDatabaseConfigured()) {
      return errorResponse(
        "Database not configured. Please set DATABASE_URL in your .env.local file and run: pnpm db:generate && pnpm db:push", 
        503
      );
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

    const validation = await validateRequest(request, loginSchema);
    if ("error" in validation) return validation.error;

    const { email, password } = validation.data;

    // Find user with role and permissions
    const user = await prisma.user.findUnique({
      where: { email },
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
      return errorResponse("Invalid email or password", 401);
    }

    if (!user.isActive) {
      return errorResponse("Your account has been deactivated", 403);
    }

    // Verify password
    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      return errorResponse("Invalid email or password", 401);
    }

    // Create session
    const sessionToken = await createSession(user.id);

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // Log activity
    await logActivity(
      user.id,
      "LOGIN",
      "auth",
      user.id,
      "User",
      null,
      null,
      request.headers.get("x-forwarded-for") || undefined,
      request.headers.get("user-agent") || undefined
    );

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set("auth-token", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/",
    });

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
        doctorId: user.doctor?.id || null,
        staffId: user.staff?.id || null,
      },
    });
  } catch (error: any) {
    console.error("Login error:", error);
    return errorResponse(error.message || "An error occurred during login", 500);
  }
}
