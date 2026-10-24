export interface GlossaryTerm {
  abbr: string;
  name: string;
  description: string;
  formula: string;
  example: string;
  note?: string;
}

export const glossaryTerms: GlossaryTerm[] = [
  {
    abbr: 'PV',
    name: 'Valor Planificado',
    description:
      'Lo que se esperaba gastar en esta actividad según el plan original.',
    formula: 'PV = Presupuesto asignado × % planificado de avance',
    example:
      'Si una actividad de S/ 10,000 debería estar al 40% de avance, PV = S/ 4,000.',
    note: 'En este sistema, PV, EV y AC se ingresan directamente por el Residente; esta fórmula es la definición conceptual del PMBOK.',
  },
  {
    abbr: 'EV',
    name: 'Valor Ganado',
    description:
      'El valor del trabajo que realmente se ha completado hasta ahora, medido en dinero.',
    formula: 'EV = Presupuesto asignado × % real de avance completado',
    example:
      'Si la misma actividad de S/ 10,000 está al 50% completada, EV = S/ 5,000.',
  },
  {
    abbr: 'AC',
    name: 'Costo Real',
    description:
      'Lo que realmente se ha gastado en esta actividad hasta el momento.',
    formula: 'AC = Suma de todos los costos incurridos (facturas, mano de obra, materiales)',
    example:
      'Si se han gastado S/ 6,000 en esa actividad, AC = S/ 6,000.',
    note: 'En este sistema, PV, EV y AC se ingresan directamente por el Residente; esta fórmula es la definición conceptual del PMBOK.',
  },
  {
    abbr: 'CV',
    name: 'Variación de Costo',
    description:
      'La diferencia entre lo que se ganó y lo que se gastó (EV − AC). Si es negativo, hay sobrecosto; si es positivo, hay ahorro.',
    formula: 'CV = EV − AC',
    example:
      'Con EV = S/ 5,000 y AC = S/ 6,000 → CV = −S/ 1,000 (sobrecosto de S/ 1,000).',
  },
  {
    abbr: 'CPI',
    name: 'Índice de Desempeño del Costo',
    description:
      'Por cada sol gastado, cuánto valor se generó (EV / AC). Un CPI de 1.0 significa que se gastó exactamente lo planificado; menos de 1.0 significa ineficiencia.',
    formula: 'CPI = EV / AC',
    example:
      'Con EV = S/ 5,000 y AC = S/ 6,000 → CPI = 0.83 (por cada sol se generó S/ 0.83 de valor).',
    note: 'Si AC = 0 (aún no se registran costos reales), el sistema muestra CPI = 0.00 en vez de dividir entre cero.',
  },
  {
    abbr: 'BAC',
    name: 'Presupuesto hasta la Conclusión',
    description:
      'El presupuesto total aprobado para completar esta cuenta de control, incluyendo el colchón de contingencia.',
    formula: 'BAC = Presupuesto Base + Reserva de Contingencia',
    example:
      'Si el presupuesto base es S/ 90,000 y la reserva es S/ 10,000 → BAC = S/ 100,000.',
  },
  {
    abbr: 'EDT/WBS',
    name: 'Estructura de Desglose del Trabajo',
    description:
      'La forma en que se divide un proyecto grande en paquetes de trabajo más pequeños y manejables.',
    formula: 'EDT = Árbol jerárquico de paquetes de trabajo',
    example:
      'Un puente se divide en: cimentación, columnas, vigas y losa, cada uno como cuenta de control.',
  },
];

export const tooltipDescriptions: Record<string, string> = {
  PV: 'Costo que se planificó gastar hasta este momento.',
  EV: 'Valor del trabajo que realmente se ha completado, expresado en soles.',
  AC: 'Dinero que realmente se ha gastado hasta ahora.',
  CV: 'Diferencia entre el valor del trabajo hecho y lo que costó. Un valor negativo indica que se gastó más de lo esperado.',
  CPI: 'Indica qué tan eficiente es el gasto. Un valor menor a 1 significa que se está gastando más de lo planificado por cada sol de trabajo entregado.',
  BAC: 'Presupuesto total autorizado para terminar el trabajo.',
  'EDT/WBS': 'La forma en que se divide un proyecto grande en paquetes de trabajo más pequeños y manejables.',
};
