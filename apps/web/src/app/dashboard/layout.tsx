"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Box, CircularProgress } from "@mui/material";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import {
  DashboardProvider,
  useDashboard,
} from "@/components/dashboard/DashboardContext";

function DashboardFrame({ children }: { children: React.ReactNode }) {
  const { loading } = useDashboard();
  if (loading) {
    return (
      <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <CircularProgress />
      </Box>
    );
  }
  return (
    <div className="app-shell">
      <DashboardSidebar />
      <main className="dashboard-main">{children}</main>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/login");
      return;
    }
    setAllowed(true);
  }, [router]);

  if (!allowed) {
    return (
      <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <DashboardProvider>
      <DashboardFrame>{children}</DashboardFrame>
    </DashboardProvider>
  );
}
