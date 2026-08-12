"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { AuthProvider, useAuth } from "./lib/AuthProvider";
import { OrgProvider } from "./lib/OrgProvider";

const PUBLIC_ROUTES = new Set(["/login"]);

function RouteGuard({ children }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isPublicRoute = PUBLIC_ROUTES.has(pathname);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated && !isPublicRoute) {
      router.replace("/login");
    } else if (isAuthenticated && isPublicRoute) {
      router.replace("/");
    }
  }, [isLoading, isAuthenticated, isPublicRoute, router]);

  if (isLoading) {
    return (
      <div className="app-loading-screen">
        <span className="material-symbols-outlined animate-spin">progress_activity</span>
      </div>
    );
  }

  if ((!isAuthenticated && !isPublicRoute) || (isAuthenticated && isPublicRoute)) {
    return (
      <div className="app-loading-screen">
        <span className="material-symbols-outlined animate-spin">progress_activity</span>
      </div>
    );
  }

  return children;
}

export default function Providers({ children }) {
  return (
    <AuthProvider>
      <OrgProvider>
        <RouteGuard>{children}</RouteGuard>
      </OrgProvider>
    </AuthProvider>
  );
}
