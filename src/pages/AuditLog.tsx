import { useState, useEffect, useCallback, useMemo } from 'react';
import { ShieldCheck, Loader2, Search, ArrowUp, ArrowDown } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Auditoria, Usuario } from '@/lib/types';
import { formatDateTime } from '@/lib/format';
import Badge from '@/components/Badge';
import { Input, Select } from '@/components/FormControls';

const tableLabels: Record<string, string> = {
  registro_costo: 'Registro de Costos',
  valorizacion: 'Valorizaciones',
  cuenta_control: 'Cuentas de Control',
  proyecto: 'Proyectos',
  usuario: 'Usuarios',
};

type RefMap = Record<string, string>;

export default function AuditLog() {
  const [logs, setLogs] = useState<Auditoria[]>([]);
  const [users, setUsers] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterTable, setFilterTable] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');
  const [refMap, setRefMap] = useState<RefMap>({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('auditoria')
      .select('*')
      .in('accion', ['UPDATE', 'DELETE'])
      .order('fecha_hora', { ascending: false })
      .order('id', { ascending: false })
      .limit(500);

    if (filterTable) query = query.eq('tabla_afectada', filterTable);
    if (filterAction) query = query.eq('accion', filterAction);
    if (dateFrom) query = query.gte('fecha_hora', `${dateFrom}T00:00:00`);
    if (dateTo) query = query.lte('fecha_hora', `${dateTo}T23:59:59`);

    const { data } = await query;
    const logData = (data as Auditoria[]) ?? [];
    setLogs(logData);

    const { data: userData } = await supabase
      .from('usuario')
      .select('*')
      .order('nombre');
    setUsers((userData as Usuario[]) ?? []);

    // Fetch readable references for affected records
    const newRefMap: RefMap = {};
    const idsByTable: Record<string, number[]> = {};
    for (const log of logData) {
      const key = `${log.tabla_afectada}:${log.registro_afectado_id}`;
      if (!newRefMap[key]) {
        if (!idsByTable[log.tabla_afectada]) idsByTable[log.tabla_afectada] = [];
        idsByTable[log.tabla_afectada].push(log.registro_afectado_id);
      }
    }

    const fetches: PromiseLike<void>[] = [];

    if (idsByTable['registro_costo']?.length) {
      fetches.push(
        supabase
          .from('registro_costo')
          .select('id, descripcion_recurso')
          .in('id', idsByTable['registro_costo'])
          .then(({ data }) => {
            (data ?? []).forEach((r: { id: number; descripcion_recurso: string }) => {
              newRefMap[`registro_costo:${r.id}`] = r.descripcion_recurso;
            });
          })
      );
    }

    if (idsByTable['valorizacion']?.length) {
      fetches.push(
        supabase
          .from('valorizacion')
          .select('id, periodo')
          .in('id', idsByTable['valorizacion'])
          .then(({ data }) => {
            (data ?? []).forEach((r: { id: number; periodo: string }) => {
              newRefMap[`valorizacion:${r.id}`] = r.periodo;
            });
          })
      );
    }

    if (idsByTable['cuenta_control']?.length) {
      fetches.push(
        supabase
          .from('cuenta_control')
          .select('id, codigo_cuenta, codigo_registro')
          .in('id', idsByTable['cuenta_control'])
          .then(({ data }) => {
            (data ?? []).forEach(
              (r: { id: number; codigo_cuenta: string; codigo_registro: string | null }) => {
                newRefMap[`cuenta_control:${r.id}`] =
                  r.codigo_registro ?? r.codigo_cuenta;
              }
            );
          })
      );
    }

    if (idsByTable['proyecto']?.length) {
      fetches.push(
        supabase
          .from('proyecto')
          .select('id, codigo, nombre')
          .in('id', idsByTable['proyecto'])
          .then(({ data }) => {
            (data ?? []).forEach((r: { id: number; codigo: string; nombre: string }) => {
              newRefMap[`proyecto:${r.id}`] = `${r.codigo} — ${r.nombre}`;
            });
          })
      );
    }

    if (idsByTable['usuario']?.length) {
      fetches.push(
        supabase
          .from('usuario')
          .select('id, nombre, email')
          .in('id', idsByTable['usuario'])
          .then(({ data }) => {
            (data ?? []).forEach((r: { id: number; nombre: string; email: string }) => {
              newRefMap[`usuario:${r.id}`] = r.nombre ?? r.email;
            });
          })
      );
    }

    await Promise.all(fetches);
    setRefMap(newRefMap);
    setLoading(false);
  }, [filterTable, filterAction, dateFrom, dateTo]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const userMap = new Map(users.map((u) => [u.id, u.nombre]));

  const actionLabels: Record<string, string> = {
    UPDATE: 'Modificación',
    DELETE: 'Eliminación',
  };

  const filtered = useMemo(() => {
    return logs
      .filter((log) => {
        if (search) {
          const userName = userMap.get(log.usuario_id ?? 0) ?? '';
          const tableLabel = tableLabels[log.tabla_afectada] ?? log.tabla_afectada;
          const refLabel = refMap[`${log.tabla_afectada}:${log.registro_afectado_id}`] ?? '';
          const haystack = `${userName} ${tableLabel} ${refLabel}`.toLowerCase();
          if (!haystack.includes(search.toLowerCase()))
            return false;
        }
        return true;
      })
      .sort((a, b) => {
        const cmp = new Date(a.fecha_hora).getTime() - new Date(b.fecha_hora).getTime();
        return sortDir === 'desc' ? -cmp : cmp;
      });
  }, [logs, search, sortDir, users, refMap]);

  const toggleSort = () => setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));

  const actionVariants: Record<string, 'success' | 'warning' | 'danger'> = {
    UPDATE: 'warning',
    DELETE: 'danger',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bitácora de Auditoría</h1>
        <p className="text-sm text-gray-500 mt-1">
          Registro de solo lectura de todas las acciones sobre costos y valorizaciones
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterTable} onChange={(e) => setFilterTable(e.target.value)}>
            <option value="">Todas las tablas</option>
            <option value="registro_costo">Registro de Costos</option>
            <option value="valorizacion">Valorizaciones</option>
            <option value="cuenta_control">Cuentas de Control</option>
            <option value="proyecto">Proyectos</option>
            <option value="usuario">Usuarios</option>
          </Select>
          <Select value={filterAction} onChange={(e) => setFilterAction(e.target.value)}>
            <option value="">Todas</option>
            <option value="UPDATE">Modificación</option>
            <option value="DELETE">Eliminación</option>
          </Select>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            placeholder="Desde"
          />
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            placeholder="Hasta"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center">
            <ShieldCheck className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-400">Aún no hay modificaciones ni eliminaciones registradas.</p>
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
                      Fecha y Hora
                      {sortDir === 'desc' ? (
                        <ArrowDown className="w-3 h-3" />
                      ) : (
                        <ArrowUp className="w-3 h-3" />
                      )}
                    </button>
                  </th>
                  <th className="px-5 py-3">Usuario</th>
                  <th className="px-5 py-3">Tabla</th>
                  <th className="px-5 py-3">Registro</th>
                  <th className="px-5 py-3">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((log) => {
                  const refKey = `${log.tabla_afectada}:${log.registro_afectado_id}`;
                  const refLabel = refMap[refKey];
                  return (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3 text-sm text-gray-600">
                        {formatDateTime(log.fecha_hora)}
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-900">
                        {log.usuario_id === null
                          ? 'Usuario eliminado'
                          : userMap.get(log.usuario_id) ?? `Usuario #${log.usuario_id}`}
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-600">
                        {tableLabels[log.tabla_afectada] ?? log.tabla_afectada}
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-600">
                        <span className="font-mono text-gray-400">#{log.registro_afectado_id}</span>
                        {refLabel && (
                          <span className="ml-2 text-gray-700">{refLabel}</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <Badge variant={actionVariants[log.accion]}>{actionLabels[log.accion]}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
