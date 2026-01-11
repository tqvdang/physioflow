import { redirect } from "next/navigation";

/**
 * Redirect to localized callback page
 */
export default function CallbackRedirect() {
  redirect("/vi/auth/callback");
}
