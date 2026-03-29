import { BrowserTimeZoneSync } from "@/components/client/browser-timezone-sync";
import { DashboardChrome } from "@/components/client/dashboard-chrome";
import { DashboardUserProvider } from "@/components/client/dashboard-user-context";
import { RequireAuth } from "@/components/client/require-auth";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RequireAuth>
      <DashboardUserProvider>
        <BrowserTimeZoneSync />
        <DashboardChrome>{children}</DashboardChrome>
      </DashboardUserProvider>
    </RequireAuth>
  );
}
