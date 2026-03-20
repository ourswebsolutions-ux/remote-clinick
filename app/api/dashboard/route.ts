
import { getPrismaClient, isDatabaseConfigured } from "@/lib/db/prisma";
import { requireAuth } from "@/lib/auth/auth";
import { successResponse, errorResponse, getStartOfDay, getEndOfDay, getStartOfMonth } from "@/lib/api/utils";

// Demo data for when database is not available
const DEMO_DASHBOARD_DATA = {
  patients: {
    total: 156,
    active: 142,
  },
  doctors: {
    total: 8,
  },
  staff: {
    total: 12,
  },
  appointments: {
    total: 1248,
    today: 24,
    byStatus: {
      scheduled: 8,
      confirmed: 6,
      checkedIn: 3,
      inProgress: 2,
      completed: 4,
      cancelled: 1,
      noShow: 0,
    },
  },
  revenue: {
    total: 485000,
    monthly: 52000,
    today: 3200,
    pending: 8500,
  },
  pharmacy: {
    lowStockItems: 5,
  },
  recentAppointments: [
    {
      id: "1",
      date: new Date().toISOString(),
      time: "09:00",
      status: "CONFIRMED",
      type: "CONSULTATION",
      patient: { firstName: "John", lastName: "Doe", phone: "+1234567890" },
      doctor: { user: { name: "Dr. Sarah Smith" } },
    },
    {
      id: "2",
      date: new Date().toISOString(),
      time: "09:30",
      status: "CHECKED_IN",
      type: "FOLLOW_UP",
      patient: { firstName: "Jane", lastName: "Wilson", phone: "+1234567891" },
      doctor: { user: { name: "Dr. Michael Brown" } },
    },
    {
      id: "3",
      date: new Date().toISOString(),
      time: "10:00",
      status: "SCHEDULED",
      type: "CONSULTATION",
      patient: { firstName: "Robert", lastName: "Johnson", phone: "+1234567892" },
      doctor: { user: { name: "Dr. Sarah Smith" } },
    },
    {
      id: "4",
      date: new Date().toISOString(),
      time: "10:30",
      status: "IN_PROGRESS",
      type: "PROCEDURE",
      patient: { firstName: "Emily", lastName: "Davis", phone: "+1234567893" },
      doctor: { user: { name: "Dr. James Lee" } },
    },
    {
      id: "5",
      date: new Date().toISOString(),
      time: "11:00",
      status: "SCHEDULED",
      type: "CONSULTATION",
      patient: { firstName: "Michael", lastName: "Taylor", phone: "+1234567894" },
      doctor: { user: { name: "Dr. Michael Brown" } },
    },
  ],
  upcomingAppointments: [
    {
      id: "6",
      date: new Date(Date.now() + 86400000).toISOString(),
      time: "09:00",
      status: "SCHEDULED",
      patient: { firstName: "Alice", lastName: "Martin" },
      doctor: { user: { name: "Dr. Sarah Smith" } },
    },
    {
      id: "7",
      date: new Date(Date.now() + 86400000).toISOString(),
      time: "10:00",
      status: "CONFIRMED",
      patient: { firstName: "David", lastName: "Clark" },
      doctor: { user: { name: "Dr. James Lee" } },
    },
    {
      id: "8",
      date: new Date(Date.now() + 172800000).toISOString(),
      time: "14:00",
      status: "SCHEDULED",
      patient: { firstName: "Sarah", lastName: "White" },
      doctor: { user: { name: "Dr. Michael Brown" } },
    },
  ],
  demoMode: true,
};

// GET /api/dashboard - Get dashboard statistics
export async function GET() {
  try {
     const prisma = await getPrismaClient(); // ✅ ADD THIS // <-- await the lazy client
    const auth = await requireAuth();
    if ("error" in auth) return errorResponse(auth.error, auth.status);

    // Return demo data if database is not available
  

    const today = new Date();
    const startOfToday = getStartOfDay(today);
    const endOfToday = getEndOfDay(today);
    const startOfMonth = getStartOfMonth(today);

    // Get all stats in parallel
    const [
      totalPatients,
      activePatients,
      totalDoctors,
      totalStaff,
      totalAppointments,
      todayAppointments,
      appointmentsByStatus,
      totalRevenue,
      monthlyRevenue,
      todayRevenue,
      pendingPayments,
      lowStockMedicines,
      recentAppointments,
      upcomingAppointments,
    ] = await Promise.all([
      // Patient stats
      prisma.patient.count(),
      prisma.patient.count({ where: { isActive: true } }),

      // Doctor & Staff stats
      prisma.doctor.count({
        where: { user: { isActive: true } },
      }),
      prisma.staff.count({
        where: { user: { isActive: true } },
      }),

      // Appointment stats
      prisma.appointment.count(),
      prisma.appointment.count({
        where: {
          date: {
            gte: startOfToday,
            lte: endOfToday,
          },
        },
      }),
      prisma.appointment.groupBy({
        by: ["status"],
        _count: { status: true },
      }),

      // Revenue stats
      prisma.billing.aggregate({
        _sum: { paidAmount: true },
        where: { paymentStatus: "PAID" },
      }),
      prisma.billing.aggregate({
        _sum: { paidAmount: true },
        where: {
          paymentStatus: "PAID",
          createdAt: { gte: startOfMonth },
        },
      }),
      prisma.billing.aggregate({
        _sum: { paidAmount: true },
        where: {
          paymentStatus: "PAID",
          createdAt: {
            gte: startOfToday,
            lte: endOfToday,
          },
        },
      }),
      prisma.billing.aggregate({
        _sum: { dueAmount: true },
        where: {
          paymentStatus: { in: ["PENDING", "PARTIAL"] },
        },
      }),

      // Pharmacy stats
      prisma.medicine.count({
        where: {
          isActive: true,
          stock: { lte: 10 },
        },
      }),

      // Recent appointments
      prisma.appointment.findMany({
        where: {
          date: {
            gte: startOfToday,
            lte: endOfToday,
          },
        },
        orderBy: [{ time: "asc" }],
        take: 10,
        include: {
          patient: {
            select: {
              firstName: true,
              lastName: true,
              phone: true,
            },
          },
          doctor: {
            include: {
              user: {
                select: { name: true },
              },
            },
          },
        },
      }),

      // Upcoming appointments (next 7 days)
      prisma.appointment.findMany({
        where: {
          date: {
            gt: endOfToday,
            lte: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000),
          },
          status: { in: ["SCHEDULED", "CONFIRMED"] },
        },
        orderBy: [{ date: "asc" }, { time: "asc" }],
        take: 10,
        include: {
          patient: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
          doctor: {
            include: {
              user: {
                select: { name: true },
              },
            },
          },
        },
      }),
    ]);

    // Process appointment stats
    const appointmentStats = {
      scheduled: 0,
      confirmed: 0,
      checkedIn: 0,
      inProgress: 0,
      completed: 0,
      cancelled: 0,
      noShow: 0,
    };

    appointmentsByStatus.forEach((stat) => {
      const key = stat.status.toLowerCase().replace("_", "") as keyof typeof appointmentStats;
      if (key === "checkedin") appointmentStats.checkedIn = stat._count.status;
      else if (key === "inprogress") appointmentStats.inProgress = stat._count.status;
      else if (key === "noshow") appointmentStats.noShow = stat._count.status;
      else if (key in appointmentStats) appointmentStats[key as keyof typeof appointmentStats] = stat._count.status;
    });

    return successResponse({
      patients: {
        total: totalPatients,
        active: activePatients,
      },
      doctors: {
        total: totalDoctors,
      },
      staff: {
        total: totalStaff,
      },
      appointments: {
        total: totalAppointments,
        today: todayAppointments,
        byStatus: appointmentStats,
      },
      revenue: {
        total: Number(totalRevenue._sum.paidAmount || 0),
        monthly: Number(monthlyRevenue._sum.paidAmount || 0),
        today: Number(todayRevenue._sum.paidAmount || 0),
        pending: Number(pendingPayments._sum.dueAmount || 0),
      },
      pharmacy: {
        lowStockItems: lowStockMedicines,
      },
      recentAppointments,
      upcomingAppointments,
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return errorResponse("Failed to fetch dashboard data", 500);
  }
}
