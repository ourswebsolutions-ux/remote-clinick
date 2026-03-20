"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Spinner } from "@/components/ui/spinner"
import { updateLabTest } from "@/lib/hooks/use-api"
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field"

const resultSchema = z.object({
  results: z.string().min(1, "Results are required"),
  notes: z.string().optional(),
})

type ResultFormData = z.infer<typeof resultSchema>

interface LabResultFormProps {
  test: {
    id: string
    testName: string
    notes: string | null
  }
  onSuccess: () => void
}

export function LabResultForm({ test, onSuccess }: LabResultFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResultFormData>({
    resolver: zodResolver(resultSchema),
    defaultValues: {
      results: "",
      notes: test.notes || "",
    },
  })

  const onSubmit = async (data: ResultFormData) => {
    const result = await updateLabTest(test.id, {
      results: data.results,
      notes: data.notes || null,
      status: "completed",
      completedAt: new Date().toISOString(),
    })
    if (result.success) {
      onSuccess()
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="results">Test Results *</FieldLabel>
          <Textarea
            id="results"
            {...register("results")}
            rows={6}
            placeholder="Enter detailed test results..."
          />
          {errors.results && (
            <p className="text-sm text-destructive">{errors.results.message}</p>
          )}
        </Field>

        <Field>
          <FieldLabel htmlFor="notes">Additional Notes</FieldLabel>
          <Textarea
            id="notes"
            {...register("notes")}
            rows={3}
            placeholder="Interpretation, recommendations, etc."
          />
        </Field>
      </FieldGroup>

      <div className="flex justify-end gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Spinner className="mr-2 h-4 w-4" />
              Submitting...
            </>
          ) : (
            "Submit Results"
          )}
        </Button>
      </div>
    </form>
  )
}
