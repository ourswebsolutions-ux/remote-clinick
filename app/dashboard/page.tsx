"use client"

import { PageHeader } from "@/components/dashboard/page-header"
import { StatsCard } from "@/components/dashboard/stats-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { useDashboard } from "@/lib/hooks/use-api"
import { useAuth } from "@/lib/contexts/auth-context"
import {
  Users,
  Calendar,
  CreditCard,
  Pill,
  Clock,
  AlertTriangle,
  TrendingUp,
  Activity,
} from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"

export default function DashboardPage() {
  const { user } = useAuth()
  const { data, isLoading } = useDashboard()

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  const stats = data?.stats || {
    totalPatients: 0,
    todayAppointments: 0,
    pendingBills: 0,
    lowStockMedications: 0,
  }

  const recentAppointments = data?.recentAppointments || []
  const upcomingAppointments = data?.upcomingAppointments || []
  const alerts = data?.alerts || []

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back, ${user?.name?.split(" ")[0]}`}
        description={`Here's what's happening at your clinic today`}
      />

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Patients"
          value={stats.totalPatients}
          icon={Users}
          trend={{ value: 12, label: "from last month" }}
        />
        <StatsCard
          title="Today's Appointments"
          value={stats.todayAppointments}
          icon={Calendar}
          description="Scheduled for today"
        />
        <StatsCard
          title="Pending Bills"
          value={stats.pendingBills}
          icon={CreditCard}
          description="Awaiting payment"
        />
        <StatsCard
          title="Low Stock Alerts"
          value={stats.lowStockMedications}
          icon={Pill}
          description="Medications need restock"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming Appointments */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Upcoming Appointments
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/appointments">View all</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {upcomingAppointments.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No upcoming appointments
              </p>
            ) : (
              <div className="space-y-4">
                {upcomingAppointments.slice(0, 5).map((apt: { id: string; patient?: { name: string }; doctor?: { name: string }; dateTime: string; status: string }) => (
                  <div
                    key={apt.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-medium">{apt.patient?.name || "Unknown Patient"}</p>
                      <p className="text-sm text-muted-foreground">
                        Dr. {apt.doctor?.name || "Unknown"} - {format(new Date(apt.dateTime), "MMM d, h:mm a")}
                      </p>
                    </div>
                    <Badge variant={apt.status === "scheduled" ? "default" : "secondary"}>
                      {apt.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Recent Appointments
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentAppointments.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No recent appointments
              </p>
            ) : (
              <div className="space-y-4">
                {recentAppointments.slice(0, 5).map((apt: { id: string; patient?: { name: string }; type: string; dateTime: string; status: string }) => (
                  <div
                    key={apt.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-medium">{apt.patient?.name || "Unknown Patient"}</p>
                      <p className="text-sm text-muted-foreground">
                        {apt.type} - {format(new Date(apt.dateTime), "MMM d, h:mm a")}
                      </p>
                    </div>
                    <Badge
                      variant={
                        apt.status === "completed"
                          ? "default"
                          : apt.status === "cancelled"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {apt.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <Card className="border-warning bg-warning/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-warning-foreground">
              <AlertTriangle className="h-5 w-5" />
              System Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alerts.map((alert: { id: string; message: string; type: string }, index: number) => (
                <div
                  key={index}
                  className="flex items-center gap-3 rounded-lg bg-background p-3"
                >
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  <p className="text-sm">{alert.message}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Button variant="outline" className="h-auto flex-col gap-2 py-4" asChild>
              <Link href="/dashboard/patients?action=new">
                <Users className="h-5 w-5" />
                <span>Add Patient</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto flex-col gap-2 py-4" asChild>
              <Link href="/dashboard/appointments?action=new">
                <Calendar className="h-5 w-5" />
                <span>Schedule Appointment</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto flex-col gap-2 py-4" asChild>
              <Link href="/dashboard/billing?action=new">
                <CreditCard className="h-5 w-5" />
                <span>Create Bill</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto flex-col gap-2 py-4" asChild>
              <Link href="/dashboard/pharmacy">
                <Pill className="h-5 w-5" />
                <span>Check Inventory</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
