"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  Calculator,
  Calendar,
  CreditCard,
  FileText,
  LayoutDashboard,
  Library,
  Settings,
  User,
  UserPlus,
  Users,
} from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CommandItemData {
  icon: React.ElementType;
  label: string;
  shortcut?: string;
  action: () => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("commandPalette");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedIndex, setSelectedIndex] = React.useState(0);

  // Navigation items
  const navigationItems: CommandItemData[] = React.useMemo(
    () => [
      {
        icon: LayoutDashboard,
        label: t("navigation.dashboard"),
        action: () => router.push(`/${locale}`),
      },
      {
        icon: Calendar,
        label: t("navigation.schedule"),
        action: () => router.push(`/${locale}/schedule`),
      },
      {
        icon: Users,
        label: t("navigation.patients"),
        action: () => router.push(`/${locale}/patients`),
      },
      {
        icon: Library,
        label: t("navigation.library"),
        action: () => router.push(`/${locale}/library`),
      },
      {
        icon: FileText,
        label: t("navigation.reports"),
        action: () => router.push(`/${locale}/reports`),
      },
    ],
    [router, locale, t]
  );

  // Quick actions
  const quickActions: CommandItemData[] = React.useMemo(
    () => [
      {
        icon: UserPlus,
        label: t("actions.newPatient"),
        shortcut: "N",
        action: () => router.push(`/${locale}/patients/new`),
      },
      {
        icon: Calculator,
        label: t("actions.newAssessment"),
        shortcut: "A",
        action: () => router.push(`/${locale}/assessments/new`),
      },
      {
        icon: CreditCard,
        label: t("actions.newSession"),
        shortcut: "S",
        action: () => router.push(`/${locale}/sessions/new`),
      },
    ],
    [router, locale, t]
  );

  // Settings items
  const settingsItems: CommandItemData[] = React.useMemo(
    () => [
      {
        icon: User,
        label: t("settings.profile"),
        action: () => router.push(`/${locale}/settings/profile`),
      },
      {
        icon: Settings,
        label: t("settings.preferences"),
        action: () => router.push(`/${locale}/settings`),
      },
    ],
    [router, locale, t]
  );

  // All items flattened for keyboard navigation - used via filteredAllItems
  const _allItems = React.useMemo(
    () => [...navigationItems, ...quickActions, ...settingsItems],
    [navigationItems, quickActions, settingsItems]
  );
  void _allItems; // Prevent unused variable warning

  // Filter items based on search query
  const filteredNavigationItems = navigationItems.filter((item) =>
    item.label.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredQuickActions = quickActions.filter((item) =>
    item.label.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredSettingsItems = settingsItems.filter((item) =>
    item.label.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredAllItems = [
    ...filteredNavigationItems,
    ...filteredQuickActions,
    ...filteredSettingsItems,
  ];

  // Reset selection when search changes
  React.useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  // Handle keyboard navigation
  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < filteredAllItems.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredAllItems.length - 1
        );
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filteredAllItems[selectedIndex]) {
          filteredAllItems[selectedIndex].action();
          onOpenChange(false);
        }
      }
    },
    [filteredAllItems, selectedIndex, onOpenChange]
  );

  const handleItemClick = (action: () => void) => {
    action();
    onOpenChange(false);
  };

  // Calculate the index offset for each section
  const getItemIndex = (sectionItems: CommandItemData[], localIndex: number) => {
    if (sectionItems === filteredNavigationItems) {
      return localIndex;
    }
    if (sectionItems === filteredQuickActions) {
      return filteredNavigationItems.length + localIndex;
    }
    return filteredNavigationItems.length + filteredQuickActions.length + localIndex;
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <div onKeyDown={handleKeyDown}>
        <CommandInput
          placeholder={t("placeholder")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <CommandList>
          <CommandEmpty>{t("noResults")}</CommandEmpty>

          {filteredNavigationItems.length > 0 && (
            <CommandGroup heading={t("groups.navigation")}>
              {filteredNavigationItems.map((item, index) => (
                <CommandItem
                  key={item.label}
                  selected={selectedIndex === getItemIndex(filteredNavigationItems, index)}
                  onClick={() => handleItemClick(item.action)}
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  <span>{item.label}</span>
                  {item.shortcut && (
                    <CommandShortcut>{item.shortcut}</CommandShortcut>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {filteredQuickActions.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading={t("groups.quickActions")}>
                {filteredQuickActions.map((item, index) => (
                  <CommandItem
                    key={item.label}
                    selected={selectedIndex === getItemIndex(filteredQuickActions, index)}
                    onClick={() => handleItemClick(item.action)}
                  >
                    <item.icon className="mr-2 h-4 w-4" />
                    <span>{item.label}</span>
                    {item.shortcut && (
                      <CommandShortcut>{item.shortcut}</CommandShortcut>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {filteredSettingsItems.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading={t("groups.settings")}>
                {filteredSettingsItems.map((item, index) => (
                  <CommandItem
                    key={item.label}
                    selected={selectedIndex === getItemIndex(filteredSettingsItems, index)}
                    onClick={() => handleItemClick(item.action)}
                  >
                    <item.icon className="mr-2 h-4 w-4" />
                    <span>{item.label}</span>
                    {item.shortcut && (
                      <CommandShortcut>{item.shortcut}</CommandShortcut>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </CommandList>
      </div>
    </CommandDialog>
  );
}
