// Textos de estado de un documento, para la lista y la cuadrícula de la biblioteca.

const DAY = 24 * 60 * 60 * 1000;

export function relativeDay(ts) {
  const days = Math.floor((new Date().setHours(0, 0, 0, 0) - new Date(ts).setHours(0, 0, 0, 0)) / DAY);
  if (days <= 0) return 'Hoy';
  if (days === 1) return 'Ayer';
  if (days < 7) return `Hace ${days} días`;
  return new Date(ts).toLocaleDateString('es', { day: 'numeric', month: 'short' });
}

export function progressOf(doc) {
  if (!doc.openedAt) return { label: 'Sin empezar', ratio: 0 };
  if (doc.pages && doc.lastPage >= doc.pages) return { label: 'Terminado', ratio: 1 };
  const ratio = doc.pages ? doc.lastPage / doc.pages : 0;
  const of = doc.pages ? ` de ${doc.pages}` : '';
  return { label: `Página ${doc.lastPage}${of}`, ratio };
}
