"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface LanguageToggleProps {
  className?: string;
}

export function LanguageToggle({ className }: LanguageToggleProps) {
  const locale = useLocale();
  const t = useTranslations("sidebar");
  const router = useRouter();
  const pathname = usePathname();

  const toggleLocale = () => {
    const newLocale = locale === "vi" ? "en" : "vi";
    // Replace the locale in the pathname
    const segments = pathname.split("/");
    segments[1] = newLocale;
    const newPath = segments.join("/");
    router.push(newPath);
  };

  return (
    <button
      onClick={toggleLocale}
      className={cn(
        "flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
        className
      )}
      aria-label={t("switchLanguage")}
    >
      <span
        className={cn(
          "transition-opacity",
          locale === "vi" ? "opacity-100 font-semibold" : "opacity-50"
        )}
      >
        VI
      </span>
      <span className="text-muted-foreground">/</span>
      <span
        className={cn(
          "transition-opacity",
          locale === "en" ? "opacity-100 font-semibold" : "opacity-50"
        )}
      >
        EN
      </span>
    </button>
  );
}
