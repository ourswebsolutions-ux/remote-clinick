import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { getCurrentUser, hasPermission } from "@/lib/auth/auth"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const prescription = await prisma.prescription.findUnique({
      where: { id },
      include: {
        patient: {
          include: { user: { select: { name: true, email: true, phone: true } } },
        },
        doctor: {
          include: { user: { select: { name: true, email: true } } },
        },
        medication: true,
        emr: true,
      },
    })

    if (!prescription) {
      return NextResponse.json({ error: "Prescription not found" }, { status: 404 })
    }

    return NextResponse.json({ prescription })
  } catch (error) {
    console.error("Error fetching prescription:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    const existingPrescription = await prisma.prescription.findUnique({
      where: { id },
      include: { medication: true },
    })

    if (!existingPrescription) {
      return NextResponse.json({ error: "Prescription not found" }, { status: 404 })
    }

    // If dispensing, update medication stock
    if (body.status === "DISPENSED" && existingPrescription.status !== "DISPENSED") {
      const medication = existingPrescription.medication
      if (medication && medication.stockQuantity < existingPrescription.quantity) {
        return NextResponse.json(
          { error: "Insufficient stock for this medication" },
          { status: 400 }
        )
      }

      // Reduce stock
      if (medication) {
        await prisma.medication.update({
          where: { id: medication.id },
          data: { stockQuantity: { decrement: existingPrescription.quantity } },
        })

        // Create stock adjustment record
        await prisma.stockAdjustment.create({
          data: {
            medicationId: medication.id,
            adjustmentType: "DISPENSED",
            quantity: -existingPrescription.quantity,
            reason: `Dispensed for prescription ${id}`,
            adjustedById: user.id,
          },
        })
      }
    }

    const prescription = await prisma.prescription.update({
      where: { id },
      data: {
        status: body.status,
        refillsUsed: body.refillsUsed,
        instructions: body.instructions,
      },
      include: {
        patient: {
          include: { user: { select: { name: true, email: true } } },
        },
        doctor: {
          include: { user: { select: { name: true, email: true } } },
        },
        medication: true,
      },
    })

    return NextResponse.json({ prescription })
  } catch (error) {
    console.error("Error updating prescription:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || !hasPermission(user, "prescriptions:delete")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const prescription = await prisma.prescription.findUnique({
      where: { id },
    })

    if (!prescription) {
      return NextResponse.json({ error: "Prescription not found" }, { status: 404 })
    }

    // Only allow cancellation, not deletion
    await prisma.prescription.update({
      where: { id },
      data: { status: "CANCELLED" },
    })

    return NextResponse.json({ message: "Prescription cancelled" })
  } catch (error) {
    console.error("Error deleting prescription:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
