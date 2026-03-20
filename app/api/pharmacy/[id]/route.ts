import { getPrismaClient, isDatabaseConfigured } from "@/lib/db/prisma";
import { requireAuth, logActivity } from "@/lib/auth/auth";
import { validateRequest, successResponse, errorResponse } from "@/lib/api/utils";
import { updateMedicineSchema } from "@/lib/validations";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/pharmacy/[id] - Get medicine by ID
export async function GET(request: Request, { params }: RouteParams) {
  try {
        const prisma = await getPrismaClient(); // ✅ ADD THIS // <-- await the lazy client
    
    const auth = await requireAuth([{ module: "pharmacy", action: "read" }]);
    if ("error" in auth) return errorResponse(auth.error, auth.status);

    const { id } = await params;

    const medicine = await prisma.medicine.findUnique({
      where: { id },
      include: {
        stockMovements: {
          orderBy: { createdAt: "desc" },
          take: 50,
        },
      },
    });

    if (!medicine) {
      return errorResponse("Medicine not found", 404);
    }

    return successResponse(medicine);
  } catch (error) {
    console.error("Get medicine error:", error);
    return errorResponse("Failed to fetch medicine", 500);
  }
}

// PATCH /api/pharmacy/[id] - Update medicine
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
        const prisma = await getPrismaClient(); // ✅ ADD THIS // <-- await the lazy client
    
    const auth = await requireAuth([{ module: "pharmacy", action: "update" }]);
    if ("error" in auth) return errorResponse(auth.error, auth.status);

    const { id } = await params;

    const validation = await validateRequest(request, updateMedicineSchema);
    if ("error" in validation) return validation.error;

    const existingMedicine = await prisma.medicine.findUnique({
      where: { id },
    });

    if (!existingMedicine) {
      return errorResponse("Medicine not found", 404);
    }

    const data = validation.data;

    const updateData: Record<string, unknown> = {};
    if (data.name) updateData.name = data.name;
    if (data.genericName !== undefined) updateData.genericName = data.genericName;
    if (data.category) updateData.category = data.category;
    if (data.manufacturer !== undefined) updateData.manufacturer = data.manufacturer;
    if (data.dosageForm) updateData.dosageForm = data.dosageForm;
    if (data.strength !== undefined) updateData.strength = data.strength;
    if (data.unitPrice !== undefined) updateData.unitPrice = data.unitPrice;
    if (data.minStock !== undefined) updateData.minStock = data.minStock;
    if (data.expiryDate !== undefined)
      updateData.expiryDate = data.expiryDate ? new Date(data.expiryDate) : null;
    if (data.batchNumber !== undefined) updateData.batchNumber = data.batchNumber;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const medicine = await prisma.medicine.update({
      where: { id },
      data: updateData,
    });

    await logActivity(
      auth.user.id,
      "UPDATE",
      "pharmacy",
      medicine.id,
      "Medicine",
      existingMedicine,
      medicine
    );

    return successResponse(medicine);
  } catch (error) {
    console.error("Update medicine error:", error);
    return errorResponse("Failed to update medicine", 500);
  }
}

// DELETE /api/pharmacy/[id] - Deactivate medicine
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
        const prisma = await getPrismaClient(); // ✅ ADD THIS // <-- await the lazy client
    
    const auth = await requireAuth([{ module: "pharmacy", action: "delete" }]);
    if ("error" in auth) return errorResponse(auth.error, auth.status);

    const { id } = await params;

    const medicine = await prisma.medicine.findUnique({
      where: { id },
    });

    if (!medicine) {
      return errorResponse("Medicine not found", 404);
    }

    // Soft delete
    await prisma.medicine.update({
      where: { id },
      data: { isActive: false },
    });

    await logActivity(
      auth.user.id,
      "DELETE",
      "pharmacy",
      id,
      "Medicine",
      medicine,
      null
    );

    return successResponse({ message: "Medicine deactivated successfully" });
  } catch (error) {
    console.error("Delete medicine error:", error);
    return errorResponse("Failed to delete medicine", 500);
  }
}
