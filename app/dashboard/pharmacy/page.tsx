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
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { usePharmacy, adjustStock } from "@/lib/hooks/use-api"
import { useAuth } from "@/lib/contexts/auth-context"
import { Plus, MoreHorizontal, Edit, Package, AlertTriangle, ArrowUpDown } from "lucide-react"
import { MedicationForm } from "@/components/forms/medication-form"
import { StockAdjustmentForm } from "@/components/forms/stock-adjustment-form"
import { format } from "date-fns"
import { useDebouncedCallback } from "@/lib/hooks/use-debounce"

interface Medication {
  id: string
  name: string
  genericName: string | null
  category: string
  dosageForm: string
  strength: string
  manufacturer: string | null
  stockQuantity: number
  reorderLevel: number
  unitPrice: number
  expiryDate: string | null
  status: string
}

export default function PharmacyPage() {
  const [search, setSearch] = useState("")
  const [lowStockOnly, setLowStockOnly] = useState(false)
  const [page, setPage] = useState(1)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editMedication, setEditMedication] = useState<Medication | null>(null)
  const [stockMedication, setStockMedication] = useState<Medication | null>(null)
  const { hasPermission } = useAuth()

  const debouncedSearch = useDebouncedCallback((value: string) => {
    setSearch(value)
    setPage(1)
  }, 300)

  const { data, isLoading, mutate } = usePharmacy({ search, lowStock: lowStockOnly, page })

  const columns = [
    {
      key: "medication",
      header: "Medication",
      cell: (med: Medication) => (
        <div>
          <p className="font-medium">{med.name}</p>
          <p className="text-sm text-muted-foreground">
            {med.genericName && `${med.genericName} - `}{med.strength}
          </p>
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
      cell: (med: Medication) => (
        <div>
          <p>{med.category}</p>
          <p className="text-sm text-muted-foreground">{med.dosageForm}</p>
        </div>
      ),
    },
    {
      key: "stock",
      header: "Stock",
      cell: (med: Medication) => {
        const isLow = med.stockQuantity <= med.reorderLevel
        return (
          <div className="flex items-center gap-2">
            <span className={isLow ? "font-medium text-red-600" : ""}>
              {med.stockQuantity}
            </span>
            {isLow && <AlertTriangle className="h-4 w-4 text-red-600" />}
          </div>
        )
      },
    },
    {
      key: "reorderLevel",
      header: "Reorder Level",
      cell: (med: Medication) => med.reorderLevel,
    },
    {
      key: "price",
      header: "Unit Price",
      cell: (med: Medication) => `$${med.unitPrice.toFixed(2)}`,
    },
    {
      key: "expiry",
      header: "Expiry Date",
      cell: (med: Medication) => {
        if (!med.expiryDate) return "N/A"
        const date = new Date(med.expiryDate)
        const isExpiringSoon = date <= new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
        return (
          <span className={isExpiringSoon ? "text-orange-600" : ""}>
            {format(date, "MMM yyyy")}
          </span>
        )
      },
    },
    {
      key: "status",
      header: "Status",
      cell: (med: Medication) => (
        <Badge variant={med.status === "active" ? "default" : "secondary"}>
          {med.status}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-[50px]",
      cell: (med: Medication) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {hasPermission("pharmacy:update") && (
              <>
                <DropdownMenuItem onClick={() => setEditMedication(med)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStockMedication(med)}>
                  <ArrowUpDown className="mr-2 h-4 w-4" />
                  Adjust Stock
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  const stats = data?.stats || { total: 0, lowStock: 0, outOfStock: 0, expiringSoon: 0 }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pharmacy"
        description="Manage medications and inventory"
      >
        {hasPermission("pharmacy:create") && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Medication
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Medication</DialogTitle>
                <DialogDescription>
                  Add a new medication to the inventory
                </DialogDescription>
              </DialogHeader>
              <MedicationForm
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
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Medications</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Package className="h-8 w-8 text-muted-foreground/20" />
            </div>
          </CardContent>
        </Card>
        <Card className={stats.lowStock > 0 ? "border-orange-500" : ""}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Low Stock</p>
                <p className="text-2xl font-bold text-orange-600">{stats.lowStock}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-600/20" />
            </div>
          </CardContent>
        </Card>
        <Card className={stats.outOfStock > 0 ? "border-red-500" : ""}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Out of Stock</p>
                <p className="text-2xl font-bold text-red-600">{stats.outOfStock}</p>
              </div>
              <Package className="h-8 w-8 text-red-600/20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Expiring Soon</p>
                <p className="text-2xl font-bold">{stats.expiringSoon}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-muted-foreground/20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Switch
            id="lowStock"
            checked={lowStockOnly}
            onCheckedChange={setLowStockOnly}
          />
          <Label htmlFor="lowStock">Show low stock only</Label>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data?.medications || []}
        isLoading={isLoading}
        searchPlaceholder="Search medications..."
        onSearch={debouncedSearch}
        pagination={{
          page,
          totalPages: data?.totalPages || 1,
          onPageChange: setPage,
        }}
        emptyMessage="No medications found"
      />

      {/* Edit Dialog */}
      <Dialog open={!!editMedication} onOpenChange={(open) => !open && setEditMedication(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Medication</DialogTitle>
            <DialogDescription>
              Update medication information
            </DialogDescription>
          </DialogHeader>
          {editMedication && (
            <MedicationForm
              medication={editMedication}
              onSuccess={() => {
                setEditMedication(null)
                mutate()
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Stock Adjustment Dialog */}
      <Dialog open={!!stockMedication} onOpenChange={(open) => !open && setStockMedication(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Stock</DialogTitle>
            <DialogDescription>
              Adjust stock for {stockMedication?.name}
            </DialogDescription>
          </DialogHeader>
          {stockMedication && (
            <StockAdjustmentForm
              medication={stockMedication}
              onSuccess={() => {
                setStockMedication(null)
                mutate()
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
