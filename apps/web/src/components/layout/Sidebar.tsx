"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  BarChart3,
  BookOpen,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Home,
  LogOut,
  Settings,
  User,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { LanguageToggle } from "@/components/common/LanguageToggle";
import { useAuth } from "@/contexts/auth-context";

interface NavItem {
  icon: React.ElementType;
  labelKey: string;
  href: string;
}

const navItems: NavItem[] = [
  { icon: Home, labelKey: "dashboard", href: "" },
  { icon: Calendar, labelKey: "schedule", href: "/schedule" },
  { icon: Users, labelKey: "patients", href: "/patients" },
  { icon: BookOpen, labelKey: "library", href: "/library" },
  { icon: BarChart3, labelKey: "reports", href: "/reports" },
];

interface SidebarProps {
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}

export function Sidebar({ collapsed, onCollapsedChange }: SidebarProps) {
  const pathname = usePathname();
  const locale = useLocale();
  const t = useTranslations("sidebar");
  const tAuth = useTranslations("auth");
  const { user, logout } = useAuth();

  const isActive = (href: string) => {
    const fullPath = `/${locale}${href}`;
    if (href === "") {
      // Dashboard - exact match for locale root
      return pathname === `/${locale}` || pathname === `/${locale}/`;
    }
    return pathname.startsWith(fullPath);
  };

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

  return (
    <TooltipProvider delayDuration={0}>
      <div
        className={cn(
          "relative flex h-full flex-col border-r bg-background transition-all duration-300",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-center border-b px-4">
          <Link
            href={`/${locale}` as any}
            className="flex items-center gap-2 font-semibold"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <span className="text-lg font-bold">P</span>
            </div>
            {!collapsed && (
              <span className="text-lg font-semibold">PhysioFlow</span>
            )}
          </Link>
        </div>

        {/* Collapse toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute -right-3 top-20 z-10 h-6 w-6 rounded-full border bg-background shadow-sm"
          onClick={() => onCollapsedChange(!collapsed)}
        >
          {collapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronLeft className="h-3 w-3" />
          )}
        </Button>

        {/* Navigation */}
        <ScrollArea className="flex-1 px-3 py-4">
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              const href = `/${locale}${item.href}`;

              if (collapsed) {
                return (
                  <Tooltip key={item.labelKey}>
                    <TooltipTrigger asChild>
                      <Link
                        href={href as any}
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
                          active
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      {t(`nav.${item.labelKey}`)}
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return (
                <Link
                  key={item.labelKey}
                  href={href as any}
                  className={cn(
                    "flex h-10 items-center gap-3 rounded-lg px-3 transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-sm font-medium">
                    {t(`nav.${item.labelKey}`)}
                  </span>
                </Link>
              );
            })}
          </nav>
        </ScrollArea>

        {/* Bottom section */}
        <div className="border-t p-3">
          {/* Language toggle */}
          <div
            className={cn(
              "mb-3 flex items-center",
              collapsed ? "justify-center" : "justify-start px-1"
            )}
          >
            {collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <LanguageToggle />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right">
                  {t("language")}
                </TooltipContent>
              </Tooltip>
            ) : (
              <LanguageToggle />
            )}
          </div>

          <Separator className="mb-3" />

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start gap-2",
                  collapsed && "justify-center px-0"
                )}
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={undefined} alt={user?.firstName} />
                  <AvatarFallback className="text-xs">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                {!collapsed && (
                  <div className="flex flex-col items-start text-left">
                    <span className="text-sm font-medium">
                      {user?.firstName} {user?.lastName}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {user?.email}
                    </span>
                  </div>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align={collapsed ? "center" : "start"}
              side="top"
              className="w-56"
            >
              <DropdownMenuLabel>
                {user?.firstName} {user?.lastName}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href={`/${locale}/settings/profile` as any}>
                  <User className="mr-2 h-4 w-4" />
                  {tAuth("profile")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/${locale}/settings` as any}>
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
      </div>
    </TooltipProvider>
  );
}
