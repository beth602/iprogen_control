import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import bcrypt from 'bcryptjs';
import { supabase } from '@/lib/supabase';
import type { Usuario, Rol } from '@/lib/types';

interface SessionUser {
  id: number;
  nombre: string;
  email: string;
  rol: Rol;
}

interface AuthContextValue {
  user: SessionUser | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const SESSION_KEY = 'iprogen_session';

function loadSession(): SessionUser | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(loadSession);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: queryError } = await supabase
        .from('usuario')
        .select('*')
        .eq('email', email)
        .single<Usuario>();

      if (queryError || !data) {
        setError('Correo o contraseña incorrectos.');
        setLoading(false);
        return false;
      }

      if (data.estado !== 'Activo') {
        setError('Su cuenta está inactiva. Contacte al administrador.');
        setLoading(false);
        return false;
      }

      const valid = bcrypt.compareSync(password, data.password_hash);
      if (!valid) {
        setError('Correo o contraseña incorrectos.');
        setLoading(false);
        return false;
      }

      const sessionUser: SessionUser = {
        id: data.id,
        nombre: data.nombre,
        email: data.email,
        rol: data.rol,
      };
      setUser(sessionUser);
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
      setLoading(false);
      return true;
    } catch {
      setError('Error de conexión. Intente nuevamente.');
      setLoading(false);
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    sessionStorage.removeItem(SESSION_KEY);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
