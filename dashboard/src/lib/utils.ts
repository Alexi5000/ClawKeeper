import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function format_currency(cents: number | bigint, currency: string = 'USD'): string {
  const dollars = Number(cents) / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(dollars);
}

export function format_date(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));
}

export function format_datetime(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function get_status_color(status: string): string {
  const colors: Record<string, string> = {
    active: 'text-green-500',
    pending: 'text-yellow-500',
    approved: 'text-blue-500',
    paid: 'text-green-600',
    overdue: 'text-red-500',
    cancelled: 'text-gray-500',
    failed: 'text-red-600',
  };

  return colors[status] || 'text-gray-400';
}

export function get_status_badge_color(status: string): string {
  const colors: Record<string, string> = {
    active: 'bg-green-500/10 text-green-500 border-green-500/20',
    pending: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    approved: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    paid: 'bg-green-600/10 text-green-600 border-green-600/20',
    overdue: 'bg-red-500/10 text-red-500 border-red-500/20',
    cancelled: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
  };

  return colors[status] || 'bg-gray-500/10 text-gray-500 border-gray-500/20';
}
