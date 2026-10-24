import { BookOpen } from 'lucide-react';
import { glossaryTerms } from '@/lib/glossary';

export default function Glossary() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Ayuda / Glosario</h1>
        <p className="text-sm text-gray-500 mt-1">
          Glosario de términos técnicos de Gestión del Valor Ganado (EVM)
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {glossaryTerms.map((term) => (
          <div
            key={term.abbr}
            className="bg-white rounded-xl border border-gray-200 p-5"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {term.abbr} — {term.name}
                </h2>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-3">{term.description}</p>
            <div className="space-y-2">
              <div className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-200">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-0.5">
                  Cálculo
                </p>
                <p className="text-sm font-mono text-gray-800">{term.formula}</p>
              </div>
              <div className="px-3 py-2 rounded-lg bg-sky-50 border border-sky-200">
                <p className="text-xs font-semibold text-sky-600 uppercase tracking-wider mb-0.5">
                  Ejemplo
                </p>
                <p className="text-sm text-sky-900">{term.example}</p>
              </div>
              {term.note && (
                <div className="px-3 py-2 rounded-lg bg-amber-50 border border-amber-200">
                  <p className="text-sm text-amber-800">{term.note}</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
