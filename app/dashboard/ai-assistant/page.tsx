"use client"

import { useState } from "react"
import { PageHeader } from "@/components/dashboard/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { usePatients, useAILogs, requestAIDiagnosis, approveAIDiagnosis } from "@/lib/hooks/use-api"
import { useAuth } from "@/lib/contexts/auth-context"
import { Bot, AlertTriangle, CheckCircle, XCircle, Clock, Send, Stethoscope } from "lucide-react"
import { format } from "date-fns"
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field"

interface AILog {
  id: string
  patient?: { id: string; name: string }
  doctor?: { id: string; name: string }
  symptoms: string
  diagnosis: string
  recommendations: string
  confidence: number
  status: string
  doctorNotes: string | null
  createdAt: string
  reviewedAt: string | null
}

export default function AIAssistantPage() {
  const [patientId, setPatientId] = useState("")
  const [symptoms, setSymptoms] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [aiResponse, setAIResponse] = useState<{
    diagnosis: string
    recommendations: string
    confidence: number
    logId: string
  } | null>(null)
  const [reviewNotes, setReviewNotes] = useState("")
  const [page, setPage] = useState(1)

  const { user, hasPermission } = useAuth()
  const { data: patientsData } = usePatients({ limit: 100 })
  const { data: logsData, mutate } = useAILogs({ page })

  const handleAnalyze = async () => {
    if (!patientId || !symptoms.trim()) return

    setIsAnalyzing(true)
    setAIResponse(null)

    try {
      const result = await requestAIDiagnosis({
        patientId,
        symptoms,
        doctorId: user?.doctorId || undefined,
      })

      if (result.success && result.data) {
        const data = result.data as { diagnosis: string; recommendations: string; confidence: number; logId: string }
        setAIResponse({
          diagnosis: data.diagnosis,
          recommendations: data.recommendations,
          confidence: data.confidence,
          logId: data.logId,
        })
        mutate()
      }
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleReview = async (logId: string, approved: boolean) => {
    const result = await approveAIDiagnosis(logId, {
      approved,
      doctorNotes: reviewNotes,
    })
    if (result.success) {
      setReviewNotes("")
      mutate()
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "text-green-600"
    if (confidence >= 0.6) return "text-yellow-600"
    return "text-red-600"
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline"><Clock className="mr-1 h-3 w-3" />Pending Review</Badge>
      case "approved":
        return <Badge variant="default"><CheckCircle className="mr-1 h-3 w-3" />Approved</Badge>
      case "rejected":
        return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" />Rejected</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Diagnostic Assistant"
        description="AI-powered symptom analysis and diagnostic suggestions"
      />

      <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
          <div>
            <p className="font-medium text-orange-800">Medical Disclaimer</p>
            <p className="text-sm text-orange-700">
              AI suggestions are for informational purposes only and must be reviewed by a licensed physician.
              They should not be used as a substitute for professional medical advice, diagnosis, or treatment.
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="analyze" className="space-y-6">
        <TabsList>
          <TabsTrigger value="analyze">Analyze Symptoms</TabsTrigger>
          <TabsTrigger value="history">AI Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="analyze" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" />
                Symptom Analysis
              </CardTitle>
              <CardDescription>
                Enter patient symptoms for AI-powered diagnostic suggestions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="patient">Select Patient</FieldLabel>
                  <Select value={patientId} onValueChange={setPatientId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a patient" />
                    </SelectTrigger>
                    <SelectContent>
                      {patientsData?.patients?.map((patient: { id: string; name: string }) => (
                        <SelectItem key={patient.id} value={patient.id}>
                          {patient.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field>
                  <FieldLabel htmlFor="symptoms">Symptoms</FieldLabel>
                  <Textarea
                    id="symptoms"
                    value={symptoms}
                    onChange={(e) => setSymptoms(e.target.value)}
                    rows={4}
                    placeholder="Describe the patient's symptoms in detail..."
                  />
                </Field>
              </FieldGroup>

              <Button
                onClick={handleAnalyze}
                disabled={!patientId || !symptoms.trim() || isAnalyzing}
              >
                {isAnalyzing ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Analyze Symptoms
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {aiResponse && (
            <Card className="border-primary">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Stethoscope className="h-5 w-5 text-primary" />
                    AI Diagnostic Suggestion
                  </span>
                  <span className={`text-sm ${getConfidenceColor(aiResponse.confidence)}`}>
                    {Math.round(aiResponse.confidence * 100)}% Confidence
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-medium mb-2">Possible Diagnosis</h4>
                  <p className="text-muted-foreground">{aiResponse.diagnosis}</p>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Recommendations</h4>
                  <p className="text-muted-foreground whitespace-pre-line">{aiResponse.recommendations}</p>
                </div>

                {hasPermission("ai:approve") && (
                  <div className="border-t pt-6 space-y-4">
                    <h4 className="font-medium">Doctor Review</h4>
                    <Textarea
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      rows={3}
                      placeholder="Add your clinical notes..."
                    />
                    <div className="flex gap-3">
                      <Button
                        variant="default"
                        onClick={() => handleReview(aiResponse.logId, true)}
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Approve Diagnosis
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => handleReview(aiResponse.logId, false)}
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        Reject
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {logsData?.logs?.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No AI diagnostic logs yet
              </CardContent>
            </Card>
          ) : (
            logsData?.logs?.map((log: AILog) => (
              <Card key={log.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      {log.patient?.name || "Unknown Patient"}
                    </CardTitle>
                    {getStatusBadge(log.status)}
                  </div>
                  <CardDescription>
                    {format(new Date(log.createdAt), "MMM d, yyyy h:mm a")} - 
                    Dr. {log.doctor?.name || "Unknown"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Symptoms</h4>
                    <p>{log.symptoms}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">AI Diagnosis</h4>
                    <p>{log.diagnosis}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Recommendations</h4>
                    <p className="whitespace-pre-line">{log.recommendations}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground">
                      Confidence: <span className={getConfidenceColor(log.confidence)}>
                        {Math.round(log.confidence * 100)}%
                      </span>
                    </span>
                  </div>
                  {log.doctorNotes && (
                    <div className="rounded-lg bg-muted p-3">
                      <h4 className="text-sm font-medium">Doctor Notes</h4>
                      <p className="text-sm text-muted-foreground">{log.doctorNotes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
