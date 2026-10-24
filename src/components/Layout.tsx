import { type ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderKanban,
  FileText,
  TrendingUp,
  Users,
  ShieldCheck,
  LogOut,
  Menu,
  BookOpen,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import Logo from '@/components/Logo';
import { useState } from 'react';

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  show: boolean;
}

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const perms = usePermissions();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems: NavItem[] = [
    { to: '/dashboard', label: 'Panel Gerencial', icon: LayoutDashboard, show: perms.canViewDashboard },
    { to: '/proyectos', label: 'Proyectos', icon: FolderKanban, show: perms.canManageProjects },
    { to: '/costos', label: 'Registro de Costos', icon: FileText, show: perms.canCreateCosts },
    { to: '/valorizaciones', label: 'Valorizaciones', icon: TrendingUp, show: perms.canCreateCosts },
    { to: '/usuarios', label: 'Usuarios', icon: Users, show: perms.canManageUsers },
    { to: '/auditoria', label: 'Auditoría', icon: ShieldCheck, show: perms.canViewAudit },
    { to: '/glosario', label: 'Ayuda / Glosario', icon: BookOpen, show: true },
  ];

  const visibleItems = navItems.filter((item) => item.show);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar - desktop */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 flex flex-col transition-transform duration-200 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="h-16 flex items-center gap-3 px-5 border-b border-gray-200">
          <Logo size={40} />
          <div>
            <p className="text-sm font-bold text-gray-900 leading-tight">IPROGEN</p>
            <p className="text-xs text-gray-500 leading-tight">S.A.C.</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {visibleItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`
              }
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-gray-200 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm">
              {user?.nombre.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.nombre}</p>
              <p className="text-xs text-gray-500">{user?.rol}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Superposición para móviles */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-gray-900/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Encabezado para móviles */}
        <header className="lg:hidden h-16 flex items-center gap-3 px-4 bg-white border-b border-gray-200">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg text-gray-600 hover:bg-gray-100"
          >
            <Menu className="w-5 h-5" />
          </button>
          <Logo size={32} />
          <span className="text-sm font-bold text-gray-900">IPROGEN S.A.C.</span>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-8 print-area">{children}</main>
      </div>
    </div>
  );
}
