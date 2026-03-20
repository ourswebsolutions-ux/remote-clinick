import { getPrismaClient, isDatabaseConfigured } from "@/lib/db/prisma";
import { requireAuth, logActivity } from "@/lib/auth/auth";
import {
  validateRequest,
  successResponse,
  errorResponse,
  paginatedResponse,
  getPaginationParams,
  generateLabTestNumber,
} from "@/lib/api/utils";
import { createLabTestSchema } from "@/lib/validations";

// GET /api/lab-tests - List all lab tests
export async function GET(request: Request) {
  try {
    const prisma = await getPrismaClient(); // ✅ ADD THIS // <-- await the lazy client
    const auth = await requireAuth([{ module: "lab", action: "read" }]);
    if ("error" in auth) return errorResponse(auth.error, auth.status);

    const { page, limit, sortBy, sortOrder } = getPaginationParams(request);
    const skip = (page - 1) * limit;

    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get("patientId");
    const status = searchParams.get("status");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    // Build where clause
    const where: Record<string, unknown> = {};

    if (patientId) where.patientId = patientId;
    if (status) where.status = status;

    if (dateFrom || dateTo) {
      where.orderedAt = {};
      if (dateFrom)
        (where.orderedAt as Record<string, Date>).gte = new Date(dateFrom);
      if (dateTo)
        (where.orderedAt as Record<string, Date>).lte = new Date(dateTo);
    }

    const [labTests, total] = await Promise.all([
      prisma.labTest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          patient: {
            select: {
              id: true,
              patientNumber: true,
              firstName: true,
              lastName: true,
              phone: true,
            },
          },
          billing: {
            include: {
              billing: {
                select: {
                  id: true,
                  invoiceNumber: true,
                  paymentStatus: true,
                },
              },
            },
          },
        },
      }),
      prisma.labTest.count({ where }),
    ]);

    return paginatedResponse(labTests, page, limit, total);
  } catch (error) {
    console.error("Get lab tests error:", error);
    return errorResponse("Failed to fetch lab tests", 500);
  }
}

// POST /api/lab-tests - Create a new lab test
export async function POST(request: Request) {
  try {
    const prisma = await getPrismaClient(); // ✅ ADD THIS // <-- await the lazy client
    const auth = await requireAuth([{ module: "lab", action: "create" }]);
    if ("error" in auth) return errorResponse(auth.error, auth.status);

    const validation = await validateRequest(request, createLabTestSchema);
    if ("error" in validation) return validation.error;

    const data = validation.data;

    // Verify patient exists
    const patient = await prisma.patient.findUnique({
      where: { id: data.patientId },
    });
    if (!patient) {
      return errorResponse("Patient not found", 404);
    }

    // Generate test number
    const testNumber = generateLabTestNumber();

    const labTest = await prisma.labTest.create({
      data: {
        testNumber,
        patientId: data.patientId,
        testName: data.testName,
        testCategory: data.testCategory,
        orderedBy: data.orderedBy,
        price: data.price,
      },
      include: {
        patient: {
          select: {
            id: true,
            patientNumber: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
      },
    });

    await logActivity(
      auth.user.id,
      "CREATE",
      "lab",
      labTest.id,
      "LabTest",
      null,
      labTest
    );

    return successResponse(labTest, 201);
  } catch (error) {
    console.error("Create lab test error:", error);
    return errorResponse("Failed to create lab test", 500);
  }
}
