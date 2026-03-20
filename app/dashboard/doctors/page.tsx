"use client"

import { useState } from "react"
import { PageHeader } from "@/components/dashboard/page-header"
import { DataTable } from "@/components/dashboard/data-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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
import { useDoctors, deleteDoctor } from "@/lib/hooks/use-api"
import { useAuth } from "@/lib/contexts/auth-context"
import { Plus, MoreHorizontal, Eye, Edit, Trash2, Phone, Mail, Stethoscope } from "lucide-react"
import { DoctorForm } from "@/components/forms/doctor-form"
import Link from "next/link"
import { useDebouncedCallback } from "@/lib/hooks/use-debounce"

interface Doctor {
  id: string
  name: string
  email: string
  phone: string
  specialization: string
  licenseNumber: string
  status: string
  consultationFee: number
  user?: { name: string; email: string }
}

export default function DoctorsPage() {
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editDoctor, setEditDoctor] = useState<Doctor | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const { hasPermission } = useAuth()

  const debouncedSearch = useDebouncedCallback((value: string) => {
    setSearch(value)
    setPage(1)
  }, 300)

  const { data, isLoading, mutate } = useDoctors({ search, page })

  const handleDelete = async () => {
    if (!deleteId) return
    const result = await deleteDoctor(deleteId)
    if (result.success) {
      mutate()
    }
    setDeleteId(null)
  }

  const getInitials = (name: string) => {
    return name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const columns = [
    {
      key: "doctor",
      header: "Doctor",
      cell: (doctor: Doctor) => (
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarFallback className="bg-primary/10 text-primary">
              {getInitials(doctor.name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">Dr. {doctor.name}</p>
            <p className="text-sm text-muted-foreground">{doctor.specialization}</p>
          </div>
        </div>
      ),
    },
    {
      key: "contact",
      header: "Contact",
      cell: (doctor: Doctor) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm">
            <Phone className="h-3 w-3 text-muted-foreground" />
            {doctor.phone}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Mail className="h-3 w-3" />
            {doctor.email}
          </div>
        </div>
      ),
    },
    {
      key: "license",
      header: "License",
      cell: (doctor: Doctor) => (
        <span className="font-mono text-sm">{doctor.licenseNumber}</span>
      ),
    },
    {
      key: "fee",
      header: "Consultation Fee",
      cell: (doctor: Doctor) => (
        <span className="font-medium">${doctor.consultationFee}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (doctor: Doctor) => (
        <Badge variant={doctor.status === "active" ? "default" : "secondary"}>
          {doctor.status}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-[50px]",
      cell: (doctor: Doctor) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/dashboard/doctors/${doctor.id}`}>
                <Eye className="mr-2 h-4 w-4" />
                View Profile
              </Link>
            </DropdownMenuItem>
            {hasPermission("doctors:update") && (
              <DropdownMenuItem onClick={() => setEditDoctor(doctor)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
            )}
            {hasPermission("doctors:delete") && (
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => setDeleteId(doctor.id)}
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
        title="Doctors"
        description="Manage doctors and their schedules"
      >
        {hasPermission("doctors:create") && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Doctor
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Doctor</DialogTitle>
                <DialogDescription>
                  Enter the doctor information below
                </DialogDescription>
              </DialogHeader>
              <DoctorForm
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
        searchPlaceholder="Search doctors..."
        onSearch={debouncedSearch}
        pagination={{
          page,
          totalPages: data?.totalPages || 1,
          onPageChange: setPage,
        }}
        emptyMessage="No doctors found"
      />

      {/* Edit Dialog */}
      <Dialog open={!!editDoctor} onOpenChange={(open) => !open && setEditDoctor(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Doctor</DialogTitle>
            <DialogDescription>
              Update the doctor information below
            </DialogDescription>
          </DialogHeader>
          {editDoctor && (
            <DoctorForm
              doctor={editDoctor}
              onSuccess={() => {
                setEditDoctor(null)
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
            <AlertDialogTitle>Delete Doctor</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this doctor? This action cannot be undone.
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
