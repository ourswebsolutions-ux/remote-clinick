import { requireAuth } from "@/lib/auth/auth";
import { validateRequest, successResponse, errorResponse } from "@/lib/api/utils";
import { aiAssistantSchema } from "@/lib/validations";
import { getAIDiagnosisSuggestion } from "@/lib/services/ai-assistant";
import { getPrismaClient, isDatabaseConfigured } from "@/lib/db/prisma";

// POST /api/ai/diagnose - Get AI diagnosis suggestion
export async function POST(request: Request) {
  try {
        const prisma = await getPrismaClient(); // ✅ ADD THIS // <-- await the lazy client

    const auth = await requireAuth([{ module: "ai", action: "read" }]);
    if ("error" in auth) return errorResponse(auth.error, auth.status);

    const validation = await validateRequest(request, aiAssistantSchema);
    if ("error" in validation) return validation.error;

    const data = validation.data;

    // Get doctor ID if user is a doctor
    let doctorId: string | undefined;
    const doctor = await prisma.doctor.findUnique({
      where: { userId: auth.user.id },
    });
    if (doctor) {
      doctorId = doctor.id;
    }

    // Get AI suggestion
    const result = await getAIDiagnosisSuggestion(
      {
        symptoms: data.symptoms,
        patientHistory: data.patientHistory,
        patientAge: data.patientAge,
        patientGender: data.patientGender,
      },
      doctorId
    );

    return successResponse({
      suggestion: result.response,
      logId: result.logId,
      disclaimer:
        "This is an AI-generated suggestion for decision support only. All medical decisions must be made by qualified healthcare professionals.",
    });
  } catch (error) {
    console.error("AI diagnosis error:", error);
    return errorResponse("Failed to get AI diagnosis suggestion", 500);
  }
}
