"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
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
import { Separator } from "@/components/ui/separator";
import { LanguageToggle } from "@/components/common/LanguageToggle";
import { useAuth } from "@/contexts/auth-context";

interface NavItem {
  icon: React.ElementType;
  labelKey: string;
  href: string;
}

// Main navigation items shown in bottom nav (4 items + More)
const mainNavItems: NavItem[] = [
  { icon: Home, labelKey: "dashboard", href: "" },
  { icon: Calendar, labelKey: "schedule", href: "/schedule" },
  { icon: Users, labelKey: "patients", href: "/patients" },
  { icon: BookOpen, labelKey: "library", href: "/library" },
];

// Items shown in the "More" menu
const moreMenuItems: NavItem[] = [
  { icon: BarChart3, labelKey: "reports", href: "/reports" },
];

export function MobileNav() {
  const [moreMenuOpen, setMoreMenuOpen] = React.useState(false);
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

  // Check if any "more" menu item is active
  const isMoreActive = moreMenuItems.some((item) => isActive(item.href)) ||
    pathname.startsWith(`/${locale}/settings`);

  const handleLogout = async () => {
    try {
      await logout();
      setMoreMenuOpen(false);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleNavClick = () => {
    setMoreMenuOpen(false);
  };

  const userInitials = user
    ? `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase() ||
      user.email?.[0]?.toUpperCase() ||
      "U"
    : "U";

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background lg:hidden">
      <div className="flex h-16 items-center justify-around px-2">
        {/* Main navigation items */}
        {mainNavItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          const href = `/${locale}${item.href}`;

          return (
            <Link
              key={item.labelKey}
              href={href as any}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 py-2 transition-colors",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn("h-5 w-5", active && "stroke-[2.5px]")} />
              <span className="text-[10px] font-medium">
                {t(`nav.${item.labelKey}`)}
              </span>
            </Link>
          );
        })}

        {/* More menu */}
        <Sheet open={moreMenuOpen} onOpenChange={setMoreMenuOpen}>
          <SheetTrigger asChild>
            <button
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 py-2 transition-colors",
                isMoreActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Menu className={cn("h-5 w-5", isMoreActive && "stroke-[2.5px]")} />
              <span className="text-[10px] font-medium">
                {t("more")}
              </span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-auto max-h-[80vh] rounded-t-xl p-0">
            <SheetHeader className="border-b px-6 py-4">
              <SheetTitle className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <span className="text-lg font-bold">P</span>
                </div>
                <span className="text-lg font-semibold">PhysioFlow</span>
              </SheetTitle>
            </SheetHeader>

            <div className="px-4 py-4">
              {/* Additional nav items */}
              <div className="flex flex-col gap-1">
                {moreMenuItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  const href = `/${locale}${item.href}`;

                  return (
                    <Link
                      key={item.labelKey}
                      href={href as any}
                      onClick={handleNavClick}
                      className={cn(
                        "flex h-12 items-center gap-3 rounded-lg px-3 transition-colors",
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
              </div>

              <Separator className="my-4" />

              {/* Settings and profile */}
              <div className="flex flex-col gap-1">
                <Link
                  href={`/${locale}/settings` as any}
                  onClick={handleNavClick}
                  className={cn(
                    "flex h-12 items-center gap-3 rounded-lg px-3 transition-colors",
                    pathname.startsWith(`/${locale}/settings`)
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <Settings className="h-5 w-5" />
                  <span className="text-sm font-medium">{t("settings")}</span>
                </Link>
              </div>

              <Separator className="my-4" />

              {/* Language toggle */}
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-sm text-muted-foreground">{t("language")}</span>
                <LanguageToggle />
              </div>

              <Separator className="my-4" />

              {/* User section */}
              <div className="flex items-center gap-3 px-3 py-2">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={undefined} alt={user?.firstName} />
                  <AvatarFallback>{userInitials}</AvatarFallback>
                </Avatar>
                <div className="flex flex-1 flex-col">
                  <span className="text-sm font-medium">
                    {user?.firstName} {user?.lastName}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {user?.email}
                  </span>
                </div>
              </div>

              <div className="mt-2 flex flex-col gap-1">
                <Link
                  href={`/${locale}/settings/profile` as any}
                  onClick={handleNavClick}
                  className="flex h-12 items-center gap-3 rounded-lg px-3 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <User className="h-5 w-5" />
                  <span className="text-sm font-medium">{tAuth("profile")}</span>
                </Link>
                <Button
                  variant="ghost"
                  onClick={handleLogout}
                  className="h-12 justify-start gap-3 px-3 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                >
                  <LogOut className="h-5 w-5" />
                  <span className="text-sm font-medium">{tAuth("logout")}</span>
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
