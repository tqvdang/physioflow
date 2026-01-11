import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function LocalizedHomePage({ params }: PageProps) {
  const { locale } = await params;
  // Redirect to the authenticated dashboard
  // The (app) route group will handle authentication
  redirect(`/${locale}/dashboard`);
}
