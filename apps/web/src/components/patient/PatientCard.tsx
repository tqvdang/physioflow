"use client";

/**
 * Reusable patient card component
 * Displays patient info with photo, name, and status
 */

import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PatientStatusBadge } from "./PatientStatusBadge";
import { QuickStats } from "./QuickStats";
import { cn, formatDate } from "@/lib/utils";
import type { Patient, PatientQuickStats } from "@/types/patient";
import {
  Phone,
  Mail,
  Calendar,
  Edit,
  Play,
  ChevronRight,
} from "lucide-react";

interface PatientCardProps {
  patient: Patient;
  stats?: PatientQuickStats;
  variant?: "compact" | "full";
  showActions?: boolean;
  className?: string;
  locale?: string;
}

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

export function PatientCard({
  patient,
  stats,
  variant = "full",
  showActions = true,
  className,
  locale = "vi",
}: PatientCardProps) {
  const displayName = locale === "en" && patient.nameEn ? patient.nameEn : patient.nameVi;
  const age = calculateAge(patient.dateOfBirth);

  if (variant === "compact") {
    return (
      <Card className={cn("hover:shadow-md transition-shadow", className)}>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={patient.photoUrl} alt={displayName} />
              <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Link
                  href={`/${locale}/patients/${patient.id}`}
                  className="font-medium truncate hover:underline"
                >
                  {displayName}
                </Link>
                <PatientStatusBadge status={patient.status} />
              </div>
              <p className="text-sm text-muted-foreground">
                MRN: {patient.mrn} | {age} tuoi
              </p>
            </div>
            {showActions && (
              <Link href={`/${locale}/patients/${patient.id}`}>
                <Button variant="ghost" size="icon">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("hover:shadow-md transition-shadow", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={patient.photoUrl} alt={displayName} />
            <AvatarFallback className="text-lg">
              {getInitials(displayName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                href={`/${locale}/patients/${patient.id}`}
                className="text-lg font-semibold hover:underline"
              >
                {displayName}
              </Link>
              <PatientStatusBadge status={patient.status} />
            </div>
            {patient.nameEn && locale === "vi" && (
              <p className="text-sm text-muted-foreground">{patient.nameEn}</p>
            )}
            <p className="text-sm text-muted-foreground mt-1">
              MRN: {patient.mrn} | {age} tuoi |{" "}
              {patient.gender === "male"
                ? "Nam"
                : patient.gender === "female"
                ? "Nu"
                : "Khac"}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Contact Info */}
        <div className="space-y-2 mb-4">
          {patient.phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{patient.phone}</span>
            </div>
          )}
          {patient.email && (
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="truncate">{patient.email}</span>
            </div>
          )}
          {patient.lastVisitDate && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>Lan kham cuoi: {formatDate(patient.lastVisitDate)}</span>
            </div>
          )}
        </div>

        {/* Quick Stats */}
        {stats && <QuickStats stats={stats} variant="compact" className="mb-4" />}

        {/* Actions */}
        {showActions && (
          <div className="flex items-center gap-2 pt-2 border-t">
            <Link href={`/${locale}/patients/${patient.id}`} className="flex-1">
              <Button variant="outline" size="sm" className="w-full">
                Xem chi tiet
              </Button>
            </Link>
            <Link href={`/${locale}/patients/${patient.id}/edit`}>
              <Button variant="ghost" size="icon">
                <Edit className="h-4 w-4" />
              </Button>
            </Link>
            <Link href={`/${locale}/patients/${patient.id}/session/new`}>
              <Button size="icon" className="bg-green-600 hover:bg-green-700">
                <Play className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
