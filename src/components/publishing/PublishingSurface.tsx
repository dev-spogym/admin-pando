'use client';

import React from "react";
import AppLayout from "@/components/layout/AppLayout";

interface PublishingSurfaceProps {
  publicView?: boolean;
  children: React.ReactNode;
}

export default function PublishingSurface({ publicView = false, children }: PublishingSurfaceProps) {
  if (!publicView) {
    return <AppLayout>{children}</AppLayout>;
  }

  return (
    <main className="min-h-screen w-full bg-[linear-gradient(180deg,#f8fafc_0%,#eef4f7_48%,#e9eef5_100%)] px-3 py-4 sm:px-5 lg:px-7">
      <div className="mx-auto w-full max-w-[1540px]">
        {children}
      </div>
    </main>
  );
}
