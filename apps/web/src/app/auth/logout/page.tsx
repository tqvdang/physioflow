import { redirect } from "next/navigation";

/**
 * Redirect to localized logout page
 */
export default function LogoutRedirect() {
  redirect("/vi/auth/logout");
}
