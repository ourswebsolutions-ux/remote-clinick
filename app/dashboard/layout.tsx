"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/contexts/auth-context"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Spinner } from "@/components/ui/spinner"

export default function DashboardLayoutWrapper({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, isLoading, isAuthenticated } = useAuth()
  const router = useRouter()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    // Wait for initial auth check to complete
    if (isLoading) return

    // Only redirect if we've confirmed the user is not authenticated
    if (!isAuthenticated && !user) {
      router.replace("/login")
    } else {
      setIsChecking(false)
    }
  }, [user, isLoading, isAuthenticated, router])

  // Show loading while checking auth state
  if (isLoading || isChecking) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Spinner className="h-8 w-8 text-primary" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Don't render anything if not authenticated (will redirect)
  if (!isAuthenticated || !user) {
    return null
  }

  return <DashboardLayout>{children}</DashboardLayout>
}
