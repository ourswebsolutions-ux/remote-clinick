import { getPrismaClient, isDatabaseConfigured } from "@/lib/db/prisma";
import { requireAuth } from "@/lib/auth/auth";
import {
  validateRequest,
  successResponse,
  errorResponse,
  paginatedResponse,
  getPaginationParams,
} from "@/lib/api/utils";
import { sendNotificationSchema } from "@/lib/validations";
import {
  sendEmail,
  generateWhatsAppLink,
  logNotification,
} from "@/lib/services/notifications";

// GET /api/notifications - List all notifications
export async function GET(request: Request) {
  try {
        const prisma = await getPrismaClient(); // ✅ ADD THIS // <-- await the lazy client

    const auth = await requireAuth([{ module: "notifications", action: "read" }]);
    if ("error" in auth) return errorResponse(auth.error, auth.status);

    const { page, limit, sortBy, sortOrder } = getPaginationParams(request);
    const skip = (page - 1) * limit;

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const channel = searchParams.get("channel");
    const status = searchParams.get("status");

    // Build where clause
    const where: Record<string, unknown> = {};

    if (type) where.type = type;
    if (channel) where.channel = channel;
    if (status) where.status = status;

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          recipient: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.notification.count({ where }),
    ]);

    return paginatedResponse(notifications, page, limit, total);
  } catch (error) {
    console.error("Get notifications error:", error);
    return errorResponse("Failed to fetch notifications", 500);
  }
}

// POST /api/notifications - Send a notification
export async function POST(request: Request) {
  try {
        const prisma = await getPrismaClient(); // ✅ ADD THIS // <-- await the lazy client

    const auth = await requireAuth([{ module: "notifications", action: "create" }]);
    if ("error" in auth) return errorResponse(auth.error, auth.status);

    const validation = await validateRequest(request, sendNotificationSchema);
    if ("error" in validation) return validation.error;

    const data = validation.data;

    let result: { success: boolean; data?: unknown; error?: string } = {
      success: false,
    };

    switch (data.channel) {
      case "EMAIL": {
        if (!data.recipientEmail) {
          return errorResponse("Email address is required", 400);
        }

        const emailSent = await sendEmail({
          to: data.recipientEmail,
          subject: data.subject || "Notification from Clinic",
          html: data.content,
        });

        result = {
          success: emailSent,
          error: emailSent ? undefined : "Failed to send email",
        };

        await logNotification({
          type: data.type,
          channel: "EMAIL",
          recipientId: data.recipientId,
          recipientEmail: data.recipientEmail,
          subject: data.subject,
          content: data.content,
          status: emailSent ? "SENT" : "FAILED",
          error: emailSent ? undefined : "Email sending failed",
          metadata: data.metadata,
        });
        break;
      }

      case "WHATSAPP": {
        if (!data.recipientPhone) {
          return errorResponse("Phone number is required", 400);
        }

        const whatsappLink = generateWhatsAppLink(
          data.recipientPhone,
          data.content
        );

        result = {
          success: true,
          data: { whatsappLink },
        };

        await logNotification({
          type: data.type,
          channel: "WHATSAPP",
          recipientId: data.recipientId,
          recipientPhone: data.recipientPhone,
          content: data.content,
          status: "SENT",
          metadata: { ...data.metadata, whatsappLink },
        });
        break;
      }

      case "SMS": {
        // SMS integration placeholder
        result = {
          success: false,
          error: "SMS service not configured",
        };
        break;
      }

      default:
        return errorResponse("Invalid notification channel", 400);
    }

    if (!result.success) {
      return errorResponse(result.error || "Failed to send notification", 500);
    }

    return successResponse(result.data || { message: "Notification sent successfully" });
  } catch (error) {
    console.error("Send notification error:", error);
    return errorResponse("Failed to send notification", 500);
  }
}
