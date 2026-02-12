"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { handleCallback, getAndClearRedirectPath } from "@/lib/auth";

/**
 * OAuth callback page
 * Handles the authorization code exchange after Keycloak redirect
 */
export default function CallbackPage() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const processCallback = async () => {
      // Get authorization code and state from URL
      const code = searchParams.get("code");
      const state = searchParams.get("state");
      const errorParam = searchParams.get("error");
      const errorDescription = searchParams.get("error_description");

      // Handle error from Keycloak
      if (errorParam) {
        setError(errorDescription ?? errorParam);
        return;
      }

      // Validate required parameters
      if (!code || !state) {
        setError(t("invalidCallback"));
        return;
      }

      try {
        // Exchange code for tokens
        await handleCallback(code, state);

        // Set session cookie for middleware
        document.cookie = `physioflow_session=active; path=/; max-age=${60 * 60 * 24}; SameSite=Lax`;

        // Get redirect path and strip any locale prefix to avoid double-prefixing
        let redirectPath = getAndClearRedirectPath() ?? "/dashboard";
        // Strip locale prefix if present (e.g., /vi/dashboard -> /dashboard)
        const localePrefix = `/${locale}/`;
        if (redirectPath.startsWith(localePrefix)) {
          redirectPath = redirectPath.slice(localePrefix.length - 1);
        } else if (redirectPath === `/${locale}`) {
          redirectPath = "/dashboard";
        }
        // Ensure we redirect to dashboard instead of root
        if (redirectPath === "/" || redirectPath === "") {
          redirectPath = "/dashboard";
        }

        // Redirect to the original destination (locale prefix is auto-added by next-intl router)
        router.replace(redirectPath);
      } catch (err) {
        console.error("Callback error:", err);
        setError(err instanceof Error ? err.message : t("callbackError"));
      }
    };

    processCallback();
  }, [searchParams, router, t, locale]);

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-red-50 to-red-100 px-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{t("authenticationFailed")}</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push("/auth/login" as any)}
            className="w-full px-6 py-3 bg-blue-700 hover:bg-blue-800 text-white font-medium rounded-lg transition-colors duration-200"
          >
            {t("backToLogin")}
          </button>
        </div>
      </div>
    );
  }

  // Show loading state
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4">
          <svg
            className="animate-spin w-full h-full text-blue-600"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{t("authenticating")}</h1>
        <p className="text-gray-600">{t("pleaseWait")}</p>
      </div>
    </div>
  );
}
