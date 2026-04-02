export const fmt = {
  currency: (n: number | string) =>
    `${Number(n).toLocaleString('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MZN`,

  date: (d: string | Date) =>
    new Date(d).toLocaleDateString('pt-MZ', { day: '2-digit', month: 'short', year: 'numeric' }),

  datetime: (d: string | Date) =>
    new Date(d).toLocaleString('pt-MZ', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }),

  time: (d: string | Date) =>
    new Date(d).toLocaleTimeString('pt-MZ', { hour: '2-digit', minute: '2-digit' }),

  duration: (min: number) => {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return h > 0 ? `${h}h${m > 0 ? ` ${m}min` : ''}` : `${m}min`;
  },

  relativeTime: (date: string | Date) => {
    const diff = Date.now() - new Date(date).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return 'Hoje';
    if (days === 1) return 'Ontem';
    if (days < 7) return `${days} dias atrás`;
    if (days < 30) return `${Math.floor(days / 7)} sem. atrás`;
    return fmt.date(date);
  },
};
