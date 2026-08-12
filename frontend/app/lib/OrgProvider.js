"use client";

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { useAuth } from "./AuthProvider";
import { gqlRequest } from "./graphql";

const OrgContext = createContext(null);

const MY_MEMBERSHIPS = `
  query MyMemberships($userId: uuid!) {
    org_members(where: { user_id: { _eq: $userId } }) {
      id
      org_id
      role
      organization {
        id
        name
        quota_calls_used
        quota_calls_allowed
      }
    }
  }
`;

const STORAGE_KEY = "ai-architect-current-org";

export function OrgProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const [memberships, setMemberships] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentOrgId, setCurrentOrgIdState] = useState(null);
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    if (!user) {
      setMemberships([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await gqlRequest(MY_MEMBERSHIPS, { userId: user.id });
      setMemberships(data.org_members);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (isAuthenticated) refetch();
    else {
      setMemberships([]);
      setIsLoading(false);
    }
  }, [isAuthenticated, refetch]);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
    if (stored) setCurrentOrgIdState(stored);
  }, []);

  useEffect(() => {
    if (memberships.length === 0) return;
    const stillValid = memberships.some((m) => m.org_id === currentOrgId);
    if (!currentOrgId || !stillValid) {
      setCurrentOrgIdState(memberships[0].org_id);
    }
  }, [memberships, currentOrgId]);

  const setCurrentOrgId = useCallback((orgId) => {
    setCurrentOrgIdState(orgId);
    if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, orgId);
  }, []);

  const currentMembership = useMemo(
    () => memberships.find((m) => m.org_id === currentOrgId) ?? null,
    [memberships, currentOrgId]
  );

  const value = {
    memberships,
    isLoading,
    error,
    currentOrgId,
    setCurrentOrgId,
    currentOrg: currentMembership?.organization ?? null,
    currentRole: currentMembership?.role ?? null,
    canEdit: currentMembership?.role === "owner" || currentMembership?.role === "editor",
    isOwner: currentMembership?.role === "owner",
    refetch,
  };

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}

export function useOrg() {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error("useOrg must be used within OrgProvider");
  return ctx;
}
