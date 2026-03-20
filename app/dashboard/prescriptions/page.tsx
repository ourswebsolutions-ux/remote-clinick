"use client"

import { useState } from "react"
import { PageHeader } from "@/components/dashboard/page-header"
import { DataTable } from "@/components/dashboard/data-table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { usePrescriptions, usePatients, useDoctors, useMedications } from "@/lib/hooks/use-api"
import { useDebounce } from "@/lib/hooks/use-debounce"
import { toast } from "sonner"
import { Plus, Search, Pill, Eye } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PrescriptionForm } from "@/components/forms/prescription-form"

export default function PrescriptionsPage() {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedPrescription, setSelectedPrescription] = useState<any>(null)
  const [viewPrescription, setViewPrescription] = useState<any>(null)
  const debouncedSearch = useDebounce(search, 300)

  const { data, isLoading, mutate } = usePrescriptions({
    search: debouncedSearch,
    status: statusFilter !== "all" ? statusFilter : undefined,
  })
  const { data: patientsData } = usePatients({ limit: 100 })
  const { data: doctorsData } = useDoctors({ limit: 100 })
  const { data: medicationsData } = useMedications({ limit: 100 })

  const prescriptions = data?.prescriptions || []
  const patients = patientsData?.patients || []
  const doctors = doctorsData?.doctors || []
  const medications = medicationsData?.medications || []

  const handleCreate = () => {
    setSelectedPrescription(null)
    setIsDialogOpen(true)
  }

  const handleView = (prescription: any) => {
    setViewPrescription(prescription)
  }

  const handleDispense = async (id: string) => {
    try {
      const res = await fetch(`/api/prescriptions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "DISPENSED" }),
      })
      if (!res.ok) throw new Error("Failed to update")
      toast.success("Prescription marked as dispensed")
      mutate()
    } catch {
      toast.error("Failed to update prescription")
    }
  }

  const handleSuccess = () => {
    setIsDialogOpen(false)
    setSelectedPrescription(null)
    mutate()
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE": return "default"
      case "DISPENSED": return "secondary"
      case "COMPLETED": return "outline"
      case "CANCELLED": return "destructive"
      default: return "outline"
    }
  }

  const columns = [
    {
      key: "medication",
      label: "Medication",
      render: (row: any) => (
        <div className="flex items-center gap-2">
          <Pill className="h-4 w-4 text-primary" />
          <div>
            <p className="font-medium">{row.medication?.name || "N/A"}</p>
            <p className="text-sm text-muted-foreground">{row.medication?.genericName}</p>
          </div>
        </div>
      ),
    },
    {
      key: "patient",
      label: "Patient",
      render: (row: any) => row.patient?.user?.name || "N/A",
    },
    {
      key: "doctor",
      label: "Prescriber",
      render: (row: any) => `Dr. ${row.doctor?.user?.name || "N/A"}`,
    },
    {
      key: "dosage",
      label: "Dosage",
      render: (row: any) => (
        <div>
          <p>{row.dosage}</p>
          <p className="text-sm text-muted-foreground">{row.frequency}</p>
        </div>
      ),
    },
    {
      key: "duration",
      label: "Duration",
      render: (row: any) => row.duration,
    },
    {
      key: "status",
      label: "Status",
      render: (row: any) => (
        <Badge variant={getStatusColor(row.status)}>{row.status}</Badge>
      ),
    },
    {
      key: "prescribedDate",
      label: "Date",
      render: (row: any) => new Date(row.prescribedDate).toLocaleDateString(),
    },
    {
      key: "actions",
      label: "Actions",
      render: (row: any) => (
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => handleView(row)}>
            <Eye className="h-4 w-4" />
          </Button>
          {row.status === "ACTIVE" && (
            <Button variant="outline" size="sm" onClick={() => handleDispense(row.id)}>
              Dispense
            </Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Prescriptions"
        description="Manage patient prescriptions"
        action={
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            New Prescription
          </Button>
        }
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search prescriptions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="DISPENSED">Dispensed</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={prescriptions}
        isLoading={isLoading}
        emptyMessage="No prescriptions found"
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Prescription</DialogTitle>
          </DialogHeader>
          <PrescriptionForm
            patients={patients}
            doctors={doctors}
            medications={medications}
            onSuccess={handleSuccess}
            onCancel={() => setIsDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewPrescription} onOpenChange={() => setViewPrescription(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pill className="h-5 w-5" />
              Prescription Details
            </DialogTitle>
          </DialogHeader>
          {viewPrescription && (
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Medication</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-semibold">{viewPrescription.medication?.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {viewPrescription.medication?.genericName} - {viewPrescription.medication?.dosageForm}
                  </p>
                </CardContent>
              </Card>
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Patient</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p>{viewPrescription.patient?.user?.name}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Prescriber</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p>Dr. {viewPrescription.doctor?.user?.name}</p>
                  </CardContent>
                </Card>
              </div>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Prescription Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Dosage:</span>
                    <span>{viewPrescription.dosage}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Frequency:</span>
                    <span>{viewPrescription.frequency}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Duration:</span>
                    <span>{viewPrescription.duration}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Quantity:</span>
                    <span>{viewPrescription.quantity}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Refills:</span>
                    <span>{viewPrescription.refillsAllowed} allowed, {viewPrescription.refillsUsed} used</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge variant={getStatusColor(viewPrescription.status)}>
                      {viewPrescription.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
              {viewPrescription.instructions && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Instructions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{viewPrescription.instructions}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
