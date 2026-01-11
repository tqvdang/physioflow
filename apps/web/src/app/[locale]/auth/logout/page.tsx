"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { logout } from "@/lib/auth";

/**
 * Logout page component
 * Handles logout and redirects to Keycloak logout endpoint
 */
export default function LogoutPage() {
  const t = useTranslations("auth");

  useEffect(() => {
    const performLogout = async () => {
      // Clear session cookie
      document.cookie = "physioflow_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";

      // Logout from Keycloak
      await logout();
    };

    performLogout();
  }, []);

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
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{t("logout")}</h1>
        <p className="text-gray-600">{t("pleaseWait")}</p>
      </div>
    </div>
  );
}
