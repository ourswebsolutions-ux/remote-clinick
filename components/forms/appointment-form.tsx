"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { createAppointment, updateAppointment, usePatients, useDoctors } from "@/lib/hooks/use-api"
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field"

const appointmentSchema = z.object({
  patientId: z.string().min(1, "Patient is required"),
  doctorId: z.string().min(1, "Doctor is required"),
  date: z.string().min(1, "Date is required"),
  time: z.string().min(1, "Time is required"),
  duration: z.number().min(15, "Duration must be at least 15 minutes"),
  type: z.enum(["consultation", "follow_up", "procedure", "emergency", "routine_checkup"]),
  notes: z.string().optional(),
})

type AppointmentFormData = z.infer<typeof appointmentSchema>

interface AppointmentFormProps {
  appointment?: {
    id: string
    patient?: { id: string; name: string }
    doctor?: { id: string; name: string }
    dateTime: string
    duration: number
    type: string
    notes: string | null
  }
  onSuccess: () => void
}

export function AppointmentForm({ appointment, onSuccess }: AppointmentFormProps) {
  const isEditing = !!appointment
  const { data: patientsData } = usePatients({ limit: 100 })
  const { data: doctorsData } = useDoctors()

  const appointmentDate = appointment?.dateTime ? new Date(appointment.dateTime) : null

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      patientId: appointment?.patient?.id || "",
      doctorId: appointment?.doctor?.id || "",
      date: appointmentDate ? appointmentDate.toISOString().split("T")[0] : "",
      time: appointmentDate ? appointmentDate.toTimeString().slice(0, 5) : "",
      duration: appointment?.duration || 30,
      type: (appointment?.type as AppointmentFormData["type"]) || "consultation",
      notes: appointment?.notes || "",
    },
  })

  const onSubmit = async (data: AppointmentFormData) => {
    const dateTime = new Date(`${data.date}T${data.time}`).toISOString()
    const payload = {
      patientId: data.patientId,
      doctorId: data.doctorId,
      dateTime,
      duration: data.duration,
      type: data.type,
      notes: data.notes || null,
    }

    const result = isEditing
      ? await updateAppointment(appointment.id, payload)
      : await createAppointment(payload)

    if (result.success) {
      onSuccess()
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <FieldGroup>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="patientId">Patient *</FieldLabel>
            <Select
              value={watch("patientId")}
              onValueChange={(value) => setValue("patientId", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select patient" />
              </SelectTrigger>
              <SelectContent>
                {patientsData?.patients?.map((patient: { id: string; name: string }) => (
                  <SelectItem key={patient.id} value={patient.id}>
                    {patient.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.patientId && (
              <p className="text-sm text-destructive">{errors.patientId.message}</p>
            )}
          </Field>

          <Field>
            <FieldLabel htmlFor="doctorId">Doctor *</FieldLabel>
            <Select
              value={watch("doctorId")}
              onValueChange={(value) => setValue("doctorId", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select doctor" />
              </SelectTrigger>
              <SelectContent>
                {doctorsData?.doctors?.map((doctor: { id: string; name: string; specialization: string }) => (
                  <SelectItem key={doctor.id} value={doctor.id}>
                    Dr. {doctor.name} - {doctor.specialization}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.doctorId && (
              <p className="text-sm text-destructive">{errors.doctorId.message}</p>
            )}
          </Field>

          <Field>
            <FieldLabel htmlFor="date">Date *</FieldLabel>
            <Input id="date" type="date" {...register("date")} />
            {errors.date && (
              <p className="text-sm text-destructive">{errors.date.message}</p>
            )}
          </Field>

          <Field>
            <FieldLabel htmlFor="time">Time *</FieldLabel>
            <Input id="time" type="time" {...register("time")} />
            {errors.time && (
              <p className="text-sm text-destructive">{errors.time.message}</p>
            )}
          </Field>

          <Field>
            <FieldLabel htmlFor="duration">Duration (minutes) *</FieldLabel>
            <Select
              value={watch("duration")?.toString()}
              onValueChange={(value) => setValue("duration", parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select duration" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 minutes</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="45">45 minutes</SelectItem>
                <SelectItem value="60">1 hour</SelectItem>
                <SelectItem value="90">1.5 hours</SelectItem>
                <SelectItem value="120">2 hours</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel htmlFor="type">Appointment Type *</FieldLabel>
            <Select
              value={watch("type")}
              onValueChange={(value) => setValue("type", value as AppointmentFormData["type"])}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="consultation">Consultation</SelectItem>
                <SelectItem value="follow_up">Follow Up</SelectItem>
                <SelectItem value="procedure">Procedure</SelectItem>
                <SelectItem value="emergency">Emergency</SelectItem>
                <SelectItem value="routine_checkup">Routine Checkup</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>

        <Field>
          <FieldLabel htmlFor="notes">Notes</FieldLabel>
          <Textarea
            id="notes"
            {...register("notes")}
            rows={3}
            placeholder="Additional notes or reason for visit"
          />
        </Field>
      </FieldGroup>

      <div className="flex justify-end gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Spinner className="mr-2 h-4 w-4" />
              {isEditing ? "Updating..." : "Scheduling..."}
            </>
          ) : (
            <>{isEditing ? "Update Appointment" : "Schedule Appointment"}</>
          )}
        </Button>
      </div>
    </form>
  )
}
