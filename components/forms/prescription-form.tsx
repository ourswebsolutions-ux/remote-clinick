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
import { toast } from "sonner"
import { Spinner } from "@/components/ui/spinner"

const prescriptionSchema = z.object({
  patientId: z.string().min(1, "Patient is required"),
  doctorId: z.string().min(1, "Doctor is required"),
  medicationId: z.string().min(1, "Medication is required"),
  dosage: z.string().min(1, "Dosage is required"),
  frequency: z.string().min(1, "Frequency is required"),
  duration: z.string().min(1, "Duration is required"),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  refillsAllowed: z.number().min(0).default(0),
  instructions: z.string().optional(),
})

type PrescriptionFormData = z.infer<typeof prescriptionSchema>

interface PrescriptionFormProps {
  patients: any[]
  doctors: any[]
  medications: any[]
  onSuccess: () => void
  onCancel: () => void
}

const frequencies = [
  "Once daily",
  "Twice daily",
  "Three times daily",
  "Four times daily",
  "Every 4 hours",
  "Every 6 hours",
  "Every 8 hours",
  "Every 12 hours",
  "As needed",
  "At bedtime",
  "Before meals",
  "After meals",
  "With meals",
]

const durations = [
  "3 days",
  "5 days",
  "7 days",
  "10 days",
  "14 days",
  "21 days",
  "30 days",
  "60 days",
  "90 days",
  "Ongoing",
]

export function PrescriptionForm({
  patients,
  doctors,
  medications,
  onSuccess,
  onCancel,
}: PrescriptionFormProps) {
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PrescriptionFormData>({
    resolver: zodResolver(prescriptionSchema),
    defaultValues: {
      patientId: "",
      doctorId: "",
      medicationId: "",
      dosage: "",
      frequency: "",
      duration: "",
      quantity: 1,
      refillsAllowed: 0,
      instructions: "",
    },
  })

  const selectedMedication = medications.find(
    (m: any) => m.id === watch("medicationId")
  )

  const onSubmit = async (data: PrescriptionFormData) => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/prescriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to create prescription")
      }

      toast.success("Prescription created successfully")
      onSuccess()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
                  {patient.user?.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.patientId && (
            <p className="text-sm text-destructive">{errors.patientId.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="doctorId">Prescriber *</Label>
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
        <Label htmlFor="medicationId">Medication *</Label>
        <Select
          value={watch("medicationId")}
          onValueChange={(value) => setValue("medicationId", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select medication" />
          </SelectTrigger>
          <SelectContent>
            {medications.map((medication) => (
              <SelectItem key={medication.id} value={medication.id}>
                {medication.name} ({medication.dosageForm}) - {medication.strength}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.medicationId && (
          <p className="text-sm text-destructive">{errors.medicationId.message}</p>
        )}
        {selectedMedication && (
          <p className="text-sm text-muted-foreground">
            Generic: {selectedMedication.genericName} | Stock: {selectedMedication.stockQuantity}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="dosage">Dosage *</Label>
          <Input
            {...register("dosage")}
            placeholder="e.g., 500mg"
          />
          {errors.dosage && (
            <p className="text-sm text-destructive">{errors.dosage.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="frequency">Frequency *</Label>
          <Select
            value={watch("frequency")}
            onValueChange={(value) => setValue("frequency", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select frequency" />
            </SelectTrigger>
            <SelectContent>
              {frequencies.map((freq) => (
                <SelectItem key={freq} value={freq}>
                  {freq}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.frequency && (
            <p className="text-sm text-destructive">{errors.frequency.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="duration">Duration *</Label>
          <Select
            value={watch("duration")}
            onValueChange={(value) => setValue("duration", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select duration" />
            </SelectTrigger>
            <SelectContent>
              {durations.map((dur) => (
                <SelectItem key={dur} value={dur}>
                  {dur}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.duration && (
            <p className="text-sm text-destructive">{errors.duration.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="quantity">Quantity *</Label>
          <Input
            type="number"
            {...register("quantity", { valueAsNumber: true })}
            min={1}
          />
          {errors.quantity && (
            <p className="text-sm text-destructive">{errors.quantity.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="refillsAllowed">Refills Allowed</Label>
          <Input
            type="number"
            {...register("refillsAllowed", { valueAsNumber: true })}
            min={0}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="instructions">Special Instructions</Label>
        <Textarea
          {...register("instructions")}
          placeholder="Any special instructions for the patient..."
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Spinner className="mr-2 h-4 w-4" />}
          Create Prescription
        </Button>
      </div>
    </form>
  )
}
