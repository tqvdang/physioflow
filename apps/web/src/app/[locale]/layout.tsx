import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { type ReactNode } from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Supported locales
const locales = ["vi", "en"] as const;
type Locale = (typeof locales)[number];

interface LocaleLayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params;

  // Validate that the incoming `locale` parameter is valid
  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  // Providing all messages to the client side
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      <ErrorBoundary>
        {children}
      </ErrorBoundary>
    </NextIntlClientProvider>
  );
}
