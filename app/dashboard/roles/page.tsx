"use client"

import { useState } from "react"
import { PageHeader } from "@/components/dashboard/page-header"
import { DataTable } from "@/components/dashboard/data-table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Plus, Search, Shield, Edit, Trash2 } from "lucide-react"
import { Spinner } from "@/components/ui/spinner"
import useSWR from "swr"

const fetcher = (url: string) => fetch(url).then(res => res.json())

const allPermissions = [
  { id: "patients:read", name: "View Patients", module: "Patients" },
  { id: "patients:create", name: "Create Patients", module: "Patients" },
  { id: "patients:update", name: "Update Patients", module: "Patients" },
  { id: "patients:delete", name: "Delete Patients", module: "Patients" },
  { id: "appointments:read", name: "View Appointments", module: "Appointments" },
  { id: "appointments:create", name: "Create Appointments", module: "Appointments" },
  { id: "appointments:update", name: "Update Appointments", module: "Appointments" },
  { id: "appointments:delete", name: "Delete Appointments", module: "Appointments" },
  { id: "emr:read", name: "View Medical Records", module: "EMR" },
  { id: "emr:create", name: "Create Medical Records", module: "EMR" },
  { id: "emr:update", name: "Update Medical Records", module: "EMR" },
  { id: "emr:delete", name: "Delete Medical Records", module: "EMR" },
  { id: "billing:read", name: "View Billing", module: "Billing" },
  { id: "billing:create", name: "Create Invoices", module: "Billing" },
  { id: "billing:update", name: "Update Billing", module: "Billing" },
  { id: "billing:delete", name: "Delete Billing", module: "Billing" },
  { id: "pharmacy:read", name: "View Pharmacy", module: "Pharmacy" },
  { id: "pharmacy:create", name: "Manage Inventory", module: "Pharmacy" },
  { id: "pharmacy:update", name: "Update Pharmacy", module: "Pharmacy" },
  { id: "pharmacy:delete", name: "Delete Pharmacy Items", module: "Pharmacy" },
  { id: "lab:read", name: "View Lab Tests", module: "Laboratory" },
  { id: "lab:create", name: "Order Lab Tests", module: "Laboratory" },
  { id: "lab:update", name: "Update Lab Results", module: "Laboratory" },
  { id: "lab:delete", name: "Delete Lab Tests", module: "Laboratory" },
  { id: "staff:read", name: "View Staff", module: "Staff" },
  { id: "staff:create", name: "Create Staff", module: "Staff" },
  { id: "staff:update", name: "Update Staff", module: "Staff" },
  { id: "staff:delete", name: "Delete Staff", module: "Staff" },
  { id: "doctors:read", name: "View Doctors", module: "Doctors" },
  { id: "doctors:create", name: "Create Doctors", module: "Doctors" },
  { id: "doctors:update", name: "Update Doctors", module: "Doctors" },
  { id: "doctors:delete", name: "Delete Doctors", module: "Doctors" },
  { id: "settings:read", name: "View Settings", module: "Settings" },
  { id: "settings:update", name: "Update Settings", module: "Settings" },
  { id: "roles:read", name: "View Roles", module: "Roles" },
  { id: "roles:create", name: "Create Roles", module: "Roles" },
  { id: "roles:update", name: "Update Roles", module: "Roles" },
  { id: "roles:delete", name: "Delete Roles", module: "Roles" },
  { id: "analytics:read", name: "View Analytics", module: "Analytics" },
  { id: "ai:use", name: "Use AI Assistant", module: "AI" },
  { id: "ai:approve", name: "Approve AI Suggestions", module: "AI" },
]

export default function RolesPage() {
  const [search, setSearch] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedRole, setSelectedRole] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  const { data, mutate } = useSWR("/api/roles", fetcher)
  const roles = data?.roles || []

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    permissions: [] as string[],
  })

  const handleCreate = () => {
    setSelectedRole(null)
    setFormData({ name: "", description: "", permissions: [] })
    setIsDialogOpen(true)
  }

  const handleEdit = (role: any) => {
    setSelectedRole(role)
    setFormData({
      name: role.name,
      description: role.description || "",
      permissions: role.permissions?.map((p: any) => p.permission?.name) || [],
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this role?")) return
    try {
      const res = await fetch(`/api/roles/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete")
      toast.success("Role deleted successfully")
      mutate()
    } catch {
      toast.error("Failed to delete role")
    }
  }

  const handleSubmit = async () => {
    setIsLoading(true)
    try {
      const url = selectedRole ? `/api/roles/${selectedRole.id}` : "/api/roles"
      const method = selectedRole ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to save role")
      }

      toast.success(selectedRole ? "Role updated successfully" : "Role created successfully")
      setIsDialogOpen(false)
      mutate()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const togglePermission = (permissionId: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permissionId)
        ? prev.permissions.filter(p => p !== permissionId)
        : [...prev.permissions, permissionId]
    }))
  }

  const toggleModulePermissions = (module: string, checked: boolean) => {
    const modulePermissions = allPermissions
      .filter(p => p.module === module)
      .map(p => p.id)

    setFormData(prev => ({
      ...prev,
      permissions: checked
        ? [...new Set([...prev.permissions, ...modulePermissions])]
        : prev.permissions.filter(p => !modulePermissions.includes(p))
    }))
  }

  const filteredRoles = roles.filter((role: any) =>
    role.name.toLowerCase().includes(search.toLowerCase())
  )

  const modules = [...new Set(allPermissions.map(p => p.module))]

  const columns = [
    {
      key: "name",
      label: "Role Name",
      render: (row: any) => (
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          <span className="font-medium">{row.name}</span>
        </div>
      ),
    },
    {
      key: "description",
      label: "Description",
      render: (row: any) => (
        <p className="text-sm text-muted-foreground max-w-[300px] truncate">
          {row.description || "No description"}
        </p>
      ),
    },
    {
      key: "permissions",
      label: "Permissions",
      render: (row: any) => (
        <Badge variant="secondary">
          {row.permissions?.length || 0} permissions
        </Badge>
      ),
    },
    {
      key: "users",
      label: "Users",
      render: (row: any) => (
        <Badge variant="outline">{row._count?.users || 0} users</Badge>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (row: any) => (
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => handleEdit(row)}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive"
            onClick={() => handleDelete(row.id)}
            disabled={row.name === "SUPER_ADMIN"}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Roles & Permissions"
        description="Manage user roles and access permissions"
        action={
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Create Role
          </Button>
        }
      />

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search roles..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <DataTable
        columns={columns}
        data={filteredRoles}
        isLoading={!data}
        emptyMessage="No roles found"
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedRole ? "Edit Role" : "Create Role"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Role Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Doctor, Nurse, Receptionist"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Role description"
                />
              </div>
            </div>

            <div className="space-y-4">
              <Label>Permissions</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {modules.map(module => {
                  const modulePermissions = allPermissions.filter(p => p.module === module)
                  const allChecked = modulePermissions.every(p => formData.permissions.includes(p.id))
                  const someChecked = modulePermissions.some(p => formData.permissions.includes(p.id))

                  return (
                    <Card key={module}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={`module-${module}`}
                            checked={allChecked}
                            // @ts-expect-error - indeterminate is valid
                            ref={(el) => el && (el.indeterminate = someChecked && !allChecked)}
                            onCheckedChange={(checked) => toggleModulePermissions(module, checked as boolean)}
                          />
                          <CardTitle className="text-sm">{module}</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {modulePermissions.map(permission => (
                          <div key={permission.id} className="flex items-center gap-2">
                            <Checkbox
                              id={permission.id}
                              checked={formData.permissions.includes(permission.id)}
                              onCheckedChange={() => togglePermission(permission.id)}
                            />
                            <label
                              htmlFor={permission.id}
                              className="text-xs text-muted-foreground cursor-pointer"
                            >
                              {permission.name}
                            </label>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>

            <div className="flex justify-end gap-4">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={isLoading || !formData.name}>
                {isLoading && <Spinner className="mr-2 h-4 w-4" />}
                {selectedRole ? "Update Role" : "Create Role"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
