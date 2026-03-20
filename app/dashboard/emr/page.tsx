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
import { useEMR, usePatients, useDoctors } from "@/lib/hooks/use-api"
import { useDebounce } from "@/lib/hooks/use-debounce"
import { EMRForm } from "@/components/forms/emr-form"
import { toast } from "sonner"
import { Plus, Search, FileText, Eye } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function EMRPage() {
  const [search, setSearch] = useState("")
  const [patientFilter, setPatientFilter] = useState<string>("all")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<any>(null)
  const [viewRecord, setViewRecord] = useState<any>(null)
  const debouncedSearch = useDebounce(search, 300)

  const { data: emrData, isLoading, mutate } = useEMR({
    search: debouncedSearch,
    patientId: patientFilter !== "all" ? patientFilter : undefined,
  })
  const { data: patientsData } = usePatients({ limit: 100 })
  const { data: doctorsData } = useDoctors({ limit: 100 })

  const records = emrData?.data || []
  const patients = patientsData?.data || []
  const doctors = doctorsData?.data || []

  const handleCreate = () => {
    setSelectedRecord(null)
    setIsDialogOpen(true)
  }

  const handleEdit = (record: any) => {
    setSelectedRecord(record)
    setIsDialogOpen(true)
  }

  const handleView = (record: any) => {
    setViewRecord(record)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this record?")) return
    try {
      const res = await fetch(`/api/emr/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete")
      toast.success("Record deleted successfully")
      mutate()
    } catch {
      toast.error("Failed to delete record")
    }
  }

  const handleSuccess = () => {
    setIsDialogOpen(false)
    setSelectedRecord(null)
    mutate()
  }

  const columns = [
    {
      key: "patient",
      label: "Patient",
      render: (row: any) => (
        <div>
          <p className="font-medium">{row.patient?.user?.name || "N/A"}</p>
          <p className="text-sm text-muted-foreground">{row.patient?.medicalRecordNumber}</p>
        </div>
      ),
    },
    {
      key: "doctor",
      label: "Doctor",
      render: (row: any) => row.doctor?.user?.name || "N/A",
    },
    {
      key: "visitDate",
      label: "Visit Date",
      render: (row: any) => new Date(row.visitDate).toLocaleDateString(),
    },
    {
      key: "chiefComplaint",
      label: "Chief Complaint",
      render: (row: any) => (
        <p className="max-w-[200px] truncate">{row.chiefComplaint}</p>
      ),
    },
    {
      key: "diagnosis",
      label: "Diagnosis",
      render: (row: any) => (
        <Badge variant="outline" className="max-w-[150px] truncate">
          {row.diagnosis || "Pending"}
        </Badge>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (row: any) => (
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => handleView(row)}>
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleEdit(row)}>
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive"
            onClick={() => handleDelete(row.id)}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Electronic Medical Records"
        description="Manage patient medical records and visit history"
        action={
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            New Record
          </Button>
        }
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search records..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={patientFilter} onValueChange={setPatientFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Filter by patient" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Patients</SelectItem>
            {patients.map((patient: any) => (
              <SelectItem key={patient.id} value={patient.id}>
                {patient.user?.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={records}
        isLoading={isLoading}
        emptyMessage="No medical records found"
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedRecord ? "Edit Medical Record" : "New Medical Record"}
            </DialogTitle>
          </DialogHeader>
          <EMRForm
            record={selectedRecord}
            patients={patients}
            doctors={doctors}
            onSuccess={handleSuccess}
            onCancel={() => setIsDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewRecord} onOpenChange={() => setViewRecord(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Medical Record Details
            </DialogTitle>
          </DialogHeader>
          {viewRecord && (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="vitals">Vitals</TabsTrigger>
                <TabsTrigger value="treatment">Treatment</TabsTrigger>
                <TabsTrigger value="prescriptions">Prescriptions</TabsTrigger>
              </TabsList>
              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Patient</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="font-semibold">{viewRecord.patient?.user?.name}</p>
                      <p className="text-sm text-muted-foreground">
                        MRN: {viewRecord.patient?.medicalRecordNumber}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Doctor</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="font-semibold">{viewRecord.doctor?.user?.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {viewRecord.doctor?.specialization}
                      </p>
                    </CardContent>
                  </Card>
                </div>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Visit Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <span className="text-sm text-muted-foreground">Date: </span>
                      <span>{new Date(viewRecord.visitDate).toLocaleDateString()}</span>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Chief Complaint: </span>
                      <span>{viewRecord.chiefComplaint}</span>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">History of Present Illness: </span>
                      <p className="mt-1">{viewRecord.historyOfPresentIllness || "N/A"}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Diagnosis & Assessment</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <span className="text-sm text-muted-foreground">Diagnosis: </span>
                      <Badge>{viewRecord.diagnosis || "Pending"}</Badge>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Assessment: </span>
                      <p className="mt-1">{viewRecord.assessment || "N/A"}</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="vitals" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Vital Signs</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <p className="text-2xl font-bold">{viewRecord.vitalSigns?.bloodPressure || "N/A"}</p>
                        <p className="text-sm text-muted-foreground">Blood Pressure</p>
                      </div>
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <p className="text-2xl font-bold">{viewRecord.vitalSigns?.heartRate || "N/A"}</p>
                        <p className="text-sm text-muted-foreground">Heart Rate (bpm)</p>
                      </div>
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <p className="text-2xl font-bold">{viewRecord.vitalSigns?.temperature || "N/A"}</p>
                        <p className="text-sm text-muted-foreground">Temperature (F)</p>
                      </div>
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <p className="text-2xl font-bold">{viewRecord.vitalSigns?.respiratoryRate || "N/A"}</p>
                        <p className="text-sm text-muted-foreground">Respiratory Rate</p>
                      </div>
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <p className="text-2xl font-bold">{viewRecord.vitalSigns?.oxygenSaturation || "N/A"}</p>
                        <p className="text-sm text-muted-foreground">O2 Saturation (%)</p>
                      </div>
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <p className="text-2xl font-bold">{viewRecord.vitalSigns?.weight || "N/A"}</p>
                        <p className="text-sm text-muted-foreground">Weight (kg)</p>
                      </div>
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <p className="text-2xl font-bold">{viewRecord.vitalSigns?.height || "N/A"}</p>
                        <p className="text-sm text-muted-foreground">Height (cm)</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Physical Examination</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p>{viewRecord.physicalExamination || "No examination notes recorded"}</p>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="treatment" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Treatment Plan</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p>{viewRecord.treatmentPlan || "No treatment plan recorded"}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Follow-up Instructions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p>{viewRecord.followUpInstructions || "No follow-up instructions"}</p>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="prescriptions" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Prescriptions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {viewRecord.prescriptions && viewRecord.prescriptions.length > 0 ? (
                      <div className="space-y-2">
                        {viewRecord.prescriptions.map((rx: any, i: number) => (
                          <div key={i} className="p-3 border rounded-lg">
                            <div className="flex justify-between">
                              <span className="font-medium">{rx.medication?.name}</span>
                              <Badge variant="outline">{rx.status}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {rx.dosage} - {rx.frequency} for {rx.duration}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No prescriptions</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
