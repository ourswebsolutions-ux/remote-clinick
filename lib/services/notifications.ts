import { getPrismaClient, isDatabaseConfigured } from "@/lib/db/prisma";

// ============================================
// NOTIFICATION SERVICE
// ============================================

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  attachments?: {
    filename: string;
    content: string | Buffer;
    contentType?: string;
  }[];
}

export interface WhatsAppOptions {
  phone: string;
  message: string;
}

// ============================================
// EMAIL SERVICE
// ============================================

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    // Using a simple email service - can be replaced with SendGrid, AWS SES, etc.
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || "clinic@example.com",
        to: options.to,
        subject: options.subject,
        html: options.html,
        attachments: options.attachments,
      }),
    });

    return response.ok;
  } catch (error) {
    console.error("Email sending error:", error);
    return false;
  }
}

// ============================================
// WHATSAPP SERVICE (wa.me)
// ============================================

export function generateWhatsAppLink(
  phone: string,
  message: string
): string {
  // Clean phone number (remove spaces, dashes, etc.)
  const cleanPhone = phone.replace(/[^\d+]/g, "");
  
  // Remove leading zero if present and add country code if missing
  let formattedPhone = cleanPhone;
  if (formattedPhone.startsWith("0")) {
    formattedPhone = formattedPhone.substring(1);
  }
  if (!formattedPhone.startsWith("+")) {
    // Default to Pakistan country code
    formattedPhone = `92${formattedPhone}`;
  } else {
    formattedPhone = formattedPhone.substring(1); // Remove +
  }

  // Encode message for URL
  const encodedMessage = encodeURIComponent(message);

  return `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
}

// ============================================
// NOTIFICATION TEMPLATES
// ============================================

export function getAppointmentReminderTemplate(data: {
  patientName: string;
  doctorName: string;
  date: string;
  time: string;
  clinicName?: string;
}): { subject: string; html: string; whatsapp: string } {
  const clinicName = data.clinicName || "Our Clinic";
  
  return {
    subject: `Appointment Reminder - ${data.date}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Appointment Reminder</h2>
        <p>Dear ${data.patientName},</p>
        <p>This is a reminder for your upcoming appointment:</p>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Doctor:</strong> ${data.doctorName}</p>
          <p><strong>Date:</strong> ${data.date}</p>
          <p><strong>Time:</strong> ${data.time}</p>
        </div>
        <p>Please arrive 15 minutes before your scheduled time.</p>
        <p>Best regards,<br>${clinicName}</p>
      </div>
    `,
    whatsapp: `*Appointment Reminder*\n\nDear ${data.patientName},\n\nYour appointment is scheduled:\n\nDoctor: ${data.doctorName}\nDate: ${data.date}\nTime: ${data.time}\n\nPlease arrive 15 minutes early.\n\n- ${clinicName}`,
  };
}

export function getLabResultTemplate(data: {
  patientName: string;
  testName: string;
  date: string;
  clinicName?: string;
}): { subject: string; html: string; whatsapp: string } {
  const clinicName = data.clinicName || "Our Clinic";
  
  return {
    subject: `Lab Results Ready - ${data.testName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Lab Results Ready</h2>
        <p>Dear ${data.patientName},</p>
        <p>Your lab test results are now available:</p>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Test:</strong> ${data.testName}</p>
          <p><strong>Date:</strong> ${data.date}</p>
        </div>
        <p>Please visit the clinic to collect your reports or contact us for more information.</p>
        <p>Best regards,<br>${clinicName}</p>
      </div>
    `,
    whatsapp: `*Lab Results Ready*\n\nDear ${data.patientName},\n\nYour lab results are available:\n\nTest: ${data.testName}\nDate: ${data.date}\n\nPlease visit the clinic to collect your reports.\n\n- ${clinicName}`,
  };
}

export function getPrescriptionTemplate(data: {
  patientName: string;
  doctorName: string;
  date: string;
  medicines: string[];
  clinicName?: string;
}): { subject: string; html: string; whatsapp: string } {
  const clinicName = data.clinicName || "Our Clinic";
  const medicineList = data.medicines.map((m) => `• ${m}`).join("\n");
  const medicineListHtml = data.medicines.map((m) => `<li>${m}</li>`).join("");
  
  return {
    subject: `Your Prescription - ${data.date}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Prescription</h2>
        <p>Dear ${data.patientName},</p>
        <p>Here is your prescription from ${data.doctorName}:</p>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Date:</strong> ${data.date}</p>
          <p><strong>Prescribed Medications:</strong></p>
          <ul>${medicineListHtml}</ul>
        </div>
        <p>Please follow the prescribed dosage instructions carefully.</p>
        <p>Best regards,<br>${clinicName}</p>
      </div>
    `,
    whatsapp: `*Prescription*\n\nDear ${data.patientName},\n\nPrescription from ${data.doctorName}:\n\nDate: ${data.date}\n\nMedications:\n${medicineList}\n\nPlease follow the dosage instructions.\n\n- ${clinicName}`,
  };
}

export function getBillingTemplate(data: {
  patientName: string;
  invoiceNumber: string;
  totalAmount: number;
  dueDate?: string;
  clinicName?: string;
}): { subject: string; html: string; whatsapp: string } {
  const clinicName = data.clinicName || "Our Clinic";
  
  return {
    subject: `Invoice ${data.invoiceNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Invoice</h2>
        <p>Dear ${data.patientName},</p>
        <p>Please find your invoice details below:</p>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Invoice Number:</strong> ${data.invoiceNumber}</p>
          <p><strong>Total Amount:</strong> Rs. ${data.totalAmount.toFixed(2)}</p>
          ${data.dueDate ? `<p><strong>Due Date:</strong> ${data.dueDate}</p>` : ""}
        </div>
        <p>Please contact us for any queries regarding this invoice.</p>
        <p>Best regards,<br>${clinicName}</p>
      </div>
    `,
    whatsapp: `*Invoice ${data.invoiceNumber}*\n\nDear ${data.patientName},\n\nTotal Amount: Rs. ${data.totalAmount.toFixed(2)}${data.dueDate ? `\nDue Date: ${data.dueDate}` : ""}\n\nPlease contact us for any queries.\n\n- ${clinicName}`,
  };
}

// ============================================
// NOTIFICATION LOGGING
// ============================================

export async function logNotification(data: {
  type: string;
  channel: string;
  recipientId?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  subject?: string;
  content: string;
  status: string;
  error?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    await prisma.notification.create({
      data: {
        type: data.type as "APPOINTMENT_REMINDER" | "APPOINTMENT_CONFIRMATION" | "LAB_RESULT" | "PRESCRIPTION" | "BILLING" | "GENERAL" | "EMERGENCY",
        channel: data.channel as "EMAIL" | "WHATSAPP" | "SMS" | "PUSH",
        recipientId: data.recipientId,
        recipientEmail: data.recipientEmail,
        recipientPhone: data.recipientPhone,
        subject: data.subject,
        content: data.content,
        status: data.status as "PENDING" | "SENT" | "DELIVERED" | "FAILED" | "CANCELLED",
        sentAt: data.status === "SENT" ? new Date() : null,
        error: data.error,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      },
    });
  } catch (error) {
    console.error("Failed to log notification:", error);
  }
}
