"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { Spinner } from "@/components/ui/spinner"

const emrSchema = z.object({
  patientId: z.string().min(1, "Patient is required"),
  doctorId: z.string().min(1, "Doctor is required"),
  visitDate: z.string().min(1, "Visit date is required"),
  chiefComplaint: z.string().min(1, "Chief complaint is required"),
  historyOfPresentIllness: z.string().optional(),
  physicalExamination: z.string().optional(),
  diagnosis: z.string().optional(),
  assessment: z.string().optional(),
  treatmentPlan: z.string().optional(),
  followUpInstructions: z.string().optional(),
  vitalSigns: z.object({
    bloodPressure: z.string().optional(),
    heartRate: z.string().optional(),
    temperature: z.string().optional(),
    respiratoryRate: z.string().optional(),
    oxygenSaturation: z.string().optional(),
    weight: z.string().optional(),
    height: z.string().optional(),
  }).optional(),
})

type EMRFormData = z.infer<typeof emrSchema>

interface EMRFormProps {
  record?: any
  patients: any[]
  doctors: any[]
  onSuccess: () => void
  onCancel: () => void
}

export function EMRForm({ record, patients, doctors, onSuccess, onCancel }: EMRFormProps) {
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EMRFormData>({
    resolver: zodResolver(emrSchema),
    defaultValues: {
      patientId: record?.patientId || "",
      doctorId: record?.doctorId || "",
      visitDate: record?.visitDate ? new Date(record.visitDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
      chiefComplaint: record?.chiefComplaint || "",
      historyOfPresentIllness: record?.historyOfPresentIllness || "",
      physicalExamination: record?.physicalExamination || "",
      diagnosis: record?.diagnosis || "",
      assessment: record?.assessment || "",
      treatmentPlan: record?.treatmentPlan || "",
      followUpInstructions: record?.followUpInstructions || "",
      vitalSigns: record?.vitalSigns || {},
    },
  })

  const onSubmit = async (data: EMRFormData) => {
    setIsLoading(true)
    try {
      const url = record ? `/api/emr/${record.id}` : "/api/emr"
      const method = record ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to save record")
      }

      toast.success(record ? "Record updated successfully" : "Record created successfully")
      onSuccess()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="vitals">Vital Signs</TabsTrigger>
          <TabsTrigger value="examination">Examination</TabsTrigger>
          <TabsTrigger value="treatment">Treatment</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="patientId">Patient *</Label>
              <Select
                value={watch("patientId")}
                onValueChange={(value) => setValue("patientId", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select patient" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((patient) => (
                    <SelectItem key={patient.id} value={patient.id}>
                      {patient.user?.name} ({patient.medicalRecordNumber})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.patientId && (
                <p className="text-sm text-destructive">{errors.patientId.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="doctorId">Doctor *</Label>
              <Select
                value={watch("doctorId")}
                onValueChange={(value) => setValue("doctorId", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select doctor" />
                </SelectTrigger>
                <SelectContent>
                  {doctors.map((doctor) => (
                    <SelectItem key={doctor.id} value={doctor.id}>
                      Dr. {doctor.user?.name} - {doctor.specialization}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.doctorId && (
                <p className="text-sm text-destructive">{errors.doctorId.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="visitDate">Visit Date *</Label>
            <Input type="date" {...register("visitDate")} />
            {errors.visitDate && (
              <p className="text-sm text-destructive">{errors.visitDate.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="chiefComplaint">Chief Complaint *</Label>
            <Textarea
              {...register("chiefComplaint")}
              placeholder="Primary reason for visit"
              rows={3}
            />
            {errors.chiefComplaint && (
              <p className="text-sm text-destructive">{errors.chiefComplaint.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="historyOfPresentIllness">History of Present Illness</Label>
            <Textarea
              {...register("historyOfPresentIllness")}
              placeholder="Detailed history of the current illness"
              rows={4}
            />
          </div>
        </TabsContent>

        <TabsContent value="vitals" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bloodPressure">Blood Pressure</Label>
              <Input
                {...register("vitalSigns.bloodPressure")}
                placeholder="e.g., 120/80"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="heartRate">Heart Rate (bpm)</Label>
              <Input
                {...register("vitalSigns.heartRate")}
                placeholder="e.g., 72"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="temperature">Temperature (F)</Label>
              <Input
                {...register("vitalSigns.temperature")}
                placeholder="e.g., 98.6"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="respiratoryRate">Respiratory Rate</Label>
              <Input
                {...register("vitalSigns.respiratoryRate")}
                placeholder="e.g., 16"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="oxygenSaturation">O2 Saturation (%)</Label>
              <Input
                {...register("vitalSigns.oxygenSaturation")}
                placeholder="e.g., 98"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="weight">Weight (kg)</Label>
              <Input
                {...register("vitalSigns.weight")}
                placeholder="e.g., 70"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="height">Height (cm)</Label>
              <Input
                {...register("vitalSigns.height")}
                placeholder="e.g., 175"
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="examination" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="physicalExamination">Physical Examination</Label>
            <Textarea
              {...register("physicalExamination")}
              placeholder="Findings from physical examination"
              rows={6}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="diagnosis">Diagnosis</Label>
            <Textarea
              {...register("diagnosis")}
              placeholder="Primary and secondary diagnoses"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="assessment">Assessment</Label>
            <Textarea
              {...register("assessment")}
              placeholder="Clinical assessment and evaluation"
              rows={4}
            />
          </div>
        </TabsContent>

        <TabsContent value="treatment" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="treatmentPlan">Treatment Plan</Label>
            <Textarea
              {...register("treatmentPlan")}
              placeholder="Proposed treatment and interventions"
              rows={5}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="followUpInstructions">Follow-up Instructions</Label>
            <Textarea
              {...register("followUpInstructions")}
              placeholder="Instructions for patient follow-up"
              rows={4}
            />
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Spinner className="mr-2 h-4 w-4" />}
          {record ? "Update Record" : "Create Record"}
        </Button>
      </div>
    </form>
  )
}
