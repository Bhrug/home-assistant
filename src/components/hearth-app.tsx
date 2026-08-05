"use client";

import { useState } from "react";
import { HomeDashboard } from "@/components/home-dashboard";
import { LoginScreen } from "@/components/login-screen";
import type { MemberId } from "@/data/household";

export function HearthApp() {
  const [signedInAs, setSignedInAs] = useState<MemberId | null>(null);

  if (!signedInAs) {
    return <LoginScreen onSignIn={setSignedInAs} />;
  }

  return (
    <HomeDashboard
      initialMemberId={signedInAs}
      onSignOut={() => setSignedInAs(null)}
    />
  );
}
