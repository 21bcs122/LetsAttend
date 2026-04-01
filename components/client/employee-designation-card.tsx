"use client";

import { useDashboardUser } from "@/components/client/dashboard-user-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function EmployeeDesignationCard() {
  const { user } = useDashboardUser();
  return (
    <div className="mx-auto mb-4 max-w-2xl">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Designation</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-zinc-600 dark:text-zinc-300">
          {user?.designation?.trim() || "Not set"}
        </CardContent>
      </Card>
    </div>
  );
}
