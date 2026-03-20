"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { createMedication, updateMedication } from "@/lib/hooks/use-api"
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field"

const medicationSchema = z.object({
  name: z.string().min(1, "Name is required"),
  genericName: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  dosageForm: z.string().min(1, "Dosage form is required"),
  strength: z.string().min(1, "Strength is required"),
  manufacturer: z.string().optional(),
  stockQuantity: z.number().min(0, "Stock must be positive"),
  reorderLevel: z.number().min(0, "Reorder level must be positive"),
  unitPrice: z.number().min(0, "Price must be positive"),
  expiryDate: z.string().optional(),
  status: z.enum(["active", "inactive", "discontinued"]),
})

type MedicationFormData = z.infer<typeof medicationSchema>

const categories = [
  "Antibiotics",
  "Analgesics",
  "Antihistamines",
  "Antidepressants",
  "Antihypertensives",
  "Cardiovascular",
  "Diabetes",
  "Gastrointestinal",
  "Respiratory",
  "Vitamins & Supplements",
  "Other",
]

const dosageForms = [
  "Tablet",
  "Capsule",
  "Syrup",
  "Injection",
  "Cream",
  "Ointment",
  "Drops",
  "Inhaler",
  "Patch",
  "Suppository",
]

interface MedicationFormProps {
  medication?: {
    id: string
    name: string
    genericName: string | null
    category: string
    dosageForm: string
    strength: string
    manufacturer: string | null
    stockQuantity: number
    reorderLevel: number
    unitPrice: number
    expiryDate: string | null
    status: string
  }
  onSuccess: () => void
}

export function MedicationForm({ medication, onSuccess }: MedicationFormProps) {
  const isEditing = !!medication

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<MedicationFormData>({
    resolver: zodResolver(medicationSchema),
    defaultValues: {
      name: medication?.name || "",
      genericName: medication?.genericName || "",
      category: medication?.category || "",
      dosageForm: medication?.dosageForm || "",
      strength: medication?.strength || "",
      manufacturer: medication?.manufacturer || "",
      stockQuantity: medication?.stockQuantity || 0,
      reorderLevel: medication?.reorderLevel || 10,
      unitPrice: medication?.unitPrice || 0,
      expiryDate: medication?.expiryDate ? new Date(medication.expiryDate).toISOString().split("T")[0] : "",
      status: (medication?.status as MedicationFormData["status"]) || "active",
    },
  })

  const onSubmit = async (data: MedicationFormData) => {
    const payload = {
      ...data,
      genericName: data.genericName || null,
      manufacturer: data.manufacturer || null,
      expiryDate: data.expiryDate ? new Date(data.expiryDate).toISOString() : null,
    }

    const result = isEditing
      ? await updateMedication(medication.id, payload)
      : await createMedication(payload)

    if (result.success) {
      onSuccess()
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <FieldGroup>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="name">Medication Name *</FieldLabel>
            <Input id="name" {...register("name")} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </Field>

          <Field>
            <FieldLabel htmlFor="genericName">Generic Name</FieldLabel>
            <Input id="genericName" {...register("genericName")} />
          </Field>

          <Field>
            <FieldLabel htmlFor="category">Category *</FieldLabel>
            <Select
              value={watch("category")}
              onValueChange={(value) => setValue("category", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category && <p className="text-sm text-destructive">{errors.category.message}</p>}
          </Field>

          <Field>
            <FieldLabel htmlFor="dosageForm">Dosage Form *</FieldLabel>
            <Select
              value={watch("dosageForm")}
              onValueChange={(value) => setValue("dosageForm", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select form" />
              </SelectTrigger>
              <SelectContent>
                {dosageForms.map((form) => (
                  <SelectItem key={form} value={form}>{form}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.dosageForm && <p className="text-sm text-destructive">{errors.dosageForm.message}</p>}
          </Field>

          <Field>
            <FieldLabel htmlFor="strength">Strength *</FieldLabel>
            <Input id="strength" {...register("strength")} placeholder="e.g., 500mg" />
            {errors.strength && <p className="text-sm text-destructive">{errors.strength.message}</p>}
          </Field>

          <Field>
            <FieldLabel htmlFor="manufacturer">Manufacturer</FieldLabel>
            <Input id="manufacturer" {...register("manufacturer")} />
          </Field>

          <Field>
            <FieldLabel htmlFor="stockQuantity">Stock Quantity *</FieldLabel>
            <Input
              id="stockQuantity"
              type="number"
              {...register("stockQuantity", { valueAsNumber: true })}
            />
            {errors.stockQuantity && <p className="text-sm text-destructive">{errors.stockQuantity.message}</p>}
          </Field>

          <Field>
            <FieldLabel htmlFor="reorderLevel">Reorder Level *</FieldLabel>
            <Input
              id="reorderLevel"
              type="number"
              {...register("reorderLevel", { valueAsNumber: true })}
            />
            {errors.reorderLevel && <p className="text-sm text-destructive">{errors.reorderLevel.message}</p>}
          </Field>

          <Field>
            <FieldLabel htmlFor="unitPrice">Unit Price ($) *</FieldLabel>
            <Input
              id="unitPrice"
              type="number"
              step="0.01"
              {...register("unitPrice", { valueAsNumber: true })}
            />
            {errors.unitPrice && <p className="text-sm text-destructive">{errors.unitPrice.message}</p>}
          </Field>

          <Field>
            <FieldLabel htmlFor="expiryDate">Expiry Date</FieldLabel>
            <Input id="expiryDate" type="date" {...register("expiryDate")} />
          </Field>

          <Field>
            <FieldLabel htmlFor="status">Status *</FieldLabel>
            <Select
              value={watch("status")}
              onValueChange={(value) => setValue("status", value as MedicationFormData["status"])}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="discontinued">Discontinued</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>
      </FieldGroup>

      <div className="flex justify-end gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Spinner className="mr-2 h-4 w-4" />
              {isEditing ? "Updating..." : "Creating..."}
            </>
          ) : (
            <>{isEditing ? "Update Medication" : "Add Medication"}</>
          )}
        </Button>
      </div>
    </form>
  )
}
