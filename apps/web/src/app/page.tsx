import { Activity, Calendar, FileText, Users } from "lucide-react";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold text-foreground">PhysioFlow</span>
          </div>
          <nav className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Welcome to PhysioFlow EMR
            </span>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="mt-2 text-muted-foreground">
            Welcome to PhysioFlow - Your Physiotherapy Electronic Medical Records System
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <DashboardCard
            title="Patients"
            value="--"
            description="Total registered patients"
            icon={<Users className="h-5 w-5 text-primary" />}
          />
          <DashboardCard
            title="Appointments"
            value="--"
            description="Today's appointments"
            icon={<Calendar className="h-5 w-5 text-success" />}
          />
          <DashboardCard
            title="Sessions"
            value="--"
            description="This week's sessions"
            icon={<Activity className="h-5 w-5 text-warning" />}
          />
          <DashboardCard
            title="Reports"
            value="--"
            description="Pending reports"
            icon={<FileText className="h-5 w-5 text-error" />}
          />
        </div>

        {/* Placeholder Content */}
        <div className="mt-8 rounded-lg border border-border bg-card p-8 text-center">
          <Activity className="mx-auto h-12 w-12 text-muted-foreground" />
          <h2 className="mt-4 text-xl font-semibold text-foreground">
            Getting Started
          </h2>
          <p className="mt-2 text-muted-foreground">
            This is a placeholder for the PhysioFlow dashboard.
            Components and features will be added as development progresses.
          </p>
        </div>
      </div>
    </main>
  );
}

interface DashboardCardProps {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
}

function DashboardCard({ title, value, description, icon }: DashboardCardProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
        {icon}
      </div>
      <div className="mt-2">
        <span className="text-2xl font-bold text-foreground">{value}</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </div>
  );
}
