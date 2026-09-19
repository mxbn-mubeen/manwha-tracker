import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getUnreadCount(latest: number | null | undefined, read: number | null | undefined): number {
  return Math.max(0, (latest ?? 0) - (read ?? 0));
}

export function formatUnreadCount(unread: number): string {
  if (unread <= 0) return '0';
  return Number(unread.toFixed(1)).toString();
}
