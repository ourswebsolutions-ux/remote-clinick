"use client"

import { useState } from "react"
import { PageHeader } from "@/components/dashboard/page-header"
import { DataTable } from "@/components/dashboard/data-table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useNotifications, usePatients } from "@/lib/hooks/use-api"
import { useDebounce } from "@/lib/hooks/use-debounce"
import { toast } from "sonner"
import { Plus, Search, MessageSquare, Mail, Bell, Send } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Spinner } from "@/components/ui/spinner"

export default function NotificationsPage() {
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [notificationType, setNotificationType] = useState<"whatsapp" | "email">("whatsapp")
  const debouncedSearch = useDebounce(search, 300)

  const { data, isLoading, mutate } = useNotifications({
    search: debouncedSearch,
    type: typeFilter !== "all" ? typeFilter : undefined,
  })
  const { data: patientsData } = usePatients({ limit: 100 })

  const notifications = data?.notifications || []
  const patients = patientsData?.patients || []

  const [formData, setFormData] = useState({
    patientId: "",
    phone: "",
    email: "",
    subject: "",
    message: "",
  })
  const [isSending, setIsSending] = useState(false)

  const handleSendNotification = async () => {
    setIsSending(true)
    try {
      const endpoint = notificationType === "whatsapp" 
        ? "/api/notifications/whatsapp" 
        : "/api/notifications/email"

      const payload = notificationType === "whatsapp"
        ? { patientId: formData.patientId, phone: formData.phone, message: formData.message }
        : { patientId: formData.patientId, email: formData.email, subject: formData.subject, message: formData.message }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to send notification")
      }

      toast.success("Notification sent successfully")
      setIsDialogOpen(false)
      setFormData({ patientId: "", phone: "", email: "", subject: "", message: "" })
      mutate()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsSending(false)
    }
  }

  const handlePatientSelect = (patientId: string) => {
    const patient = patients.find((p: any) => p.id === patientId)
    setFormData(prev => ({
      ...prev,
      patientId,
      phone: patient?.user?.phone || "",
      email: patient?.user?.email || "",
    }))
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "SENT": return "default"
      case "DELIVERED": return "default"
      case "FAILED": return "destructive"
      case "PENDING": return "secondary"
      default: return "outline"
    }
  }

  const columns = [
    {
      key: "type",
      label: "Type",
      render: (row: any) => (
        <Badge variant="outline" className="capitalize">
          {row.type === "WHATSAPP" ? (
            <MessageSquare className="mr-1 h-3 w-3" />
          ) : row.type === "EMAIL" ? (
            <Mail className="mr-1 h-3 w-3" />
          ) : (
            <Bell className="mr-1 h-3 w-3" />
          )}
          {row.type.toLowerCase()}
        </Badge>
      ),
    },
    {
      key: "recipient",
      label: "Recipient",
      render: (row: any) => (
        <div>
          <p className="font-medium">{row.patient?.user?.name || "N/A"}</p>
          <p className="text-sm text-muted-foreground">
            {row.type === "EMAIL" ? row.patient?.user?.email : row.patient?.user?.phone}
          </p>
        </div>
      ),
    },
    {
      key: "title",
      label: "Subject/Title",
      render: (row: any) => (
        <p className="max-w-[200px] truncate">{row.title || "No subject"}</p>
      ),
    },
    {
      key: "message",
      label: "Message",
      render: (row: any) => (
        <p className="max-w-[250px] truncate text-sm text-muted-foreground">
          {row.message}
        </p>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (row: any) => (
        <Badge variant={getStatusColor(row.status)}>{row.status}</Badge>
      ),
    },
    {
      key: "sentAt",
      label: "Sent At",
      render: (row: any) => row.sentAt 
        ? new Date(row.sentAt).toLocaleString() 
        : "Not sent",
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Manage WhatsApp and email notifications"
        action={
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Send Notification
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">WhatsApp Messages</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {notifications.filter((n: any) => n.type === "WHATSAPP").length}
            </div>
            <p className="text-xs text-muted-foreground">Total messages sent</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Email Notifications</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {notifications.filter((n: any) => n.type === "EMAIL").length}
            </div>
            <p className="text-xs text-muted-foreground">Total emails sent</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Delivery Rate</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {notifications.length > 0
                ? Math.round(
                    (notifications.filter((n: any) => n.status === "DELIVERED" || n.status === "SENT").length /
                      notifications.length) *
                      100
                  )
                : 0}
              %
            </div>
            <p className="text-xs text-muted-foreground">Successfully delivered</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search notifications..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
            <SelectItem value="EMAIL">Email</SelectItem>
            <SelectItem value="SMS">SMS</SelectItem>
            <SelectItem value="PUSH">Push</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={notifications}
        isLoading={isLoading}
        emptyMessage="No notifications found"
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Send Notification</DialogTitle>
          </DialogHeader>

          <Tabs value={notificationType} onValueChange={(v) => setNotificationType(v as "whatsapp" | "email")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="whatsapp">
                <MessageSquare className="mr-2 h-4 w-4" />
                WhatsApp
              </TabsTrigger>
              <TabsTrigger value="email">
                <Mail className="mr-2 h-4 w-4" />
                Email
              </TabsTrigger>
            </TabsList>

            <TabsContent value="whatsapp" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Select Patient</Label>
                <Select value={formData.patientId} onValueChange={handlePatientSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a patient" />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map((patient: any) => (
                      <SelectItem key={patient.id} value={patient.id}>
                        {patient.user?.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Phone Number</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+1234567890"
                />
              </div>

              <div className="space-y-2">
                <Label>Message</Label>
                <Textarea
                  value={formData.message}
                  onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                  placeholder="Enter your message..."
                  rows={4}
                />
              </div>
            </TabsContent>

            <TabsContent value="email" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Select Patient</Label>
                <Select value={formData.patientId} onValueChange={handlePatientSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a patient" />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map((patient: any) => (
                      <SelectItem key={patient.id} value={patient.id}>
                        {patient.user?.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Email Address</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="email@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label>Subject</Label>
                <Input
                  value={formData.subject}
                  onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="Email subject"
                />
              </div>

              <div className="space-y-2">
                <Label>Message</Label>
                <Textarea
                  value={formData.message}
                  onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                  placeholder="Enter your message..."
                  rows={4}
                />
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-4 mt-4">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendNotification} disabled={isSending}>
              {isSending && <Spinner className="mr-2 h-4 w-4" />}
              <Send className="mr-2 h-4 w-4" />
              Send
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
