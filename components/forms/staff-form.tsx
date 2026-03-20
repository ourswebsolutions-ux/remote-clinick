"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { Spinner } from "@/components/ui/spinner"

const staffSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
  employeeId: z.string().min(1, "Employee ID is required"),
  department: z.string().min(1, "Department is required"),
  position: z.string().min(1, "Position is required"),
  hireDate: z.string().min(1, "Hire date is required"),
  salary: z.number().optional(),
  isActive: z.boolean().default(true),
})

type StaffFormData = z.infer<typeof staffSchema>

interface StaffFormProps {
  staff?: any
  onSuccess: () => void
  onCancel: () => void
}

const departments = [
  "Reception",
  "Nursing",
  "Laboratory",
  "Radiology",
  "Pharmacy",
  "Administration",
  "Billing",
  "IT",
  "Maintenance",
  "Security",
]

export function StaffForm({ staff, onSuccess, onCancel }: StaffFormProps) {
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<StaffFormData>({
    resolver: zodResolver(staffSchema),
    defaultValues: {
      name: staff?.user?.name || "",
      email: staff?.user?.email || "",
      phone: staff?.user?.phone || "",
      password: "",
      employeeId: staff?.employeeId || "",
      department: staff?.department || "",
      position: staff?.position || "",
      hireDate: staff?.hireDate ? new Date(staff.hireDate).toISOString().split("T")[0] : "",
      salary: staff?.salary || undefined,
      isActive: staff?.user?.isActive ?? true,
    },
  })

  const onSubmit = async (data: StaffFormData) => {
    setIsLoading(true)
    try {
      const url = staff ? `/api/staff/${staff.id}` : "/api/staff"
      const method = staff ? "PUT" : "POST"

      // Don't send empty password on update
      if (staff && !data.password) {
        delete data.password
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to save staff member")
      }

      toast.success(staff ? "Staff updated successfully" : "Staff created successfully")
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
          <Label htmlFor="name">Full Name *</Label>
          <Input {...register("name")} placeholder="Enter full name" />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email *</Label>
          <Input type="email" {...register("email")} placeholder="Enter email" />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input {...register("phone")} placeholder="Enter phone number" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">
            {staff ? "New Password (leave blank to keep)" : "Password *"}
          </Label>
          <Input
            type="password"
            {...register("password")}
            placeholder={staff ? "Leave blank to keep current" : "Enter password"}
          />
          {errors.password && (
            <p className="text-sm text-destructive">{errors.password.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="employeeId">Employee ID *</Label>
          <Input {...register("employeeId")} placeholder="e.g., EMP-001" />
          {errors.employeeId && (
            <p className="text-sm text-destructive">{errors.employeeId.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="department">Department *</Label>
          <Select
            value={watch("department")}
            onValueChange={(value) => setValue("department", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select department" />
            </SelectTrigger>
            <SelectContent>
              {departments.map((dept) => (
                <SelectItem key={dept} value={dept}>
                  {dept}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.department && (
            <p className="text-sm text-destructive">{errors.department.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="position">Position *</Label>
          <Input {...register("position")} placeholder="e.g., Receptionist" />
          {errors.position && (
            <p className="text-sm text-destructive">{errors.position.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="hireDate">Hire Date *</Label>
          <Input type="date" {...register("hireDate")} />
          {errors.hireDate && (
            <p className="text-sm text-destructive">{errors.hireDate.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="salary">Salary</Label>
          <Input
            type="number"
            {...register("salary", { valueAsNumber: true })}
            placeholder="Enter salary"
          />
        </div>

        <div className="flex items-center gap-2">
          <Switch
            id="isActive"
            checked={watch("isActive")}
            onCheckedChange={(checked) => setValue("isActive", checked)}
          />
          <Label htmlFor="isActive">Active</Label>
        </div>
      </div>

      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Spinner className="mr-2 h-4 w-4" />}
          {staff ? "Update Staff" : "Add Staff"}
        </Button>
      </div>
    </form>
  )
}
