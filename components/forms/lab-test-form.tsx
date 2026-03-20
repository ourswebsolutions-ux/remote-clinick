"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { createLabTest, usePatients, useDoctors } from "@/lib/hooks/use-api"
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field"

const labTestSchema = z.object({
  patientId: z.string().min(1, "Patient is required"),
  doctorId: z.string().min(1, "Doctor is required"),
  testName: z.string().min(1, "Test name is required"),
  testCode: z.string().min(1, "Test code is required"),
  priority: z.enum(["routine", "urgent", "stat"]),
  notes: z.string().optional(),
})

type LabTestFormData = z.infer<typeof labTestSchema>

const commonTests = [
  { name: "Complete Blood Count (CBC)", code: "CBC001" },
  { name: "Basic Metabolic Panel", code: "BMP001" },
  { name: "Comprehensive Metabolic Panel", code: "CMP001" },
  { name: "Lipid Panel", code: "LIP001" },
  { name: "Thyroid Function Test", code: "TFT001" },
  { name: "Liver Function Test", code: "LFT001" },
  { name: "Urinalysis", code: "UA001" },
  { name: "Hemoglobin A1C", code: "HBA1C001" },
  { name: "Blood Glucose", code: "GLU001" },
  { name: "Electrolytes Panel", code: "ELEC001" },
]

interface LabTestFormProps {
  onSuccess: () => void
}

export function LabTestForm({ onSuccess }: LabTestFormProps) {
  const { data: patientsData } = usePatients({ limit: 100 })
  const { data: doctorsData } = useDoctors()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<LabTestFormData>({
    resolver: zodResolver(labTestSchema),
    defaultValues: {
      patientId: "",
      doctorId: "",
      testName: "",
      testCode: "",
      priority: "routine",
    },
  })

  const handleTestSelect = (testName: string) => {
    const test = commonTests.find(t => t.name === testName)
    if (test) {
      setValue("testName", test.name)
      setValue("testCode", test.code)
    }
  }

  const onSubmit = async (data: LabTestFormData) => {
    const result = await createLabTest({
      ...data,
      notes: data.notes || null,
    })
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
            <FieldLabel htmlFor="doctorId">Ordering Doctor *</FieldLabel>
            <Select
              value={watch("doctorId")}
              onValueChange={(value) => setValue("doctorId", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select doctor" />
              </SelectTrigger>
              <SelectContent>
                {doctorsData?.doctors?.map((doctor: { id: string; name: string }) => (
                  <SelectItem key={doctor.id} value={doctor.id}>
                    Dr. {doctor.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.doctorId && (
              <p className="text-sm text-destructive">{errors.doctorId.message}</p>
            )}
          </Field>

          <Field className="sm:col-span-2">
            <FieldLabel htmlFor="testName">Test *</FieldLabel>
            <Select
              value={watch("testName")}
              onValueChange={handleTestSelect}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select test" />
              </SelectTrigger>
              <SelectContent>
                {commonTests.map((test) => (
                  <SelectItem key={test.code} value={test.name}>
                    {test.name} ({test.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.testName && (
              <p className="text-sm text-destructive">{errors.testName.message}</p>
            )}
          </Field>

          <Field>
            <FieldLabel htmlFor="priority">Priority *</FieldLabel>
            <Select
              value={watch("priority")}
              onValueChange={(value) => setValue("priority", value as LabTestFormData["priority"])}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="routine">Routine</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="stat">STAT (Immediate)</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>

        <Field>
          <FieldLabel htmlFor="notes">Clinical Notes</FieldLabel>
          <Textarea
            id="notes"
            {...register("notes")}
            rows={3}
            placeholder="Relevant clinical information, reason for test, etc."
          />
        </Field>
      </FieldGroup>

      <div className="flex justify-end gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Spinner className="mr-2 h-4 w-4" />
              Ordering...
            </>
          ) : (
            "Order Test"
          )}
        </Button>
      </div>
    </form>
  )
}
