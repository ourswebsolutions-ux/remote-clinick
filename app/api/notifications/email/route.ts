import { requireAuth } from "@/lib/auth/auth";
import { successResponse, errorResponse } from "@/lib/api/utils";
import {
  sendEmail,
  logNotification,
  getAppointmentReminderTemplate,
  getLabResultTemplate,
  getPrescriptionTemplate,
  getBillingTemplate,
} from "@/lib/services/notifications";

// POST /api/notifications/email - Send email notification
export async function POST(request: Request) {
  try {
    const auth = await requireAuth([{ module: "notifications", action: "create" }]);
    if ("error" in auth) return errorResponse(auth.error, auth.status);

    const body = await request.json();
    const { type, email, data: templateData, attachments } = body;

    if (!email) {
      return errorResponse("Email address is required", 400);
    }

    let subject = "";
    let html = "";

    switch (type) {
      case "appointment_reminder": {
        const template = getAppointmentReminderTemplate({
          patientName: templateData.patientName,
          doctorName: templateData.doctorName,
          date: templateData.date,
          time: templateData.time,
          clinicName: templateData.clinicName,
        });
        subject = template.subject;
        html = template.html;
        break;
      }

      case "lab_result": {
        const template = getLabResultTemplate({
          patientName: templateData.patientName,
          testName: templateData.testName,
          date: templateData.date,
          clinicName: templateData.clinicName,
        });
        subject = template.subject;
        html = template.html;
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
        subject = template.subject;
        html = template.html;
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
        subject = template.subject;
        html = template.html;
        break;
      }

      case "custom": {
        subject = templateData.subject;
        html = templateData.html;
        break;
      }

      default:
        return errorResponse("Invalid notification type", 400);
    }

    const emailSent = await sendEmail({
      to: email,
      subject,
      html,
      attachments,
    });

    await logNotification({
      type: type.toUpperCase(),
      channel: "EMAIL",
      recipientEmail: email,
      subject,
      content: html,
      status: emailSent ? "SENT" : "FAILED",
      error: emailSent ? undefined : "Email sending failed",
    });

    if (!emailSent) {
      return errorResponse("Failed to send email", 500);
    }

    return successResponse({
      message: "Email sent successfully",
    });
  } catch (error) {
    console.error("Email notification error:", error);
    return errorResponse("Failed to send email", 500);
  }
}
