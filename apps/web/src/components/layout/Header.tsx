"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import {
  Bell,
  ChevronDown,
  LogOut,
  Plus,
  Search,
  Settings,
  User,
  UserPlus,
  FileText,
  Calendar,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MobileSidebar } from "@/components/layout/MobileSidebar";
import { useAuth } from "@/contexts/auth-context";

interface HeaderProps {
  onSearchOpen: () => void;
  mobileMenuOpen: boolean;
  onMobileMenuChange: (open: boolean) => void;
}

export function Header({
  onSearchOpen,
  mobileMenuOpen,
  onMobileMenuChange,
}: HeaderProps) {
  const t = useTranslations("header");
  const tAuth = useTranslations("auth");
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const userInitials = user
    ? `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase() ||
      user.email?.[0]?.toUpperCase() ||
      "U"
    : "U";

  // Mock notification count
  const notificationCount = 3;

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b bg-background px-4 lg:px-6">
      {/* Left side - Mobile menu + Search */}
      <div className="flex items-center gap-4">
        <MobileSidebar open={mobileMenuOpen} onOpenChange={onMobileMenuChange} />

        {/* Global search */}
        <Button
          variant="outline"
          className="hidden w-64 justify-start text-muted-foreground sm:flex"
          onClick={onSearchOpen}
        >
          <Search className="mr-2 h-4 w-4" />
          <span>{t("search")}</span>
          <kbd className="pointer-events-none ml-auto hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
            <span className="text-xs">Cmd</span>K
          </kbd>
        </Button>

        {/* Mobile search button */}
        <Button
          variant="ghost"
          size="icon"
          className="sm:hidden"
          onClick={onSearchOpen}
        >
          <Search className="h-5 w-5" />
          <span className="sr-only">{t("search")}</span>
        </Button>
      </div>

      {/* Right side - Actions */}
      <div className="flex items-center gap-2">
        {/* Quick actions dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="hidden sm:flex">
              <Plus className="mr-2 h-4 w-4" />
              {t("quickActions.title")}
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild>
              <Link href="/patients/new">
                <UserPlus className="mr-2 h-4 w-4" />
                {t("quickActions.newPatient")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/assessments/new">
                <FileText className="mr-2 h-4 w-4" />
                {t("quickActions.newAssessment")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/sessions/new">
                <Calendar className="mr-2 h-4 w-4" />
                {t("quickActions.newSession")}
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Mobile quick action button */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="sm:hidden">
              <Plus className="h-5 w-5" />
              <span className="sr-only">{t("quickActions.title")}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild>
              <Link href="/patients/new">
                <UserPlus className="mr-2 h-4 w-4" />
                {t("quickActions.newPatient")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/assessments/new">
                <FileText className="mr-2 h-4 w-4" />
                {t("quickActions.newAssessment")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/sessions/new">
                <Calendar className="mr-2 h-4 w-4" />
                {t("quickActions.newSession")}
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {notificationCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center p-0 text-xs"
                >
                  {notificationCount}
                </Badge>
              )}
              <span className="sr-only">{t("notifications")}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between">
              {t("notifications")}
              <Badge variant="secondary" className="ml-2">
                {notificationCount} {t("new")}
              </Badge>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="max-h-80 overflow-y-auto">
              <DropdownMenuItem className="flex flex-col items-start gap-1 py-3">
                <span className="font-medium">{t("notificationItems.appointmentReminder")}</span>
                <span className="text-xs text-muted-foreground">
                  {t("notificationItems.appointmentReminderDesc")}
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem className="flex flex-col items-start gap-1 py-3">
                <span className="font-medium">{t("notificationItems.newPatient")}</span>
                <span className="text-xs text-muted-foreground">
                  {t("notificationItems.newPatientDesc")}
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem className="flex flex-col items-start gap-1 py-3">
                <span className="font-medium">{t("notificationItems.reportReady")}</span>
                <span className="text-xs text-muted-foreground">
                  {t("notificationItems.reportReadyDesc")}
                </span>
              </DropdownMenuItem>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="justify-center">
              <Link href="/notifications">
                {t("viewAllNotifications")}
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Avatar className="h-8 w-8">
                <AvatarImage src={undefined} alt={user?.firstName} />
                <AvatarFallback className="text-xs">{userInitials}</AvatarFallback>
              </Avatar>
              <span className="sr-only">{tAuth("profile")}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span>
                  {user?.firstName} {user?.lastName}
                </span>
                <span className="text-xs font-normal text-muted-foreground">
                  {user?.email}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings/profile">
                <User className="mr-2 h-4 w-4" />
                {tAuth("profile")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings">
                <Settings className="mr-2 h-4 w-4" />
                {t("settings")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              {tAuth("logout")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
