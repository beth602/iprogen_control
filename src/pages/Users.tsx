import { useState, useEffect, useCallback } from 'react';
import { UserPlus, Pencil, Loader2, Search, Eye, EyeOff } from 'lucide-react';
import bcrypt from 'bcryptjs';
import { supabase } from '@/lib/supabase';
import type { Usuario } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';
import Modal from '@/components/Modal';
import Button from '@/components/Button';
import Badge from '@/components/Badge';
import { Field, Input, Select } from '@/components/FormControls';

interface FormData {
  nombre: string;
  email: string;
  password: string;
  rol: 'Gerente' | 'Residente';
  estado: 'Activo' | 'Inactivo';
}

const emptyForm: FormData = {
  nombre: '',
  email: '',
  password: '',
  rol: 'Residente',
  estado: 'Activo',
};

export default function Users() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Usuario | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('usuario')
      .select('*')
      .order('id', { ascending: true });
    if (error) {
      setError(error.message);
    } else {
      setUsers(data as Usuario[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (u: Usuario) => {
    setEditing(u);
    setForm({
      nombre: u.nombre,
      email: u.email,
      password: '',
      rol: u.rol,
      estado: u.estado,
    });
    setError(null);
    setModalOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      if (editing) {
        // Estructura de actualización para usuarios existentes
        const updates: Record<string, string> = {
          nombre: form.nombre,
          email: form.email,
          rol: form.rol,
          estado: form.estado,
        };
        // Solo recalcula el hash si se ingresó una nueva contraseña
        if (form.password) {
          updates.password_hash = bcrypt.hashSync(form.password, 10);
        }
        const { error: updateError } = await supabase
          .from('usuario')
          .update(updates)
          .eq('id', editing.id);
        if (updateError) throw updateError;
      } else {
        // Validación obligatoria de clave para nuevos registros
        if (!form.password) {
          setError('La contraseña es obligatoria para nuevos usuarios.');
          setSaving(false);
          return;
        }
        // Generación de Hash seguro BCRYPT (Salt rounds = 10)
        const hash = bcrypt.hashSync(form.password, 10);
        const { error: insertError } = await supabase.from('usuario').insert({
          nombre: form.nombre,
          email: form.email,
          password_hash: hash,
          rol: form.rol,
          estado: form.estado,
        });
        if (insertError) throw insertError;
      }
      setModalOpen(false);
      fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const filtered = users.filter(
    (u) =>
      u.nombre.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Usuarios</h1>
          <p className="text-sm text-gray-500 mt-1">Administra los usuarios del sistema y sus roles</p>
        </div>
        <Button onClick={openCreate}>
          <UserPlus className="w-4 h-4" />
          Nuevo Usuario
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200">
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar usuario..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="px-5 py-3">Nombre</th>
                  <th className="px-5 py-3">Correo</th>
                  <th className="px-5 py-3">Rol</th>
                  <th className="px-5 py-3">Estado</th>
                  <th className="px-5 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5 text-sm font-medium text-gray-900">
                      {u.nombre}
                      {u.id === currentUser?.id && (
                        <span className="ml-2 text-xs text-blue-600">(Tú)</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-600">{u.email}</td>
                    <td className="px-5 py-3.5">
                      <Badge variant={u.rol === 'Gerente' ? 'info' : 'neutral'}>{u.rol}</Badge>
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant={u.estado === 'Activo' ? 'success' : 'danger'}>
                        {u.estado}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => openEdit(u)}
                        className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium"
                      >
                        <Pencil className="w-4 h-4" />
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar Usuario' : 'Nuevo Usuario'}
      >
        <div className="space-y-4">
          <Field label="Nombre completo">
            <Input
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              placeholder="Juan Pérez"
            />
          </Field>
          <Field label="Correo electrónico">
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="usuario@iprogen.com"
            />
          </Field>
          <Field label={editing ? 'Nueva contraseña (dejar en blanco para mantener)' : 'Contraseña'}>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Rol">
              <Select
                value={form.rol}
                onChange={(e) => setForm({ ...form, rol: e.target.value as FormData['rol'] })}
              >
                <option value="Residente">Residente</option>
                <option value="Gerente">Gerente</option>
              </Select>
            </Field>
            <Field label="Estado">
              <Select
                value={form.estado}
                onChange={(e) => setForm({ ...form, estado: e.target.value as FormData['estado'] })}
              >
                <option value="Activo">Activo</option>
                <option value="Inactivo">Inactivo</option>
              </Select>
            </Field>
          </div>
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
