"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import { PageHeader } from "@/components/dashboard/page-header"
import { DataTable } from "@/components/dashboard/data-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { useAppointments, deleteAppointment, updateAppointment } from "@/lib/hooks/use-api"
import { useAuth } from "@/lib/contexts/auth-context"
import { Plus, MoreHorizontal, Eye, Edit, Trash2, CheckCircle, XCircle, Clock } from "lucide-react"
import { AppointmentForm } from "@/components/forms/appointment-form"
import { format } from "date-fns"
import Link from "next/link"
import { Input } from "@/components/ui/input"

interface Appointment {
  id: string
  patient?: { id: string; name: string }
  doctor?: { id: string; name: string; specialization: string }
  dateTime: string
  duration: number
  type: string
  status: string
  notes: string | null
  createdAt: string
}

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  scheduled: "default",
  completed: "secondary",
  cancelled: "destructive",
  no_show: "outline",
  in_progress: "default",
}

export default function AppointmentsPage() {
  const searchParams = useSearchParams()
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string>("")
  const [dateFilter, setDateFilter] = useState<string>("")
  const [dialogOpen, setDialogOpen] = useState(searchParams.get("action") === "new")
  const [editAppointment, setEditAppointment] = useState<Appointment | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const { hasPermission } = useAuth()

  const { data, isLoading, mutate } = useAppointments({
    status: statusFilter || undefined,
    date: dateFilter || undefined,
    page,
  })

  const handleDelete = async () => {
    if (!deleteId) return
    const result = await deleteAppointment(deleteId)
    if (result.success) {
      mutate()
    }
    setDeleteId(null)
  }

  const handleStatusChange = async (id: string, status: string) => {
    const result = await updateAppointment(id, { status })
    if (result.success) {
      mutate()
    }
  }

  const columns = [
    {
      key: "patient",
      header: "Patient",
      cell: (apt: Appointment) => (
        <div>
          <p className="font-medium">{apt.patient?.name || "Unknown"}</p>
          <p className="text-sm text-muted-foreground">{apt.type}</p>
        </div>
      ),
    },
    {
      key: "doctor",
      header: "Doctor",
      cell: (apt: Appointment) => (
        <div>
          <p className="font-medium">Dr. {apt.doctor?.name || "Unknown"}</p>
          <p className="text-sm text-muted-foreground">{apt.doctor?.specialization}</p>
        </div>
      ),
    },
    {
      key: "dateTime",
      header: "Date & Time",
      cell: (apt: Appointment) => (
        <div>
          <p className="font-medium">{format(new Date(apt.dateTime), "MMM d, yyyy")}</p>
          <p className="text-sm text-muted-foreground">
            {format(new Date(apt.dateTime), "h:mm a")} ({apt.duration} min)
          </p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (apt: Appointment) => (
        <Badge variant={statusColors[apt.status] || "secondary"}>
          {apt.status.replace("_", " ")}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-[50px]",
      cell: (apt: Appointment) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/dashboard/appointments/${apt.id}`}>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </Link>
            </DropdownMenuItem>
            {hasPermission("appointments:update") && apt.status === "scheduled" && (
              <>
                <DropdownMenuItem onClick={() => handleStatusChange(apt.id, "completed")}>
                  <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                  Mark Completed
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStatusChange(apt.id, "in_progress")}>
                  <Clock className="mr-2 h-4 w-4 text-blue-600" />
                  Start Appointment
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStatusChange(apt.id, "no_show")}>
                  <XCircle className="mr-2 h-4 w-4 text-orange-600" />
                  Mark No Show
                </DropdownMenuItem>
              </>
            )}
            {hasPermission("appointments:update") && (
              <DropdownMenuItem onClick={() => setEditAppointment(apt)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
            )}
            {hasPermission("appointments:delete") && apt.status === "scheduled" && (
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => setDeleteId(apt.id)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Cancel
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  const stats = data?.stats || { total: 0, scheduled: 0, completed: 0, cancelled: 0 }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Appointments"
        description="Schedule and manage patient appointments"
      >
        {hasPermission("appointments:create") && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Appointment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Schedule Appointment</DialogTitle>
                <DialogDescription>
                  Create a new appointment for a patient
                </DialogDescription>
              </DialogHeader>
              <AppointmentForm
                onSuccess={() => {
                  setDialogOpen(false)
                  mutate()
                }}
              />
            </DialogContent>
          </Dialog>
        )}
      </PageHeader>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Scheduled</p>
            <p className="text-2xl font-bold text-blue-600">{stats.scheduled}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Completed</p>
            <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Cancelled</p>
            <p className="text-2xl font-bold text-red-600">{stats.cancelled}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="no_show">No Show</SelectItem>
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="w-[180px]"
        />
        {(statusFilter || dateFilter) && (
          <Button
            variant="ghost"
            onClick={() => {
              setStatusFilter("")
              setDateFilter("")
            }}
          >
            Clear Filters
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={data?.data || []}
        isLoading={isLoading}
        pagination={{
          page,
          totalPages: data?.totalPages || 1,
          onPageChange: setPage,
        }}
        emptyMessage="No appointments found"
      />

      {/* Edit Dialog */}
      <Dialog open={!!editAppointment} onOpenChange={(open) => !open && setEditAppointment(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Appointment</DialogTitle>
            <DialogDescription>
              Update the appointment details
            </DialogDescription>
          </DialogHeader>
          {editAppointment && (
            <AppointmentForm
              appointment={editAppointment}
              onSuccess={() => {
                setEditAppointment(null)
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
            <AlertDialogTitle>Cancel Appointment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this appointment? The patient will be notified.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Appointment</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Cancel Appointment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
