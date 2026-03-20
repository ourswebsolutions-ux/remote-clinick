import { getPrismaClient, isDatabaseConfigured } from "@/lib/db/prisma";
import { requireAuth } from "@/lib/auth/auth";
import { successResponse, errorResponse } from "@/lib/api/utils";

// GET /api/analytics - Get analytics data
export async function GET(request: Request) {
  try {
        const prisma = await getPrismaClient(); // ✅ ADD THIS // <-- await the lazy client

    const auth = await requireAuth([{ module: "analytics", action: "read" }]);
    if ("error" in auth) return errorResponse(auth.error, auth.status);

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "month"; // week, month, year
    const type = searchParams.get("type") || "all"; // revenue, appointments, patients, all

    const now = new Date();
    let startDate: Date;

    switch (period) {
      case "week":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "year":
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case "month":
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }

    const analytics: Record<string, unknown> = {};

    // Revenue Analytics
    if (type === "all" || type === "revenue") {
      const revenueData = await prisma.billing.findMany({
        where: {
          createdAt: { gte: startDate },
          paymentStatus: "PAID",
        },
        select: {
          createdAt: true,
          paidAmount: true,
        },
        orderBy: { createdAt: "asc" },
      });

      // Group by date
      const revenueByDate: Record<string, number> = {};
      revenueData.forEach((bill) => {
        const date = bill.createdAt.toISOString().split("T")[0];
        revenueByDate[date] = (revenueByDate[date] || 0) + Number(bill.paidAmount);
      });

      // Revenue by payment method
      const revenueByMethod = await prisma.billing.groupBy({
        by: ["paymentMethod"],
        where: {
          createdAt: { gte: startDate },
          paymentStatus: "PAID",
        },
        _sum: { paidAmount: true },
      });

      analytics.revenue = {
        byDate: Object.entries(revenueByDate).map(([date, amount]) => ({
          date,
          amount,
        })),
        byPaymentMethod: revenueByMethod.map((r) => ({
          method: r.paymentMethod || "Unknown",
          amount: Number(r._sum.paidAmount || 0),
        })),
        total: revenueData.reduce((sum, bill) => sum + Number(bill.paidAmount), 0),
      };
    }

    // Appointment Analytics
    if (type === "all" || type === "appointments") {
      const appointmentsByDate = await prisma.appointment.groupBy({
        by: ["date"],
        where: {
          date: { gte: startDate },
        },
        _count: { id: true },
        orderBy: { date: "asc" },
      });

      const appointmentsByType = await prisma.appointment.groupBy({
        by: ["type"],
        where: {
          date: { gte: startDate },
        },
        _count: { id: true },
      });

      const appointmentsByStatus = await prisma.appointment.groupBy({
        by: ["status"],
        where: {
          date: { gte: startDate },
        },
        _count: { id: true },
      });

      const appointmentsByDoctor = await prisma.appointment.groupBy({
        by: ["doctorId"],
        where: {
          date: { gte: startDate },
        },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 10,
      });

      // Get doctor names
      const doctorIds = appointmentsByDoctor.map((a) => a.doctorId);
      const doctors = await prisma.doctor.findMany({
        where: { id: { in: doctorIds } },
        include: {
          user: { select: { name: true } },
        },
      });

      const doctorNameMap = new Map(
        doctors.map((d) => [d.id, d.user.name])
      );

      analytics.appointments = {
        byDate: appointmentsByDate.map((a) => ({
          date: a.date.toISOString().split("T")[0],
          count: a._count.id,
        })),
        byType: appointmentsByType.map((a) => ({
          type: a.type,
          count: a._count.id,
        })),
        byStatus: appointmentsByStatus.map((a) => ({
          status: a.status,
          count: a._count.id,
        })),
        byDoctor: appointmentsByDoctor.map((a) => ({
          doctorId: a.doctorId,
          doctorName: doctorNameMap.get(a.doctorId) || "Unknown",
          count: a._count.id,
        })),
      };
    }

    // Patient Analytics
    if (type === "all" || type === "patients") {
      const newPatients = await prisma.patient.groupBy({
        by: ["createdAt"],
        where: {
          createdAt: { gte: startDate },
        },
        _count: { id: true },
      });

      // Group by date
      const patientsByDate: Record<string, number> = {};
      newPatients.forEach((p) => {
        const date = p.createdAt.toISOString().split("T")[0];
        patientsByDate[date] = (patientsByDate[date] || 0) + p._count.id;
      });

      const patientsByGender = await prisma.patient.groupBy({
        by: ["gender"],
        _count: { id: true },
      });

      const patientsByCity = await prisma.patient.groupBy({
        by: ["city"],
        where: { city: { not: null } },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 10,
      });

      analytics.patients = {
        newByDate: Object.entries(patientsByDate).map(([date, count]) => ({
          date,
          count,
        })),
        byGender: patientsByGender.map((p) => ({
          gender: p.gender,
          count: p._count.id,
        })),
        byCity: patientsByCity.map((p) => ({
          city: p.city || "Unknown",
          count: p._count.id,
        })),
        totalNew: Object.values(patientsByDate).reduce((sum, count) => sum + count, 0),
      };
    }

    // Lab Test Analytics
    if (type === "all" || type === "lab") {
      const labTestsByStatus = await prisma.labTest.groupBy({
        by: ["status"],
        where: {
          createdAt: { gte: startDate },
        },
        _count: { id: true },
      });

      const labTestsByCategory = await prisma.labTest.groupBy({
        by: ["testCategory"],
        where: {
          createdAt: { gte: startDate },
          testCategory: { not: null },
        },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 10,
      });

      analytics.labTests = {
        byStatus: labTestsByStatus.map((l) => ({
          status: l.status,
          count: l._count.id,
        })),
        byCategory: labTestsByCategory.map((l) => ({
          category: l.testCategory || "Unknown",
          count: l._count.id,
        })),
      };
    }

    // Pharmacy Analytics
    if (type === "all" || type === "pharmacy") {
      const lowStockMedicines = await prisma.medicine.findMany({
        where: {
          isActive: true,
          stock: { lte: 10 },
        },
        select: {
          id: true,
          name: true,
          stock: true,
          minStock: true,
        },
        orderBy: { stock: "asc" },
        take: 20,
      });

      const expiringMedicines = await prisma.medicine.findMany({
        where: {
          isActive: true,
          expiryDate: {
            lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
            gte: now,
          },
        },
        select: {
          id: true,
          name: true,
          expiryDate: true,
          stock: true,
        },
        orderBy: { expiryDate: "asc" },
        take: 20,
      });

      const stockMovements = await prisma.stockMovement.groupBy({
        by: ["type"],
        where: {
          createdAt: { gte: startDate },
        },
        _sum: { quantity: true },
      });

      analytics.pharmacy = {
        lowStock: lowStockMedicines,
        expiringSoon: expiringMedicines,
        movements: stockMovements.map((m) => ({
          type: m.type,
          quantity: m._sum.quantity || 0,
        })),
      };
    }

    return successResponse(analytics);
  } catch (error) {
    console.error("Analytics error:", error);
    return errorResponse("Failed to fetch analytics", 500);
  }
}
