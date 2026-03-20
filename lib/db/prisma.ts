// Prisma client with lazy loading
// This file handles the case when Prisma client hasn't been generated yet

let prismaInstance: any = null;
let prismaError: string | null = null;

export function isDatabaseConfigured(): boolean {
  return !!process.env.DATABASE_URL;
}

export async function getPrismaClient() {
  // Check if DATABASE_URL is configured
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is not configured. Please set it in your .env.local file.\n" +
      "Example: DATABASE_URL=\"mysql://root:password@localhost:3306/clinic_db\""
    );
  }

  // Return existing instance if available
  if (prismaInstance) {
    return prismaInstance;
  }

  // If we already know there's an error, throw it
  if (prismaError) {
    throw new Error(prismaError);
  }

  try {
    // Dynamic import to avoid build-time errors
    const { PrismaClient } = await import("@prisma/client");
    
    // Create singleton instance
    const globalForPrisma = globalThis as unknown as {
      prisma: typeof prismaInstance | undefined;
    };

    if (!globalForPrisma.prisma) {
      globalForPrisma.prisma = new PrismaClient({
        log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
      });
    }

    prismaInstance = globalForPrisma.prisma;
    return prismaInstance;
  } catch (error: any) {
    // Store error message for future calls
    if (error.message?.includes("Cannot find module")) {
      prismaError = 
        "Prisma client not generated. Please run:\n" +
        "  pnpm db:generate\n" +
        "  pnpm db:push\n\n" +
        "Then restart the development server.";
    } else {
      prismaError = error.message || "Failed to initialize Prisma client";
    }
    throw new Error(prismaError);
  }
}

// For backwards compatibility - but prefer getPrismaClient()
export const prisma = {
  get client() {
    console.warn("[ClinicPro] Using synchronous prisma access. Prefer getPrismaClient() instead.");
    return prismaInstance;
  }
};
