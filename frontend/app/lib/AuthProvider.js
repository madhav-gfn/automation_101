"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { nhost } from "./nhost";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setSession(nhost.getUserSession());
    const unsubscribe = nhost.sessionStorage.onChange((s) => setSession(s));
    nhost.refreshSession(60).finally(() => setIsLoading(false));
    return unsubscribe;
  }, []);

  const signIn = useCallback(async (email, password) => {
    const res = await nhost.auth.signInEmailPassword({ email, password });
    if (!res.body.session) {
      throw new Error("Sign-in did not return a session (MFA is not supported here).");
    }
    return res.body.session;
  }, []);

  const signUp = useCallback(async (email, password, displayName) => {
    const res = await nhost.auth.signUpEmailPassword({
      email,
      password,
      options: displayName ? { displayName } : undefined,
    });
    return res.body.session ?? null;
  }, []);

  const signOut = useCallback(async () => {
    const current = nhost.getUserSession();
    try {
      await nhost.auth.signOut({ refreshToken: current?.refreshToken });
    } finally {
      nhost.clearSession();
    }
  }, []);

  const value = {
    session,
    user: session?.user ?? null,
    isAuthenticated: Boolean(session),
    isLoading,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
