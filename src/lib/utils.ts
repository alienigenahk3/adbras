import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function parseLocalDate(dateStr: string): Date {
  if (!dateStr || typeof dateStr !== 'string') return new Date();
  const parts = dateStr.split('-').map(Number);
  if (parts.some(isNaN)) return new Date();
  if (parts.length === 2) {
    // Format: 'yyyy-MM'
    return new Date(parts[0], parts[1] - 1, 1, 12, 0, 0);
  }
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return new Date(year, month - 1, day, 12, 0, 0);
  }
  const d = new Date(dateStr);
  return !isNaN(d.getTime()) ? d : new Date();
}

export function toSafeDate(val: any): Date {
  if (!val) return new Date();
  if (val instanceof Date) return isNaN(val.getTime()) ? new Date() : val;
  if (typeof val === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
      return parseLocalDate(val);
    }
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d;
  }
  if (typeof val === 'number') {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d;
  }
  if (typeof val.toDate === 'function') {
    const d = val.toDate();
    return d instanceof Date && !isNaN(d.getTime()) ? d : new Date();
  }
  if (val && typeof val === 'object') {
    if ('seconds' in val || '_seconds' in val) {
      const seconds = val.seconds ?? val._seconds ?? 0;
      const nanoseconds = val.nanoseconds ?? val._nanoseconds ?? 0;
      return new Date(seconds * 1000 + nanoseconds / 1000000);
    }
  }
  const d = new Date(val);
  return !isNaN(d.getTime()) ? d : new Date();
}

export function maskPhone(value: string): string {
  let v = value.replace(/\D/g, '');
  if (v.length > 11) v = v.slice(0, 11);
  
  if (v.length > 10) {
    v = v.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3');
  } else if (v.length > 6) {
    v = v.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3');
  } else if (v.length > 2) {
    v = v.replace(/^(\d{2})(\d{0,5}).*/, '($1) $2');
  } else if (v.length > 0) {
    v = v.replace(/^(\d*)/, '($1');
  }
  return v;
}

export function validateName(value: string): string {
  return value.replace(/[0-9]/g, '');
}

export function validateTimeRangeString(timeStr: string): { isValid: boolean; error?: string } {
  if (!timeStr) return { isValid: true };
  
  // Normalize string: convert to lower case, replace common separators with a hyphen, and strip spaces
  // common separators: ' às ', ' as ', ' a ', '-', '/'
  const normalized = timeStr.toLowerCase()
    .replace(/\s*(?:às|as|a|h|to|at)\s*/gi, '-')
    .replace(/-+/g, '-');
  
  // split by hyphen
  const parts = normalized.split('-');
  if (parts.length < 2) {
    // Single time or no range, e.g., "19:30" or "19h30" or "19:30h"
    return { isValid: true };
  }

  // We have a range! Let's extract start and end times
  const partStart = parts[0].trim();
  const partEnd = parts[1].trim();

  const parseTimeToMinutes = (str: string): number | null => {
    // Extract numbers using regex, e.g. "19:30" or "19" or "19h30"
    const match = str.match(/(\d{1,2})(?:[\s:h](\d{2})?)?/);
    if (!match) return null;
    const hours = parseInt(match[1], 10);
    const minutes = match[2] ? parseInt(match[2], 10) : 0;
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
    return hours * 60 + minutes;
  };

  const startMin = parseTimeToMinutes(partStart);
  const endMin = parseTimeToMinutes(partEnd);

  if (startMin !== null && endMin !== null) {
    if (endMin <= startMin) {
      return { 
        isValid: false, 
        error: `O horário de término (${partEnd}) deve ser posterior ao horário de início (${partStart}).` 
      };
    }
  }

  return { isValid: true };
}


