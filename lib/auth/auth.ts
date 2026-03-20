import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { getPrismaClient, isDatabaseConfigured } from "@/lib/db/prisma";
import bcrypt from "bcryptjs";
import type { JWTPayload, SafeUser } from "@/lib/db/types";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "clinic-management-secret-key-change-in-production"
);
const JWT_EXPIRY = "7d";
const SALT_ROUNDS = 12;

// ============================================
// PASSWORD UTILITIES (using bcrypt)
// ============================================

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// ============================================
// JWT UTILITIES
// ============================================

export async function createToken(payload: JWTPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRY)
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

// ============================================
// SESSION MANAGEMENT
// ============================================

export async function createSession(userId: string): Promise<string> {
  if (!isDatabaseConfigured()) {
    throw new Error("Database not configured");
  }

  const prisma = await getPrismaClient();
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await prisma.session.create({
    data: {
      token,
      userId,
      expiresAt,
    },
  });

  return token;
}

export async function validateSession(token: string) {
  if (!isDatabaseConfigured()) {
    return null;
  }

  const prisma = await getPrismaClient();

  const session = await prisma.session.findUnique({
    where: { token },
    include: {
      user: {
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
      },
    },
  });

  if (!session || session.expiresAt < new Date()) {
    if (session) {
      await prisma.session.delete({ where: { id: session.id } });
    }
    return null;
  }

  return session;
}

export async function deleteSession(token: string): Promise<void> {
  if (!isDatabaseConfigured()) return;
  
  const prisma = await getPrismaClient();
  await prisma.session.deleteMany({ where: { token } });
}

// ============================================
// AUTH HELPERS
// ============================================

export async function getCurrentUser(): Promise<SafeUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth-token")?.value;

  if (!token) return null;

  const session = await validateSession(token);
  if (!session) return null;

  const { password: _, ...safeUser } = session.user as any;
  return safeUser;
}

export async function getUserPermissions(userId: string): Promise<string[]> {
  if (!isDatabaseConfigured()) return [];

  const prisma = await getPrismaClient();

  const user = await prisma.user.findUnique({
    where: { id: userId },
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

  if (!user) return [];

  return user.role.permissions.map(
    (rp) => `${rp.permission.module}:${rp.permission.action}`
  );
}

export function hasPermission(
  userPermissions: string[],
  module: string,
  action: string
): boolean {
  const requiredPermission = `${module}:${action}`;
  return (
    userPermissions.includes(requiredPermission) ||
    userPermissions.includes(`${module}:*`) ||
    userPermissions.includes("*:*")
  );
}

// ============================================
// AUTH MIDDLEWARE HELPER
// ============================================

export async function requireAuth(
  requiredPermissions?: { module: string; action: string }[]
) {
  const user = await getCurrentUser();

  if (!user) {
    return { error: "Unauthorized", status: 401 };
  }

  if (requiredPermissions && requiredPermissions.length > 0) {
    const permissions = await getUserPermissions(user.id);
    
    for (const required of requiredPermissions) {
      if (!hasPermission(permissions, required.module, required.action)) {
        return { error: "Forbidden", status: 403 };
      }
    }
  }

  return { user };
}

// ============================================
// ACTIVITY LOGGING
// ============================================

export async function logActivity(
  userId: string | null,
  action: string,
  module: string,
  entityId?: string,
  entityType?: string,
  oldData?: unknown,
  newData?: unknown,
  ipAddress?: string,
  userAgent?: string
) {
  if (!isDatabaseConfigured()) return;

  try {
    const prisma = await getPrismaClient();
    await prisma.activityLog.create({
      data: {
        userId,
        action,
        module,
        entityId,
        entityType,
        oldData: oldData ? JSON.stringify(oldData) : null,
        newData: newData ? JSON.stringify(newData) : null,
        ipAddress,
        userAgent,
      },
    });
  } catch (error) {
    console.error("Failed to log activity:", error);
  }
}
