import { NextResponse } from "next/server";
import type { ZodSchema } from "zod";

// ============================================
// API RESPONSE HELPERS
// ============================================

export function successResponse<T>(data: T, status: number = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function errorResponse(message: string, status: number = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

export function paginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number
) {
  return NextResponse.json({
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

// ============================================
// VALIDATION HELPER
// ============================================

export async function validateRequest<T>(
  request: Request,
  schema: ZodSchema<T>
): Promise<{ data: T } | { error: NextResponse }> {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);

    if (!result.success) {
      const errors = result.error.errors.map((e) => e.message).join(", ");
      return { error: errorResponse(errors, 400) };
    }

    return { data: result.data };
  } catch {
    return { error: errorResponse("Invalid JSON body", 400) };
  }
}

// ============================================
// QUERY PARAMS HELPER
// ============================================

export function getQueryParams(request: Request) {
  const { searchParams } = new URL(request.url);
  return Object.fromEntries(searchParams.entries());
}

export function getPaginationParams(request: Request) {
  const params = getQueryParams(request);
  return {
    page: Math.max(1, parseInt(params.page || "1")),
    limit: Math.min(100, Math.max(1, parseInt(params.limit || "10"))),
    sortBy: params.sortBy || "createdAt",
    sortOrder: (params.sortOrder === "asc" ? "asc" : "desc") as "asc" | "desc",
    search: params.search || "",
  };
}

// ============================================
// ID GENERATORS
// ============================================

export function generatePatientNumber(): string {
  const prefix = "PAT";
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}${random}`;
}

export function generateAppointmentNumber(): string {
  const prefix = "APT";
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${date}-${random}`;
}

export function generateInvoiceNumber(): string {
  const prefix = "INV";
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${date}-${random}`;
}

export function generateLabTestNumber(): string {
  const prefix = "LAB";
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${date}-${random}`;
}

// ============================================
// DATE HELPERS
// ============================================

export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toISOString().split("T")[0];
}

export function formatDateTime(date: Date | string): string {
  const d = new Date(date);
  return d.toISOString().slice(0, 19).replace("T", " ");
}

export function getStartOfDay(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getEndOfDay(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function getStartOfWeek(date: Date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getStartOfMonth(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

// ============================================
// FILE UPLOAD HELPERS
// ============================================

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

export const ALLOWED_DOCUMENT_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function validateFileType(mimeType: string, allowedTypes: string[]): boolean {
  return allowedTypes.includes(mimeType);
}

export function validateFileSize(size: number, maxSize: number = MAX_FILE_SIZE): boolean {
  return size <= maxSize;
}

// ============================================
// SANITIZATION HELPERS
// ============================================

export function sanitizePhone(phone: string): string {
  return phone.replace(/[^\d+]/g, "");
}

export function sanitizeCNIC(cnic: string): string {
  return cnic.replace(/[^\d-]/g, "");
}
