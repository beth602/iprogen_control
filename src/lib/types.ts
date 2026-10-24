export type Rol = 'Gerente' | 'Residente';
export type EstadoUsuario = 'Activo' | 'Inactivo';

export interface Usuario {
  id: number;
  nombre: string;
  email: string;
  password_hash: string;
  rol: Rol;
  estado: EstadoUsuario;
}

export type EstadoProyecto = 'Planificado' | 'En Ejecución' | 'Concluido' | 'Suspendido';

export interface Proyecto {
  id: number;
  codigo: string;
  nombre: string;
  estado: EstadoProyecto;
  fecha_inicio: string;
  gerente_id: number;
}

export interface CuentaControl {
  id: number;
  proyecto_id: number;
  codigo_cuenta: string;
  nombre_edt: string;
  responsable_id: number;
  presupuesto_base: number;
  reserva_contingencia: number;
  bac: number;
  activo: boolean;
  codigo_registro: string | null;
  responsable_campo: string | null;
}

export interface RegistroCosto {
  id: number;
  cuenta_control_id: number;
  usuario_id: number;
  descripcion_recurso: string;
  cantidad_qty: number;
  costo_unitario: number;
  costo_planificado_pv: number;
  valor_ganado_ev: number;
  costo_real_ac: number;
  variacion_costo_cv: number;
  fecha_registro: string;
  unidad_medida: string | null;
  modificado_por: number | null;
}

export interface Valorizacion {
  id: number;
  cuenta_control_id: number;
  usuario_id: number;
  periodo: string;
  valor_planeado_pv: number;
  valor_ganado_ev: number;
  costo_real_ac: number;
  variacion_costo_cv: number;
  indice_desempeno_cpi: number;
  fecha_registro: string;
  modificado_por: number | null;
}

export interface Auditoria {
  id: number;
  usuario_id: number | null;
  tabla_afectada: string;
  registro_afectado_id: number;
  accion: 'INSERT' | 'UPDATE' | 'DELETE';
  fecha_hora: string;
}
