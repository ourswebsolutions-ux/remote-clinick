import { z } from "zod";

// ============================================
// AUTH SCHEMAS
// ============================================

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().optional(),
});

// ============================================
// PATIENT SCHEMAS
// ============================================

export const createPatientSchema = z.object({
  firstName: z.string().min(2, "First name is required"),
  lastName: z.string().min(2, "Last name is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  cnic: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().min(10, "Valid phone number is required"),
  alternatePhone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  photo: z.string().optional().nullable(),
  bloodGroup: z.enum([
    "A_POSITIVE", "A_NEGATIVE", "B_POSITIVE", "B_NEGATIVE",
    "AB_POSITIVE", "AB_NEGATIVE", "O_POSITIVE", "O_NEGATIVE"
  ]).optional().nullable(),
  allergies: z.string().optional().nullable(),
  emergencyName: z.string().optional().nullable(),
  emergencyPhone: z.string().optional().nullable(),
  emergencyRelation: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const updatePatientSchema = createPatientSchema.partial().extend({
  isActive: z.boolean().optional(),
});

// ============================================
// DOCTOR SCHEMAS
// ============================================

export const createDoctorSchema = z.object({
  email: z.string().email("Invalid email address"),
  // password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(2, "Name is required"),
  phone: z.string().optional(),
  specialization: z.string().min(2, "Specialization is required"),
  qualification: z.string().optional(),
  licenseNumber: z.string().optional(),
  experience: z.number().int().min(0).optional(),
  consultationFee: z.number().min(0, "Consultation fee is required"),
  bio: z.string().optional(),
});

export const updateDoctorSchema = createDoctorSchema.partial().omit({ password: true });

// ============================================
// STAFF SCHEMAS
// ============================================

export const createStaffSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(2, "Name is required"),
  phone: z.string().optional(),
  roleId: z.string().min(1, "Role is required"),
  department: z.string().min(2, "Department is required"),
  position: z.string().min(2, "Position is required"),
  hireDate: z.string().min(1, "Hire date is required"),
  salary: z.number().min(0).optional(),
});

export const updateStaffSchema = createStaffSchema.partial().omit({ password: true });

// ============================================
// APPOINTMENT SCHEMAS
// ============================================

export const createAppointmentSchema = z.object({
  patientId: z.string().min(1, "Patient is required"),
  doctorId: z.string().min(1, "Doctor is required"),
  date: z.string().min(1, "Date is required"),
  time: z.string().min(1, "Time is required"),
  duration: z.number().int().min(15).max(120).optional().default(30),
  type: z.enum(["CONSULTATION", "FOLLOW_UP", "EMERGENCY", "CHECKUP", "PROCEDURE"]).optional().default("CONSULTATION"),
  reason: z.string().optional(),
  notes: z.string().optional(),
});

export const updateAppointmentSchema = createAppointmentSchema.partial().extend({
  status: z.enum([
    "SCHEDULED", "CONFIRMED", "CHECKED_IN", 
    "IN_PROGRESS", "COMPLETED", "CANCELLED", "NO_SHOW"
  ]).optional(),
});

// ============================================
// EMR SCHEMAS
// ============================================

export const createEMRSchema = z.object({
  patientId: z.string().min(1, "Patient is required"),
  doctorId: z.string().min(1, "Doctor is required"),
  appointmentId: z.string().optional(),
  bloodPressure: z.string().optional(),
  heartRate: z.number().int().min(0).max(300).optional(),
  temperature: z.number().min(30).max(45).optional(),
  weight: z.number().min(0).max(500).optional(),
  height: z.number().min(0).max(300).optional(),
  oxygenLevel: z.number().int().min(0).max(100).optional(),
  chiefComplaint: z.string().optional(),
  symptoms: z.string().optional(),
  examination: z.string().optional(),
  diagnosis: z.string().optional(),
  treatment: z.string().optional(),
  notes: z.string().optional(),
  followUpDate: z.string().optional(),
});

export const updateEMRSchema = createEMRSchema.partial();

// ============================================
// LAB TEST SCHEMAS
// ============================================

export const createLabTestSchema = z.object({
  patientId: z.string().min(1, "Patient is required"),
  testName: z.string().min(2, "Test name is required"),
  testCategory: z.string().optional(),
  orderedBy: z.string().optional(),
  price: z.number().min(0, "Price is required"),
});

export const updateLabTestSchema = createLabTestSchema.partial().extend({
  status: z.enum(["PENDING", "SAMPLE_COLLECTED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
  resultFile: z.string().optional(),
  resultNotes: z.string().optional(),
});

// ============================================
// BILLING SCHEMAS
// ============================================

export const billingItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
  unitPrice: z.number().min(0, "Unit price is required"),
});

export const createBillingSchema = z.object({
  patientId: z.string().min(1, "Patient is required"),
  appointmentId: z.string().optional(),
  items: z.array(billingItemSchema).min(1, "At least one item is required"),
  discount: z.number().min(0).optional().default(0),
  tax: z.number().min(0).optional().default(0),
  paymentMethod: z.enum(["CASH", "CARD", "BANK_TRANSFER", "INSURANCE", "OTHER"]).optional(),
  notes: z.string().optional(),
});

export const updateBillingSchema = z.object({
  discount: z.number().min(0).optional(),
  tax: z.number().min(0).optional(),
  paidAmount: z.number().min(0).optional(),
  paymentMethod: z.enum(["CASH", "CARD", "BANK_TRANSFER", "INSURANCE", "OTHER"]).optional(),
  paymentStatus: z.enum(["PENDING", "PARTIAL", "PAID", "REFUNDED", "CANCELLED"]).optional(),
  notes: z.string().optional(),
});

// ============================================
// MEDICINE SCHEMAS
// ============================================

export const createMedicineSchema = z.object({
  name: z.string().min(2, "Name is required"),
  genericName: z.string().optional(),
  category: z.string().min(2, "Category is required"),
  manufacturer: z.string().optional(),
  dosageForm: z.string().min(2, "Dosage form is required"),
  strength: z.string().optional(),
  unitPrice: z.number().min(0, "Price is required"),
  stock: z.number().int().min(0, "Stock is required"),
  minStock: z.number().int().min(0).optional().default(10),
  expiryDate: z.string().optional(),
  batchNumber: z.string().optional(),
  description: z.string().optional(),
});

export const updateMedicineSchema = createMedicineSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const stockAdjustmentSchema = z.object({
  medicineId: z.string().min(1, "Medicine is required"),
  type: z.enum(["PURCHASE", "SALE", "ADJUSTMENT", "RETURN", "EXPIRED", "DAMAGED"]),
  quantity: z.number().int().min(1, "Quantity is required"),
  reason: z.string().optional(),
  reference: z.string().optional(),
});

// ============================================
// PRESCRIPTION SCHEMAS
// ============================================

export const prescriptionItemSchema = z.object({
  medicineId: z.string().optional(),
  medicineName: z.string().min(1, "Medicine name is required"),
  dosage: z.string().min(1, "Dosage is required"),
  frequency: z.string().min(1, "Frequency is required"),
  duration: z.string().min(1, "Duration is required"),
  instructions: z.string().optional(),
  quantity: z.number().int().min(1, "Quantity is required"),
});

export const createPrescriptionSchema = z.object({
  patientId: z.string().min(1, "Patient is required"),
  emrId: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(prescriptionItemSchema).min(1, "At least one medicine is required"),
});

// ============================================
// NOTIFICATION SCHEMAS
// ============================================

export const sendNotificationSchema = z.object({
  type: z.enum([
    "APPOINTMENT_REMINDER", "APPOINTMENT_CONFIRMATION", 
    "LAB_RESULT", "PRESCRIPTION", "BILLING", "GENERAL", "EMERGENCY"
  ]),
  channel: z.enum(["EMAIL", "WHATSAPP", "SMS"]),
  recipientId: z.string().optional(),
  recipientEmail: z.string().email().optional(),
  recipientPhone: z.string().optional(),
  subject: z.string().optional(),
  content: z.string().min(1, "Content is required"),
  attachments: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

// ============================================
// AI ASSISTANT SCHEMAS
// ============================================

export const aiAssistantSchema = z.object({
  symptoms: z.string().min(10, "Please provide detailed symptoms"),
  patientHistory: z.string().optional(),
  patientAge: z.number().int().min(0).max(150).optional(),
  patientGender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
});

// ============================================
// ROLE & PERMISSION SCHEMAS
// ============================================

export const createRoleSchema = z.object({
  name: z.string().min(2, "Role name is required"),
  description: z.string().optional(),
  permissions: z.array(z.string()).min(1, "At least one permission is required"),
});

export const updateRoleSchema = createRoleSchema.partial();

// ============================================
// AVAILABILITY SCHEMA
// ============================================

export const doctorAvailabilitySchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
  isActive: z.boolean().optional().default(true),
});

// ============================================
// QUERY PARAMS SCHEMAS
// ============================================

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});

export const searchSchema = z.object({
  search: z.string().optional(),
});

// Type exports
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreatePatientInput = z.infer<typeof createPatientSchema>;
export type UpdatePatientInput = z.infer<typeof updatePatientSchema>;
export type CreateDoctorInput = z.infer<typeof createDoctorSchema>;
export type CreateStaffInput = z.infer<typeof createStaffSchema>;
export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;
export type CreateEMRInput = z.infer<typeof createEMRSchema>;
export type CreateLabTestInput = z.infer<typeof createLabTestSchema>;
export type CreateBillingInput = z.infer<typeof createBillingSchema>;
export type CreateMedicineInput = z.infer<typeof createMedicineSchema>;
export type CreatePrescriptionInput = z.infer<typeof createPrescriptionSchema>;
export type SendNotificationInput = z.infer<typeof sendNotificationSchema>;
export type AIAssistantInput = z.infer<typeof aiAssistantSchema>;
