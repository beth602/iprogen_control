import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Pencil, Trash2, Loader2, Search, FileText, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import type { RegistroCosto, CuentaControl, Proyecto } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/format';
import Modal from '@/components/Modal';
import Button from '@/components/Button';
import Badge from '@/components/Badge';
import { Field, Input, Select } from '@/components/FormControls';
import TermTooltip from '@/components/TermTooltip';
import { tooltipDescriptions } from '@/lib/glossary';

interface FormState {
  cuenta_control_id: string;
  descripcion_recurso: string;
  unidad_medida: string;
  cantidad_qty: string;
  costo_unitario: string;
  costo_planificado_pv: string;
  valor_ganado_ev: string;
  costo_real_ac: string;
  fecha_registro: string;
}

const emptyForm: FormState = {
  cuenta_control_id: '',
  descripcion_recurso: '',
  unidad_medida: '',
  cantidad_qty: '0',
  costo_unitario: '0',
  costo_planificado_pv: '0',
  valor_ganado_ev: '0',
  costo_real_ac: '0',
  fecha_registro: new Date().toISOString().split('T')[0],
};

export default function CostRecords() {
  const { user } = useAuth();
  const perms = usePermissions();
  const [records, setRecords] = useState<RegistroCosto[]>([]);
  const [accounts, setAccounts] = useState<CuentaControl[]>([]);
  const [projects, setProjects] = useState<Proyecto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterProject, setFilterProject] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<RegistroCosto | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [recRes, accRes, projRes] = await Promise.all([
      supabase
        .from('registro_costo')
        .select('*')
        .order('fecha_registro', { ascending: false })
        .order('id', { ascending: false }),
      supabase.from('cuenta_control').select('*').eq('activo', true).order('codigo_cuenta'),
      supabase.from('proyecto').select('*').order('nombre'),
    ]);

    if (recRes.error) {
      setError(recRes.error.message);
      setLoading(false);
      return;
    }

    setRecords(recRes.data as RegistroCosto[]);
    setAccounts(accRes.data as CuentaControl[]);
    setProjects(projRes.data as Proyecto[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const accountMap = new Map(accounts.map((a) => [a.id, a]));
  const projectMap = new Map(projects.map((p) => [p.id, p]));

  const getProjectName = (accountId: number) => {
    const acc = accountMap.get(accountId);
    if (!acc) return '-';
    return projectMap.get(acc.proyecto_id)?.nombre ?? '-';
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, cuenta_control_id: accounts[0]?.id.toString() ?? '' });
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (r: RegistroCosto) => {
    setEditing(r);
    setForm({
      cuenta_control_id: r.cuenta_control_id.toString(),
      descripcion_recurso: r.descripcion_recurso,
      unidad_medida: r.unidad_medida ?? '',
      cantidad_qty: r.cantidad_qty.toString(),
      costo_unitario: r.costo_unitario.toString(),
      costo_planificado_pv: r.costo_planificado_pv.toString(),
      valor_ganado_ev: r.valor_ganado_ev.toString(),
      costo_real_ac: r.costo_real_ac.toString(),
      fecha_registro: r.fecha_registro,
    });
    setError(null);
    setModalOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        cuenta_control_id: parseInt(form.cuenta_control_id),
        usuario_id: user!.id,
        descripcion_recurso: form.descripcion_recurso,
        unidad_medida: form.unidad_medida || null,
        cantidad_qty: parseFloat(form.cantidad_qty) || 0,
        costo_unitario: parseFloat(form.costo_unitario) || 0,
        costo_planificado_pv: parseFloat(form.costo_planificado_pv) || 0,
        valor_ganado_ev: parseFloat(form.valor_ganado_ev) || 0,
        costo_real_ac: parseFloat(form.costo_real_ac) || 0,
        fecha_registro: form.fecha_registro,
      };
      if (editing) {
        const { error: e } = await supabase
          .from('registro_costo')
          .update({ ...payload, modificado_por: user!.id })
          .eq('id', editing.id);
        if (e) throw e;
      } else {
        const { error: e } = await supabase.from('registro_costo').insert(payload);
        if (e) throw e;
      }
      setModalOpen(false);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (r: RegistroCosto) => {
    if (!confirm('¿Eliminar este registro de costo? Esta acción no se puede deshacer.')) return;
    const { error: delError } = await supabase.rpc('eliminar_registro_costo', {
      p_id: r.id,
      p_usuario_id: user!.id,
    });
    if (delError) {
      setError(delError.message);
      return;
    }
    fetchData();
  };

  const cvPreview =
    (parseFloat(form.valor_ganado_ev) || 0) - (parseFloat(form.costo_real_ac) || 0);

  const filteredAccountIds = filterProject
    ? new Set(accounts.filter((a) => a.proyecto_id === parseInt(filterProject)).map((a) => a.id))
    : null;

  const filtered = useMemo(() => {
    return records
      .filter((r) => {
        if (filteredAccountIds && !filteredAccountIds.has(r.cuenta_control_id)) return false;
        if (
          search &&
          !r.descripcion_recurso.toLowerCase().includes(search.toLowerCase()) &&
          !getProjectName(r.cuenta_control_id).toLowerCase().includes(search.toLowerCase())
        )
          return false;
        return true;
      })
      .sort((a, b) => {
        const cmp = new Date(a.fecha_registro).getTime() - new Date(b.fecha_registro).getTime();
        return sortDir === 'desc' ? -cmp : cmp;
      });
  }, [records, filteredAccountIds, search, sortDir, accounts, projects]);

  const toggleSort = () => setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Registro Diario de Costos</h1>
          <p className="text-sm text-gray-500 mt-1">
            Registra los recursos utilizados en cada cuenta de control
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4" />
          Nuevo Registro
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar por descripción o proyecto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            className="max-w-[200px]"
          >
            <option value="">Todos los proyectos</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </Select>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center">
            <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-400">No hay registros de costo.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="px-5 py-3">
                    <button
                      onClick={toggleSort}
                      className="flex items-center gap-1 hover:text-gray-700 transition-colors"
                    >
                      Fecha
                      {sortDir === 'desc' ? (
                        <ArrowDown className="w-3 h-3" />
                      ) : (
                        <ArrowUp className="w-3 h-3" />
                      )}
                    </button>
                  </th>
                  <th className="px-5 py-3">Proyecto</th>
                  <th className="px-5 py-3">Cuenta</th>
                  <th className="px-5 py-3">Recurso</th>
                  <th className="px-5 py-3 text-right">Cant.</th>
                  <th className="px-5 py-3 text-right">C. Unit.</th>
                  <th className="px-5 py-3 text-right">
                    <span className="inline-flex items-center gap-1">
                      PV
                      <TermTooltip term="PV" description={tooltipDescriptions['PV']}><span /></TermTooltip>
                    </span>
                  </th>
                  <th className="px-5 py-3 text-right">
                    <span className="inline-flex items-center gap-1">
                      EV
                      <TermTooltip term="EV" description={tooltipDescriptions['EV']}><span /></TermTooltip>
                    </span>
                  </th>
                  <th className="px-5 py-3 text-right">
                    <span className="inline-flex items-center gap-1">
                      AC
                      <TermTooltip term="AC" description={tooltipDescriptions['AC']}><span /></TermTooltip>
                    </span>
                  </th>
                  <th className="px-5 py-3 text-right">
                    <span className="inline-flex items-center gap-1">
                      CV
                      <TermTooltip term="CV" description={tooltipDescriptions['CV']}><span /></TermTooltip>
                    </span>
                  </th>
                  <th className="px-5 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((r) => {
                  const acc = accountMap.get(r.cuenta_control_id);
                  const cv = r.variacion_costo_cv;
                  return (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3 text-sm text-gray-600">
                        {formatDate(r.fecha_registro)}
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-900">
                        {getProjectName(r.cuenta_control_id)}
                      </td>
                      <td className="px-5 py-3 text-sm font-mono text-gray-600">
                        {acc?.codigo_cuenta ?? '-'}
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-900">
                        {r.descripcion_recurso}
                        {r.unidad_medida &&
                          !r.descripcion_recurso.trim().endsWith(`(${r.unidad_medida})`) && (
                            <span className="ml-1 text-xs text-gray-400">({r.unidad_medida})</span>
                          )}
                      </td>
                      <td className="px-5 py-3 text-sm text-right text-gray-600">
                        {r.cantidad_qty}
                      </td>
                      <td className="px-5 py-3 text-sm text-right text-gray-600 tabular-nums">
                        {formatCurrency(r.costo_unitario)}
                      </td>
                      <td className="px-5 py-3 text-sm text-right text-gray-600 tabular-nums">
                        {formatCurrency(r.costo_planificado_pv)}
                      </td>
                      <td className="px-5 py-3 text-sm text-right text-gray-600 tabular-nums">
                        {formatCurrency(r.valor_ganado_ev)}
                      </td>
                      <td className="px-5 py-3 text-sm text-right text-gray-600 tabular-nums">
                        {formatCurrency(r.costo_real_ac)}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums">
                        <Badge variant={cv >= 0 ? 'success' : 'danger'}>
                          {formatCurrency(cv)}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {perms.canEditCosts && (
                            <button
                              onClick={() => openEdit(r)}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          )}
                          {perms.canDelete && (
                            <button
                              onClick={() => handleDelete(r)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar Registro de Costo' : 'Nuevo Registro de Costo'}
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Cuenta de control">
              <Select
                value={form.cuenta_control_id}
                onChange={(e) => setForm({ ...form, cuenta_control_id: e.target.value })}
              >
                {accounts.map((a) => {
                  const proj = projectMap.get(a.proyecto_id);
                  return (
                    <option key={a.id} value={a.id}>
                      {proj?.nombre} - {a.codigo_cuenta} ({a.nombre_edt})
                    </option>
                  );
                })}
              </Select>
            </Field>
            <Field label="Fecha del registro">
              <Input
                type="date"
                value={form.fecha_registro}
                onChange={(e) => setForm({ ...form, fecha_registro: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Descripción del recurso">
            <Input
              value={form.descripcion_recurso}
              onChange={(e) => setForm({ ...form, descripcion_recurso: e.target.value })}
              placeholder="Cemento, mano de obra, alquiler de equipo..."
            />
          </Field>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Unidad de medida">
              <Input
                value={form.unidad_medida}
                onChange={(e) => setForm({ ...form, unidad_medida: e.target.value })}
                placeholder="m, m3, kg, glb"
              />
            </Field>
            <Field label="Cantidad (Qty)">
              <Input
                type="number"
                step="0.01"
                value={form.cantidad_qty}
                onChange={(e) => setForm({ ...form, cantidad_qty: e.target.value })}
              />
            </Field>
            <Field label="Costo unitario">
              <Input
                type="number"
                step="0.01"
                value={form.costo_unitario}
                onChange={(e) => setForm({ ...form, costo_unitario: e.target.value })}
              />
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Field label={<span className="inline-flex items-center gap-1">Costo planificado (PV) <TermTooltip term="PV" description={tooltipDescriptions['PV']}><span /></TermTooltip></span>}>
              <Input
                type="number"
                step="0.01"
                value={form.costo_planificado_pv}
                onChange={(e) => setForm({ ...form, costo_planificado_pv: e.target.value })}
              />
            </Field>
            <Field label={<span className="inline-flex items-center gap-1">Valor ganado (EV) <TermTooltip term="EV" description={tooltipDescriptions['EV']}><span /></TermTooltip></span>}>
              <Input
                type="number"
                step="0.01"
                value={form.valor_ganado_ev}
                onChange={(e) => setForm({ ...form, valor_ganado_ev: e.target.value })}
              />
            </Field>
            <Field label={<span className="inline-flex items-center gap-1">Costo real (AC) <TermTooltip term="AC" description={tooltipDescriptions['AC']}><span /></TermTooltip></span>}>
              <Input
                type="number"
                step="0.01"
                value={form.costo_real_ac}
                onChange={(e) => setForm({ ...form, costo_real_ac: e.target.value })}
              />
            </Field>
          </div>
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-gray-50 border border-gray-200">
            <span className="text-sm font-medium text-gray-700 inline-flex items-center gap-1">
              Variación de Costo (CV = EV − AC):
              <TermTooltip term="CV" description={tooltipDescriptions['CV']}><span /></TermTooltip>
            </span>
            <Badge variant={cvPreview >= 0 ? 'success' : 'danger'}>
              {formatCurrency(cvPreview)}
            </Badge>
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
