import { requireAuth } from "@/lib/auth/auth";
import { successResponse, errorResponse } from "@/lib/api/utils";
import { approveAISuggestion } from "@/lib/services/ai-assistant";
import { getPrismaClient, isDatabaseConfigured } from "@/lib/db/prisma";
import { z } from "zod";

const approveSchema = z.object({
  logId: z.string().min(1, "Log ID is required"),
  notes: z.string().optional(),
});

// POST /api/ai/approve - Approve AI suggestion
export async function POST(request: Request) {
  try {
        const prisma = await getPrismaClient(); // ✅ ADD THIS // <-- await the lazy client

    const auth = await requireAuth([{ module: "ai", action: "update" }]);
    if ("error" in auth) return errorResponse(auth.error, auth.status);

    const body = await request.json();
    const validation = approveSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse(
        validation.error.errors.map((e) => e.message).join(", "),
        400
      );
    }

    const { logId, notes } = validation.data;

    // Get doctor ID
    const doctor = await prisma.doctor.findUnique({
      where: { userId: auth.user.id },
    });

    if (!doctor) {
      return errorResponse("Only doctors can approve AI suggestions", 403);
    }

    // Verify log exists
    const aiLog = await prisma.aILog.findUnique({
      where: { id: logId },
    });

    if (!aiLog) {
      return errorResponse("AI log not found", 404);
    }

    if (aiLog.isApproved) {
      return errorResponse("This suggestion has already been approved", 400);
    }

    await approveAISuggestion(logId, doctor.id, notes);

    return successResponse({
      message: "AI suggestion approved successfully",
    });
  } catch (error) {
    console.error("AI approve error:", error);
    return errorResponse("Failed to approve AI suggestion", 500);
  }
}
