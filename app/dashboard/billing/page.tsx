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
import { useBilling, addPayment } from "@/lib/hooks/use-api"
import { useAuth } from "@/lib/contexts/auth-context"
import { Plus, MoreHorizontal, Eye, CreditCard, DollarSign, Receipt, AlertCircle } from "lucide-react"
import { BillingForm } from "@/components/forms/billing-form"
import { PaymentForm } from "@/components/forms/payment-form"
import { format } from "date-fns"
import Link from "next/link"

interface Bill {
  id: string
  invoiceNumber: string
  patient?: { id: string; name: string }
  totalAmount: number
  paidAmount: number
  balanceAmount: number
  status: string
  dueDate: string
  createdAt: string
  items: Array<{ description: string; amount: number }>
}

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline",
  partial: "secondary",
  paid: "default",
  overdue: "destructive",
  cancelled: "secondary",
}

export default function BillingPage() {
  const searchParams = useSearchParams()
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string>("")
  const [dialogOpen, setDialogOpen] = useState(searchParams.get("action") === "new")
  const [paymentBill, setPaymentBill] = useState<Bill | null>(null)
  const { hasPermission } = useAuth()

  const { data, isLoading, mutate } = useBilling({
    status: statusFilter || undefined,
    page,
  })

  const columns = [
    {
      key: "invoice",
      header: "Invoice",
      cell: (bill: Bill) => (
        <div>
          <p className="font-mono font-medium">{bill.invoiceNumber}</p>
          <p className="text-sm text-muted-foreground">
            {format(new Date(bill.createdAt), "MMM d, yyyy")}
          </p>
        </div>
      ),
    },
    {
      key: "patient",
      header: "Patient",
      cell: (bill: Bill) => (
        <p className="font-medium">{bill.patient?.name || "Unknown"}</p>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      cell: (bill: Bill) => (
        <div>
          <p className="font-medium">${bill.totalAmount.toFixed(2)}</p>
          {bill.paidAmount > 0 && (
            <p className="text-sm text-green-600">
              Paid: ${bill.paidAmount.toFixed(2)}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "balance",
      header: "Balance",
      cell: (bill: Bill) => (
        <p className={bill.balanceAmount > 0 ? "font-medium text-red-600" : "font-medium text-green-600"}>
          ${bill.balanceAmount.toFixed(2)}
        </p>
      ),
    },
    {
      key: "dueDate",
      header: "Due Date",
      cell: (bill: Bill) => format(new Date(bill.dueDate), "MMM d, yyyy"),
    },
    {
      key: "status",
      header: "Status",
      cell: (bill: Bill) => (
        <Badge variant={statusColors[bill.status] || "secondary"}>
          {bill.status}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-[50px]",
      cell: (bill: Bill) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/dashboard/billing/${bill.id}`}>
                <Eye className="mr-2 h-4 w-4" />
                View Invoice
              </Link>
            </DropdownMenuItem>
            {hasPermission("billing:update") && bill.balanceAmount > 0 && (
              <DropdownMenuItem onClick={() => setPaymentBill(bill)}>
                <CreditCard className="mr-2 h-4 w-4" />
                Add Payment
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  const stats = data?.stats || { total: 0, pending: 0, paid: 0, overdue: 0, totalRevenue: 0, pendingAmount: 0 }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing"
        description="Manage invoices and payments"
      >
        {hasPermission("billing:create") && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Invoice
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Invoice</DialogTitle>
                <DialogDescription>
                  Create a new invoice for a patient
                </DialogDescription>
              </DialogHeader>
              <BillingForm
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold text-green-600">${stats.totalRevenue?.toFixed(2) || "0.00"}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600/20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Amount</p>
                <p className="text-2xl font-bold text-orange-600">${stats.pendingAmount?.toFixed(2) || "0.00"}</p>
              </div>
              <Receipt className="h-8 w-8 text-orange-600/20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Paid Invoices</p>
                <p className="text-2xl font-bold">{stats.paid}</p>
              </div>
              <CreditCard className="h-8 w-8 text-muted-foreground/20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Overdue</p>
                <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-600/20" />
            </div>
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
            <SelectItem value="partial">Partial</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
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
        data={data?.bills || []}
        isLoading={isLoading}
        pagination={{
          page,
          totalPages: data?.totalPages || 1,
          onPageChange: setPage,
        }}
        emptyMessage="No invoices found"
      />

      {/* Payment Dialog */}
      <Dialog open={!!paymentBill} onOpenChange={(open) => !open && setPaymentBill(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Payment</DialogTitle>
            <DialogDescription>
              Record a payment for invoice {paymentBill?.invoiceNumber}
            </DialogDescription>
          </DialogHeader>
          {paymentBill && (
            <PaymentForm
              bill={paymentBill}
              onSuccess={() => {
                setPaymentBill(null)
                mutate()
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
