"use client"

import { useState } from "react"
import { PageHeader } from "@/components/dashboard/page-header"
import { StatsCard } from "@/components/dashboard/stats-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { useAnalytics } from "@/lib/hooks/use-api"
import {
  Users,
  Calendar,
  DollarSign,
  TrendingUp,
  Activity,
  Stethoscope,
} from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { format, subDays, parseISO } from "date-fns"

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
]

export default function AnalyticsPage() {
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"))
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"))

  const { data, isLoading } = useAnalytics({ startDate, endDate })

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  // Map API response
  const apiData = data?.data || {}

  const stats = {
    totalPatients: apiData.patients?.totalNew || 0,
    newPatients: apiData.patients?.totalNew || 0,
    totalAppointments: apiData.appointments?.byDate?.reduce((sum, a) => sum + a.count, 0) || 0,
    completedAppointments:
      apiData.appointments?.byStatus?.find(s => s.status === "completed")?.count || 0,
    totalRevenue: apiData.revenue?.total || 0,
    averageRating: 0, // not provided by API
  }

  const appointmentsByDay =
    apiData.appointments?.byDate?.map(d => ({
      date: d.date,
      count: d.count,
    })) || []

  const revenueByMonth =
    apiData.revenue?.byDate?.map(d => ({
      month: d.date,
      revenue: d.amount || 0,
    })) || []

  const appointmentsByType =
    apiData.appointments?.byType?.map(a => ({
      name: a.type,
      value: a.count,
    })) || []

  const topDoctors =
    apiData.appointments?.byDoctor?.map(d => ({
      id: d.id,
      name: d.name,
      appointments: d.count,
      revenue: d.revenue || 0,
    })) || []

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Clinic performance metrics and insights"
      />

      {/* Date Range Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="startDate">From</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-auto"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="endDate">To</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-auto"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatsCard title="Total Patients" value={stats.totalPatients} icon={Users} />
        <StatsCard
          title="New Patients"
          value={stats.newPatients}
          icon={TrendingUp}
          trend={{ value: stats.newPatients, label: "vs last period" }}
        />
        <StatsCard title="Appointments" value={stats.totalAppointments} icon={Calendar} />
        <StatsCard title="Completed" value={stats.completedAppointments} icon={Activity} />
        <StatsCard
          title="Revenue"
          value={`$${stats.totalRevenue?.toLocaleString()}`}
          icon={DollarSign}
        />
        <StatsCard
          title="Avg Rating"
          value={stats.averageRating?.toFixed(1)}
          icon={Stethoscope}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Appointments by Day */}
        <Card>
          <CardHeader>
            <CardTitle>Appointments Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {appointmentsByDay.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={appointmentsByDay}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="date"
                      className="text-xs"
                      tickFormatter={(d) => format(parseISO(d), "MMM d")}
                    />
                    <YAxis className="text-xs" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "var(--radius)",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  No data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Revenue by Month */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {revenueByMonth.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueByMonth}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="month"
                      className="text-xs"
                      tickFormatter={(d) => format(parseISO(d), "MMM yyyy")}
                    />
                    <YAxis className="text-xs" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "var(--radius)",
                      }}
                      formatter={(value: number) => [`$${value.toLocaleString()}`, "Revenue"]}
                    />
                    <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  No data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Appointments by Type */}
        <Card>
          <CardHeader>
            <CardTitle>Appointments by Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {appointmentsByType.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={appointmentsByType}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name} (${(percent * 100).toFixed(0)}%)`
                      }
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {appointmentsByType.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "var(--radius)",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  No data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Performing Doctors */}
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Doctors</CardTitle>
          </CardHeader>
          <CardContent>
            {topDoctors.length > 0 ? (
              <div className="space-y-4">
                {topDoctors.map((doctor, index) => (
                  <div key={doctor.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">Dr. {doctor.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {doctor.appointments} appointments
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">${doctor.revenue.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">revenue</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}