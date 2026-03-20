"use client"

import { useForm, useFieldArray } from "react-hook-form"
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
import { createBill, usePatients } from "@/lib/hooks/use-api"
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field"
import { Plus, Trash2 } from "lucide-react"

const billItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  unitPrice: z.number().min(0, "Price must be positive"),
})

const billingSchema = z.object({
  patientId: z.string().min(1, "Patient is required"),
  dueDate: z.string().min(1, "Due date is required"),
  items: z.array(billItemSchema).min(1, "At least one item is required"),
  notes: z.string().optional(),
  discount: z.number().min(0).optional(),
  tax: z.number().min(0).optional(),
})

type BillingFormData = z.infer<typeof billingSchema>

interface BillingFormProps {
  onSuccess: () => void
}

export function BillingForm({ onSuccess }: BillingFormProps) {
  const { data: patientsData } = usePatients({ limit: 100 })

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<BillingFormData>({
    resolver: zodResolver(billingSchema),
    defaultValues: {
      patientId: "",
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      items: [{ description: "", quantity: 1, unitPrice: 0 }],
      discount: 0,
      tax: 0,
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  })

  const items = watch("items")
  const discount = watch("discount") || 0
  const tax = watch("tax") || 0

  const subtotal = items.reduce((sum, item) => sum + (item.quantity || 0) * (item.unitPrice || 0), 0)
  const taxAmount = (subtotal - discount) * (tax / 100)
  const total = subtotal - discount + taxAmount

  const onSubmit = async (data: BillingFormData) => {
    const payload = {
      patientId: data.patientId,
      dueDate: new Date(data.dueDate).toISOString(),
      items: data.items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        amount: item.quantity * item.unitPrice,
      })),
      discount: data.discount || 0,
      tax: data.tax || 0,
      notes: data.notes || null,
    }

    const result = await createBill(payload)
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
            <FieldLabel htmlFor="dueDate">Due Date *</FieldLabel>
            <Input id="dueDate" type="date" {...register("dueDate")} />
            {errors.dueDate && (
              <p className="text-sm text-destructive">{errors.dueDate.message}</p>
            )}
          </Field>
        </div>

        {/* Invoice Items */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <FieldLabel>Invoice Items *</FieldLabel>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ description: "", quantity: 1, unitPrice: 0 })}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Item
            </Button>
          </div>

          <div className="space-y-3">
            {fields.map((field, index) => (
              <div key={field.id} className="grid gap-3 sm:grid-cols-12 items-end">
                <div className="sm:col-span-5">
                  <Input
                    placeholder="Description"
                    {...register(`items.${index}.description`)}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Input
                    type="number"
                    placeholder="Qty"
                    {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                  />
                </div>
                <div className="sm:col-span-3">
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Price"
                    {...register(`items.${index}.unitPrice`, { valueAsNumber: true })}
                  />
                </div>
                <div className="sm:col-span-2 flex items-center gap-2">
                  <span className="text-sm font-medium">
                    ${((items[index]?.quantity || 0) * (items[index]?.unitPrice || 0)).toFixed(2)}
                  </span>
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
          {errors.items && (
            <p className="text-sm text-destructive">{errors.items.message}</p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="discount">Discount ($)</FieldLabel>
            <Input
              id="discount"
              type="number"
              step="0.01"
              {...register("discount", { valueAsNumber: true })}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="tax">Tax (%)</FieldLabel>
            <Input
              id="tax"
              type="number"
              step="0.01"
              {...register("tax", { valueAsNumber: true })}
            />
          </Field>
        </div>

        {/* Totals */}
        <div className="rounded-lg bg-muted p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span>Subtotal</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Discount</span>
              <span>-${discount.toFixed(2)}</span>
            </div>
          )}
          {tax > 0 && (
            <div className="flex justify-between text-sm">
              <span>Tax ({tax}%)</span>
              <span>${taxAmount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-lg border-t pt-2">
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </div>
        </div>
      </FieldGroup>

      <div className="flex justify-end gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Spinner className="mr-2 h-4 w-4" />
              Creating...
            </>
          ) : (
            "Create Invoice"
          )}
        </Button>
      </div>
    </form>
  )
}
