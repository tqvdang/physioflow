"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/routing";
import {
  BarChart3,
  BookOpen,
  Calendar,
  Home,
  LogOut,
  Menu,
  Settings,
  User,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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

interface MobileSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MobileSidebar({ open, onOpenChange }: MobileSidebarProps) {
  const pathname = usePathname();
  const t = useTranslations("sidebar");
  const tAuth = useTranslations("auth");
  const { user, logout } = useAuth();

  const isActive = (href: string) => {
    if (href === "") {
      return pathname === "/" || pathname === "";
    }
    return pathname.startsWith(href);
  };

  const handleLogout = async () => {
    try {
      await logout();
      onOpenChange(false);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleNavClick = () => {
    onOpenChange(false);
  };

  const userInitials = user
    ? `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase() ||
      user.email?.[0]?.toUpperCase() ||
      "U"
    : "U";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader className="border-b px-6 py-4">
          <SheetTitle className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <span className="text-lg font-bold">P</span>
            </div>
            <span className="text-lg font-semibold">PhysioFlow</span>
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1 px-3 py-4">
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              const href = item.href || "/dashboard";

              return (
                <Link
                  key={item.labelKey}
                  href={href}
                  onClick={handleNavClick}
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
        <div className="border-t p-4">
          {/* Language toggle */}
          <div className="mb-3 flex items-center justify-start px-1">
            <LanguageToggle />
          </div>

          <Separator className="mb-3" />

          {/* User info */}
          <div className="mb-3 flex items-center gap-3 px-1">
            <Avatar className="h-10 w-10">
              <AvatarImage src={undefined} alt={user?.firstName} />
              <AvatarFallback>{userInitials}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-sm font-medium">
                {user?.firstName} {user?.lastName}
              </span>
              <span className="text-xs text-muted-foreground">
                {user?.email}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <Link
              href="/settings/profile"
              onClick={handleNavClick}
              className="flex h-10 items-center gap-3 rounded-lg px-3 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <User className="h-5 w-5" />
              <span className="text-sm font-medium">{tAuth("profile")}</span>
            </Link>
            <Link
              href="/settings"
              onClick={handleNavClick}
              className="flex h-10 items-center gap-3 rounded-lg px-3 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <Settings className="h-5 w-5" />
              <span className="text-sm font-medium">{t("settings")}</span>
            </Link>
            <button
              onClick={handleLogout}
              className="flex h-10 w-full items-center gap-3 rounded-lg px-3 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <LogOut className="h-5 w-5" />
              <span className="text-sm font-medium">{tAuth("logout")}</span>
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
