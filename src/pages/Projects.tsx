import { useState, useEffect, useCallback } from 'react';
import {
  FolderPlus,
  Pencil,
  ChevronRight,
  ChevronDown,
  Loader2,
  Layers,
  Plus,
  Trash2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { usePermissions } from '@/hooks/usePermissions';
import type { Proyecto, CuentaControl, Usuario } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/format';
import Modal from '@/components/Modal';
import Button from '@/components/Button';
import Badge from '@/components/Badge';
import { Field, Input, Select } from '@/components/FormControls';
import TermTooltip from '@/components/TermTooltip';
import { tooltipDescriptions } from '@/lib/glossary';

interface ProjectForm {
  codigo: string;
  nombre: string;
  estado: Proyecto['estado'];
  fecha_inicio: string;
  gerente_id: string;
}

interface AccountForm {
  codigo_cuenta: string;
  nombre_edt: string;
  responsable_id: string;
  presupuesto_base: string;
  reserva_contingencia: string;
  codigo_registro: string;
  responsable_campo: string;
}

const emptyProject: ProjectForm = {
  codigo: '',
  nombre: '',
  estado: 'Planificado',
  fecha_inicio: new Date().toISOString().split('T')[0],
  gerente_id: '',
};

const emptyAccount: AccountForm = {
  codigo_cuenta: '',
  nombre_edt: '',
  responsable_id: '',
  presupuesto_base: '0',
  reserva_contingencia: '0',
  codigo_registro: '',
  responsable_campo: '',
};

export default function Projects() {
  const perms = usePermissions();
  const [projects, setProjects] = useState<Proyecto[]>([]);
  const [managers, setManagers] = useState<Usuario[]>([]);
  const [allUsers, setAllUsers] = useState<Usuario[]>([]);
  const [accounts, setAccounts] = useState<Record<number, CuentaControl[]>>({});
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [projectModal, setProjectModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Proyecto | null>(null);
  const [projectForm, setProjectForm] = useState<ProjectForm>(emptyProject);
  const [savingProject, setSavingProject] = useState(false);

  const [accountModal, setAccountModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<CuentaControl | null>(null);
  const [accountProjectId, setAccountProjectId] = useState<number | null>(null);
  const [accountForm, setAccountForm] = useState<AccountForm>(emptyAccount);
  const [savingAccount, setSavingAccount] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [projRes, userRes] = await Promise.all([
      supabase.from('proyecto').select('*').order('id', { ascending: true }),
      supabase.from('usuario').select('*').order('nombre', { ascending: true }),
    ]);

    if (projRes.error) {
      setError(projRes.error.message);
      setLoading(false);
      return;
    }

    const projData = projRes.data as Proyecto[];
    const userData = userRes.data as Usuario[];
    setProjects(projData);
    setAllUsers(userData);
    setManagers(userData.filter((u) => u.rol === 'Gerente'));

    // Fetch all control accounts
    const { data: accData } = await supabase
      .from('cuenta_control')
      .select('*')
      .order('codigo_cuenta', { ascending: true });

    if (accData) {
      const accMap: Record<number, CuentaControl[]> = {};
      (accData as CuentaControl[]).forEach((acc) => {
        if (!accMap[acc.proyecto_id]) accMap[acc.proyecto_id] = [];
        accMap[acc.proyecto_id].push(acc);
      });
      setAccounts(accMap);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleExpand = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openCreateProject = () => {
    setEditingProject(null);
    setProjectForm({ ...emptyProject, gerente_id: managers[0]?.id.toString() ?? '' });
    setError(null);
    setProjectModal(true);
  };

  const openEditProject = (p: Proyecto) => {
    setEditingProject(p);
    setProjectForm({
      codigo: p.codigo,
      nombre: p.nombre,
      estado: p.estado,
      fecha_inicio: p.fecha_inicio,
      gerente_id: p.gerente_id.toString(),
    });
    setError(null);
    setProjectModal(true);
  };

  const handleSaveProject = async () => {
    setSavingProject(true);
    setError(null);
    try {
      const payload = {
        codigo: projectForm.codigo,
        nombre: projectForm.nombre,
        estado: projectForm.estado,
        fecha_inicio: projectForm.fecha_inicio,
        gerente_id: parseInt(projectForm.gerente_id),
      };
      if (editingProject) {
        const { error: e } = await supabase
          .from('proyecto')
          .update(payload)
          .eq('id', editingProject.id);
        if (e) throw e;
      } else {
        const { error: e } = await supabase.from('proyecto').insert(payload);
        if (e) throw e;
      }
      setProjectModal(false);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSavingProject(false);
    }
  };

  const openCreateAccount = (projectId: number) => {
    setEditingAccount(null);
    setAccountProjectId(projectId);
    setAccountForm({ ...emptyAccount, responsable_id: allUsers[0]?.id.toString() ?? '' });
    setError(null);
    setAccountModal(true);
  };

  const openEditAccount = (acc: CuentaControl) => {
    setEditingAccount(acc);
    setAccountProjectId(acc.proyecto_id);
    setAccountForm({
      codigo_cuenta: acc.codigo_cuenta,
      nombre_edt: acc.nombre_edt,
      responsable_id: acc.responsable_id.toString(),
      presupuesto_base: acc.presupuesto_base.toString(),
      reserva_contingencia: acc.reserva_contingencia.toString(),
      codigo_registro: acc.codigo_registro ?? '',
      responsable_campo: acc.responsable_campo ?? '',
    });
    setError(null);
    setAccountModal(true);
  };

  const handleSaveAccount = async () => {
    setSavingAccount(true);
    setError(null);
    try {
      const payload = {
        proyecto_id: accountProjectId,
        codigo_cuenta: accountForm.codigo_cuenta,
        nombre_edt: accountForm.nombre_edt,
        responsable_id: parseInt(accountForm.responsable_id),
        presupuesto_base: parseFloat(accountForm.presupuesto_base) || 0,
        reserva_contingencia: parseFloat(accountForm.reserva_contingencia) || 0,
        codigo_registro: accountForm.codigo_registro || null,
        responsable_campo: accountForm.responsable_campo || null,
      };
      if (editingAccount) {
        const { error: e } = await supabase
          .from('cuenta_control')
          .update(payload)
          .eq('id', editingAccount.id);
        if (e) throw e;
      } else {
        const { error: e } = await supabase.from('cuenta_control').insert(payload);
        if (e) throw e;
      }
      setAccountModal(false);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSavingAccount(false);
    }
  };

  const handleDeleteAccount = async (acc: CuentaControl) => {
    if (!confirm('¿Eliminar esta cuenta de control? Esta acción no se puede deshacer.')) return;
    await supabase.from('cuenta_control').update({ activo: false }).eq('id', acc.id);
    fetchData();
  };

  const bacPreview =
    (parseFloat(accountForm.presupuesto_base) || 0) +
    (parseFloat(accountForm.reserva_contingencia) || 0);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Proyectos y Cuentas de Control</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestiona proyectos de infraestructura y sus cuentas EDT/WBS
          </p>
        </div>
        <Button onClick={openCreateProject}>
          <FolderPlus className="w-4 h-4" />
          Nuevo Proyecto
        </Button>
      </div>

      <div className="space-y-3">
        {projects.map((p) => {
          const projectAccounts = accounts[p.id] ?? [];
          const isExpanded = expanded.has(p.id);
          const totalBac = projectAccounts
            .filter((a) => a.activo)
            .reduce((sum, a) => sum + a.bac, 0);
          return (
            <div
              key={p.id}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden"
            >
              <div
                className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggleExpand(p.id)}
              >
                <button className="text-gray-400">
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5" />
                  ) : (
                    <ChevronRight className="w-5 h-5" />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-sm font-mono text-gray-500">{p.codigo}</span>
                    <h3 className="text-sm font-semibold text-gray-900">{p.nombre}</h3>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Inicio: {formatDate(p.fecha_inicio)} · BAC Total:{' '}
                    {formatCurrency(totalBac)}
                  </p>
                </div>
                <Badge
                  variant={
                    p.estado === 'En Ejecución'
                      ? 'success'
                      : p.estado === 'Planificado'
                        ? 'info'
                        : p.estado === 'Concluido'
                          ? 'neutral'
                          : 'warning'
                  }
                >
                  {p.estado}
                </Badge>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openEditProject(p);
                  }}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </div>

              {isExpanded && (
                <div className="border-t border-gray-100">
                  {projectAccounts.length === 0 ? (
                    <div className="px-5 py-8 text-center text-sm text-gray-400">
                      No hay cuentas de control. Crea la primera.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            <th className="px-5 py-2.5">Código</th>
                            <th className="px-5 py-2.5">
                              <span className="inline-flex items-center gap-1">
                                EDT/WBS
                                <TermTooltip term="EDT/WBS" description={tooltipDescriptions['EDT/WBS']}>
                                  <span />
                                </TermTooltip>
                              </span>
                            </th>
                            <th className="px-5 py-2.5">Reg.</th>
                            <th className="px-5 py-2.5">Responsable Campo</th>
                            <th className="px-5 py-2.5 text-right">P. Base</th>
                            <th className="px-5 py-2.5 text-right">Reserva</th>
                            <th className="px-5 py-2.5 text-right">
                              <span className="inline-flex items-center gap-1">
                                BAC
                                <TermTooltip term="BAC" description={tooltipDescriptions['BAC']}>
                                  <span />
                                </TermTooltip>
                              </span>
                            </th>
                            <th className="px-5 py-2.5 text-center">Estado</th>
                            <th className="px-5 py-2.5 text-right">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {projectAccounts.map((acc) => (
                            <tr key={acc.id} className="hover:bg-gray-50">
                              <td className="px-5 py-3 text-sm font-mono text-gray-700">
                                {acc.codigo_cuenta}
                              </td>
                              <td className="px-5 py-3 text-sm text-gray-900">{acc.nombre_edt}</td>
                              <td className="px-5 py-3 text-sm text-gray-600">
                                {acc.codigo_registro ?? '-'}
                              </td>
                              <td className="px-5 py-3 text-sm text-gray-600">
                                {acc.responsable_campo ?? '-'}
                              </td>
                              <td className="px-5 py-3 text-sm text-right text-gray-700 tabular-nums">
                                {formatCurrency(acc.presupuesto_base)}
                              </td>
                              <td className="px-5 py-3 text-sm text-right text-gray-700 tabular-nums">
                                {formatCurrency(acc.reserva_contingencia)}
                              </td>
                              <td className="px-5 py-3 text-sm text-right font-semibold text-blue-700 tabular-nums">
                                {formatCurrency(acc.bac)}
                              </td>
                              <td className="px-5 py-3 text-center">
                                <Badge variant={acc.activo ? 'success' : 'neutral'}>
                                  {acc.activo ? 'Activa' : 'Inactiva'}
                                </Badge>
                              </td>
                              <td className="px-5 py-3 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => openEditAccount(acc)}
                                    className="text-blue-600 hover:text-blue-800"
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                  {perms.canDelete && (
                                    <button
                                      onClick={() => handleDeleteAccount(acc)}
                                      className="text-red-500 hover:text-red-700"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => openCreateAccount(p.id)}
                    >
                      <Plus className="w-4 h-4" />
                      Agregar Cuenta de Control
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {projects.length === 0 && !loading && (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <Layers className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-400">No hay proyectos registrados.</p>
          </div>
        )}
      </div>

      {/* Project Modal */}
      <Modal
        open={projectModal}
        onClose={() => setProjectModal(false)}
        title={editingProject ? 'Editar Proyecto' : 'Nuevo Proyecto'}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Código">
              <Input
                value={projectForm.codigo}
                onChange={(e) => setProjectForm({ ...projectForm, codigo: e.target.value })}
                placeholder="PRJ-001"
              />
            </Field>
            <Field label="Estado">
              <Select
                value={projectForm.estado}
                onChange={(e) =>
                  setProjectForm({ ...projectForm, estado: e.target.value as Proyecto['estado'] })
                }
              >
                <option value="Planificado">Planificado</option>
                <option value="En Ejecución">En Ejecución</option>
                <option value="Concluido">Concluido</option>
                <option value="Suspendido">Suspendido</option>
              </Select>
            </Field>
          </div>
          <Field label="Nombre del proyecto">
            <Input
              value={projectForm.nombre}
              onChange={(e) => setProjectForm({ ...projectForm, nombre: e.target.value })}
              placeholder="Construcción de Puente..."
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Fecha de inicio">
              <Input
                type="date"
                value={projectForm.fecha_inicio}
                onChange={(e) => setProjectForm({ ...projectForm, fecha_inicio: e.target.value })}
              />
            </Field>
            <Field label="Gerente responsable">
              <Select
                value={projectForm.gerente_id}
                onChange={(e) => setProjectForm({ ...projectForm, gerente_id: e.target.value })}
              >
                {managers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nombre}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setProjectModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveProject} disabled={savingProject}>
              {savingProject ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Account Modal */}
      <Modal
        open={accountModal}
        onClose={() => setAccountModal(false)}
        title={editingAccount ? 'Editar Cuenta de Control' : 'Nueva Cuenta de Control'}
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Código de cuenta">
              <Input
                value={accountForm.codigo_cuenta}
                onChange={(e) => setAccountForm({ ...accountForm, codigo_cuenta: e.target.value })}
                placeholder="CC-001"
              />
            </Field>
            <Field label="Código de registro" hint="Ej. REG-001, para cruzar con instrumentos">
              <Input
                value={accountForm.codigo_registro}
                onChange={(e) =>
                  setAccountForm({ ...accountForm, codigo_registro: e.target.value })
                }
                placeholder="REG-001"
              />
            </Field>
          </div>
          <Field label={<span className="inline-flex items-center gap-1">Nombre EDT/WBS <TermTooltip term="EDT/WBS" description={tooltipDescriptions['EDT/WBS']}><span /></TermTooltip></span>}>
            <Input
              value={accountForm.nombre_edt}
              onChange={(e) => setAccountForm({ ...accountForm, nombre_edt: e.target.value })}
              placeholder="Estructura de desglose del trabajo..."
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Responsable (sistema)">
              <Select
                value={accountForm.responsable_id}
                onChange={(e) =>
                  setAccountForm({ ...accountForm, responsable_id: e.target.value })
                }
              >
                {allUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nombre} ({u.rol})
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Responsable de campo" hint="Cargo real de campo, solo informativo">
              <Input
                value={accountForm.responsable_campo}
                onChange={(e) =>
                  setAccountForm({ ...accountForm, responsable_campo: e.target.value })
                }
                placeholder="Maestro de Obra"
              />
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Presupuesto base">
              <Input
                type="number"
                step="0.01"
                value={accountForm.presupuesto_base}
                onChange={(e) =>
                  setAccountForm({ ...accountForm, presupuesto_base: e.target.value })
                }
              />
            </Field>
            <Field label="Reserva de contingencia">
              <Input
                type="number"
                step="0.01"
                value={accountForm.reserva_contingencia}
                onChange={(e) =>
                  setAccountForm({ ...accountForm, reserva_contingencia: e.target.value })
                }
              />
            </Field>
            <Field label={<span className="inline-flex items-center gap-1">BAC (Calculado) <TermTooltip term="BAC" description={tooltipDescriptions['BAC']}><span /></TermTooltip></span>}>
              <div className="flex items-center h-[42px] px-3.5 rounded-lg bg-blue-50 border border-blue-200">
                <span className="text-sm font-semibold text-blue-700 tabular-nums">
                  {formatCurrency(bacPreview)}
                </span>
              </div>
            </Field>
          </div>
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setAccountModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveAccount} disabled={savingAccount}>
              {savingAccount ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
