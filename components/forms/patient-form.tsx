"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { createPatient, updatePatient } from "@/lib/hooks/use-api"
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field"

// Maps for Prisma enums
const GENDER_MAP: Record<string, "MALE" | "FEMALE" | "OTHER"> = {
  male: "MALE",
  female: "FEMALE",
  other: "OTHER",
}
const BLOOD_GROUP_MAP: Record<string, string> = {
  "A+": "A_POSITIVE",
  "A-": "A_NEGATIVE",
  "B+": "B_POSITIVE",
  "B-": "B_NEGATIVE",
  "AB+": "AB_POSITIVE",
  "AB-": "AB_NEGATIVE",
  "O+": "O_POSITIVE",
  "O-": "O_NEGATIVE",
}

// ---------------------------
// Form validation schema
// ---------------------------
const patientSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  gender: z.enum(["male", "female", "other"]),
  bloodGroup: z.string().optional(),
  address: z.string().optional(),
  cnic: z.string().optional(),
  alternatePhone: z.string().optional(),
  photo: z.string().optional(),
  allergies: z.string().optional(),
  emergencyName: z.string().optional(),
  emergencyPhone: z.string().optional(),
  emergencyRelation: z.string().optional(),
  medicalHistory: z.string().optional(),
  insuranceProvider: z.string().optional(),
  insuranceNumber: z.string().optional(),
  notes: z.string().optional(),
})

type PatientFormData = z.infer<typeof patientSchema> & {
  appointments?: any[]
  emrRecords?: any[]
  labTests?: any[]
  billings?: any[]
  prescriptions?: any[]
}

interface PatientFormProps {
  patient?: Partial<PatientFormData> & { id: string }
  onSuccess: () => void
}

export function PatientForm({ patient, onSuccess }: PatientFormProps) {
  const isEditing = !!patient

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } =
    useForm<PatientFormData>({
      resolver: zodResolver(patientSchema),
      defaultValues: {
        name: patient?.name || "",
        email: patient?.email || "",
        phone: patient?.phone || "",
        dateOfBirth: patient?.dateOfBirth
          ? new Date(patient.dateOfBirth).toISOString().split("T")[0]
          : "",
        gender: (patient?.gender?.toLowerCase() as "male" | "female" | "other") || "male",
        bloodGroup: patient?.bloodGroup || "",
        address: patient?.address || "",
        cnic: patient?.cnic || "",
        alternatePhone: patient?.alternatePhone || "",
        photo: patient?.photo || "",
        allergies: patient?.allergies || "",
        emergencyName: patient?.emergencyName || "",
        emergencyPhone: patient?.emergencyPhone || "",
        emergencyRelation: patient?.emergencyRelation || "",
        medicalHistory: patient?.medicalHistory || "",
        insuranceProvider: patient?.insuranceProvider || "",
        insuranceNumber: patient?.insuranceNumber || "",
        notes: patient?.notes || "",
        appointments: patient?.appointments || [],
        emrRecords: patient?.emrRecords || [],
        labTests: patient?.labTests || [],
        billings: patient?.billings || [],
        prescriptions: patient?.prescriptions || [],
      },
    })

  // Split full name into first and last
  const splitName = (fullName: string) => {
    const parts = fullName.trim().split(" ")
    return { firstName: parts[0] || "", lastName: parts.slice(1).join(" ") || "" }
  }

  const onSubmit = async (data: PatientFormData) => {
    const { firstName, lastName } = splitName(data.name)

    const payload = {
      firstName,
      lastName,
      email: data.email || null,
      phone: data.phone || null,
      dateOfBirth: new Date(data.dateOfBirth).toISOString(),
      gender: GENDER_MAP[data.gender],
      bloodGroup: data.bloodGroup ? BLOOD_GROUP_MAP[data.bloodGroup] : null,
      address: data.address || null,
      cnic: data.cnic || null,
      alternatePhone: data.alternatePhone || null,
      photo: data.photo || null,
      allergies: data.allergies || null,
      emergencyName: data.emergencyName || null,
      emergencyPhone: data.emergencyPhone || null,
      emergencyRelation: data.emergencyRelation || null,
      medicalHistory: data.medicalHistory || null,
      insuranceProvider: data.insuranceProvider || null,
      insuranceNumber: data.insuranceNumber || null,
      notes: data.notes || null,

      // relational arrays
      appointments: data.appointments?.length ? { create: data.appointments } : { create: [] },
      emrRecords: data.emrRecords?.length ? { create: data.emrRecords } : { create: [] },
      labTests: data.labTests?.length ? { create: data.labTests } : { create: [] },
      billings: data.billings?.length ? { create: data.billings } : { create: [] },
      prescriptions: data.prescriptions?.length ? { create: data.prescriptions } : { create: [] },
    }

    const result = isEditing
      ? await updatePatient(patient.id, payload)
      : await createPatient(payload)

    if (result.success) onSuccess()
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
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input id="email" type="email" {...register("email")} />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </Field>

          <Field>
            <FieldLabel htmlFor="phone">Phone Number *</FieldLabel>
            <Input id="phone" {...register("phone")} aria-invalid={!!errors.phone} />
            {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
          </Field>

          <Field>
            <FieldLabel htmlFor="dateOfBirth">Date of Birth *</FieldLabel>
            <Input id="dateOfBirth" type="date" {...register("dateOfBirth")} />
            {errors.dateOfBirth && (
              <p className="text-sm text-destructive">{errors.dateOfBirth.message}</p>
            )}
          </Field>

          <Field>
            <FieldLabel htmlFor="gender">Gender *</FieldLabel>
            <Select
              value={watch("gender")}
              onValueChange={(value) => setValue("gender", value as "male" | "female" | "other")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel htmlFor="bloodGroup">Blood Group</FieldLabel>
            <Select
              value={watch("bloodGroup") || ""}
              onValueChange={(value) => setValue("bloodGroup", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select blood group" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="A+">A+</SelectItem>
                <SelectItem value="A-">A-</SelectItem>
                <SelectItem value="B+">B+</SelectItem>
                <SelectItem value="B-">B-</SelectItem>
                <SelectItem value="AB+">AB+</SelectItem>
                <SelectItem value="AB-">AB-</SelectItem>
                <SelectItem value="O+">O+</SelectItem>
                <SelectItem value="O-">O-</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>

        <Field>
          <FieldLabel htmlFor="address">Address</FieldLabel>
          <Textarea id="address" {...register("address")} rows={2} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="emergencyName">Emergency Contact Name</FieldLabel>
            <Input id="emergencyName" {...register("emergencyName")} />
          </Field>

          <Field>
            <FieldLabel htmlFor="emergencyPhone">Emergency Contact Phone</FieldLabel>
            <Input id="emergencyPhone" {...register("emergencyPhone")} />
          </Field>
        </div>

        <Field>
          <FieldLabel htmlFor="emergencyRelation">Emergency Relation</FieldLabel>
          <Input id="emergencyRelation" {...register("emergencyRelation")} />
        </Field>

        <Field>
          <FieldLabel htmlFor="cnic">CNIC</FieldLabel>
          <Input id="cnic" {...register("cnic")} />
        </Field>

        <Field>
          <FieldLabel htmlFor="alternatePhone">Alternate Phone</FieldLabel>
          <Input id="alternatePhone" {...register("alternatePhone")} />
        </Field>

        <Field>
          <FieldLabel htmlFor="photo">Photo URL</FieldLabel>
          <Input id="photo" {...register("photo")} />
        </Field>

        <Field>
          <FieldLabel htmlFor="medicalHistory">Medical History</FieldLabel>
          <Textarea
            id="medicalHistory"
            {...register("medicalHistory")}
            rows={3}
            placeholder="Previous conditions, surgeries, etc."
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="allergies">Allergies</FieldLabel>
          <Textarea
            id="allergies"
            {...register("allergies")}
            rows={2}
            placeholder="Known allergies"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="insuranceProvider">Insurance Provider</FieldLabel>
            <Input id="insuranceProvider" {...register("insuranceProvider")} />
          </Field>

          <Field>
            <FieldLabel htmlFor="insuranceNumber">Insurance Number</FieldLabel>
            <Input id="insuranceNumber" {...register("insuranceNumber")} />
          </Field>
        </div>

        <Field>
          <FieldLabel htmlFor="notes">Notes</FieldLabel>
          <Textarea id="notes" {...register("notes")} rows={2} />
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
            <>{isEditing ? "Update Patient" : "Create Patient"}</>
          )}
        </Button>
      </div>
    </form>
  )
}