import { requireAuth } from "@/lib/auth/auth";
import { successResponse, errorResponse } from "@/lib/api/utils";
import {
  generateWhatsAppLink,
  logNotification,
  getAppointmentReminderTemplate,
  getLabResultTemplate,
  getPrescriptionTemplate,
  getBillingTemplate,
} from "@/lib/services/notifications";

// POST /api/notifications/whatsapp - Generate WhatsApp link
export async function POST(request: Request) {
  try {
    const auth = await requireAuth([{ module: "notifications", action: "create" }]);
    if ("error" in auth) return errorResponse(auth.error, auth.status);

    const body = await request.json();
    const { type, phone, data: templateData } = body;

    if (!phone) {
      return errorResponse("Phone number is required", 400);
    }

    let message = "";

    switch (type) {
      case "appointment_reminder": {
        const template = getAppointmentReminderTemplate({
          patientName: templateData.patientName,
          doctorName: templateData.doctorName,
          date: templateData.date,
          time: templateData.time,
          clinicName: templateData.clinicName,
        });
        message = template.whatsapp;
        break;
      }

      case "lab_result": {
        const template = getLabResultTemplate({
          patientName: templateData.patientName,
          testName: templateData.testName,
          date: templateData.date,
          clinicName: templateData.clinicName,
        });
        message = template.whatsapp;
        break;
      }

      case "prescription": {
        const template = getPrescriptionTemplate({
          patientName: templateData.patientName,
          doctorName: templateData.doctorName,
          date: templateData.date,
          medicines: templateData.medicines,
          clinicName: templateData.clinicName,
        });
        message = template.whatsapp;
        break;
      }

      case "billing": {
        const template = getBillingTemplate({
          patientName: templateData.patientName,
          invoiceNumber: templateData.invoiceNumber,
          totalAmount: templateData.totalAmount,
          dueDate: templateData.dueDate,
          clinicName: templateData.clinicName,
        });
        message = template.whatsapp;
        break;
      }

      case "custom": {
        message = templateData.message;
        break;
      }

      default:
        return errorResponse("Invalid notification type", 400);
    }

    const whatsappLink = generateWhatsAppLink(phone, message);

    await logNotification({
      type: type.toUpperCase(),
      channel: "WHATSAPP",
      recipientPhone: phone,
      content: message,
      status: "SENT",
      metadata: { whatsappLink },
    });

    return successResponse({
      whatsappLink,
      message: "WhatsApp link generated successfully",
    });
  } catch (error) {
    console.error("WhatsApp notification error:", error);
    return errorResponse("Failed to generate WhatsApp link", 500);
  }
}
