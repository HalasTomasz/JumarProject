import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import apiClient, { clearStoredAuthToken, setUnauthorizedHandler } from '../api/client';

export const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('auth_token'));
  const [loading, setLoading] = useState(true);
  const isAuthenticated = Boolean(token && user);

  const clearAuthState = useCallback(() => {
    setUser(null);
    setToken(null);
    setLoading(false);
    clearStoredAuthToken();
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(clearAuthState);
    return () => setUnauthorizedHandler(null);
  }, [clearAuthState]);

  const fetchProfile = useCallback(async () => {
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const { data } = await apiClient.get('auth/me/');
      setUser(data);
    } catch (error) {
      clearAuthState();
    } finally {
      setLoading(false);
    }
  }, [clearAuthState, token]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const login = useCallback(async (credentials) => {
    const { data } = await apiClient.post('auth/login/', credentials);
    setToken(data.token);
    localStorage.setItem('auth_token', data.token);
    setUser(data.user);
    setLoading(false);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiClient.post('auth/logout/');
    } catch (error) {
      // ignore network errors to keep UX smooth
    } finally {
      clearAuthState();
    }
  }, [clearAuthState]);

  const value = useMemo(
    () => ({ user, token, loading, isAuthenticated, login, logout }),
    [user, token, loading, isAuthenticated, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
