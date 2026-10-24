import { type ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';

interface RequireRoleProps {
  rol: 'Gerente' | 'Residente';
  children: ReactNode;
  fallback?: ReactNode;
}

export default function RequireRole({ rol, children, fallback = null }: RequireRoleProps) {
  const { user } = useAuth();
  if (user?.rol !== rol) return <>{fallback}</>;
  return <>{children}</>;
}
