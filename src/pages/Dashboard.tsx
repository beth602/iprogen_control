import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  FolderOpen,
  Calculator,
  Gauge,
  Loader2,
  Download,
  Printer,
  FileText,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Proyecto, CuentaControl, RegistroCosto, Valorizacion } from '@/lib/types';
import { formatCurrency, formatNumber, formatDate } from '@/lib/format';
import Button from '@/components/Button';
import Badge from '@/components/Badge';
import { Select } from '@/components/FormControls';
import TermTooltip from '@/components/TermTooltip';
import { tooltipDescriptions } from '@/lib/glossary';

interface ProjectKPI {
  projectName: string;
  cv: number;
  bac: number;
}

interface CpiTrend {
  period: string;
  cpi: number;
}

export default function Dashboard() {
  const [projects, setProjects] = useState<Proyecto[]>([]);
  const [accounts, setAccounts] = useState<CuentaControl[]>([]);
  const [costRecords, setCostRecords] = useState<RegistroCosto[]>([]);
  const [valuations, setValuations] = useState<Valorizacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterProject, setFilterProject] = useState('');
  const [reportSortDir, setReportSortDir] = useState<'asc' | 'desc'>('asc');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [projRes, accRes, costRes, valRes] = await Promise.all([
      supabase.from('proyecto').select('*').order('nombre'),
      supabase.from('cuenta_control').select('*').eq('activo', true),
      supabase.from('registro_costo').select('*').order('fecha_registro'),
      supabase.from('valorizacion').select('*').order('fecha_registro'),
    ]);

    setProjects(projRes.data as Proyecto[]);
    setAccounts(accRes.data as CuentaControl[]);
    setCostRecords(costRes.data as RegistroCosto[]);
    setValuations(valRes.data as Valorizacion[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const accountMap = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);
  const projectMap = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);

  const filteredAccountIds = useMemo(() => {
    if (!filterProject) return null;
    return new Set(
      accounts.filter((a) => a.proyecto_id === parseInt(filterProject)).map((a) => a.id)
    );
  }, [filterProject, accounts]);

  const kpis = useMemo(() => {
    const activeProjects = projects.filter(
      (p) => p.estado === 'En Ejecución' || p.estado === 'Planificado'
    ).length;

    const relevantAccounts = filterProject
      ? accounts.filter((a) => a.proyecto_id === parseInt(filterProject))
      : accounts;

    const totalBac = relevantAccounts.reduce((sum, a) => sum + a.bac, 0);

    const relevantCosts = filteredAccountIds
      ? costRecords.filter((r) => filteredAccountIds.has(r.cuenta_control_id))
      : costRecords;
    const relevantVals = filteredAccountIds
      ? valuations.filter((v) => filteredAccountIds.has(v.cuenta_control_id))
      : valuations;

    const totalEv =
      relevantVals.reduce((s, v) => s + v.valor_ganado_ev, 0);
    const totalAc =
      relevantVals.reduce((s, v) => s + v.costo_real_ac, 0);
    const globalCv = totalEv - totalAc;

    const weightedCpi = totalAc > 0 ? totalEv / totalAc : 0;

    return {
      activeProjects: filterProject ? 1 : activeProjects,
      totalBac,
      globalCv,
      avgCpi: weightedCpi,
    };
  }, [projects, accounts, costRecords, valuations, filterProject, filteredAccountIds]);

  const cvByProject = useMemo<ProjectKPI[]>(() => {
    const projIds = filterProject ? [parseInt(filterProject)] : projects.map((p) => p.id);
    return projIds
      .map((pid) => {
        const proj = projectMap.get(pid);
        if (!proj) return null;
        const accIds = accounts.filter((a) => a.proyecto_id === pid).map((a) => a.id);
        const vals = valuations.filter((v) => accIds.includes(v.cuenta_control_id));
        const ev = vals.reduce((s, v) => s + v.valor_ganado_ev, 0);
        const ac = vals.reduce((s, v) => s + v.costo_real_ac, 0);
        const bac = accounts.filter((a) => a.proyecto_id === pid).reduce((s, a) => s + a.bac, 0);
        return { projectName: proj.nombre, cv: ev - ac, bac };
      })
      .filter((p): p is ProjectKPI => p !== null);
  }, [projects, accounts, costRecords, valuations, filterProject, projectMap]);

  const cpiTrend = useMemo<CpiTrend[]>(() => {
    const vals = filteredAccountIds
      ? valuations.filter((v) => filteredAccountIds.has(v.cuenta_control_id))
      : valuations;

    const byDate = new Map<string, { evSum: number; acSum: number }>();
    for (const v of vals) {
      const date = v.fecha_registro;
      const existing = byDate.get(date) ?? { evSum: 0, acSum: 0 };
      existing.evSum += v.valor_ganado_ev;
      existing.acSum += v.costo_real_ac;
      byDate.set(date, existing);
    }

    return Array.from(byDate.entries())
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .map(([date, { evSum, acSum }]) => ({
        period: formatDate(date),
        cpi: acSum > 0 ? evSum / acSum : 0,
      }));
  }, [valuations, filteredAccountIds]);

  const cpiDomain = useMemo<[number, number]>(() => {
    if (cpiTrend.length === 0) return [0, 2];
    const values = cpiTrend.map((d) => d.cpi).filter((c) => c > 0);
    if (values.length === 0) return [0, 1];
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const margin = range * 0.1;
    return [Math.max(0, min - margin), max + margin];
  }, [cpiTrend]);

  const reportData = useMemo(() => {
    const vals = filteredAccountIds
      ? valuations.filter((v) => filteredAccountIds.has(v.cuenta_control_id))
      : valuations;
    const sorted = [...vals].sort((a, b) => {
      const cmp = new Date(a.fecha_registro).getTime() - new Date(b.fecha_registro).getTime();
      return reportSortDir === 'asc' ? cmp : -cmp;
    });
    return sorted.map((v) => {
      const acc = accountMap.get(v.cuenta_control_id);
      const proj = acc ? projectMap.get(acc.proyecto_id) : null;
      return {
        fecha: formatDate(v.fecha_registro),
        proyecto: proj?.nombre ?? '-',
        cuenta: acc?.codigo_cuenta ?? '-',
        periodo: v.periodo,
        pv: v.valor_planeado_pv,
        ev: v.valor_ganado_ev,
        ac: v.costo_real_ac,
        cv: v.variacion_costo_cv,
        cpi: v.indice_desempeno_cpi,
      };
    });
  }, [valuations, filteredAccountIds, accountMap, projectMap, reportSortDir]);

  const exportCSV = () => {
    const headers = [
      'Fecha',
      'Proyecto',
      'Cuenta',
      'Periodo',
      'PV',
      'EV',
      'AC',
      'CV',
      'CPI',
    ];
    const rows = reportData.map((r) => [
      r.fecha,
      r.proyecto,
      r.cuenta,
      r.periodo,
      r.pv.toFixed(2),
      r.ev.toFixed(2),
      r.ac.toFixed(2),
      r.cv.toFixed(2),
      r.cpi.toFixed(2),
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reporte_iprogen_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const toggleReportSort = () => setReportSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));

  const exportPDF = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  const kpiCards = [
    {
      label: 'Proyectos Activos',
      value: kpis.activeProjects.toString(),
      icon: FolderOpen,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      tooltip: null as string | null,
    },
    {
      label: 'BAC Total (Presupuesto)',
      value: formatCurrency(kpis.totalBac),
      icon: Calculator,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      tooltip: 'BAC',
    },
    {
      label: 'Variación de Costo (CV)',
      value: formatCurrency(kpis.globalCv),
      icon: kpis.globalCv >= 0 ? ArrowUp : ArrowDown,
      color: kpis.globalCv >= 0 ? 'text-emerald-600' : 'text-red-600',
      bg: kpis.globalCv >= 0 ? 'bg-emerald-50' : 'bg-red-50',
      tooltip: 'CV',
    },
    {
      label: 'CPI Promedio',
      value: formatNumber(kpis.avgCpi),
      icon: Gauge,
      color: kpis.avgCpi >= 1.0 ? 'text-emerald-600' : kpis.avgCpi >= 0.9 ? 'text-amber-600' : 'text-red-600',
      bg: 'bg-sky-50',
      tooltip: 'CPI',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Panel Gerencial</h1>
          <p className="text-sm text-gray-500 mt-1">
            Indicadores clave de rendimiento y reportes de costos
          </p>
        </div>
        <div className="flex items-center gap-3">
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
          <Button variant="secondary" size="sm" onClick={exportCSV}>
            <Download className="w-4 h-4" />
            CSV
          </Button>
          <Button variant="secondary" size="sm" onClick={exportPDF}>
            <Printer className="w-4 h-4" />
            PDF
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((kpi) => (
          <div
            key={kpi.label}
            className="bg-white rounded-xl border border-gray-200 p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2.5 rounded-lg ${kpi.bg}`}>
                <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
            <p className="text-xs text-gray-500 mt-1 inline-flex items-center gap-1">
              {kpi.label}
              {kpi.tooltip && (
                <TermTooltip term={kpi.tooltip} description={tooltipDescriptions[kpi.tooltip]}><span /></TermTooltip>
              )}
            </p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 inline-flex items-center gap-1">
            Variación de Costo (CV) por Proyecto
            <TermTooltip term="CV" description={tooltipDescriptions['CV']}><span /></TermTooltip>
          </h3>
          {cvByProject.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-sm text-gray-400">
              Sin datos para mostrar
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={cvByProject}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="projectName"
                  tick={{ fontSize: 11 }}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value) => formatCurrency(Number(value))}
                  contentStyle={{ fontSize: '12px', borderRadius: '8px' }}
                />
                <Bar dataKey="cv" name="CV" radius={[4, 4, 0, 0]}>
                  {cvByProject.map((entry, i) => (
                    <Bar
                      key={i}
                      dataKey="cv"
                      fill={entry.cv >= 0 ? '#10b981' : '#ef4444'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            Tendencia Histórica del CPI
          </h3>
          {cpiTrend.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-sm text-gray-400">
              Sin datos para mostrar
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={cpiTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="period" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={60} />
                <YAxis domain={cpiDomain} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value) => formatNumber(Number(value))}
                  contentStyle={{ fontSize: '12px', borderRadius: '8px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Line
                  type="monotone"
                  dataKey="cpi"
                  stroke="#2563eb"
                  strokeWidth={2}
                  name="CPI"
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Report Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center gap-2">
          <FileText className="w-4 h-4 text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-900">Reporte de Valorizaciones</h3>
        </div>
        {reportData.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400">
            No hay datos de valorizaciones para mostrar.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="px-5 py-3">
                    <button
                      onClick={toggleReportSort}
                      className="flex items-center gap-1 hover:text-gray-700 transition-colors"
                    >
                      Fecha
                      {reportSortDir === 'asc' ? (
                        <ArrowUp className="w-3 h-3" />
                      ) : (
                        <ArrowDown className="w-3 h-3" />
                      )}
                    </button>
                  </th>
                  <th className="px-5 py-3">Proyecto</th>
                  <th className="px-5 py-3">Cuenta</th>
                  <th className="px-5 py-3">Periodo</th>
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
                  <th className="px-5 py-3 text-center">
                    <span className="inline-flex items-center gap-1">
                      CPI
                      <TermTooltip term="CPI" description={tooltipDescriptions['CPI']}><span /></TermTooltip>
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reportData.map((r, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-5 py-3 text-sm text-gray-600">{r.fecha}</td>
                    <td className="px-5 py-3 text-sm text-gray-900">{r.proyecto}</td>
                    <td className="px-5 py-3 text-sm font-mono text-gray-600">{r.cuenta}</td>
                    <td className="px-5 py-3 text-sm text-gray-900">{r.periodo}</td>
                    <td className="px-5 py-3 text-sm text-right text-gray-600 tabular-nums">
                      {formatCurrency(r.pv)}
                    </td>
                    <td className="px-5 py-3 text-sm text-right text-gray-600 tabular-nums">
                      {formatCurrency(r.ev)}
                    </td>
                    <td className="px-5 py-3 text-sm text-right text-gray-600 tabular-nums">
                      {formatCurrency(r.ac)}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums">
                      <Badge variant={r.cv >= 0 ? 'success' : 'danger'}>
                        {formatCurrency(r.cv)}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <Badge
                        variant={
                          r.cpi >= 1.0 ? 'success' : r.cpi >= 0.9 ? 'warning' : 'danger'
                        }
                      >
                        {formatNumber(r.cpi)}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
