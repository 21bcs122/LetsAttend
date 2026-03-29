"use client";

import Link from "next/link";
import * as React from "react";
import { onAuthStateChanged } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { Button } from "@/components/ui/button";

export function LandingHeroButtons() {
  const [signedIn, setSignedIn] = React.useState(false);

  React.useEffect(() => {
    const auth = getFirebaseAuth();
    const unsub = onAuthStateChanged(auth, (u) => setSignedIn(!!u));
    return () => unsub();
  }, []);

  if (signedIn) {
    return (
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button asChild size="lg">
          <Link href="/dashboard/employee#employee-check-in">Check in</Link>
        </Button>
        <Button asChild size="lg" variant="secondary">
          <Link href="/dashboard/employee#employee-site-switch">Switch</Link>
        </Button>
        <Button asChild size="lg" variant="secondary">
          <Link href="/dashboard/employee#employee-check-out">Check out</Link>
        </Button>
        <Button asChild size="lg" variant="secondary">
          <Link href="/dashboard/employee/overtime">Overtime</Link>
        </Button>
        <Button asChild size="sm" variant="ghost" className="text-zinc-500">
          <Link href="/dashboard/employee">Full dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <Button asChild size="lg">
      <Link href="/signup">Get started</Link>
    </Button>
  );
}

