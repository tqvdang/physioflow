import { redirect } from "next/navigation";

/**
 * Redirect to localized login page
 */
export default function LoginRedirect() {
  redirect("/vi/auth/login");
}
