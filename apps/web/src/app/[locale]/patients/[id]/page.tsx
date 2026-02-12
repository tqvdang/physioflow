"use client";

/**
 * Patient dashboard page
 * Displays patient overview with status, sessions timeline, and tabs
 */

import * as React from "react";
import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/routing";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { PatientStatusBadge, QuickStats } from "@/components/patient";
import {
  usePatient,
  usePatientDashboard,
  usePatientStats,
  usePatientSessions,
  usePatientTimeline,
} from "@/hooks/use-patients";
import { formatDate, formatRelativeTime, cn } from "@/lib/utils";
import type { PatientSession, PatientTimelineEntry, PatientInsurance } from "@/types/patient";
import {
  ArrowLeft,
  Edit,
  Play,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Clock,
  FileText,
  Activity,
  FolderOpen,
  TrendingUp,
  User,
  Shield,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

/**
 * Get initials from name
 */
function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Insurance status badge component
 */
function InsuranceBadge({ insurance, t }: { insurance: PatientInsurance; t: (key: string) => string }) {
  const isExpired = insurance.validTo && new Date(insurance.validTo) < new Date();
  const isActive = insurance.isActive && !isExpired;

  const providerLabel = {
    bhyt: t("insurance.bhyt"),
    private: t("insurance.private"),
    corporate: t("insurance.corporate"),
  }[insurance.providerType] ?? insurance.providerType;

  return (
    <div className="flex items-center gap-2 text-sm">
      <Badge
        variant="outline"
        className={cn(
          isActive
            ? "bg-green-50 text-green-700 border-green-200"
            : "bg-gray-50 text-gray-600 border-gray-200"
        )}
      >
        <Shield className="h-3 w-3 mr-1" />
        {providerLabel}: {isActive ? t("insurance.valid") : t("insurance.expired")}
      </Badge>
      {insurance.coveragePercentage > 0 && (
        <span className="text-muted-foreground">
          {t("insurance.coverage")}: {insurance.coveragePercentage}%
        </span>
      )}
    </div>
  );
}

/**
 * Calculate age from date of birth
 */
function calculateAge(dateOfBirth: string): number {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

/**
 * Timeline item component
 */
function TimelineItem({ entry }: { entry: PatientTimelineEntry }) {
  const iconMap = {
    session: Activity,
    note: FileText,
    document: FolderOpen,
    measurement: TrendingUp,
  };
  const Icon = iconMap[entry.type] ?? FileText;

  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 w-px bg-border" />
      </div>
      <div className="flex-1 pb-6">
        <div className="flex items-center justify-between">
          <p className="font-medium">{entry.title}</p>
          <span className="text-xs text-muted-foreground">
            {formatRelativeTime(entry.timestamp)}
          </span>
        </div>
        {entry.description && (
          <p className="text-sm text-muted-foreground mt-1">{entry.description}</p>
        )}
      </div>
    </div>
  );
}

/**
 * Session card component
 */
function SessionCard({ session, t }: { session: PatientSession; t: (key: string) => string }) {
  const statusColors = {
    scheduled: "bg-blue-100 text-blue-800",
    in_progress: "bg-yellow-100 text-yellow-800",
    completed: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{formatDate(session.sessionDate)}</span>
          </div>
          <span
            className={cn(
              "text-xs px-2 py-1 rounded-full",
              statusColors[session.status]
            )}
          >
            {t(`sessionStatus.${session.status}`)}
          </span>
        </div>
        <div className="space-y-1 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span>{t("sessions.therapist")}: {session.therapistName}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>{session.duration} {t("sessions.minutes")}</span>
          </div>
          {session.painLevelBefore !== undefined && session.painLevelAfter !== undefined && (
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              <span>
                {t("sessions.pain")}: {session.painLevelBefore} → {session.painLevelAfter}
              </span>
            </div>
          )}
        </div>
        {session.notes && (
          <p className="text-sm mt-2 pt-2 border-t">{session.notes}</p>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Loading skeleton for patient dashboard
 */
function PatientDashboardSkeleton() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10 rounded" />
        <Skeleton className="h-8 w-48" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Skeleton className="h-48 w-full rounded-lg" />
          <Skeleton className="h-32 w-full rounded-lg" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export default function PatientDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const locale = useLocale();
  const patientId = params.id as string;
  const t = useTranslations("patientDetail");

  // Fetch data
  const { data: patient, isLoading: isLoadingPatient } = usePatient(patientId);
  const { data: dashboard } = usePatientDashboard(patientId);
  const { data: stats, isLoading: isLoadingStats } = usePatientStats(patientId);
  const { data: sessionsData } = usePatientSessions(patientId, { pageSize: 5 });
  const { data: timeline } = usePatientTimeline(patientId);

  // Get primary insurance from dashboard
  const primaryInsurance = dashboard?.insuranceInfo?.find((ins: PatientInsurance) => ins.isPrimary && ins.isActive);
  const activeInsurances = dashboard?.insuranceInfo?.filter((ins: PatientInsurance) => ins.isActive) ?? [];

  // Loading state
  if (isLoadingPatient) {
    return <PatientDashboardSkeleton />;
  }

  // Not found
  if (!patient) {
    return (
      <div className="container mx-auto py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">{t("notFound.title")}</h1>
        <p className="text-muted-foreground mb-6">
          {t("notFound.description")}
        </p>
        <Link href={"/patients"}>
          <Button>{t("notFound.backToList")}</Button>
        </Link>
      </div>
    );
  }

  const displayName = locale === "en" && patient.nameEn ? patient.nameEn : patient.nameVi;
  const age = calculateAge(patient.dateOfBirth);

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Back button */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/patients")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">{t("pageTitle")}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Patient header card */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row gap-6">
                {/* Photo */}
                <Avatar className="h-24 w-24 mx-auto sm:mx-0 flex-shrink-0">
                  <AvatarImage src={patient.photoUrl} alt={displayName} />
                  <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                    {getInitials(displayName)}
                  </AvatarFallback>
                </Avatar>

                {/* Main Info */}
                <div className="flex-1 min-w-0">
                  {/* Name and Status Row */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                    <h2 className="text-xl font-bold truncate">{displayName}</h2>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <PatientStatusBadge status={patient.status} />
                    </div>
                  </div>

                  {/* Basic Info Row */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground mb-3">
                    <span className="font-medium text-foreground">
                      {t(`gender.${patient.gender}`)}, {age} {t("yearsOld")}
                    </span>
                    <span className="hidden sm:inline">|</span>
                    <span>DOB: {formatDate(patient.dateOfBirth, { year: "numeric", month: "2-digit", day: "2-digit" })}</span>
                    <span className="hidden sm:inline">|</span>
                    <span>MRN: {patient.mrn}</span>
                  </div>

                  {/* Insurance Info - from dashboard */}
                  {primaryInsurance && (
                    <div className="mb-3">
                      <InsuranceBadge insurance={primaryInsurance} t={t} />
                      {primaryInsurance.policyNumber && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {t("insurance.policyNumber")}: {primaryInsurance.policyNumber}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Contact info - horizontal on larger screens */}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    {patient.phone && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5" />
                        <span>{patient.phone}</span>
                      </div>
                    )}
                    {patient.email && (
                      <div className="flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5" />
                        <span className="truncate max-w-[180px]">{patient.email}</span>
                      </div>
                    )}
                    {patient.address && (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" />
                        <span className="truncate max-w-[200px]">{patient.address}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions - Right side */}
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <Link href={`/patients/${patientId}/edit`}>
                    <Button variant="outline" size="sm" className="w-full">
                      <Edit className="mr-2 h-4 w-4" />
                      {t("actions.edit")}
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Dashboard Stats Bar */}
              {dashboard && (
                <div className="mt-4 pt-4 border-t grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary">{dashboard.completedSessions}</p>
                    <p className="text-xs text-muted-foreground">{t("stats.completedSessions")}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">{dashboard.upcomingAppointments}</p>
                    <p className="text-xs text-muted-foreground">{t("stats.upcomingAppointments")}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{dashboard.activeTreatmentPlans}</p>
                    <p className="text-xs text-muted-foreground">{t("stats.activeTreatmentPlans")}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">
                      {dashboard.lastVisit
                        ? formatRelativeTime(dashboard.lastVisit)
                        : t("stats.noVisit")}
                    </p>
                    <p className="text-xs text-muted-foreground">{t("stats.lastVisit")}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          {stats && <QuickStats stats={stats} />}
          {isLoadingStats && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32 rounded-lg" />
              ))}
            </div>
          )}

          {/* START SESSION CTA */}
          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold">{t("startSession.title")}</h3>
                  <p className="text-green-100">
                    {t("startSession.description")}
                  </p>
                </div>
                <Link href={`/patients/${patientId}/session/new`}>
                  <Button
                    size="lg"
                    variant="secondary"
                    className="text-green-600 hover:text-green-700"
                  >
                    <Play className="mr-2 h-5 w-5" />
                    {t("startSession.button")}
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs defaultValue="status">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="status">{t("tabs.status")}</TabsTrigger>
              <TabsTrigger value="sessions">{t("tabs.sessions")}</TabsTrigger>
              <TabsTrigger value="exercises">{t("tabs.exercises")}</TabsTrigger>
              <TabsTrigger value="progress">{t("tabs.progress")}</TabsTrigger>
              <TabsTrigger value="files">{t("tabs.files")}</TabsTrigger>
            </TabsList>

            <TabsContent value="status" className="mt-4 space-y-4">
              {/* Current Status Card - Progress Overview */}
              {stats && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      {t("currentStatus.title")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Pain Level */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">{t("currentStatus.painLevel")}</span>
                        <span className="text-sm text-muted-foreground">
                          {stats.painLevel}/10
                        </span>
                      </div>
                      <div className="relative h-3 bg-secondary rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "absolute h-full transition-all rounded-full",
                            stats.painLevel <= 3
                              ? "bg-green-500"
                              : stats.painLevel <= 6
                              ? "bg-yellow-500"
                              : "bg-red-500"
                          )}
                          style={{ width: `${stats.painLevel * 10}%` }}
                        />
                        {/* Pain level indicator mark */}
                        <div
                          className="absolute top-0 bottom-0 w-0.5 bg-foreground/50"
                          style={{ left: `${stats.painLevel * 10}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {stats.painLevel <= 3
                          ? t("currentStatus.painLow")
                          : stats.painLevel <= 6
                          ? t("currentStatus.painMedium")
                          : t("currentStatus.painHigh")}
                      </p>
                    </div>

                    {/* ROM Progress */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">{t("currentStatus.rom")}</span>
                        <span className="text-sm text-muted-foreground">
                          {stats.romProgress}%
                        </span>
                      </div>
                      <div className="relative h-3 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="absolute h-full bg-blue-500 transition-all rounded-full"
                          style={{ width: `${stats.romProgress}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t("currentStatus.romDescription")}
                      </p>
                    </div>

                    {/* Goal Progress */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">{t("currentStatus.goalProgress")}</span>
                        <span className="text-sm text-muted-foreground">
                          {stats.goalProgress}%
                        </span>
                      </div>
                      <div className="relative h-3 bg-secondary rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "absolute h-full transition-all rounded-full",
                            stats.goalProgress >= 75
                              ? "bg-green-500"
                              : stats.goalProgress >= 50
                              ? "bg-blue-500"
                              : stats.goalProgress >= 25
                              ? "bg-yellow-500"
                              : "bg-gray-400"
                          )}
                          style={{ width: `${stats.goalProgress}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {stats.completedSessions}/{stats.totalSessions} {t("currentStatus.sessionsCompleted")}
                        {stats.goalProgress >= 75 && ` - ${t("currentStatus.progressGood")}`}
                        {stats.goalProgress >= 50 && stats.goalProgress < 75 && ` - ${t("currentStatus.progressOnTrack")}`}
                        {stats.goalProgress < 50 && ` - ${t("currentStatus.progressNeedsWork")}`}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Detailed Information Card */}
              <Card>
                <CardHeader>
                  <CardTitle>{t("detailedInfo.title")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Insurance - from dashboard with more details */}
                  {activeInsurances.length > 0 ? (
                    <div>
                      <h4 className="text-sm font-medium flex items-center gap-2 mb-3">
                        <Shield className="h-4 w-4" />
                        {t("detailedInfo.healthInsurance")}
                      </h4>
                      <div className="space-y-3">
                        {activeInsurances.map((ins: PatientInsurance) => {
                          const isExpired = ins.validTo && new Date(ins.validTo) < new Date();
                          const providerLabel = {
                            bhyt: t("insurance.bhytFull"),
                            private: t("insurance.privateFull"),
                            corporate: t("insurance.corporateFull"),
                          }[ins.providerType] ?? ins.providerType;

                          return (
                            <div
                              key={ins.id}
                              className={cn(
                                "p-3 rounded-lg border",
                                ins.isPrimary ? "border-primary/30 bg-primary/5" : "border-border"
                              )}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium text-sm">{providerLabel}</span>
                                <div className="flex items-center gap-2">
                                  {ins.isPrimary && (
                                    <Badge variant="secondary" className="text-xs">
                                      {t("insurance.primary")}
                                    </Badge>
                                  )}
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      "text-xs",
                                      isExpired
                                        ? "bg-red-50 text-red-700 border-red-200"
                                        : ins.verificationStatus === "verified"
                                        ? "bg-green-50 text-green-700 border-green-200"
                                        : "bg-yellow-50 text-yellow-700 border-yellow-200"
                                    )}
                                  >
                                    {isExpired ? (
                                      <>
                                        <AlertCircle className="h-3 w-3 mr-1" />
                                        {t("insurance.expired")}
                                      </>
                                    ) : ins.verificationStatus === "verified" ? (
                                      <>
                                        <CheckCircle className="h-3 w-3 mr-1" />
                                        {t("insurance.verified")}
                                      </>
                                    ) : (
                                      t("insurance.notVerified")
                                    )}
                                  </Badge>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                                <div>
                                  <span className="text-xs">{t("insurance.policyNumber")}:</span>
                                  <p className="font-mono text-foreground">{ins.policyNumber}</p>
                                </div>
                                <div>
                                  <span className="text-xs">{t("insurance.coverage")}:</span>
                                  <p className="text-foreground font-medium">{ins.coveragePercentage}%</p>
                                </div>
                                {ins.validTo && (
                                  <div className="col-span-2">
                                    <span className="text-xs">{t("insurance.validUntil")}:</span>
                                    <p className="text-foreground">{formatDate(ins.validTo)}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : patient.insuranceType && (
                    <div>
                      <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                        <Shield className="h-4 w-4" />
                        {t("detailedInfo.insurance")}
                      </h4>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>
                          {t("detailedInfo.type")}:{" "}
                          {patient.insuranceType === "bhyt"
                            ? t("insurance.bhyt")
                            : patient.insuranceType === "private"
                            ? t("insurance.private")
                            : t("insurance.selfPay")}
                        </p>
                        {patient.insuranceNumber && (
                          <p>{t("insurance.policyNumber")}: {patient.insuranceNumber}</p>
                        )}
                        {patient.insuranceExpiry && (
                          <p>
                            {t("insurance.validUntil")}: {formatDate(patient.insuranceExpiry)}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Emergency contact */}
                  {patient.emergencyContactName && (
                    <div>
                      <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                        <Phone className="h-4 w-4" />
                        {t("detailedInfo.emergencyContact")}
                      </h4>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p className="text-foreground">{patient.emergencyContactName}</p>
                        {patient.emergencyContactPhone && (
                          <p>{patient.emergencyContactPhone}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Primary Therapist */}
                  {patient.primaryTherapistName && (
                    <div>
                      <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                        <User className="h-4 w-4" />
                        {t("detailedInfo.primaryTherapist")}
                      </h4>
                      <p className="text-sm text-foreground">
                        {patient.primaryTherapistName}
                      </p>
                    </div>
                  )}

                  {/* Next Appointment */}
                  {dashboard?.nextAppointment && (
                    <div>
                      <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                        <Calendar className="h-4 w-4" />
                        {t("detailedInfo.nextAppointment")}
                      </h4>
                      <p className="text-sm text-foreground">
                        {formatDate(dashboard.nextAppointment)}
                      </p>
                    </div>
                  )}

                  {/* Notes */}
                  {patient.notes && (
                    <div>
                      <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                        <FileText className="h-4 w-4" />
                        {t("detailedInfo.notes")}
                      </h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {patient.notes}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="sessions" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>{t("sessions.title")}</CardTitle>
                </CardHeader>
                <CardContent>
                  {sessionsData?.data && sessionsData.data.length > 0 ? (
                    <div className="space-y-4">
                      {sessionsData.data.map((session: PatientSession) => (
                        <SessionCard key={session.id} session={session} t={t} />
                      ))}
                      {sessionsData.meta.totalPages > 1 && (
                        <Button variant="outline" className="w-full">
                          {t("sessions.viewAll")}
                        </Button>
                      )}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">
                      {t("sessions.empty")}
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="exercises" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>{t("exercises.title")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-center py-8">
                    {t("exercises.empty")}
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="progress" className="mt-4 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>{t("progress.title")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Link href={`/patients/${patientId}/assessment`}>
                    <Button variant="outline" className="w-full justify-start">
                      <Activity className="mr-2 h-4 w-4" />
                      {t("progress.romMmt")}
                    </Button>
                  </Link>
                  <Link href={`/patients/${patientId}/outcomes`}>
                    <Button variant="outline" className="w-full justify-start">
                      <TrendingUp className="mr-2 h-4 w-4" />
                      {t("progress.outcomeMeasures")}
                    </Button>
                  </Link>
                  <Link href={`/patients/${patientId}/assessment?tab=reevaluation`}>
                    <Button variant="outline" className="w-full justify-start">
                      <TrendingUp className="mr-2 h-4 w-4" />
                      {t("progress.reevaluation")}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="files" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>{t("files.title")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-center py-8">
                    {t("files.empty")}
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar - Timeline and Next Appointment */}
        <div className="space-y-6">
          {/* Next Appointment Card */}
          {dashboard?.nextAppointment && (
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Calendar className="h-5 w-5 text-primary" />
                  {t("sidebar.upcomingAppointment")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-semibold">
                  {formatDate(dashboard.nextAppointment)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {formatRelativeTime(dashboard.nextAppointment)}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Timeline Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                {t("sidebar.recentActivity")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {timeline && timeline.length > 0 ? (
                <div>
                  {timeline.slice(0, 5).map((entry: PatientTimelineEntry) => (
                    <TimelineItem key={entry.id} entry={entry} />
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  {t("sidebar.noActivity")}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
