"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { format } from "date-fns"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Phone, Mail, User, Calendar, MapPin, Clipboard, Edit2 } from "lucide-react"

export default function PatientPage() {
  const { id } = useParams()
  const router = useRouter()
  const [patient, setPatient] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    async function fetchPatient() {
      try { 
  //const prisma = await getPrismaClient(); // ✅ ADD THIS
        const res = await fetch(`/api/patients/${id}`)
        if (!res.ok) throw new Error("Patient not found")
        const data = await res.json()
        setPatient(data.data)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchPatient()
  }, [id])

  if (loading)
    return (
      <div className="flex justify-center items-center h-64">
        <p>Loading patient...</p>
      </div>
    )

  if (error)
    return (
      <div className="flex justify-center items-center h-64 text-destructive">
        <p>{error}</p>
      </div>
    )

  return (
  <div className="space-y-6 p-4">

  {/* Profile Header */}
  <div className="flex flex-col md:flex-row items-center gap-6 bg-gray-50 p-6 rounded-lg shadow-sm">
    {patient.photo ? (
      <img
        src={patient.photo}
        alt={`${patient.firstName} ${patient.lastName}`}
        className="w-28 h-28 rounded-full object-cover border-2 border-gray-200"
      />
    ) : (
      <User className="w-28 h-28 text-gray-400 p-6 border-2 border-gray-200 rounded-full" />
    )}
    <div className="flex-1 space-y-1">
      <h1 className="text-3xl font-bold">{patient.firstName} {patient.lastName}</h1>
      <p className="text-gray-500">Patient Number: <span className="font-medium">{patient.patientNumber}</span></p>
      <Badge variant={patient.isActive ? "default" : "destructive"}>
        {patient.isActive ? "Active" : "Inactive"}
      </Badge>
    </div>
    <div className="flex gap-2 mt-4 md:mt-0">
      <Button variant="outline" size="sm" className="hover:bg-gray-100">Edit</Button>
      {patient.phone && <Button variant="outline" size="sm" className="hover:bg-gray-100">Call</Button>}
      {patient.email && <Button variant="outline" size="sm" className="hover:bg-gray-100">Email</Button>}
    </div>
  </div>

  {/* Info Grid */}
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-6 rounded-lg shadow-sm">
    <div className="space-y-2">
      <p className="text-gray-500 font-medium">Gender</p>
      <p>{patient.gender}</p>

      <p className="text-gray-500 font-medium">Date of Birth</p>
      <p>{format(new Date(patient.dateOfBirth), "PPP")}</p>

      <p className="text-gray-500 font-medium">Phone</p>
      <p>{patient.phone}</p>

      {patient.email && (
        <>
          <p className="text-gray-500 font-medium">Email</p>
          <p>{patient.email}</p>
        </>
      )}

      {patient.address && (
        <>
          <p className="text-gray-500 font-medium">Address</p>
          <p>{patient.address}, {patient.city || ""}</p>
        </>
      )}
    </div>

    <div className="space-y-2">
      <p className="text-gray-500 font-medium">Blood Group</p>
      <Badge variant="outline">{patient.bloodGroup || "N/A"}</Badge>

      {patient.allergies && (
        <>
          <p className="text-gray-500 font-medium">Allergies</p>
          <p>{patient.allergies}</p>
        </>
      )}

      {patient.emergencyName && (
        <>
          <p className="text-gray-500 font-medium">Emergency Contact</p>
          <p>{patient.emergencyName} - {patient.emergencyRelation}</p>
          <p>{patient.emergencyPhone}</p>
        </>
      )}
    </div>
  </div>

  {/* Appointments Table */}
  <div className="overflow-x-auto rounded-lg border shadow-sm">
    <table className="w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Date</th>
          <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Doctor</th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {patient.appointments?.length ? (
          patient.appointments.map((a: any) => (
            <tr key={a.id} className="hover:bg-gray-50">
              <td className="px-4 py-2">{format(new Date(a.date), "PPP")}</td>
              <td className="px-4 py-2">{a.doctor.user.name}</td>
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan={2} className="px-4 py-4 text-center text-gray-400">No appointments found</td>
          </tr>
        )}
      </tbody>
    </table>
  </div>

</div>
  )
}