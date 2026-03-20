import { requireAuth } from "@/lib/auth/auth";
import { successResponse, errorResponse, paginatedResponse, getPaginationParams } from "@/lib/api/utils";
import { getAILogs } from "@/lib/services/ai-assistant";
import { getPrismaClient, isDatabaseConfigured } from "@/lib/db/prisma";

// GET /api/ai/logs - Get AI interaction logs
export async function GET(request: Request) {
  try {
        const prisma = await getPrismaClient(); // ✅ ADD THIS // <-- await the lazy client

    const auth = await requireAuth([{ module: "ai", action: "read" }]);
    if ("error" in auth) return errorResponse(auth.error, auth.status);

    const { page, limit } = getPaginationParams(request);
    const { searchParams } = new URL(request.url);

    const isApproved = searchParams.get("isApproved");
    const riskLevel = searchParams.get("riskLevel");
    const doctorId = searchParams.get("doctorId");

    // Build where clause
    const where: Record<string, unknown> = {};
    if (isApproved !== null) where.isApproved = isApproved === "true";
    if (riskLevel) where.riskLevel = riskLevel;
    if (doctorId) where.doctorId = doctorId;

    const [logs, total] = await Promise.all([
      prisma.aILog.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          doctor: {
            include: {
              user: {
                select: { name: true },
              },
            },
          },
        },
      }),
      prisma.aILog.count({ where }),
    ]);

    return paginatedResponse(logs, page, limit, total);
  } catch (error) {
    console.error("Get AI logs error:", error);
    return errorResponse("Failed to fetch AI logs", 500);
  }
}
