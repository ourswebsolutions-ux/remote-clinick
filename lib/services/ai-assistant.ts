import { getPrismaClient, isDatabaseConfigured } from "@/lib/db/prisma";

// ============================================
// AI DOCTOR ASSISTANT SERVICE (Ollama)
// ============================================

export interface AIAssistantInput {
  symptoms: string;
  patientHistory?: string;
  patientAge?: number;
  patientGender?: "MALE" | "FEMALE" | "OTHER";
  vitalSigns?: {
    bloodPressure?: string;
    heartRate?: number;
    temperature?: number;
    oxygenLevel?: number;
  };
}

export interface AIAssistantResponse {
  suggestedDiagnosis: string;
  differentialDiagnosis: string[];
  suggestedPrescription: string;
  suggestedTests: string[];
  riskLevel: "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
  recommendations: string[];
  warnings: string[];
  followUpAdvice: string;
}

// Ollama API endpoint (local or remote)
const OLLAMA_API_URL = process.env.OLLAMA_API_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama2";

// ============================================
// AI PROMPT TEMPLATES
// ============================================

function buildDiagnosisPrompt(input: AIAssistantInput): string {
  let prompt = `You are an experienced medical AI assistant helping doctors with diagnosis suggestions. 
Analyze the following patient information and provide clinical insights.

IMPORTANT: This is for decision support only. All suggestions require doctor approval.

Patient Information:
-------------------
`;

  if (input.patientAge) {
    prompt += `Age: ${input.patientAge} years\n`;
  }
  if (input.patientGender) {
    prompt += `Gender: ${input.patientGender}\n`;
  }

  prompt += `\nPresenting Symptoms:\n${input.symptoms}\n`;

  if (input.patientHistory) {
    prompt += `\nMedical History:\n${input.patientHistory}\n`;
  }

  if (input.vitalSigns) {
    prompt += `\nVital Signs:\n`;
    if (input.vitalSigns.bloodPressure) {
      prompt += `- Blood Pressure: ${input.vitalSigns.bloodPressure}\n`;
    }
    if (input.vitalSigns.heartRate) {
      prompt += `- Heart Rate: ${input.vitalSigns.heartRate} bpm\n`;
    }
    if (input.vitalSigns.temperature) {
      prompt += `- Temperature: ${input.vitalSigns.temperature}°C\n`;
    }
    if (input.vitalSigns.oxygenLevel) {
      prompt += `- Oxygen Level: ${input.vitalSigns.oxygenLevel}%\n`;
    }
  }

  prompt += `
Please provide your analysis in the following JSON format:
{
  "suggestedDiagnosis": "Primary suspected diagnosis",
  "differentialDiagnosis": ["Alternative diagnosis 1", "Alternative diagnosis 2"],
  "suggestedPrescription": "Recommended medications with dosage",
  "suggestedTests": ["Recommended test 1", "Recommended test 2"],
  "riskLevel": "LOW|MODERATE|HIGH|CRITICAL",
  "recommendations": ["Recommendation 1", "Recommendation 2"],
  "warnings": ["Warning 1 if any"],
  "followUpAdvice": "Follow-up advice"
}

Respond ONLY with valid JSON. No additional text.`;

  return prompt;
}

// ============================================
// OLLAMA API INTEGRATION
// ============================================

async function callOllamaAPI(prompt: string): Promise<string> {
  const startTime = Date.now();

  try {
    const response = await fetch(`${OLLAMA_API_URL}/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt,
        stream: false,
        options: {
          temperature: 0.3,
          top_p: 0.9,
          num_predict: 1000,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const data = await response.json();
    const responseTime = Date.now() - startTime;

    console.log(`Ollama response time: ${responseTime}ms`);

    return data.response;
  } catch (error) {
    console.error("Ollama API call failed:", error);
    throw error;
  }
}

// ============================================
// FALLBACK AI (when Ollama is unavailable)
// ============================================

function getFallbackResponse(input: AIAssistantInput): AIAssistantResponse {
  // Simple rule-based fallback for when Ollama is unavailable
  const symptoms = input.symptoms.toLowerCase();
  
  let riskLevel: "LOW" | "MODERATE" | "HIGH" | "CRITICAL" = "LOW";
  const warnings: string[] = [];
  const recommendations: string[] = [];
  const suggestedTests: string[] = ["Complete Blood Count (CBC)"];

  // Simple symptom analysis
  if (
    symptoms.includes("chest pain") ||
    symptoms.includes("breathing difficulty") ||
    symptoms.includes("unconscious")
  ) {
    riskLevel = "CRITICAL";
    warnings.push("Immediate medical attention required");
    recommendations.push("Consider emergency care");
  } else if (
    symptoms.includes("high fever") ||
    symptoms.includes("severe pain")
  ) {
    riskLevel = "HIGH";
    warnings.push("Close monitoring required");
  } else if (
    symptoms.includes("fever") ||
    symptoms.includes("cough") ||
    symptoms.includes("headache")
  ) {
    riskLevel = "MODERATE";
  }

  // Check vital signs for risk
  if (input.vitalSigns) {
    if (input.vitalSigns.oxygenLevel && input.vitalSigns.oxygenLevel < 94) {
      riskLevel = "HIGH";
      warnings.push("Low oxygen saturation detected");
    }
    if (input.vitalSigns.temperature && input.vitalSigns.temperature > 39) {
      riskLevel = riskLevel === "LOW" ? "MODERATE" : riskLevel;
      warnings.push("High fever detected");
    }
  }

  recommendations.push("Conduct thorough physical examination");
  recommendations.push("Review patient's complete medical history");

  return {
    suggestedDiagnosis: "AI analysis unavailable - Manual assessment required",
    differentialDiagnosis: ["Further investigation needed"],
    suggestedPrescription: "Pending doctor evaluation",
    suggestedTests,
    riskLevel,
    recommendations,
    warnings: warnings.length > 0 ? warnings : ["No immediate concerns detected"],
    followUpAdvice: "Schedule follow-up based on findings",
  };
}

// ============================================
// MAIN AI ASSISTANT FUNCTION
// ============================================

export async function getAIDiagnosisSuggestion(
  input: AIAssistantInput,
  doctorId?: string
): Promise<{ response: AIAssistantResponse; logId: string }> {
  const startTime = Date.now();
  let response: AIAssistantResponse;
  let modelUsed = OLLAMA_MODEL;

  try {
    // Try Ollama API
    const prompt = buildDiagnosisPrompt(input);
    const aiResponse = await callOllamaAPI(prompt);

    // Parse JSON response
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      response = JSON.parse(jsonMatch[0]) as AIAssistantResponse;
    } else {
      throw new Error("Invalid JSON response from AI");
    }
  } catch (error) {
    console.error("AI assistant error, using fallback:", error);
    response = getFallbackResponse(input);
    modelUsed = "fallback-rules";
  }

  const responseTime = Date.now() - startTime;

  // Log AI interaction
  const aiLog = await prisma.aILog.create({
    data: {
      doctorId,
      patientSymptoms: input.symptoms,
      patientHistory: input.patientHistory,
      aiSuggestion: JSON.stringify(response),
      suggestedDiagnosis: response.suggestedDiagnosis,
      suggestedPrescription: response.suggestedPrescription,
      riskLevel: response.riskLevel,
      modelUsed,
      responseTime,
    },
  });

  return {
    response,
    logId: aiLog.id,
  };
}

// ============================================
// APPROVE AI SUGGESTION
// ============================================

export async function approveAISuggestion(
  logId: string,
  doctorId: string,
  notes?: string
): Promise<void> {
  await prisma.aILog.update({
    where: { id: logId },
    data: {
      isApproved: true,
      approvedAt: new Date(),
      doctorId,
      doctorNotes: notes,
    },
  });
}

// ============================================
// GET AI LOGS
// ============================================

export async function getAILogs(options: {
  doctorId?: string;
  isApproved?: boolean;
  riskLevel?: string;
  limit?: number;
  offset?: number;
}) {
  const where: Record<string, unknown> = {};

  if (options.doctorId) where.doctorId = options.doctorId;
  if (options.isApproved !== undefined) where.isApproved = options.isApproved;
  if (options.riskLevel) where.riskLevel = options.riskLevel;

  return prisma.aILog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: options.limit || 50,
    skip: options.offset || 0,
    include: {
      doctor: {
        include: {
          user: {
            select: { name: true },
          },
        },
      },
    },
  });
}
