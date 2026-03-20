"use client"

import { useState } from "react"
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
import { useLabTests, updateLabTest } from "@/lib/hooks/use-api"
import { useAuth } from "@/lib/contexts/auth-context"
import { Plus, MoreHorizontal, Eye, Edit, FileText, Clock, CheckCircle, XCircle } from "lucide-react"
import { LabTestForm } from "@/components/forms/lab-test-form"
import { LabResultForm } from "@/components/forms/lab-result-form"
import { format } from "date-fns"
import Link from "next/link"

interface LabTest {
  id: string
  testName: string
  testCode: string
  patient?: { id: string; name: string }
  doctor?: { id: string; name: string }
  status: string
  priority: string
  results: string | null
  notes: string | null
  orderedAt: string
  completedAt: string | null
}

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline",
  in_progress: "secondary",
  completed: "default",
  cancelled: "destructive",
}

const priorityColors: Record<string, string> = {
  routine: "bg-gray-100 text-gray-700",
  urgent: "bg-orange-100 text-orange-700",
  stat: "bg-red-100 text-red-700",
}

export default function LabTestsPage() {
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string>("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [resultTest, setResultTest] = useState<LabTest | null>(null)
  const { hasPermission } = useAuth()

  const { data, isLoading, mutate } = useLabTests({
    status: statusFilter || undefined,
    page,
  })

  const handleStatusChange = async (id: string, status: string) => {
    const result = await updateLabTest(id, { status })
    if (result.success) {
      mutate()
    }
  }

  const columns = [
    {
      key: "test",
      header: "Test",
      cell: (test: LabTest) => (
        <div>
          <p className="font-medium">{test.testName}</p>
          <p className="text-sm text-muted-foreground font-mono">{test.testCode}</p>
        </div>
      ),
    },
    {
      key: "patient",
      header: "Patient",
      cell: (test: LabTest) => test.patient?.name || "Unknown",
    },
    {
      key: "doctor",
      header: "Ordered By",
      cell: (test: LabTest) => `Dr. ${test.doctor?.name || "Unknown"}`,
    },
    {
      key: "priority",
      header: "Priority",
      cell: (test: LabTest) => (
        <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${priorityColors[test.priority] || ""}`}>
          {test.priority.toUpperCase()}
        </span>
      ),
    },
    {
      key: "orderedAt",
      header: "Ordered",
      cell: (test: LabTest) => format(new Date(test.orderedAt), "MMM d, h:mm a"),
    },
    {
      key: "status",
      header: "Status",
      cell: (test: LabTest) => (
        <Badge variant={statusColors[test.status] || "secondary"}>
          {test.status.replace("_", " ")}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-[50px]",
      cell: (test: LabTest) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/dashboard/lab-tests/${test.id}`}>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </Link>
            </DropdownMenuItem>
            {hasPermission("lab:update") && test.status === "pending" && (
              <DropdownMenuItem onClick={() => handleStatusChange(test.id, "in_progress")}>
                <Clock className="mr-2 h-4 w-4" />
                Start Processing
              </DropdownMenuItem>
            )}
            {hasPermission("lab:update") && test.status === "in_progress" && (
              <DropdownMenuItem onClick={() => setResultTest(test)}>
                <FileText className="mr-2 h-4 w-4" />
                Enter Results
              </DropdownMenuItem>
            )}
            {hasPermission("lab:update") && test.status !== "completed" && test.status !== "cancelled" && (
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => handleStatusChange(test.id, "cancelled")}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Cancel Test
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  const stats = data?.stats || { total: 0, pending: 0, inProgress: 0, completed: 0 }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lab Tests"
        description="Manage laboratory test orders and results"
      >
        {hasPermission("lab:create") && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Order Test
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Order Lab Test</DialogTitle>
                <DialogDescription>
                  Create a new lab test order
                </DialogDescription>
              </DialogHeader>
              <LabTestForm
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
            <p className="text-sm text-muted-foreground">Total Tests</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Pending</p>
            <p className="text-2xl font-bold text-orange-600">{stats.pending}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">In Progress</p>
            <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Completed</p>
            <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
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
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        {statusFilter && (
          <Button variant="ghost" onClick={() => setStatusFilter("")}>
            Clear Filter
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={data?.tests || []}
        isLoading={isLoading}
        pagination={{
          page,
          totalPages: data?.totalPages || 1,
          onPageChange: setPage,
        }}
        emptyMessage="No lab tests found"
      />

      {/* Results Dialog */}
      <Dialog open={!!resultTest} onOpenChange={(open) => !open && setResultTest(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Enter Test Results</DialogTitle>
            <DialogDescription>
              Enter results for {resultTest?.testName}
            </DialogDescription>
          </DialogHeader>
          {resultTest && (
            <LabResultForm
              test={resultTest}
              onSuccess={() => {
                setResultTest(null)
                mutate()
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
