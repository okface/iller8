export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function getTimeGreeting(): { sr_latin: string; sr_cyrillic: string; en: string } {
  const hour = new Date().getHours();
  if (hour < 12) return { sr_latin: 'Dobro jutro', sr_cyrillic: 'Добро јутро', en: 'Good morning' };
  if (hour < 18) return { sr_latin: 'Dobar dan', sr_cyrillic: 'Добар дан', en: 'Good afternoon' };
  return { sr_latin: 'Dobro veče', sr_cyrillic: 'Добро вече', en: 'Good evening' };
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

export function getDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}
