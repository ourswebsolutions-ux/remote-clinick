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
import { addPayment } from "@/lib/hooks/use-api"
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field"

const paymentSchema = z.object({
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  paymentMethod: z.enum(["cash", "card", "bank_transfer", "insurance", "other"]),
  transactionId: z.string().optional(),
  notes: z.string().optional(),
})

type PaymentFormData = z.infer<typeof paymentSchema>

interface PaymentFormProps {
  bill: {
    id: string
    invoiceNumber: string
    balanceAmount: number
  }
  onSuccess: () => void
}

export function PaymentForm({ bill, onSuccess }: PaymentFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: bill.balanceAmount,
      paymentMethod: "cash",
    },
  })

  const onSubmit = async (data: PaymentFormData) => {
    const result = await addPayment(bill.id, {
      action: "add_payment",
      ...data,
    })
    if (result.success) {
      onSuccess()
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="rounded-lg bg-muted p-4">
        <p className="text-sm text-muted-foreground">Balance Due</p>
        <p className="text-2xl font-bold">${bill.balanceAmount.toFixed(2)}</p>
      </div>

      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="amount">Payment Amount *</FieldLabel>
          <Input
            id="amount"
            type="number"
            step="0.01"
            max={bill.balanceAmount}
            {...register("amount", { valueAsNumber: true })}
          />
          {errors.amount && (
            <p className="text-sm text-destructive">{errors.amount.message}</p>
          )}
        </Field>

        <Field>
          <FieldLabel htmlFor="paymentMethod">Payment Method *</FieldLabel>
          <Select
            value={watch("paymentMethod")}
            onValueChange={(value) => setValue("paymentMethod", value as PaymentFormData["paymentMethod"])}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cash">Cash</SelectItem>
              <SelectItem value="card">Card</SelectItem>
              <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
              <SelectItem value="insurance">Insurance</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Field>
          <FieldLabel htmlFor="transactionId">Transaction ID</FieldLabel>
          <Input
            id="transactionId"
            {...register("transactionId")}
            placeholder="Optional reference number"
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="notes">Notes</FieldLabel>
          <Textarea
            id="notes"
            {...register("notes")}
            rows={2}
            placeholder="Additional notes"
          />
        </Field>
      </FieldGroup>

      <div className="flex justify-end gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Spinner className="mr-2 h-4 w-4" />
              Processing...
            </>
          ) : (
            "Record Payment"
          )}
        </Button>
      </div>
    </form>
  )
}
