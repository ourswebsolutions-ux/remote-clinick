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
import { createDoctor, updateDoctor } from "@/lib/hooks/use-api"
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field"

const doctorSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  specialization: z.string().min(1, "Specialization is required"),
  licenseNumber: z.string().min(1, "License number is required"),
  consultationFee: z.number().min(0, "Fee must be positive"),
  qualifications: z.string().optional(),
  experience: z.number().min(0).optional(),
  bio: z.string().optional(),
  status: z.enum(["active", "inactive", "on_leave"]),
})

type DoctorFormData = z.infer<typeof doctorSchema>

interface DoctorFormProps {
  doctor?: {
    id: string
    name: string
    email: string
    phone: string
    specialization: string
    licenseNumber: string
    consultationFee: number
    qualifications?: string | null
    experience?: number | null
    bio?: string | null
    status: string
  }
  onSuccess: () => void
}

const specializations = [
  "General Practice",
  "Cardiology",
  "Dermatology",
  "Endocrinology",
  "Gastroenterology",
  "Neurology",
  "Oncology",
  "Ophthalmology",
  "Orthopedics",
  "Pediatrics",
  "Psychiatry",
  "Pulmonology",
  "Radiology",
  "Urology",
]

export function DoctorForm({ doctor, onSuccess }: DoctorFormProps) {
  const isEditing = !!doctor

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<DoctorFormData>({
    resolver: zodResolver(doctorSchema),
    defaultValues: {
      name: doctor?.name || "",
      email: doctor?.email || "",
      phone: doctor?.phone || "",
      specialization: doctor?.specialization || "",
      licenseNumber: doctor?.licenseNumber || "",
      consultationFee: doctor?.consultationFee || 100,
      qualifications: doctor?.qualifications || "",
      experience: doctor?.experience || 0,
      bio: doctor?.bio || "",
      status: (doctor?.status as DoctorFormData["status"]) || "active",
    },
  })

  const onSubmit = async (data: DoctorFormData) => {
    const result = isEditing
      ? await updateDoctor(doctor.id, data)
      : await createDoctor(data)

    if (result.success) {
      onSuccess()
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <FieldGroup>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="name">Full Name *</FieldLabel>
            <Input id="name" {...register("name")} aria-invalid={!!errors.name} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </Field>

          <Field>
            <FieldLabel htmlFor="email">Email *</FieldLabel>
            <Input id="email" type="email" {...register("email")} />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </Field>

          <Field>
            <FieldLabel htmlFor="phone">Phone Number *</FieldLabel>
            <Input id="phone" {...register("phone")} aria-invalid={!!errors.phone} />
            {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
          </Field>

          <Field>
            <FieldLabel htmlFor="specialization">Specialization *</FieldLabel>
            <Select
              value={watch("specialization")}
              onValueChange={(value) => setValue("specialization", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select specialization" />
              </SelectTrigger>
              <SelectContent>
                {specializations.map((spec) => (
                  <SelectItem key={spec} value={spec}>
                    {spec}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.specialization && (
              <p className="text-sm text-destructive">{errors.specialization.message}</p>
            )}
          </Field>

          <Field>
            <FieldLabel htmlFor="licenseNumber">License Number *</FieldLabel>
            <Input id="licenseNumber" {...register("licenseNumber")} />
            {errors.licenseNumber && (
              <p className="text-sm text-destructive">{errors.licenseNumber.message}</p>
            )}
          </Field>

          <Field>
            <FieldLabel htmlFor="consultationFee">Consultation Fee ($) *</FieldLabel>
            <Input
              id="consultationFee"
              type="number"
              {...register("consultationFee", { valueAsNumber: true })}
            />
            {errors.consultationFee && (
              <p className="text-sm text-destructive">{errors.consultationFee.message}</p>
            )}
          </Field>

          <Field>
            <FieldLabel htmlFor="experience">Experience (years)</FieldLabel>
            <Input
              id="experience"
              type="number"
              {...register("experience", { valueAsNumber: true })}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="status">Status *</FieldLabel>
            <Select
              value={watch("status")}
              onValueChange={(value) => setValue("status", value as DoctorFormData["status"])}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="on_leave">On Leave</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>

        <Field>
          <FieldLabel htmlFor="qualifications">Qualifications</FieldLabel>
          <Input id="qualifications" {...register("qualifications")} placeholder="e.g., MD, MBBS, PhD" />
        </Field>

        <Field>
          <FieldLabel htmlFor="bio">Bio</FieldLabel>
          <Textarea
            id="bio"
            {...register("bio")}
            rows={3}
            placeholder="Brief professional biography"
          />
        </Field>
      </FieldGroup>

      <div className="flex justify-end gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Spinner className="mr-2 h-4 w-4" />
              {isEditing ? "Updating..." : "Creating..."}
            </>
          ) : (
            <>{isEditing ? "Update Doctor" : "Add Doctor"}</>
          )}
        </Button>
      </div>
    </form>
  )
}
