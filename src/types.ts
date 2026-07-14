export type EventCategory = 'culto_normal' | 'culto_especial' | 'reuniao';
export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface ChurchSettings {
  name: string;
  address: string;
  logoUrl: string | null;
  logoFit?: 'cover' | 'contain';
  whatsapp?: string;
  heroSubtitle?: string;
  heroWelcomeText?: string;
  heroChurchName?: string;
  heroDescription?: string;
  heroBackgroundImageUrl?: string;
}

export interface ChurchEvent {
  id: string;
  title: string;
  description: string;
  date: Date;
  startTime: string;
  endTime: string;
  category: EventCategory;
  location: string;
  recurrence?: RecurrenceType;
  customRecurrenceDays?: number[]; // 1 for 1st, 2 for 2nd, etc. 5 for last.
  customRecurrenceWeekday?: number; // 0 for Sunday, 1 for Monday, etc.
  recurrenceEndDate?: Date;
  groupId?: string;
  bannerUrl?: string;
  membersOnly?: boolean;
}

export interface WeeklyProgramItem {
  id: string;
  title: string;
  description: string;
  days: string;
  time: string;
  icon: 'compass' | 'bookOpen' | 'sparkles' | 'heart' | 'church' | 'users' | 'music' | 'calendar';
  bannerUrl?: string;
  membersOnly?: boolean;
  isFirstPart?: boolean;
}

export interface Member {
  id: string;
  name: string;
  username: string;
  password?: string; // Stored locally
  phone?: string;
  address?: string;
  birthDate?: string;
  photoUrl?: string; // User's profile photo
  departments: string[]; // List of department IDs
  isLeader?: boolean;
  isAdmin?: boolean;
}

export interface Department {
  id: string;
  name: string;
  description: string;
  icon?: string;
  isCustom?: boolean;
}

export interface PrayerRequest {
  id: string;
  name: string;
  phone?: string;
  message: string;
  date: string;
  status?: 'pending' | 'prayed' | 'answered';
  notes?: string;
}

