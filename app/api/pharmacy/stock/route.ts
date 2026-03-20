import { getPrismaClient, isDatabaseConfigured } from "@/lib/db/prisma";
import { requireAuth, logActivity } from "@/lib/auth/auth";
import { validateRequest, successResponse, errorResponse } from "@/lib/api/utils";
import { stockAdjustmentSchema } from "@/lib/validations";

// POST /api/pharmacy/stock - Adjust stock
export async function POST(request: Request) {
  try {
        const prisma = await getPrismaClient(); // ✅ ADD THIS // <-- await the lazy client
    
    const auth = await requireAuth([{ module: "pharmacy", action: "update" }]);
    if ("error" in auth) return errorResponse(auth.error, auth.status);

    const validation = await validateRequest(request, stockAdjustmentSchema);
    if ("error" in validation) return validation.error;

    const data = validation.data;

    const medicine = await prisma.medicine.findUnique({
      where: { id: data.medicineId },
    });

    if (!medicine) {
      return errorResponse("Medicine not found", 404);
    }

    const previousStock = medicine.stock;
    let newStock = previousStock;

    // Calculate new stock based on movement type
    switch (data.type) {
      case "PURCHASE":
      case "RETURN":
        newStock = previousStock + data.quantity;
        break;
      case "SALE":
      case "EXPIRED":
      case "DAMAGED":
        if (previousStock < data.quantity) {
          return errorResponse("Insufficient stock", 400);
        }
        newStock = previousStock - data.quantity;
        break;
      case "ADJUSTMENT":
        // Adjustment can be positive or negative
        newStock = data.quantity; // Set to exact quantity for adjustment
        break;
    }

    // Update stock and create movement record
    const [updatedMedicine, stockMovement] = await prisma.$transaction([
      prisma.medicine.update({
        where: { id: data.medicineId },
        data: { stock: newStock },
      }),
      prisma.stockMovement.create({
        data: {
          medicineId: data.medicineId,
          type: data.type,
          quantity: data.type === "ADJUSTMENT" ? Math.abs(newStock - previousStock) : data.quantity,
          previousStock,
          newStock,
          reason: data.reason,
          reference: data.reference,
          createdBy: auth.user.name,
        },
      }),
    ]);

    await logActivity(
      auth.user.id,
      "STOCK_ADJUSTMENT",
      "pharmacy",
      medicine.id,
      "Medicine",
      { stock: previousStock },
      { stock: newStock, movement: stockMovement }
    );

    return successResponse({
      medicine: updatedMedicine,
      movement: stockMovement,
    });
  } catch (error) {
    console.error("Stock adjustment error:", error);
    return errorResponse("Failed to adjust stock", 500);
  }
}
