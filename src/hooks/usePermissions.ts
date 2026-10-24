import { useAuth } from '@/context/AuthContext';

export function usePermissions() {
  const { user } = useAuth();
  const isGerente = user?.rol === 'Gerente';
  const isResidente = user?.rol === 'Residente';

  return {
    isGerente,
    isResidente,
    canDelete: isGerente,
    canManageUsers: isGerente,
    canManageProjects: isGerente,
    canManageControlAccounts: isGerente,
    canViewAudit: isGerente,
    canViewDashboard: isGerente,
    canCreateCosts: isGerente || isResidente,
    canEditCosts: isGerente,
  };
}
