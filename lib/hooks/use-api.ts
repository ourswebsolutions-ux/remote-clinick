"use client"

import useSWR, { mutate } from "swr"
import { toast } from "sonner"

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || "Failed to fetch")
  }
  return res.json()
}

export function usePatients(params?: { search?: string; page?: number; limit?: number }) {
  const searchParams = new URLSearchParams()
  if (params?.search) searchParams.set("search", params.search)
  if (params?.page) searchParams.set("page", params.page.toString())
  if (params?.limit) searchParams.set("limit", params.limit.toString())
  
  const url = `/api/patients${searchParams.toString() ? `?${searchParams}` : ""}`
  return useSWR(url, fetcher)
}

export function usePatient(id: string | null) {
  return useSWR(id ? `/api/patients/${id}` : null, fetcher)
}

export function useDoctors(params?: { search?: string; specialization?: string; page?: number }) {
  const searchParams = new URLSearchParams()
  if (params?.search) searchParams.set("search", params.search)
  if (params?.specialization) searchParams.set("specialization", params.specialization)
  if (params?.page) searchParams.set("page", params.page.toString())
  
  const url = `/api/doctors${searchParams.toString() ? `?${searchParams}` : ""}`
  return useSWR(url, fetcher)
}

export function useDoctor(id: string | null) {
  return useSWR(id ? `/api/doctors/${id}` : null, fetcher)
}

export function useStaff(params?: { search?: string; role?: string; page?: number }) {
  const searchParams = new URLSearchParams()
  if (params?.search) searchParams.set("search", params.search)
  if (params?.role) searchParams.set("role", params.role)
  if (params?.page) searchParams.set("page", params.page.toString())
  
  const url = `/api/staff${searchParams.toString() ? `?${searchParams}` : ""}`
  return useSWR(url, fetcher)
}

export function useStaffMember(id: string | null) {
  return useSWR(id ? `/api/staff/${id}` : null, fetcher)
}

export function useAppointments(params?: { 
  patientId?: string
  doctorId?: string
  date?: string
  status?: string
  page?: number 
}) {
  const searchParams = new URLSearchParams()
  if (params?.patientId) searchParams.set("patientId", params.patientId)
  if (params?.doctorId) searchParams.set("doctorId", params.doctorId)
  if (params?.date) searchParams.set("date", params.date)
  if (params?.status) searchParams.set("status", params.status)
  if (params?.page) searchParams.set("page", params.page.toString())
  
  const url = `/api/appointments${searchParams.toString() ? `?${searchParams}` : ""}`
  return useSWR(url, fetcher)
}

export function useAppointment(id: string | null) {
  return useSWR(id ? `/api/appointments/${id}` : null, fetcher)
}

export function useEMRs(params?: { patientId?: string; page?: number }) {
  const searchParams = new URLSearchParams()
  if (params?.patientId) searchParams.set("patientId", params.patientId)
  if (params?.page) searchParams.set("page", params.page.toString())
  
  const url = `/api/emr${searchParams.toString() ? `?${searchParams}` : ""}`
  return useSWR(url, fetcher)
}

export function useEMR(params?: { search?: string; patientId?: string; page?: number }) {
  const searchParams = new URLSearchParams()
  if (params?.search) searchParams.set("search", params.search)
  if (params?.patientId) searchParams.set("patientId", params.patientId)
  if (params?.page) searchParams.set("page", params.page.toString())
  
  const url = `/api/emr${searchParams.toString() ? `?${searchParams}` : ""}`
  return useSWR(url, fetcher)
}

export function useEMRRecord(id: string | null) {
  return useSWR(id ? `/api/emr/${id}` : null, fetcher)
}

export function useLabTests(params?: { patientId?: string; status?: string; page?: number }) {
  const searchParams = new URLSearchParams()
  if (params?.patientId) searchParams.set("patientId", params.patientId)
  if (params?.status) searchParams.set("status", params.status)
  if (params?.page) searchParams.set("page", params.page.toString())
  
  const url = `/api/lab-tests${searchParams.toString() ? `?${searchParams}` : ""}`
  return useSWR(url, fetcher)
}

export function useLabTest(id: string | null) {
  return useSWR(id ? `/api/lab-tests/${id}` : null, fetcher)
}

export function useBilling(params?: { patientId?: string; status?: string; page?: number }) {
  const searchParams = new URLSearchParams()
  if (params?.patientId) searchParams.set("patientId", params.patientId)
  if (params?.status) searchParams.set("status", params.status)
  if (params?.page) searchParams.set("page", params.page.toString())
  
  const url = `/api/billing${searchParams.toString() ? `?${searchParams}` : ""}`
  return useSWR(url, fetcher)
}

export function useBill(id: string | null) {
  return useSWR(id ? `/api/billing/${id}` : null, fetcher)
}

export function usePharmacy(params?: { search?: string; lowStock?: boolean; page?: number }) {
  const searchParams = new URLSearchParams()
  if (params?.search) searchParams.set("search", params.search)
  if (params?.lowStock) searchParams.set("lowStock", "true")
  if (params?.page) searchParams.set("page", params.page.toString())
  
  const url = `/api/pharmacy${searchParams.toString() ? `?${searchParams}` : ""}`
  return useSWR(url, fetcher)
}

export function useMedication(id: string | null) {
  return useSWR(id ? `/api/pharmacy/${id}` : null, fetcher)
}

export function useMedications(params?: { search?: string; limit?: number; page?: number }) {
  const searchParams = new URLSearchParams()
  if (params?.search) searchParams.set("search", params.search)
  if (params?.limit) searchParams.set("limit", params.limit.toString())
  if (params?.page) searchParams.set("page", params.page.toString())
  
  const url = `/api/pharmacy${searchParams.toString() ? `?${searchParams}` : ""}`
  return useSWR(url, fetcher)
}

export function usePrescriptions(params?: { search?: string; patientId?: string; status?: string; page?: number }) {
  const searchParams = new URLSearchParams()
  if (params?.search) searchParams.set("search", params.search)
  if (params?.patientId) searchParams.set("patientId", params.patientId)
  if (params?.status) searchParams.set("status", params.status)
  if (params?.page) searchParams.set("page", params.page.toString())
  
  const url = `/api/prescriptions${searchParams.toString() ? `?${searchParams}` : ""}`
  return useSWR(url, fetcher)
}

export function useNotifications(params?: { type?: string; unreadOnly?: boolean; page?: number }) {
  const searchParams = new URLSearchParams()
  if (params?.type) searchParams.set("type", params.type)
  if (params?.unreadOnly) searchParams.set("unreadOnly", "true")
  if (params?.page) searchParams.set("page", params.page.toString())
  
  const url = `/api/notifications${searchParams.toString() ? `?${searchParams}` : ""}`
  return useSWR(url, fetcher)
}

export function useDashboard() {
  return useSWR("/api/dashboard", fetcher)
}

export function useAnalytics(params?: { startDate?: string; endDate?: string }) {
  const searchParams = new URLSearchParams()
  if (params?.startDate) searchParams.set("startDate", params.startDate)
  if (params?.endDate) searchParams.set("endDate", params.endDate)
  
  const url = `/api/analytics${searchParams.toString() ? `?${searchParams}` : ""}`
  return useSWR(url, fetcher)
}

export function useRoles() {
  return useSWR("/api/roles", fetcher)
}

export function useRole(id: string | null) {
  return useSWR(id ? `/api/roles/${id}` : null, fetcher)
}

export function usePermissions() {
  return useSWR("/api/permissions", fetcher)
}

export function useAILogs(params?: { doctorId?: string; page?: number }) {
  const searchParams = new URLSearchParams()
  if (params?.doctorId) searchParams.set("doctorId", params.doctorId)
  if (params?.page) searchParams.set("page", params.page.toString())
  
  const url = `/api/ai/logs${searchParams.toString() ? `?${searchParams}` : ""}`
  return useSWR(url, fetcher)
}

// Mutation helpers
export async function apiRequest<T>(
  url: string,
  method: "POST" | "PUT" | "PATCH" | "DELETE",
  body?: Record<string, unknown>,
  options?: { successMessage?: string; errorMessage?: string }
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    })
    
    const data = await res.json()
    
    if (!res.ok) {
      const errorMsg = data.error || options?.errorMessage || "Operation failed"
      toast.error(errorMsg)
      return { success: false, error: errorMsg }
    }
    
    if (options?.successMessage) {
      toast.success(options.successMessage)
    }
    
    return { success: true, data }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Network error"
    toast.error(errorMsg)
    return { success: false, error: errorMsg }
  }
}

export async function createPatient(data: Record<string, unknown>) {
  const result = await apiRequest("/api/patients", "POST", data, {
    successMessage: "Patient created successfully",
  })
  if (result.success) mutate((key) => typeof key === "string" && key.startsWith("/api/patients"))
  return result
}

export async function updatePatient(id: string, data: Record<string, unknown>) {
  const result = await apiRequest(`/api/patients/${id}`, "PATCH", data, {
    successMessage: "Patient updated successfully",
  })
  if (result.success) {
    mutate((key) => typeof key === "string" && key.startsWith("/api/patients"))
    mutate(`/api/patients/${id}`)
  }
  return result
}

export async function deletePatient(id: string) {
  const result = await apiRequest(`/api/patients/${id}`, "DELETE", undefined, {
    successMessage: "Patient deleted successfully",
  })
  if (result.success) mutate((key) => typeof key === "string" && key.startsWith("/api/patients"))
  return result
}

export async function createDoctor(data: Record<string, unknown>) {
  const result = await apiRequest("/api/doctors", "POST", data, {
    successMessage: "Doctor created successfully",
  })
  if (result.success) mutate((key) => typeof key === "string" && key.startsWith("/api/doctors"))
  return result
}

export async function updateDoctor(id: string, data: Record<string, unknown>) {
  const result = await apiRequest(`/api/doctors/${id}`, "PATCH", data, {
    successMessage: "Doctor updated successfully",
  })
  if (result.success) {
    mutate((key) => typeof key === "string" && key.startsWith("/api/doctors"))
    mutate(`/api/doctors/${id}`)
  }
  return result
}

export async function deleteDoctor(id: string) {
  const result = await apiRequest(`/api/doctors/${id}`, "DELETE", undefined, {
    successMessage: "Doctor deleted successfully",
  })
  if (result.success) mutate((key) => typeof key === "string" && key.startsWith("/api/doctors"))
  return result
}

export async function createStaff(data: Record<string, unknown>) {
  const result = await apiRequest("/api/staff", "POST", data, {
    successMessage: "Staff member created successfully",
  })
  if (result.success) mutate((key) => typeof key === "string" && key.startsWith("/api/staff"))
  return result
}

export async function updateStaff(id: string, data: Record<string, unknown>) {
  const result = await apiRequest(`/api/staff/${id}`, "PUT", data, {
    successMessage: "Staff member updated successfully",
  })
  if (result.success) {
    mutate((key) => typeof key === "string" && key.startsWith("/api/staff"))
    mutate(`/api/staff/${id}`)
  }
  return result
}

export async function deleteStaff(id: string) {
  const result = await apiRequest(`/api/staff/${id}`, "DELETE", undefined, {
    successMessage: "Staff member deleted successfully",
  })
  if (result.success) mutate((key) => typeof key === "string" && key.startsWith("/api/staff"))
  return result
}

export async function createAppointment(data: Record<string, unknown>) {
  const result = await apiRequest("/api/appointments", "POST", data, {
    successMessage: "Appointment created successfully",
  })
  if (result.success) mutate((key) => typeof key === "string" && key.startsWith("/api/appointments"))
  return result
}

export async function updateAppointment(id: string, data: Record<string, unknown>) {
  const result = await apiRequest(`/api/appointments/${id}`, "PUT", data, {
    successMessage: "Appointment updated successfully",
  })
  if (result.success) {
    mutate((key) => typeof key === "string" && key.startsWith("/api/appointments"))
    mutate(`/api/appointments/${id}`)
  }
  return result
}

export async function deleteAppointment(id: string) {
  const result = await apiRequest(`/api/appointments/${id}`, "DELETE", undefined, {
    successMessage: "Appointment cancelled successfully",
  })
  if (result.success) mutate((key) => typeof key === "string" && key.startsWith("/api/appointments"))
  return result
}

export async function createEMR(data: Record<string, unknown>) {
  const result = await apiRequest("/api/emr", "POST", data, {
    successMessage: "Medical record created successfully",
  })
  if (result.success) mutate((key) => typeof key === "string" && key.startsWith("/api/emr"))
  return result
}

export async function updateEMR(id: string, data: Record<string, unknown>) {
  const result = await apiRequest(`/api/emr/${id}`, "PUT", data, {
    successMessage: "Medical record updated successfully",
  })
  if (result.success) {
    mutate((key) => typeof key === "string" && key.startsWith("/api/emr"))
    mutate(`/api/emr/${id}`)
  }
  return result
}

export async function createLabTest(data: Record<string, unknown>) {
  const result = await apiRequest("/api/lab-tests", "POST", data, {
    successMessage: "Lab test created successfully",
  })
  if (result.success) mutate((key) => typeof key === "string" && key.startsWith("/api/lab-tests"))
  return result
}

export async function updateLabTest(id: string, data: Record<string, unknown>) {
  const result = await apiRequest(`/api/lab-tests/${id}`, "PUT", data, {
    successMessage: "Lab test updated successfully",
  })
  if (result.success) {
    mutate((key) => typeof key === "string" && key.startsWith("/api/lab-tests"))
    mutate(`/api/lab-tests/${id}`)
  }
  return result
}

export async function createBill(data: Record<string, unknown>) {
  const result = await apiRequest("/api/billing", "POST", data, {
    successMessage: "Bill created successfully",
  })
  if (result.success) mutate((key) => typeof key === "string" && key.startsWith("/api/billing"))
  return result
}

export async function updateBill(id: string, data: Record<string, unknown>) {
  const result = await apiRequest(`/api/billing/${id}`, "PUT", data, {
    successMessage: "Bill updated successfully",
  })
  if (result.success) {
    mutate((key) => typeof key === "string" && key.startsWith("/api/billing"))
    mutate(`/api/billing/${id}`)
  }
  return result
}

export async function addPayment(billId: string, data: Record<string, unknown>) {
  const result = await apiRequest(`/api/billing/${billId}`, "PATCH", data, {
    successMessage: "Payment added successfully",
  })
  if (result.success) {
    mutate((key) => typeof key === "string" && key.startsWith("/api/billing"))
    mutate(`/api/billing/${billId}`)
  }
  return result
}

export async function createMedication(data: Record<string, unknown>) {
  const result = await apiRequest("/api/pharmacy", "POST", data, {
    successMessage: "Medication created successfully",
  })
  if (result.success) mutate((key) => typeof key === "string" && key.startsWith("/api/pharmacy"))
  return result
}

export async function updateMedication(id: string, data: Record<string, unknown>) {
  const result = await apiRequest(`/api/pharmacy/${id}`, "PUT", data, {
    successMessage: "Medication updated successfully",
  })
  if (result.success) {
    mutate((key) => typeof key === "string" && key.startsWith("/api/pharmacy"))
    mutate(`/api/pharmacy/${id}`)
  }
  return result
}

export async function adjustStock(data: Record<string, unknown>) {
  const result = await apiRequest("/api/pharmacy/stock", "POST", data, {
    successMessage: "Stock adjusted successfully",
  })
  if (result.success) mutate((key) => typeof key === "string" && key.startsWith("/api/pharmacy"))
  return result
}

export async function createPrescription(data: Record<string, unknown>) {
  const result = await apiRequest("/api/prescriptions", "POST", data, {
    successMessage: "Prescription created successfully",
  })
  if (result.success) mutate((key) => typeof key === "string" && key.startsWith("/api/prescriptions"))
  return result
}

export async function dispensePrescription(id: string, data: Record<string, unknown>) {
  const result = await apiRequest(`/api/prescriptions/${id}`, "PATCH", data, {
    successMessage: "Prescription dispensed successfully",
  })
  if (result.success) {
    mutate((key) => typeof key === "string" && key.startsWith("/api/prescriptions"))
    mutate((key) => typeof key === "string" && key.startsWith("/api/pharmacy"))
  }
  return result
}

export async function createRole(data: Record<string, unknown>) {
  const result = await apiRequest("/api/roles", "POST", data, {
    successMessage: "Role created successfully",
  })
  if (result.success) mutate("/api/roles")
  return result
}

export async function updateRole(id: string, data: Record<string, unknown>) {
  const result = await apiRequest(`/api/roles/${id}`, "PUT", data, {
    successMessage: "Role updated successfully",
  })
  if (result.success) {
    mutate("/api/roles")
    mutate(`/api/roles/${id}`)
  }
  return result
}

export async function deleteRole(id: string) {
  const result = await apiRequest(`/api/roles/${id}`, "DELETE", undefined, {
    successMessage: "Role deleted successfully",
  })
  if (result.success) mutate("/api/roles")
  return result
}

export async function sendWhatsApp(data: Record<string, unknown>) {
  return apiRequest("/api/notifications/whatsapp", "POST", data, {
    successMessage: "WhatsApp message sent successfully",
  })
}

export async function sendEmail(data: Record<string, unknown>) {
  return apiRequest("/api/notifications/email", "POST", data, {
    successMessage: "Email sent successfully",
  })
}

export async function requestAIDiagnosis(data: Record<string, unknown>) {
  return apiRequest("/api/ai/diagnose", "POST", data)
}

export async function approveAIDiagnosis(id: string, data: Record<string, unknown>) {
  const result = await apiRequest("/api/ai/approve", "POST", { id, ...data }, {
    successMessage: "AI diagnosis reviewed successfully",
  })
  if (result.success) mutate((key) => typeof key === "string" && key.startsWith("/api/ai/logs"))
  return result
}
