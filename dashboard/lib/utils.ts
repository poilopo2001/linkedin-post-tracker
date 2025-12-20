import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const CATEGORY_COLORS: Record<string, string> = {
  recruitment: '#3B82F6',
  promotional: '#10B981',
  thought_leadership: '#8B5CF6',
  events: '#F59E0B',
  csr: '#06B6D4',
  internal_news: '#EC4899',
  partnerships: '#EF4444',
  fundraising: '#14B8A6',
};

export const CATEGORY_LABELS: Record<string, string> = {
  recruitment: 'Recrutement',
  promotional: 'Promotionnel',
  thought_leadership: 'Thought Leadership',
  events: 'Événements',
  csr: 'RSE',
  internal_news: 'Actualités internes',
  partnerships: 'Partenariats',
  fundraising: 'Levée de fonds',
};

export const SENTIMENT_COLORS: Record<string, string> = {
  positive: '#10B981',
  neutral: '#6B7280',
  negative: '#EF4444',
};

export function formatDate(dateString: string | null): string {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

export function truncateText(text: string, maxLength: number = 150): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}
