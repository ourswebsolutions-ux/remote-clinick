import { cookies } from "next/headers";
import { getPrismaClient, isDatabaseConfigured } from "@/lib/db/prisma";
import { hashPassword, createSession, logActivity } from "@/lib/auth/auth";
import { validateRequest, errorResponse, successResponse } from "@/lib/api/utils";
import { z } from "zod";

const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    // Check database configuration
    if (!isDatabaseConfigured()) {
      return errorResponse(
        "Database not configured. Please set DATABASE_URL in your .env.local file and run: pnpm db:generate && pnpm db:push",
        503
      );
    }

    const validation = await validateRequest(request, signupSchema);
    if ("error" in validation) return validation.error;

    const { email, password, firstName, lastName, phone } = validation.data;

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

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return errorResponse("An account with this email already exists", 400);
    }

    // Get default role (Staff or create one if none exists)
    let defaultRole = await prisma.role.findFirst({
      where: { name: "Staff" },
    });

    if (!defaultRole) {
      // Create default Staff role
      defaultRole = await prisma.role.create({
        data: {
          name: "Staff",
          description: "Default staff role with basic permissions",
          isSystem: false,
        },
      });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user - using 'name' field as per Prisma schema
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: `${firstName} ${lastName}`.trim(),
        phone: phone || null,
        roleId: defaultRole.id,
        isActive: true,
      },
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
      },
    });

    // Create session
    const sessionToken = await createSession(user.id);

    // Log activity
    await logActivity(
      user.id,
      "SIGNUP",
      "auth",
      user.id,
      "User",
      null,
      { email, name: `${firstName} ${lastName}` },
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

    // Prepare response data
    const permissions = user.role.permissions.map(
      (rp: any) => `${rp.permission.module}:${rp.permission.action}`
    );

    // Parse name into firstName and lastName for frontend
    const nameParts = user.name.split(" ");
    const responseFirstName = nameParts[0] || "";
    const responseLastName = nameParts.slice(1).join(" ") || "";

    return successResponse({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        firstName: responseFirstName,
        lastName: responseLastName,
        role: user.role.name.toLowerCase().replace(/\s+/g, "_"),
        permissions,
        phone: user.phone,
      },
      message: "Account created successfully",
    });
  } catch (error: any) {
    console.error("Signup error:", error);
    return errorResponse(error.message || "An error occurred during signup", 500);
  }
}
