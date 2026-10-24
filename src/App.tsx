import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import Layout from '@/components/Layout';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import Projects from '@/pages/Projects';
import CostRecords from '@/pages/CostRecords';
import Valuations from '@/pages/Valuations';
import Users from '@/pages/Users';
import AuditLog from '@/pages/AuditLog';
import Glossary from '@/pages/Glossary';
import type { ReactNode } from 'react';

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

function GerenteRoute({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.rol !== 'Gerente') return <Navigate to="/costos" replace />;
  return <Layout>{children}</Layout>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/dashboard"
        element={
          <GerenteRoute>
            <Dashboard />
          </GerenteRoute>
        }
      />
      <Route
        path="/proyectos"
        element={
          <GerenteRoute>
            <Projects />
          </GerenteRoute>
        }
      />
      <Route
        path="/costos"
        element={
          <ProtectedRoute>
            <CostRecords />
          </ProtectedRoute>
        }
      />
      <Route
        path="/valorizaciones"
        element={
          <ProtectedRoute>
            <Valuations />
          </ProtectedRoute>
        }
      />
      <Route
        path="/usuarios"
        element={
          <GerenteRoute>
            <Users />
          </GerenteRoute>
        }
      />
      <Route
        path="/auditoria"
        element={
          <GerenteRoute>
            <AuditLog />
          </GerenteRoute>
        }
      />
      <Route
        path="/glosario"
        element={
          <ProtectedRoute>
            <Glossary />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
