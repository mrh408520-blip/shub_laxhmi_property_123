import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "./api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api.me()
      .then(({ user: currentUser }) => {
        if (active) setUser(currentUser);
      })
      .catch((error) => {
        if (active && error.status !== 401) console.error("Could not restore the sign-in session.", error);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const signIn = useCallback(async (values) => {
    const result = await api.login(values);
    setUser(result.user);
    return result.user;
  }, []);

  const signUp = useCallback(async (values) => {
    const result = await api.register(values);
    setUser(result.user);
    return result.user;
  }, []);

  const signInAdmin = useCallback(async (values) => {
    const result = await api.adminLogin(values);
    setUser(result.user);
    return result.user;
  }, []);

  const signOut = useCallback(async () => {
    await api.logout();
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, loading, signIn, signUp, signInAdmin, signOut }), [
    user, loading, signIn, signUp, signInAdmin, signOut,
  ]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider.");
  return context;
}
