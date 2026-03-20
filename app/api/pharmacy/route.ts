import { getPrismaClient, isDatabaseConfigured } from "@/lib/db/prisma";
import { requireAuth, logActivity } from "@/lib/auth/auth";
import {
  validateRequest,
  successResponse,
  errorResponse,
  paginatedResponse,
  getPaginationParams,
} from "@/lib/api/utils";
import { createMedicineSchema } from "@/lib/validations";

// GET /api/pharmacy - List all medicines
export async function GET(request: Request) {
  try {
    const prisma = await getPrismaClient(); // ✅ ADD THIS // <-- await the lazy client

    const auth = await requireAuth([{ module: "pharmacy", action: "read" }]);
    if ("error" in auth) return errorResponse(auth.error, auth.status);

    const { page, limit, sortBy, sortOrder, search } = getPaginationParams(request);
    const skip = (page - 1) * limit;

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const lowStock = searchParams.get("lowStock");
    const expiringSoon = searchParams.get("expiringSoon");

    // Build where clause
    const where: Record<string, unknown> = {
      isActive: true,
    };

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { genericName: { contains: search } },
        { manufacturer: { contains: search } },
      ];
    }

    if (category) where.category = category;

    if (lowStock === "true") {
      where.stock = {
        lte: prisma.medicine.fields.minStock,
      };
    }

    if (expiringSoon === "true") {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      where.expiryDate = {
        lte: thirtyDaysFromNow,
        gte: new Date(),
      };
    }

    const [medicines, total] = await Promise.all([
      prisma.medicine.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      prisma.medicine.count({ where }),
    ]);

    // Get categories for filter
    const categories = await prisma.medicine.groupBy({
      by: ["category"],
      _count: { category: true },
    });

    return paginatedResponse(medicines, page, limit, total);
  } catch (error) {
    console.error("Get medicines error:", error);
    return errorResponse("Failed to fetch medicines", 500);
  }
}

// POST /api/pharmacy - Add new medicine
export async function POST(request: Request) {
  try {
        const prisma = await getPrismaClient(); // ✅ ADD THIS // <-- await the lazy client
    
    const auth = await requireAuth([{ module: "pharmacy", action: "create" }]);
    if ("error" in auth) return errorResponse(auth.error, auth.status);

    const validation = await validateRequest(request, createMedicineSchema);
    if ("error" in validation) return validation.error;

    const data = validation.data;

    const medicine = await prisma.medicine.create({
      data: {
        name: data.name,
        genericName: data.genericName,
        category: data.category,
        manufacturer: data.manufacturer,
        dosageForm: data.dosageForm,
        strength: data.strength,
        unitPrice: data.unitPrice,
        stock: data.stock,
        minStock: data.minStock || 10,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
        batchNumber: data.batchNumber,
        description: data.description,
      },
    });

    // Create initial stock movement
    if (data.stock > 0) {
      await prisma.stockMovement.create({
        data: {
          medicineId: medicine.id,
          type: "PURCHASE",
          quantity: data.stock,
          previousStock: 0,
          newStock: data.stock,
          reason: "Initial stock",
          createdBy: auth.user.name,
        },
      });
    }

    await logActivity(
      auth.user.id,
      "CREATE",
      "pharmacy",
      medicine.id,
      "Medicine",
      null,
      medicine
    );

    return successResponse(medicine, 201);
  } catch (error) {
    console.error("Create medicine error:", error);
    return errorResponse("Failed to create medicine", 500);
  }
}
