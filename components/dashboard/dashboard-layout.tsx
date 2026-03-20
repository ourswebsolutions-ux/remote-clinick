"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  LayoutDashboard,
  Users,
  UserRound,
  Stethoscope,
  Calendar,
  FileText,
  FlaskConical,
  CreditCard,
  Pill,
  Bell,
  Settings,
  Shield,
  Bot,
  BarChart3,
  Menu,
  X,
  LogOut,
  ChevronDown,
  Building2,
} from "lucide-react"

interface NavItem {
  title: string
  href: string
  icon: React.ElementType
  permission?: string
  roles?: string[]
}

const navItems: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Patients", href: "/dashboard/patients", icon: Users, permission: "patients:read" },
  { title: "Doctors", href: "/dashboard/doctors", icon: Stethoscope, permission: "doctors:read" },
  { title: "Staff", href: "/dashboard/staff", icon: UserRound, permission: "staff:read" },
  { title: "Appointments", href: "/dashboard/appointments", icon: Calendar, permission: "appointments:read" },
  { title: "Medical Records", href: "/dashboard/emr", icon: FileText, permission: "emr:read" },
  { title: "Lab Tests", href: "/dashboard/lab-tests", icon: FlaskConical, permission: "lab:read" },
  { title: "Billing", href: "/dashboard/billing", icon: CreditCard, permission: "billing:read" },
  { title: "Pharmacy", href: "/dashboard/pharmacy", icon: Pill, permission: "pharmacy:read" },
  { title: "Notifications", href: "/dashboard/notifications", icon: Bell, permission: "notifications:read" },
  { title: "AI Assistant", href: "/dashboard/ai-assistant", icon: Bot, permission: "ai:use" },
  { title: "Analytics", href: "/dashboard/analytics", icon: BarChart3, permission: "analytics:read" },
  { title: "Roles & Permissions", href: "/dashboard/roles", icon: Shield, roles: ["admin"] },
  { title: "Settings", href: "/dashboard/settings", icon: Settings, roles: ["admin"] },
]

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()
  const { user, logout, hasPermission, hasRole } = useAuth()

  const filteredNavItems = navItems.filter((item) => {
    if (item.roles && !hasRole(item.roles as ("admin" | "doctor" | "nurse" | "receptionist" | "pharmacist" | "lab_technician" | "billing_staff")[])) {
      return false
    }
    if (item.permission && !hasPermission(item.permission)) {
      return false
    }
    return true
  })

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      admin: "bg-red-100 text-red-700",
      doctor: "bg-blue-100 text-blue-700",
      nurse: "bg-green-100 text-green-700",
      receptionist: "bg-yellow-100 text-yellow-700",
      pharmacist: "bg-purple-100 text-purple-700",
      lab_technician: "bg-cyan-100 text-cyan-700",
      billing_staff: "bg-orange-100 text-orange-700",
    }
    return colors[role] || "bg-gray-100 text-gray-700"
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-sidebar text-sidebar-foreground transition-transform lg:static lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-4">
          <Building2 className="h-8 w-8 text-sidebar-primary" />
          <span className="text-xl font-bold">ClinicPro</span>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 px-3 py-4">
          <nav className="flex flex-col gap-1">
            {filteredNavItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.title}
                </Link>
              )
            })}
          </nav>
        </ScrollArea>

        {/* User section */}
        <div className="border-t border-sidebar-border p-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-sidebar-accent/50">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground">
                    {user ? getInitials(user.name) : "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 overflow-hidden">
                  <p className="truncate text-sm font-medium">{user?.name}</p>
                  <span className={cn("inline-block rounded px-1.5 py-0.5 text-xs font-medium capitalize", user ? getRoleBadgeColor(user.role) : "")}>
                    {user?.role.replace("_", " ")}
                  </span>
                </div>
                <ChevronDown className="h-4 w-4 text-sidebar-foreground/50" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/dashboard/profile">Profile Settings</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-16 items-center gap-4 border-b bg-card px-4 lg:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex-1" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
                  3
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel>Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="p-2 text-center text-sm text-muted-foreground">
                <Link href="/dashboard/notifications" className="text-primary hover:underline">
                  View all notifications
                </Link>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
