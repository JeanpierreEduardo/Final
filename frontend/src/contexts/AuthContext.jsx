import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api('/auth/me').then((data) => setUser(data.user)).catch(() => { sessionStorage.removeItem('cinemax_jwt'); setUser(null); }).finally(() => setLoading(false));
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    async login(correo, contrasena) { const data = await api('/auth/login', { method: 'POST', body: JSON.stringify({ correo, contrasena }) }); sessionStorage.setItem('cinemax_jwt', data.token); setUser(data.user); return data.user; },
    async register(nombre, dni, correo, contrasena) { const data = await api('/auth/register', { method: 'POST', body: JSON.stringify({ nombre, dni, correo, contrasena }) }); sessionStorage.setItem('cinemax_jwt', data.token); setUser(data.user); return data.user; },
    async refresh() { const data = await api('/auth/me'); setUser(data.user); return data.user; },
    async logout() { await api('/auth/logout', { method: 'POST' }).catch(() => {}); sessionStorage.removeItem('cinemax_jwt'); setUser(null); }
  }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
