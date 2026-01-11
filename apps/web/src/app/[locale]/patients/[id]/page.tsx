"use client";

/**
 * Patient dashboard page
 * Displays patient overview with status, sessions timeline, and tabs
 */

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { PatientStatusBadge, QuickStats } from "@/components/patient";
import {
  usePatient,
  usePatientStats,
  usePatientSessions,
  usePatientTimeline,
} from "@/hooks/usePatients";
import { formatDate, formatRelativeTime, cn } from "@/lib/utils";
import type { PatientSession, PatientTimelineEntry } from "@/types/patient";
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
} from "lucide-react";

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
function SessionCard({ session }: { session: PatientSession }) {
  const statusColors = {
    scheduled: "bg-blue-100 text-blue-800",
    in_progress: "bg-yellow-100 text-yellow-800",
    completed: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
  };

  const statusLabels = {
    scheduled: "Da len lich",
    in_progress: "Dang dien ra",
    completed: "Hoan thanh",
    cancelled: "Da huy",
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
            {statusLabels[session.status]}
          </span>
        </div>
        <div className="space-y-1 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span>KTV: {session.therapistName}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>{session.duration} phut</span>
          </div>
          {session.painLevelBefore !== undefined && session.painLevelAfter !== undefined && (
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              <span>
                Dau: {session.painLevelBefore} → {session.painLevelAfter}
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
  const locale = (params.locale as string) ?? "vi";
  const patientId = params.id as string;

  // Fetch data
  const { data: patient, isLoading: isLoadingPatient } = usePatient(patientId);
  const { data: stats, isLoading: isLoadingStats } = usePatientStats(patientId);
  const { data: sessionsData } = usePatientSessions(patientId, { pageSize: 5 });
  const { data: timeline } = usePatientTimeline(patientId);

  // Loading state
  if (isLoadingPatient) {
    return <PatientDashboardSkeleton />;
  }

  // Not found
  if (!patient) {
    return (
      <div className="container mx-auto py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">Khong tim thay benh nhan</h1>
        <p className="text-muted-foreground mb-6">
          Benh nhan ban dang tim khong ton tai hoac da bi xoa.
        </p>
        <Link href={`/${locale}/patients`}>
          <Button>Quay lai danh sach</Button>
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
          onClick={() => router.push(`/${locale}/patients`)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">Ho so benh nhan</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Patient header card */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row gap-6">
                {/* Photo */}
                <Avatar className="h-24 w-24 mx-auto sm:mx-0">
                  <AvatarImage src={patient.photoUrl} alt={displayName} />
                  <AvatarFallback className="text-2xl">
                    {getInitials(displayName)}
                  </AvatarFallback>
                </Avatar>

                {/* Info */}
                <div className="flex-1 text-center sm:text-left">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                    <h2 className="text-xl font-bold">{displayName}</h2>
                    <PatientStatusBadge status={patient.status} />
                  </div>
                  {patient.nameEn && locale === "vi" && (
                    <p className="text-muted-foreground mb-2">{patient.nameEn}</p>
                  )}
                  <div className="flex flex-wrap justify-center sm:justify-start gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span>MRN: {patient.mrn}</span>
                    <span>|</span>
                    <span>{age} tuoi</span>
                    <span>|</span>
                    <span>
                      {patient.gender === "male"
                        ? "Nam"
                        : patient.gender === "female"
                        ? "Nu"
                        : "Khac"}
                    </span>
                  </div>

                  {/* Contact info */}
                  <div className="mt-4 space-y-2">
                    {patient.phone && (
                      <div className="flex items-center justify-center sm:justify-start gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{patient.phone}</span>
                      </div>
                    )}
                    {patient.email && (
                      <div className="flex items-center justify-center sm:justify-start gap-2 text-sm">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span>{patient.email}</span>
                      </div>
                    )}
                    {patient.address && (
                      <div className="flex items-center justify-center sm:justify-start gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{patient.address}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2">
                  <Link href={`/${locale}/patients/${patientId}/edit`}>
                    <Button variant="outline" className="w-full">
                      <Edit className="mr-2 h-4 w-4" />
                      Chinh sua
                    </Button>
                  </Link>
                </div>
              </div>
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
                  <h3 className="text-lg font-semibold">Bat dau buoi tap moi</h3>
                  <p className="text-green-100">
                    Tao phien dieu tri moi cho benh nhan
                  </p>
                </div>
                <Link href={`/${locale}/patients/${patientId}/session/new`}>
                  <Button
                    size="lg"
                    variant="secondary"
                    className="text-green-600 hover:text-green-700"
                  >
                    <Play className="mr-2 h-5 w-5" />
                    BAT DAU BUOI TAP
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs defaultValue="status">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="status">Trang thai</TabsTrigger>
              <TabsTrigger value="sessions">Buoi tap</TabsTrigger>
              <TabsTrigger value="exercises">Bai tap</TabsTrigger>
              <TabsTrigger value="progress">Tien trinh</TabsTrigger>
              <TabsTrigger value="files">Tai lieu</TabsTrigger>
            </TabsList>

            <TabsContent value="status" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Thong tin chi tiet</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Insurance */}
                  {patient.insuranceType && (
                    <div>
                      <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                        <Shield className="h-4 w-4" />
                        Bao hiem
                      </h4>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>
                          Loai:{" "}
                          {patient.insuranceType === "bhyt"
                            ? "BHYT"
                            : patient.insuranceType === "private"
                            ? "Bao hiem tu nhan"
                            : "Tu chi tra"}
                        </p>
                        {patient.insuranceNumber && (
                          <p>So the: {patient.insuranceNumber}</p>
                        )}
                        {patient.insuranceExpiry && (
                          <p>
                            Han su dung: {formatDate(patient.insuranceExpiry)}
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
                        Lien he khan cap
                      </h4>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>{patient.emergencyContactName}</p>
                        {patient.emergencyContactPhone && (
                          <p>{patient.emergencyContactPhone}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {patient.notes && (
                    <div>
                      <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                        <FileText className="h-4 w-4" />
                        Ghi chu
                      </h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {patient.notes}
                      </p>
                    </div>
                  )}

                  {/* Therapist */}
                  {patient.primaryTherapistName && (
                    <div>
                      <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                        <User className="h-4 w-4" />
                        Ky thuat vien phu trach
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {patient.primaryTherapistName}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="sessions" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Lich su buoi tap</CardTitle>
                </CardHeader>
                <CardContent>
                  {sessionsData?.data && sessionsData.data.length > 0 ? (
                    <div className="space-y-4">
                      {sessionsData.data.map((session) => (
                        <SessionCard key={session.id} session={session} />
                      ))}
                      {sessionsData.meta.totalPages > 1 && (
                        <Button variant="outline" className="w-full">
                          Xem tat ca buoi tap
                        </Button>
                      )}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">
                      Chua co buoi tap nao
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="exercises" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Chuong trinh bai tap</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-center py-8">
                    Chua co bai tap nao duoc chi dinh
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="progress" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Tien trinh dieu tri</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-center py-8">
                    Chua co du lieu tien trinh
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="files" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Tai lieu va ket qua</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-center py-8">
                    Chua co tai lieu nao
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar - Timeline */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Hoat dong gan day
              </CardTitle>
            </CardHeader>
            <CardContent>
              {timeline && timeline.length > 0 ? (
                <div>
                  {timeline.slice(0, 5).map((entry) => (
                    <TimelineItem key={entry.id} entry={entry} />
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  Chua co hoat dong nao
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
