// Database Types and Interfaces for Clinic Management System

import type {
  User,
  Role,
  Permission,
  Doctor,
  Staff,
  Patient,
  Appointment,
  EMR,
  LabTest,
  Billing,
  Medicine,
  Notification,
  AILog,
} from "@prisma/client";

// ============================================
// AUTH TYPES
// ============================================

export interface JWTPayload {
  userId: string;
  email: string;
  roleId: string;
  roleName: string;
  permissions: string[];
  iat?: number;
  exp?: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: SafeUser;
  token: string;
  expiresAt: Date;
}

export type SafeUser = Omit<User, "password">;

// ============================================
// API RESPONSE TYPES
// ============================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============================================
// FILTER & QUERY TYPES
// ============================================

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PatientFilters extends PaginationParams {
  search?: string;
  gender?: string;
  bloodGroup?: string;
  isActive?: boolean;
}

export interface AppointmentFilters extends PaginationParams {
  patientId?: string;
  doctorId?: string;
  status?: string;
  type?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface BillingFilters extends PaginationParams {
  patientId?: string;
  paymentStatus?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface MedicineFilters extends PaginationParams {
  search?: string;
  category?: string;
  lowStock?: boolean;
  expiringSoon?: boolean;
}

// ============================================
// CREATE/UPDATE INPUT TYPES
// ============================================

export interface CreatePatientInput {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: "MALE" | "FEMALE" | "OTHER";
  cnic?: string;
  email?: string;
  phone: string;
  alternatePhone?: string;
  address?: string;
  city?: string;
  photo?: string;
  bloodGroup?: string;
  allergies?: string;
  emergencyName?: string;
  emergencyPhone?: string;
  emergencyRelation?: string;
  notes?: string;
}

export interface UpdatePatientInput extends Partial<CreatePatientInput> {
  isActive?: boolean;
}

export interface CreateDoctorInput {
  email: string;
  password: string;
  name: string;
  phone?: string;
  specialization: string;
  qualification?: string;
  licenseNumber?: string;
  experience?: number;
  consultationFee: number;
  bio?: string;
}

export interface CreateStaffInput {
  email: string;
  password: string;
  name: string;
  phone?: string;
  roleId: string;
  department: string;
  position: string;
  hireDate: string;
  salary?: number;
}

export interface CreateAppointmentInput {
  patientId: string;
  doctorId: string;
  date: string;
  time: string;
  duration?: number;
  type?: string;
  reason?: string;
  notes?: string;
}

export interface CreateEMRInput {
  patientId: string;
  doctorId: string;
  appointmentId?: string;
  bloodPressure?: string;
  heartRate?: number;
  temperature?: number;
  weight?: number;
  height?: number;
  oxygenLevel?: number;
  chiefComplaint?: string;
  symptoms?: string;
  examination?: string;
  diagnosis?: string;
  treatment?: string;
  notes?: string;
  followUpDate?: string;
}

export interface CreateLabTestInput {
  patientId: string;
  testName: string;
  testCategory?: string;
  orderedBy?: string;
  price: number;
}

export interface CreateBillingInput {
  patientId: string;
  appointmentId?: string;
  items: {
    description: string;
    quantity: number;
    unitPrice: number;
  }[];
  discount?: number;
  tax?: number;
  paymentMethod?: string;
  notes?: string;
}

export interface CreateMedicineInput {
  name: string;
  genericName?: string;
  category: string;
  manufacturer?: string;
  dosageForm: string;
  strength?: string;
  unitPrice: number;
  stock: number;
  minStock?: number;
  expiryDate?: string;
  batchNumber?: string;
  description?: string;
}

export interface CreatePrescriptionInput {
  patientId: string;
  emrId?: string;
  notes?: string;
  items: {
    medicineId?: string;
    medicineName: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions?: string;
    quantity: number;
  }[];
}

// ============================================
// NOTIFICATION TYPES
// ============================================

export interface SendNotificationInput {
  type: string;
  channel: "EMAIL" | "WHATSAPP" | "SMS";
  recipientId?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  subject?: string;
  content: string;
  attachments?: string[];
  metadata?: Record<string, unknown>;
}

// ============================================
// AI TYPES
// ============================================

export interface AIAssistantInput {
  symptoms: string;
  patientHistory?: string;
  patientAge?: number;
  patientGender?: string;
}

export interface AIAssistantResponse {
  suggestedDiagnosis: string;
  suggestedPrescription: string;
  riskLevel: "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
  recommendations: string[];
  warnings: string[];
}

// ============================================
// DASHBOARD TYPES
// ============================================

export interface DashboardStats {
  totalPatients: number;
  totalDoctors: number;
  totalAppointments: number;
  todayAppointments: number;
  pendingAppointments: number;
  completedAppointments: number;
  totalRevenue: number;
  todayRevenue: number;
  pendingPayments: number;
  lowStockMedicines: number;
}

export interface RevenueData {
  date: string;
  amount: number;
}

export interface AppointmentStats {
  status: string;
  count: number;
}

// Re-export Prisma types
export type {
  User,
  Role,
  Permission,
  Doctor,
  Staff,
  Patient,
  Appointment,
  EMR,
  LabTest,
  Billing,
  Medicine,
  Notification,
  AILog,
};
