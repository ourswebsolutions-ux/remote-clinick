"use client";

import { useState, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { PageHeader } from "@/components/dashboard/page-header"
import { DataTable } from "@/components/dashboard/data-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { usePatients, deletePatient } from "@/lib/hooks/use-api"
import { useAuth } from "@/lib/contexts/auth-context"
import { Plus, MoreHorizontal, Eye, Edit, Trash2, Phone, Mail } from "lucide-react"
import { PatientForm } from "@/components/forms/patient-form"
import { format } from "date-fns"
import Link from "next/link"
import { useDebouncedCallback } from "@/lib/hooks/use-debounce"

interface Patient {
  id: string
  name: string
  email: string | null
  phone: string
  dateOfBirth: string
  gender: string
  bloodGroup: string | null
  status: string
  createdAt: string
}

export default function PatientsPage() {
  const searchParams = useSearchParams()
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [dialogOpen, setDialogOpen] = useState(searchParams.get("action") === "new")
  const [editPatient, setEditPatient] = useState<Patient | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const { hasPermission } = useAuth()

  const debouncedSearch = useDebouncedCallback((value: string) => {
    setSearch(value)
    setPage(1)
  }, 300)

  const { data, isLoading, mutate } = usePatients({ search, page, limit: 10 })

  const handleDelete = async () => {
    if (!deleteId) return
    const result = await deletePatient(deleteId)
    if (result.success) {
      mutate()
    }
    setDeleteId(null)
  }

const columns = [
  {
    key: "patient",
    header: "Patient",
    cell: (patient: any) => (
      <div>
        <p className="font-medium">{patient.firstName} {patient.lastName}</p>
        <p className="text-sm text-muted-foreground">
          {format(new Date(patient.dateOfBirth), "MMM d, yyyy")} - {patient.gender}
        </p>
      </div>
    ),
  },
  {
    key: "contact",
    header: "Contact",
    cell: (patient: any) => (
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-sm">
          <Phone className="h-3 w-3 text-muted-foreground" />
          {patient.phone}
        </div>
        {patient.email && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Mail className="h-3 w-3" />
            {patient.email}
          </div>
        )}
      </div>
    ),
  },
  {
    key: "bloodGroup",
    header: "Blood Group",
    cell: (patient: any) => (
      <Badge variant="outline">{patient.bloodGroup ? patient.bloodGroup.replace("_", " ") : "N/A"}</Badge>
    ),
  },
  {
    key: "status",
    header: "Status",
    cell: (patient: any) => (
      <Badge variant={patient.isActive ? "default" : "secondary"}>
        {patient.isActive ? "Active" : "Inactive"}
      </Badge>
    ),
  },
  {
    key: "registered",
    header: "Registered",
    cell: (patient: any) => format(new Date(patient.createdAt), "MMM d, yyyy"),
  },
  {
    key: "actions",
    header: "",
    className: "w-[50px]",
    cell: (patient: any) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/dashboard/patients/${patient.id}`}>
              <Eye className="mr-2 h-4 w-4" />
              View Details
            </Link>
          </DropdownMenuItem>
          {hasPermission("patients:update") && (
            <DropdownMenuItem onClick={() => setEditPatient(patient)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
          )}
          {hasPermission("patients:delete") && (
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => setDeleteId(patient.id)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Patients"
        description="Manage patient records and information"
      >
        {hasPermission("patients:create") && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Patient
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Patient</DialogTitle>
                <DialogDescription>
                  Enter the patient information below
                </DialogDescription>
              </DialogHeader>
              <PatientForm
                onSuccess={() => {
                  setDialogOpen(false)
                  mutate()
                }}
              />
            </DialogContent>
          </Dialog>
        )}
      </PageHeader>

      <DataTable
        columns={columns}
        data={data?.data || []}
        isLoading={isLoading}
        searchPlaceholder="Search patients..."
        onSearch={debouncedSearch}
        pagination={{
          page,
          totalPages: data?.totalPages || 1,
          onPageChange: setPage,
        }}
        emptyMessage="No patients found"
      />

      {/* Edit Dialog */}
      <Dialog open={!!editPatient} onOpenChange={(open) => !open && setEditPatient(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Patient</DialogTitle>
            <DialogDescription>
              Update the patient information below
            </DialogDescription>
          </DialogHeader>
          {editPatient && (
            <PatientForm
              patient={editPatient}
              onSuccess={() => {
                setEditPatient(null)
                mutate()
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Patient</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this patient? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
  