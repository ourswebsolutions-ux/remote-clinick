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
import { adjustStock } from "@/lib/hooks/use-api"
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field"

const stockSchema = z.object({
  type: z.enum(["add", "remove", "set"]),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  reason: z.string().min(1, "Reason is required"),
  notes: z.string().optional(),
})

type StockFormData = z.infer<typeof stockSchema>

interface StockAdjustmentFormProps {
  medication: {
    id: string
    name: string
    stockQuantity: number
  }
  onSuccess: () => void
}

export function StockAdjustmentForm({ medication, onSuccess }: StockAdjustmentFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<StockFormData>({
    resolver: zodResolver(stockSchema),
    defaultValues: {
      type: "add",
      quantity: 1,
      reason: "",
    },
  })

  const type = watch("type")
  const quantity = watch("quantity")

  const newStock = type === "add"
    ? medication.stockQuantity + (quantity || 0)
    : type === "remove"
    ? Math.max(0, medication.stockQuantity - (quantity || 0))
    : quantity || 0

  const onSubmit = async (data: StockFormData) => {
    const result = await adjustStock({
      medicationId: medication.id,
      ...data,
    })
    if (result.success) {
      onSuccess()
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="rounded-lg bg-muted p-4">
        <p className="text-sm text-muted-foreground">Current Stock</p>
        <p className="text-2xl font-bold">{medication.stockQuantity} units</p>
      </div>

      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="type">Adjustment Type *</FieldLabel>
          <Select
            value={watch("type")}
            onValueChange={(value) => setValue("type", value as StockFormData["type"])}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="add">Add Stock</SelectItem>
              <SelectItem value="remove">Remove Stock</SelectItem>
              <SelectItem value="set">Set Stock Level</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Field>
          <FieldLabel htmlFor="quantity">Quantity *</FieldLabel>
          <Input
            id="quantity"
            type="number"
            min={1}
            {...register("quantity", { valueAsNumber: true })}
          />
          {errors.quantity && (
            <p className="text-sm text-destructive">{errors.quantity.message}</p>
          )}
        </Field>

        <Field>
          <FieldLabel htmlFor="reason">Reason *</FieldLabel>
          <Select
            value={watch("reason")}
            onValueChange={(value) => setValue("reason", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select reason" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="restock">Restock / Purchase</SelectItem>
              <SelectItem value="dispensed">Dispensed to Patient</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="damaged">Damaged</SelectItem>
              <SelectItem value="returned">Returned</SelectItem>
              <SelectItem value="correction">Inventory Correction</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
          {errors.reason && (
            <p className="text-sm text-destructive">{errors.reason.message}</p>
          )}
        </Field>

        <Field>
          <FieldLabel htmlFor="notes">Notes</FieldLabel>
          <Textarea
            id="notes"
            {...register("notes")}
            rows={2}
            placeholder="Additional details"
          />
        </Field>

        <div className="rounded-lg bg-primary/10 p-4">
          <p className="text-sm text-muted-foreground">New Stock Level</p>
          <p className="text-2xl font-bold text-primary">{newStock} units</p>
        </div>
      </FieldGroup>

      <div className="flex justify-end gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Spinner className="mr-2 h-4 w-4" />
              Adjusting...
            </>
          ) : (
            "Adjust Stock"
          )}
        </Button>
      </div>
    </form>
  )
}
