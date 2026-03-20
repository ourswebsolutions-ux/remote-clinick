"use client"

import { useState } from "react"
import { PageHeader } from "@/components/dashboard/page-header"
import { DataTable } from "@/components/dashboard/data-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, MoreHorizontal, Edit, Trash2 } from "lucide-react"
import { useStaff, deleteStaff } from "@/lib/hooks/use-api"
import { useAuth } from "@/lib/contexts/auth-context"
import { StaffForm } from "@/components/forms/staff-form"
import { useDebouncedCallback } from "@/lib/hooks/use-debounce"
import Link from "next/link"

interface Staff {
  id: string
  department: string
  position: string
  user: {
    id: string
    name: string
    email: string
    isActive: boolean
    role: {
      id: string
      name: string
    }
  }
}

export default function StaffPage() {
  const { hasPermission } = useAuth()
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editStaff, setEditStaff] = useState<Staff | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const debouncedSearch = useDebouncedCallback((value: string) => {
    setSearch(value)
    setPage(1)
  }, 300)

  const { data, isLoading, mutate } = useStaff({ search, page, limit: 10 })

  const handleDelete = async () => {
    if (!deleteId) return
    const result = await deleteStaff(deleteId)
    if (result.success) mutate()
    setDeleteId(null)
  }

  const handleEdit = (staff: Staff) => {
    setEditStaff(staff)
    setDialogOpen(true)
  }

  const columns = [
    {
      key: "name",
      header: "Name",
      cell: (staff: Staff) => (
        <div>
          <p className="font-medium">{staff.user.name}</p>
          <p className="text-sm text-muted-foreground">{staff.user.email}</p>
        </div>
      ),
    },
    {
      key: "department",
      header: "Department",
      cell: (staff: Staff) => <Badge variant="secondary">{staff.department}</Badge>,
    },
    {
      key: "position",
      header: "Position",
      cell: (staff: Staff) => staff.position,
    },
    {
      key: "status",
      header: "Status",
      cell: (staff: Staff) => (
        <Badge variant={staff.user.isActive ? "default" : "destructive"}>
          {staff.user.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-[80px]",
      cell: (staff: Staff) => (
        <div className="flex gap-2">
          {hasPermission("staff:update") && (
            <Button variant="ghost" size="icon" onClick={() => handleEdit(staff)}>
              <Edit className="h-4 w-4" />
            </Button>
          )}
          {hasPermission("staff:delete") && (
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive"
              onClick={() => setDeleteId(staff.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Staff Management"
        description="Manage clinic staff and employees"
        action={
          hasPermission("staff:create") && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Staff
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add New Staff</DialogTitle>
                </DialogHeader>
                <StaffForm
                  onSuccess={() => {
                    setDialogOpen(false)
                    mutate()
                  }}
                />
              </DialogContent>
            </Dialog>
          )
        }
      />

      <DataTable
        columns={columns}
        data={data?.data || []}
        isLoading={isLoading}
        searchPlaceholder="Search staff..."
        onSearch={debouncedSearch}
        pagination={{
          page,
          totalPages: data?.totalPages || 1,
          onPageChange: setPage,
        }}
        emptyMessage="No staff members found"
      />

      {/* Edit Dialog */}
      <Dialog open={!!editStaff} onOpenChange={(open) => !open && setEditStaff(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Staff Member</DialogTitle>
          </DialogHeader>
          {editStaff && (
            <StaffForm
              staff={editStaff}
              onSuccess={() => {
                setEditStaff(null)
                mutate()
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Staff Member</DialogTitle>
          </DialogHeader>
          <div className="mt-2">
            Are you sure you want to delete this staff member? This action cannot be undone.
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}