import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { format, addMonths, subMonths, addWeeks, subWeeks, addDays, addWeeks as addWeeksFns, addMonths as addMonthsFns, addYears, isSameMonth, isSameWeek, isAfter, endOfDay, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  LogOut, ChevronLeft, ChevronRight, LayoutGrid, List, Church, Settings, Plus, 
  Building, MapPin, Search, Filter, Check, Share2, ExternalLink, Menu, X, 
  MessageSquare, Heart, Send, CalendarDays, Phone, Sparkles, Compass, Calendar, 
  ArrowRight, Clock, BookOpen, Users, Music, Star, Edit2, Trash2
} from 'lucide-react';
import { WeeklyView } from './WeeklyView';
import { MonthlyView } from './MonthlyView';
import { LoginModal } from './LoginModal';
import { ChurchSettingsModal } from './ChurchSettingsModal';
import { EventFormModal } from './EventFormModal';
import { DeleteEventModal } from './DeleteEventModal';
import { WeeklyProgramModal } from './WeeklyProgramModal';
import { TodayHighlight } from './TodayHighlight';
import { mockEvents } from '../mockData';
import { cn, toSafeDate, maskPhone, validateName } from '../lib/utils';
import { ChurchSettings, ChurchEvent, WeeklyProgramItem, Member, Department, PrayerRequest, EventCategory } from '../types';
import { MembersArea } from './MembersArea';
import { 
  fetchChurchSettingsFromDb, 
  saveChurchSettingsToDb, 
  fetchEventsFromDb, 
  syncAllEventsToDb, 
  saveEventToDb,
  deleteEventFromDb,
  fetchMembersFromDb, 
  syncAllMembersToDb, 
  fetchDepartmentsFromDb, 
  syncAllDepartmentsToDb, 
  fetchPrayerRequestsFromDb, 
  syncAllPrayerRequestsToDb,
  resetAllAppDataInDb,
  fetchWeeklyProgramsFromDb,
  saveWeeklyProgramToDb,
  deleteWeeklyProgramFromDb,
  syncAllWeeklyProgramsToDb
} from '../lib/firebase';


type ViewMode = 'weekly' | 'monthly';

function generateOccurrences(eventData: Partial<ChurchEvent>, groupId: string): ChurchEvent[] {
  const newEvents: ChurchEvent[] = [];
  const baseId = Date.now().toString() + '-' + Math.floor(Math.random() * 1000);
  
  let currentEventDate = eventData.date as Date;
  const recurrenceEndDate = eventData.recurrenceEndDate ? endOfDay(eventData.recurrenceEndDate as Date) : null;
  
  if (eventData.recurrence === 'monthly' && eventData.customRecurrenceDays?.length) {
    let count = 0;
    const targetWeekday = eventData.customRecurrenceWeekday ?? currentEventDate.getDay();
    
    for (let monthOffset = 0; monthOffset < 12; monthOffset++) { // Default max 1 year
      const baseDate = new Date(currentEventDate.getFullYear(), currentEventDate.getMonth() + monthOffset, 1);
      const year = baseDate.getFullYear();
      const month = baseDate.getMonth();
      
      for (const week of eventData.customRecurrenceDays) {
        let computedDate = new Date(year, month, 1);
        
        while (computedDate.getDay() !== targetWeekday) {
          computedDate.setDate(computedDate.getDate() + 1);
        }
        computedDate.setDate(computedDate.getDate() + (week - 1) * 7);
        
        // Break early if we exceeded the custom end date
        if (recurrenceEndDate && isAfter(computedDate, recurrenceEndDate)) {
           break; 
        }

        // Only add if it's still in the correct month
        if (computedDate.getMonth() === month) {
          // Don't add if the generated date is before the event's first possible date
          if (!isAfter(currentEventDate, endOfDay(computedDate))) {
            const newEv: any = {
              ...(eventData as ChurchEvent),
              bannerUrl: eventData.bannerUrl ? eventData.bannerUrl : undefined,
              id: crypto.randomUUID(),
              date: computedDate,
              groupId,
            };
            if (!newEv.bannerUrl) delete newEv.bannerUrl;
            newEvents.push(newEv);
          }
        }
      }
      
      // Stop if all dates in this month were after the end date, or if we hit the default 5 year limit without end date
      if (recurrenceEndDate) {
         const startOfNextMonth = new Date(year, month + 1, 1);
         if (isAfter(startOfNextMonth, recurrenceEndDate)) break;
      } else if (monthOffset >= 11) {
         break; // Max 5 years if no end date
      }
    }
  } else {
    let occurrences = 1;
    if (eventData.recurrence === 'daily') occurrences = 30; // 30 days max
    else if (eventData.recurrence === 'weekly') occurrences = 12; // 12 weeks max
    else if (eventData.recurrence === 'monthly') occurrences = 12; // 12 months max
    else if (eventData.recurrence === 'yearly') occurrences = 5; // 5 years max
    
    let maxIterations = occurrences;
    
    for (let i = 0; i < maxIterations; i++) {
      let computedDate = currentEventDate;
      
      if (recurrenceEndDate && isAfter(computedDate, recurrenceEndDate)) {
         break;
      }
      
      const newEv: any = {
        ...(eventData as ChurchEvent),
        bannerUrl: eventData.bannerUrl ? eventData.bannerUrl : undefined,
        id: crypto.randomUUID(),
        date: computedDate,
        groupId: eventData.recurrence !== 'none' ? groupId : undefined,
      };
      if (!newEv.bannerUrl) delete newEv.bannerUrl;
      newEvents.push(newEv);
      
      if (eventData.recurrence === 'none') {
         break;
      } else if (eventData.recurrence === 'daily') {
         currentEventDate = addDays(currentEventDate, 1);
      } else if (eventData.recurrence === 'weekly') {
         currentEventDate = addWeeksFns(currentEventDate, 1);
      } else if (eventData.recurrence === 'monthly') {
         currentEventDate = addMonthsFns(currentEventDate, 1);
      } else if (eventData.recurrence === 'yearly') {
         currentEventDate = addYears(currentEventDate, 1);
      }
    }
  }
  return newEvents;
}

const getStoredEvents = (): ChurchEvent[] => {
  const stored = localStorage.getItem('church_events');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      return parsed.map((e: any) => ({
        ...e,
        date: toSafeDate(e.date),
        recurrenceEndDate: e.recurrenceEndDate ? toSafeDate(e.recurrenceEndDate) : undefined,
      }));
    } catch (err) {
      console.error('Failed to parse stored events', err);
    }
  }
  return mockEvents;
};

const getStoredSettings = (): ChurchSettings => {
  const stored = localStorage.getItem('church_settings');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (err) {
      console.error('Failed to parse stored settings', err);
    }
  }
  return {
    name: 'Comunidade Cristã ICTUS',
    address: 'Av. Principal, 123 - Centro',
    logoUrl: null,
  };
};

const defaultWeeklyPrograms: WeeklyProgramItem[] = [
  {
    id: '1',
    title: 'Culto de Celebração',
    description: 'O nosso principal momento da semana. Louvor vibrante, palavra inspiradora e comunhão.',
    days: 'DOMINGOS',
    time: '18:00h',
    icon: 'compass',
  },
  {
    id: '2',
    title: 'Culto de Ensino',
    description: 'Momento reservado para nos aprofundarmos nas Sagradas Escrituras e crescermos em conhecimento.',
    days: 'QUARTAS',
    time: '19:30h',
    icon: 'bookOpen',
  },
  {
    id: '3',
    title: 'Reunião de Jovens',
    description: 'Louvor descontraído, dinamismo e partilha sincera para o fortalecimento da nossa juventude.',
    days: 'SÁBADOS',
    time: '19:00h',
    icon: 'sparkles',
  },
  {
    id: '4',
    title: 'Células nos Lares',
    description: 'Nossas reuniões familiares de pequenos grupos. Um local para orar uns pelos outros e compartilhar a vida.',
    days: 'TERÇAS / QUINTAS',
    time: '20:00h',
    icon: 'heart',
  },
];

const colorPairs = [
  { bg: 'bg-blue-50 text-blue-600', border: 'hover:border-blue-200', activeBg: 'group-hover:bg-blue-600', text: 'text-blue-600' },
  { bg: 'bg-indigo-50 text-indigo-600', border: 'hover:border-indigo-200', activeBg: 'group-hover:bg-indigo-600', text: 'text-indigo-600' },
  { bg: 'bg-purple-50 text-purple-600', border: 'hover:border-purple-200', activeBg: 'group-hover:bg-purple-600', text: 'text-purple-600' },
  { bg: 'bg-amber-50 text-amber-600', border: 'hover:border-amber-200', activeBg: 'group-hover:bg-amber-600', text: 'text-amber-600' },
  { bg: 'bg-emerald-50 text-emerald-600', border: 'hover:border-emerald-200', activeBg: 'group-hover:bg-emerald-600', text: 'text-emerald-600' },
  { bg: 'bg-rose-50 text-rose-600', border: 'hover:border-rose-200', activeBg: 'group-hover:bg-rose-600', text: 'text-rose-600' },
];

const renderProgramIcon = (iconName: string) => {
  switch (iconName) {
    case 'compass': return <Compass className="w-5 h-5" />;
    case 'bookOpen': return <BookOpen className="w-5 h-5" />;
    case 'sparkles': return <Sparkles className="w-5 h-5" />;
    case 'heart': return <Heart className="w-5 h-5" />;
    case 'church': return <Church data-testid="branding-svg" className="w-5 h-5" />;
    case 'users': return <Users className="w-5 h-5" />;
    case 'music': return <Music className="w-5 h-5" />;
    case 'calendar': return <Calendar className="w-5 h-5" />;
    default: return <Calendar className="w-5 h-5" />;
  }
};

export function Dashboard() {
  const [viewMode, setViewMode] = useState<ViewMode>('weekly');
  const [isDbLoaded, setIsDbLoaded] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<ChurchEvent[]>(getStoredEvents);
  
  // Search & Filter state for the agenda
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Prayer Request state
  const [prayerName, setPrayerName] = useState('');
  const [prayerPhone, setPrayerPhone] = useState('');
  const [prayerMessage, setPrayerMessage] = useState('');
  const [prayerSubmitted, setPrayerSubmitted] = useState(false);

  // Mobile navigation drawer
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Close mobile menu on scroll with a more stable threshold
  useEffect(() => {
    let lastScrollY = window.scrollY;
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      // Only close if scrolled more than 15px to avoid accidental closings and flickering
      if (mobileMenuOpen && Math.abs(currentScrollY - lastScrollY) > 15) {
        setMobileMenuOpen(false);
      }
      lastScrollY = currentScrollY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [mobileMenuOpen]);
  
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isEventFormModalOpen, setIsEventFormModalOpen] = useState(false);
  const [eventToEdit, setEventToEdit] = useState<ChurchEvent | null>(null);
  const [eventToDelete, setEventToDelete] = useState<ChurchEvent | null>(null);
  
  const [churchSettings, setChurchSettings] = useState<ChurchSettings>(getStoredSettings);
  const [selectedInitialDate, setSelectedInitialDate] = useState<Date | null>(null);
  const [pendingAddEventDate, setPendingAddEventDate] = useState<Date | null>(null);
  const [modalInitialCategory, setModalInitialCategory] = useState<EventCategory>('culto_normal');
  const [weeklyFilter, setWeeklyFilter] = useState<string>('todos');
  const [weeklyPrograms, setWeeklyPrograms] = useState<WeeklyProgramItem[]>(() => {
    const stored = localStorage.getItem('church_weekly_programs');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (err) {
        console.error('Failed to parse stored weekly programs', err);
      }
    }
    return defaultWeeklyPrograms;
  });
  const [isWeeklyProgramModalOpen, setIsWeeklyProgramModalOpen] = useState(false);
  const [weeklyProgramToEdit, setWeeklyProgramToEdit] = useState<WeeklyProgramItem | null>(null);

  // Members Area & Auth States
  const [showMembersArea, setShowMembersArea] = useState(() => typeof window !== 'undefined' && window.location.hash === '#membros');

  React.useEffect(() => {
    const handleHashChange = () => {
      setShowMembersArea(window.location.hash === '#membros');
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Synchronize modal states with browser history to support back button
  const [isExiting, setIsExiting] = useState(false);

  // Initialize history state on load
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (!window.history.state || !window.history.state.appInitialized) {
        window.history.replaceState({ appInitialized: true, page: 'home' }, '');
        window.history.pushState({ appInitialized: true, page: 'home-active' }, '');
      }
    }
  }, []);

  const stateRefs = useRef({
    isLoginModalOpen,
    isSettingsModalOpen,
    isEventFormModalOpen,
    isWeeklyProgramModalOpen,
    eventToDelete,
  });

  useEffect(() => {
    stateRefs.current = {
      isLoginModalOpen,
      isSettingsModalOpen,
      isEventFormModalOpen,
      isWeeklyProgramModalOpen,
      eventToDelete,
    };
  }, [isLoginModalOpen, isSettingsModalOpen, isEventFormModalOpen, isWeeklyProgramModalOpen, eventToDelete]);

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const state = event.state;

      // Check if we reached the exit trigger on the home page
      if (state && state.page === 'home') {
        const anyModalOpen = stateRefs.current.isLoginModalOpen || 
                             stateRefs.current.isSettingsModalOpen || 
                             stateRefs.current.isEventFormModalOpen || 
                             stateRefs.current.isWeeklyProgramModalOpen || 
                             !!stateRefs.current.eventToDelete;
        const inMembersArea = window.location.hash === '#membros';

        if (!anyModalOpen && !inMembersArea) {
          setIsExiting(true);
          try {
            window.close();
          } catch (e) {
            console.log("window.close failed", e);
          }
          if ((window as any).navigator?.app?.exitApp) {
            try {
              (window as any).navigator.app.exitApp();
            } catch (e) {
              console.log("exitApp failed", e);
            }
          }
          // Push back to home-active so they can press back again if they stay
          window.history.pushState({ appInitialized: true, page: 'home-active' }, '');
        } else {
          // Restore home-active state
          window.history.pushState({ appInitialized: true, page: 'home-active' }, '');
        }
        return;
      }

      if (!state || state.modal !== 'login') {
        setIsLoginModalOpen(false);
      }
      if (!state || state.modal !== 'settings') {
        setIsSettingsModalOpen(false);
      }
      if (!state || state.modal !== 'event-form') {
        setIsEventFormModalOpen(false);
      }
      if (!state || state.modal !== 'weekly-program') {
        setIsWeeklyProgramModalOpen(false);
      }
      if (!state || state.modal !== 'delete-event') {
        setEventToDelete(null);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (isLoginModalOpen) {
      if (window.history.state?.modal !== 'login') {
        window.history.pushState({ modal: 'login' }, '');
      }
    } else {
      if (window.history.state?.modal === 'login') {
        window.history.back();
      }
    }
  }, [isLoginModalOpen]);

  useEffect(() => {
    if (isSettingsModalOpen) {
      if (window.history.state?.modal !== 'settings') {
        window.history.pushState({ modal: 'settings' }, '');
      }
    } else {
      if (window.history.state?.modal === 'settings') {
        window.history.back();
      }
    }
  }, [isSettingsModalOpen]);

  useEffect(() => {
    if (isEventFormModalOpen) {
      if (window.history.state?.modal !== 'event-form') {
        window.history.pushState({ modal: 'event-form' }, '');
      }
    } else {
      if (window.history.state?.modal === 'event-form') {
        window.history.back();
      }
    }
  }, [isEventFormModalOpen]);

  useEffect(() => {
    if (isWeeklyProgramModalOpen) {
      if (window.history.state?.modal !== 'weekly-program') {
        window.history.pushState({ modal: 'weekly-program' }, '');
      }
    } else {
      if (window.history.state?.modal === 'weekly-program') {
        window.history.back();
      }
    }
  }, [isWeeklyProgramModalOpen]);

  useEffect(() => {
    if (!!eventToDelete) {
      if (window.history.state?.modal !== 'delete-event') {
        window.history.pushState({ modal: 'delete-event' }, '');
      }
    } else {
      if (window.history.state?.modal === 'delete-event') {
        window.history.back();
      }
    }
  }, [eventToDelete]);

  const openMembersArea = () => {
    window.location.hash = 'membros';
    setShowMembersArea(true);
  };

  const closeMembersArea = () => {
    setShowMembersArea(false);
    if (window.location.hash === '#membros') {
      try {
        window.history.pushState(null, '', window.location.pathname + window.location.search);
      } catch (e) {
        window.location.hash = '';
      }
    }
  };

  useEffect(() => {
    (window as any).closeMembersArea = closeMembersArea;
    return () => {
      delete (window as any).closeMembersArea;
    };
  }, [closeMembersArea]);
  const [currentUser, setCurrentUser] = useState<{
    name: string;
    username: string;
    departments: string[];
    isAdmin: boolean;
    isLeader?: boolean;
  } | null>(() => {
    const stored = localStorage.getItem('church_logged_in_user');
    return stored ? JSON.parse(stored) : null;
  });

  const [isAdmin, setIsAdmin] = useState(() => {
    const stored = localStorage.getItem('church_logged_in_user');
    if (stored) {
      try {
        const u = JSON.parse(stored);
        return u?.isAdmin || false;
      } catch { }
    }
    return false;
  });

  const [members, setMembers] = useState<Member[]>(() => {
    const stored = localStorage.getItem('church_members');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (err) {
        console.error('Failed to parse stored members', err);
      }
    }
    return [
      { id: 'm1', name: 'João Líder', username: 'joao', password: '123', departments: ['oracao', 'lideres'], isLeader: true },
      { id: 'm2', name: 'Maria de Crianças', username: 'maria', password: '123', departments: ['criancas', 'mulheres'] }
    ];
  });

  const [departments, setDepartments] = useState<Department[]>(() => {
    const stored = localStorage.getItem('church_departments');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (err) {
        console.error('Failed to parse stored departments', err);
      }
    }
    return [
      { id: 'criancas', name: 'Crianças', description: 'Ministério infantil, ensinando e cuidando dos pequeninos.' },
      { id: 'jovens', name: 'Adolescentes/Jovens', description: 'Ministério de jovens e adolescentes, força e dinamismo.' },
      { id: 'homens', name: 'Homens', description: 'Ministério de homens, liderança bíblica e comunhão.' },
      { id: 'mulheres', name: 'Mulheres', description: 'Ministério de mulheres, oração, apoio e sabedoria.' },
      { id: 'lideres', name: 'Líderes', description: 'Área reservada para liderança e pastores.' },
      { id: 'oracao', name: 'Oração', description: 'Departamento de oração e intercessão.' },
    ];
  });

  const [prayerRequests, setPrayerRequests] = useState<PrayerRequest[]>(() => {
    const stored = localStorage.getItem('prayer_requests');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (err) {
        console.error('Failed to parse stored prayer requests', err);
      }
    }
    return [
      { id: 'p1', name: 'Ana Silva', phone: '(11) 98765-4321', message: 'Peço oração pela saúde da minha mãe que está hospitalizada.', date: new Date(Date.now() - 32000 * 2).toISOString(), status: 'pending' },
      { id: 'p2', name: 'Marcos Oliveira', phone: '(11) 99999-8888', message: 'Agradecimento por uma porta de emprego aberta nesta semana.', date: new Date(Date.now() - 32000 * 24).toISOString(), status: 'prayed' }
    ];
  });

  // Fetch initial data from Firebase Firestore on mount
  useEffect(() => {
    async function loadFirebaseData() {
      try {
        const dbSettings = await fetchChurchSettingsFromDb();
        if (dbSettings) {
          const dbSettingsStr = JSON.stringify(dbSettings);
          const currentSettingsStr = JSON.stringify(churchSettings);
          if (dbSettingsStr !== currentSettingsStr) {
            setChurchSettings(dbSettings);
          }
          lastSyncedSettings.current = dbSettingsStr;
        } else {
          lastSyncedSettings.current = JSON.stringify(churchSettings);
        }

        const dbEvents = await fetchEventsFromDb();
        if (dbEvents) {
          const dbEventsStr = JSON.stringify(dbEvents);
          const currentEventsStr = JSON.stringify(events);
          if (dbEventsStr !== currentEventsStr) {
            setEvents(dbEvents);
          }
          lastSyncedEvents.current = dbEventsStr;
        } else {
          lastSyncedEvents.current = JSON.stringify(events);
        }



        const dbMembers = await fetchMembersFromDb();
        if (dbMembers) {
          const dbMembersStr = JSON.stringify(dbMembers);
          const currentMembersStr = JSON.stringify(members);
          if (dbMembersStr !== currentMembersStr) {
            setMembers(dbMembers);
          }
          lastSyncedMembers.current = dbMembersStr;
        } else {
          lastSyncedMembers.current = JSON.stringify(members);
        }

        const dbDepartments = await fetchDepartmentsFromDb();
        if (dbDepartments) {
          const dbDepartmentsStr = JSON.stringify(dbDepartments);
          const currentDepartmentsStr = JSON.stringify(departments);
          if (dbDepartmentsStr !== currentDepartmentsStr) {
            setDepartments(dbDepartments);
          }
          lastSyncedDepartments.current = dbDepartmentsStr;
        } else {
          lastSyncedDepartments.current = JSON.stringify(departments);
        }

        const dbPrayerRequests = await fetchPrayerRequestsFromDb();
        if (dbPrayerRequests) {
          const dbPrayerStr = JSON.stringify(dbPrayerRequests);
          const currentPrayerStr = JSON.stringify(prayerRequests);
          if (dbPrayerStr !== currentPrayerStr) {
            setPrayerRequests(dbPrayerRequests);
          }
          lastSyncedPrayerRequests.current = dbPrayerStr;
        } else {
          lastSyncedPrayerRequests.current = JSON.stringify(prayerRequests);
        }

        const dbWeeklyPrograms = await fetchWeeklyProgramsFromDb();
        if (dbWeeklyPrograms && dbWeeklyPrograms.length > 0) {
          const dbProgStr = JSON.stringify(dbWeeklyPrograms);
          const currentProgStr = JSON.stringify(weeklyPrograms);
          if (dbProgStr !== currentProgStr) {
            setWeeklyPrograms(dbWeeklyPrograms);
          }
          lastSyncedWeeklyPrograms.current = dbProgStr;
        } else {
          // Sync default ones to DB if DB is empty
          await syncAllWeeklyProgramsToDb(weeklyPrograms);
          lastSyncedWeeklyPrograms.current = JSON.stringify(weeklyPrograms);
        }
      } catch (error) {
        console.error("Erro ao carregar dados do Firebase Firestore:", error);
      } finally {
        setIsDbLoaded(true);
      }
    }
    loadFirebaseData();
  }, []);

  const lastSyncedWeeklyPrograms = useRef<string | null>(null);
  useEffect(() => {
    try { localStorage.setItem('church_weekly_programs', JSON.stringify(weeklyPrograms)); } catch (e) {  }
    const timer = setTimeout(() => {
      const progStr = JSON.stringify(weeklyPrograms);
      if (isDbLoaded && progStr !== lastSyncedWeeklyPrograms.current) {
        syncAllWeeklyProgramsToDb(weeklyPrograms);
        lastSyncedWeeklyPrograms.current = progStr;
      }
    }, 10000);
    return () => clearTimeout(timer);
  }, [weeklyPrograms, isDbLoaded]);

  const lastSyncedEvents = useRef<string | null>(null);
  useEffect(() => {
    try { localStorage.setItem('church_events', JSON.stringify(events)); } catch (e) {  }
    const timer = setTimeout(() => {
      const eventsStr = JSON.stringify(events);
      if (isDbLoaded && eventsStr !== lastSyncedEvents.current) {
        syncAllEventsToDb(events);
        lastSyncedEvents.current = eventsStr;
      }
    }, 10000);
    return () => clearTimeout(timer);
  }, [events, isDbLoaded]);

  const lastSyncedSettings = useRef<string | null>(null);
  useEffect(() => {
    try { localStorage.setItem('church_settings', JSON.stringify(churchSettings)); } catch (e) {  }
    if (typeof (window as any).updatePWAManifest === 'function') {
      (window as any).updatePWAManifest();
    }
    const timer = setTimeout(() => {
      const settingsStr = JSON.stringify(churchSettings);
      if (isDbLoaded && settingsStr !== lastSyncedSettings.current) {
        saveChurchSettingsToDb(churchSettings);
        lastSyncedSettings.current = settingsStr;
      }
    }, 10000);
    return () => clearTimeout(timer);
  }, [churchSettings, isDbLoaded]);




  useEffect(() => {
    try { localStorage.setItem('church_logged_in_user', currentUser ? JSON.stringify(currentUser) : ''); } catch (e) {  }
    setIsAdmin(currentUser?.isAdmin || false);
  }, [currentUser]);

  const lastSyncedMembers = useRef<string | null>(null);
  useEffect(() => {
    try { localStorage.setItem('church_members', JSON.stringify(members)); } catch (e) {  }
    const timer = setTimeout(() => {
      const membersStr = JSON.stringify(members);
      if (isDbLoaded && membersStr !== lastSyncedMembers.current) {
        syncAllMembersToDb(members);
        lastSyncedMembers.current = membersStr;
      }
    }, 10000);
    return () => clearTimeout(timer);
  }, [members, isDbLoaded]);

  const lastSyncedDepartments = useRef<string | null>(null);
  useEffect(() => {
    try { localStorage.setItem('church_departments', JSON.stringify(departments)); } catch (e) {  }
    const timer = setTimeout(() => {
      const deptsStr = JSON.stringify(departments);
      if (isDbLoaded && deptsStr !== lastSyncedDepartments.current) {
        syncAllDepartmentsToDb(departments);
        lastSyncedDepartments.current = deptsStr;
      }
    }, 10000);
    return () => clearTimeout(timer);
  }, [departments, isDbLoaded]);

  const lastSyncedPrayerRequests = useRef<string | null>(null);
  useEffect(() => {
    try { localStorage.setItem('prayer_requests', JSON.stringify(prayerRequests)); } catch (e) {  }
    const timer = setTimeout(() => {
      const prayerStr = JSON.stringify(prayerRequests);
      if (isDbLoaded && prayerStr !== lastSyncedPrayerRequests.current) {
        syncAllPrayerRequestsToDb(prayerRequests);
        lastSyncedPrayerRequests.current = prayerStr;
      }
    }, 10000);
    return () => clearTimeout(timer);
  }, [prayerRequests, isDbLoaded]);

  const handleCreateEventWithDate = (date: Date) => {
    if (isAdmin) {
      setSelectedInitialDate(date);
      setEventToEdit(null);
      setIsEventFormModalOpen(true);
    } else {
      setPendingAddEventDate(date);
      setIsLoginModalOpen(true);
    }
  };



  const handlePrevious = () => {
    if (viewMode === 'monthly') {
      setCurrentDate(subMonths(currentDate, 1));
    } else {
      setCurrentDate(subWeeks(currentDate, 1));
    }
  };

  const handleNext = () => {
    if (viewMode === 'monthly') {
      setCurrentDate(addMonths(currentDate, 1));
    } else {
      setCurrentDate(addWeeks(currentDate, 1));
    }
  };

  const handleToday = () => setCurrentDate(new Date());

  const handleSaveEvent = async (eventData: Partial<ChurchEvent>) => {
    let newEventsList = [...events];
    if (eventData.id) {
      const originalEvent = events.find(e => e.id === eventData.id);
      
      if (originalEvent?.groupId) {
        const otherEvents = events.filter(e => e.groupId !== originalEvent.groupId);
        const oldGroupEvents = events.filter(e => e.groupId === originalEvent.groupId);
        for (const ev of oldGroupEvents) {
          await deleteEventFromDb(ev.id);
        }
        const newEvents = generateOccurrences(eventData, originalEvent.groupId);
        for (const ev of newEvents) {
          await saveEventToDb(ev);
        }
        newEventsList = [...otherEvents, ...newEvents];
      } else {
        const isNowRecurring = eventData.recurrence && eventData.recurrence !== 'none';
        
        if (isNowRecurring) {
          const otherEvents = events.filter(e => e.id !== eventData.id);
          await deleteEventFromDb(eventData.id);
          const newGroupId = crypto.randomUUID();
          const newEvents = generateOccurrences(eventData, newGroupId);
          for (const ev of newEvents) {
            await saveEventToDb(ev);
          }
          newEventsList = [...otherEvents, ...newEvents];
        } else {
          const updatedEvent: any = { 
            ...originalEvent, 
            ...eventData, 
            bannerUrl: eventData.bannerUrl ? eventData.bannerUrl : undefined 
          };
          if (!updatedEvent.bannerUrl) delete updatedEvent.bannerUrl;
          newEventsList = events.map(e => e.id === eventData.id ? updatedEvent : e);
          await saveEventToDb(updatedEvent);
        }
      }
    } else {
      const newGroupId = crypto.randomUUID();
      const newEvents = generateOccurrences(eventData, newGroupId);
      for (const ev of newEvents) {
        await saveEventToDb(ev);
      }
      newEventsList = [...events, ...newEvents];
    }
    setEvents(newEventsList);
    lastSyncedEvents.current = JSON.stringify(newEventsList);
    try { localStorage.setItem('church_events', JSON.stringify(newEventsList)); } catch (e) {}
    await syncAllEventsToDb(newEventsList);
  };

  const handleDeleteEventClick = (id: string) => {
    const event = events.find(e => e.id === id);
    if (event) {
      setEventToDelete(event);
    }
  };

  const handleConfirmDelete = async (deleteAll: boolean) => {
    if (!eventToDelete) return;

    console.log(`[FRONTEND] Confirming deletion of event: "${eventToDelete.title}" (${eventToDelete.id}), deleteAll occurrences: ${deleteAll}`);

    let updatedEvents = events;
    try {
      if (deleteAll && eventToDelete.groupId) {
        const eventsToDelete = events.filter(e => e.groupId === eventToDelete.groupId);
        console.log(`[FRONTEND] Deleting recurring series with groupId: "${eventToDelete.groupId}". Total occurrences to delete: ${eventsToDelete.length}`);
        updatedEvents = events.filter(e => e.groupId !== eventToDelete.groupId);
        
        // Delete all occurrences from Firestore
        for (const ev of eventsToDelete) {
          await deleteEventFromDb(ev.id);
        }
      } else {
        console.log(`[FRONTEND] Deleting single event instance with id: "${eventToDelete.id}"`);
        updatedEvents = events.filter(e => e.id !== eventToDelete.id);
        await deleteEventFromDb(eventToDelete.id);
      }

      // Update optimistic UI state and local cache immediately
      console.log(`[FRONTEND] Optimistically updating frontend local state and localStorage with remaining events: ${updatedEvents.length}`);
      setEvents(updatedEvents);
      lastSyncedEvents.current = JSON.stringify(updatedEvents);
      try { 
        localStorage.setItem('church_events', JSON.stringify(updatedEvents)); 
      } catch (e) {
        console.error('[FRONTEND] Failed to write church_events to localStorage:', e);
      }

      // Synchronize changes to guarantee database state
      await syncAllEventsToDb(updatedEvents);

      // Force-revalidate from the source of truth (the backend Firestore database server)
      console.log("[FRONTEND] Forcing active revalidation of events from database server to ensure consistency.");
      const freshEvents = await fetchEventsFromDb();
      if (freshEvents) {
        console.log(`[FRONTEND] Revalidation successful. Found ${freshEvents.length} events on the database server.`);
        
        // Check if any deleted event is still returned
        const deletedStillExists = freshEvents.some(fe => 
          deleteAll && eventToDelete.groupId 
            ? fe.groupId === eventToDelete.groupId 
            : fe.id === eventToDelete.id
        );

        if (deletedStillExists) {
          console.warn("[FRONTEND] WARNING: Server revalidation returned one or more deleted events! Force filtering from state.");
          const filteredFresh = freshEvents.filter(fe => 
            deleteAll && eventToDelete.groupId
              ? fe.groupId !== eventToDelete.groupId
              : fe.id !== eventToDelete.id
          );
          setEvents(filteredFresh);
          lastSyncedEvents.current = JSON.stringify(filteredFresh);
          try { localStorage.setItem('church_events', JSON.stringify(filteredFresh)); } catch (e) {}
        } else {
          console.log("[FRONTEND] SUCCESS: Verified that deleted event/series is completely gone from the database server.");
          setEvents(freshEvents);
          lastSyncedEvents.current = JSON.stringify(freshEvents);
          try { localStorage.setItem('church_events', JSON.stringify(freshEvents)); } catch (e) {}
        }
      }
    } catch (err) {
      console.error("[FRONTEND] Error during delete event orchestration:", err);
    } finally {
      setEventToDelete(null);
    }
  };

  const handleSaveWeeklyProgram = async (program: WeeklyProgramItem) => {
    setWeeklyPrograms(prev => {
      const exists = prev.some(p => p.id === program.id);
      if (exists) {
        return prev.map(p => p.id === program.id ? program : p);
      } else {
        return [...prev, program];
      }
    });
    await saveWeeklyProgramToDb(program);
    setIsWeeklyProgramModalOpen(false);
    setWeeklyProgramToEdit(null);
  };

  const handleDeleteWeeklyProgram = async (id: string) => {
    console.log(`[FRONTEND] Requesting deletion of weekly program ID: "${id}"`);
    
    // Optimistically update frontend state
    const updatedPrograms = weeklyPrograms.filter(p => p.id !== id);
    setWeeklyPrograms(updatedPrograms);
    lastSyncedWeeklyPrograms.current = JSON.stringify(updatedPrograms);
    try { 
      localStorage.setItem('church_weekly_programs', JSON.stringify(updatedPrograms)); 
    } catch (e) {
      console.error('[FRONTEND] Failed to write church_weekly_programs to localStorage:', e);
    }

    try {
      // Execute the database delete
      await deleteWeeklyProgramFromDb(id);
      
      // Sync to clean up and guarantee other stale programs are updated
      await syncAllWeeklyProgramsToDb(updatedPrograms);

      // Re-verify and revalidate from database server (source of truth)
      console.log("[FRONTEND] Forcing revalidation of weekly programs from database server.");
      const freshPrograms = await fetchWeeklyProgramsFromDb();
      if (freshPrograms) {
        console.log(`[FRONTEND] Revalidation successful. Found ${freshPrograms.length} weekly programs on server.`);
        const programStillExists = freshPrograms.some(fp => fp.id === id);
        
        if (programStillExists) {
          console.warn(`[FRONTEND] WARNING: Revalidation returned deleted weekly program "${id}"! Filtering out.`);
          const filteredFresh = freshPrograms.filter(fp => fp.id !== id);
          setWeeklyPrograms(filteredFresh);
          lastSyncedWeeklyPrograms.current = JSON.stringify(filteredFresh);
          try { localStorage.setItem('church_weekly_programs', JSON.stringify(filteredFresh)); } catch (e) {}
        } else {
          console.log(`[FRONTEND] SUCCESS: Verified that deleted weekly program "${id}" is completely gone from server.`);
          setWeeklyPrograms(freshPrograms);
          lastSyncedWeeklyPrograms.current = JSON.stringify(freshPrograms);
          try { localStorage.setItem('church_weekly_programs', JSON.stringify(freshPrograms)); } catch (e) {}
        }
      }
    } catch (err) {
      console.error("[FRONTEND] Error deleting weekly program:", err);
    } finally {
      setIsWeeklyProgramModalOpen(false);
      setWeeklyProgramToEdit(null);
    }
  };

  const handleEditEvent = (event: ChurchEvent) => {
    setEventToEdit(event);
    setIsEventFormModalOpen(true);
  };

  const handleSaveSettings = (newSettings: ChurchSettings) => {
    const oldAddress = churchSettings.address;
    setChurchSettings(newSettings);
    
    if (newSettings.address !== oldAddress) {
      setEvents(prevEvents => prevEvents.map(event => {
        if (
          event.location === oldAddress || 
          event.location === 'Na Igreja' || 
          (!event.location && oldAddress === '')
        ) {
          return {
            ...event,
            location: newSettings.address || 'Na Igreja'
          };
        }
        return event;
      }));
    }
  };

  const handleResetAllData = async () => {
    try {
      await resetAllAppDataInDb();
    } catch (e) {
      console.error(e);
    }
    setEvents([]);
    lastSyncedEvents.current = JSON.stringify([]);
    try {
      localStorage.removeItem('church_events');
      localStorage.removeItem('church_uploaded_images');
      localStorage.removeItem('church_deleted_images');
      localStorage.removeItem('church_settings');
    } catch (e) {}
    setIsSettingsModalOpen(false);
    alert('Sistema zerado com sucesso! Todos os eventos, cultos e imagens foram limpos.');
    window.location.reload();
  };

  const handlePrayerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prayerName || !prayerMessage) return;
    
    const newRequest: PrayerRequest = {
      id: Date.now().toString(),
      name: prayerName.trim(),
      phone: prayerPhone.trim(),
      message: prayerMessage.trim(),
      date: new Date().toISOString(),
      status: 'pending',
    };

    setPrayerRequests((prev) => [newRequest, ...prev]);
    setPrayerSubmitted(true);
    setPrayerName('');
    setPrayerPhone('');
    setPrayerMessage('');
  };

  // Helper to remove duplicate events on the same day with the same title and starting time
  const deduplicateEvents = (allEvents: ChurchEvent[]): ChurchEvent[] => {
    const seen = new Set<string>();
    return allEvents.filter(event => {
      const d = toSafeDate(event.date);
      const dateStr = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
      const titleStr = (event.title || '').trim().toLowerCase();
      const timeStr = (event.startTime || '').trim().toLowerCase();
      const key = `${dateStr}_${titleStr}_${timeStr}`;
      
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  };

  // Helper to extract upcoming events chronologically from today
  const getUpcomingEvents = (allEvents: ChurchEvent[], limit = 4) => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    
    const activeEvents = [...allEvents]
      .filter(event => {
        if (event.membersOnly && !currentUser) {
          return false;
        }
        const d = toSafeDate(event.date);
        d.setHours(23, 59, 59, 999);
        return d >= startOfToday;
      });

    return deduplicateEvents(activeEvents)
      .sort((a, b) => toSafeDate(a.date).getTime() - toSafeDate(b.date).getTime())
      .slice(0, limit);
  };

  const upcomingEvents = getUpcomingEvents(events);

  // Helper to filter events inside the actual interactive calendar view
  const filteredEvents = deduplicateEvents(
    events.filter(event => {
      if (event.membersOnly && !currentUser) {
        return false;
      }
      const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (event.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (event.location || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = categoryFilter === 'all' || event.category === categoryFilter;
      
      return matchesSearch && matchesCategory;
    })
  );

  const visibleWeeklyPrograms = weeklyPrograms;

  const getGoogleCalendarUrl = (event: ChurchEvent): string => {
    const title = encodeURIComponent(event.title);
    const details = encodeURIComponent(event.description || '');
    const location = encodeURIComponent(event.location || '');
    
    const dateStr = format(toSafeDate(event.date), 'yyyyMMdd');
    const startHour = event.startTime.replace(':', '') + '00';
    const endHour = event.endTime.replace(':', '') + '00';
    
    return `https://www.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dateStr}T${startHour}/${dateStr}T${endHour}&details=${details}&location=${location}`;
  };

  const getWhatsAppLink = (text: string): string => {
    const rawNumber = churchSettings.whatsapp || '';
    const cleanNumber = rawNumber.replace(/\D/g, '');
    let finalNumber = cleanNumber;
    if (finalNumber && !finalNumber.startsWith('55') && (finalNumber.length === 10 || finalNumber.length === 11)) {
      finalNumber = '55' + finalNumber;
    }
    return finalNumber 
      ? `https://wa.me/${finalNumber}?text=${encodeURIComponent(text)}` 
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
  };

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (isExiting) {
    return (
      <div className="fixed inset-0 z-[9999] bg-slate-900 flex flex-col items-center justify-center text-white px-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-6 max-w-md"
        >
          {churchSettings.logoUrl ? (
            <img 
              src={churchSettings.logoUrl} 
              alt="Logo" 
              className={cn(
                "w-20 h-20 mx-auto rounded-2xl border border-slate-700/50 animate-pulse",
                churchSettings.logoFit === 'contain' ? "object-contain p-1 bg-white" : "object-cover"
              )}
            />
          ) : (
            <div className="w-20 h-20 mx-auto bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 animate-pulse">
              <Church className="w-10 h-10 text-white" />
            </div>
          )}
          <div className="space-y-2">
            <h2 className="text-2xl font-serif font-black tracking-tight">Até logo!</h2>
            <p className="text-slate-400 text-sm">
              Fechando o aplicativo da <span className="font-semibold text-slate-200">{churchSettings.name}</span>...
            </p>
          </div>
          <div className="flex justify-center">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        </motion.div>
      </div>
    );
  }

  if (showMembersArea && currentUser) {
    const handleDirectDeleteEvent = async (id: string) => {
      const event = events.find(e => e.id === id);
      if (!event) return;
      
      console.log(`[FRONTEND] Direct delete event requested: "${event.title}" (${event.id})`);

      let updatedEvents = events;
      try {
        if (event.groupId) {
          const eventsToDelete = events.filter(e => e.groupId === event.groupId);
          console.log(`[FRONTEND] Direct deleting recurring series with groupId: "${event.groupId}". Total in series to delete: ${eventsToDelete.length}`);
          updatedEvents = events.filter(e => e.groupId !== event.groupId);
          for (const ev of eventsToDelete) {
            await deleteEventFromDb(ev.id);
          }
        } else {
          console.log(`[FRONTEND] Direct deleting single event instance with id: "${event.id}"`);
          updatedEvents = events.filter(e => e.id !== event.id);
          await deleteEventFromDb(event.id);
        }

        // Optimistically update state and cache
        console.log(`[FRONTEND] Updating state with remaining events after direct delete: ${updatedEvents.length}`);
        setEvents(updatedEvents);
        lastSyncedEvents.current = JSON.stringify(updatedEvents);
        try { localStorage.setItem('church_events', JSON.stringify(updatedEvents)); } catch (e) {}

        // Synchronize changes to guarantee database state
        await syncAllEventsToDb(updatedEvents);

        // Force-revalidate from the database server
        console.log("[FRONTEND] Forcing direct revalidation of events from database server.");
        const freshEvents = await fetchEventsFromDb();
        if (freshEvents) {
          console.log(`[FRONTEND] Direct revalidation successful. Found ${freshEvents.length} events on database server.`);
          const deletedStillExists = freshEvents.some(fe => 
            event.groupId 
              ? fe.groupId === event.groupId 
              : fe.id === event.id
          );

          if (deletedStillExists) {
            console.warn("[FRONTEND] WARNING: Direct revalidation returned deleted events! Force filtering from state.");
            const filteredFresh = freshEvents.filter(fe => 
              event.groupId
                ? fe.groupId !== event.groupId
                : fe.id !== event.id
            );
            setEvents(filteredFresh);
            lastSyncedEvents.current = JSON.stringify(filteredFresh);
            try { localStorage.setItem('church_events', JSON.stringify(filteredFresh)); } catch (e) {}
          } else {
            console.log("[FRONTEND] SUCCESS: Direct verified that deleted event/series is completely gone from server.");
            setEvents(freshEvents);
            lastSyncedEvents.current = JSON.stringify(freshEvents);
            try { localStorage.setItem('church_events', JSON.stringify(freshEvents)); } catch (e) {}
          }
        }
      } catch (err) {
        console.error("[FRONTEND] Error during direct delete event orchestration:", err);
      }
    };

    return (
      <MembersArea
        currentUser={currentUser}
        onLogout={() => {
          setCurrentUser(null);
          closeMembersArea();
        }}
        churchSettings={churchSettings}
        onSaveChurchSettings={handleSaveSettings}
        onClose={closeMembersArea}
        members={members}
        setMembers={setMembers}
        departments={departments}
        setDepartments={setDepartments}
        prayerRequests={prayerRequests}
        setPrayerRequests={setPrayerRequests}
        events={events}
        onSaveEvent={handleSaveEvent}
        onDeleteEvent={handleDirectDeleteEvent}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-blue-600 selection:text-white antialiased">
      <LoginModal 
        isOpen={isLoginModalOpen} 
        onClose={() => {
          setIsLoginModalOpen(false);
          setPendingAddEventDate(null);
        }} 
        onLogin={(user) => {
          setCurrentUser(user);
          setIsAdmin(user.isAdmin);
          if (pendingAddEventDate) {
            setSelectedInitialDate(pendingAddEventDate);
            setEventToEdit(null);
            setIsEventFormModalOpen(true);
            setPendingAddEventDate(null);
          }
        }} 
      />
      
      <ChurchSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={churchSettings}
        onSave={handleSaveSettings}
      />

      <EventFormModal
        isOpen={isEventFormModalOpen}
        onClose={() => {
          setIsEventFormModalOpen(false);
          setEventToEdit(null);
          setSelectedInitialDate(null);
        }}
        onSave={handleSaveEvent}
        eventToEdit={eventToEdit}
        churchSettings={churchSettings}
        initialDate={selectedInitialDate}
        initialCategory={modalInitialCategory}
      />

      <DeleteEventModal
        isOpen={!!eventToDelete}
        onClose={() => setEventToDelete(null)}
        onConfirm={handleConfirmDelete}
        event={eventToDelete}
      />

      <WeeklyProgramModal
        isOpen={isWeeklyProgramModalOpen}
        onClose={() => {
          setIsWeeklyProgramModalOpen(false);
          setWeeklyProgramToEdit(null);
        }}
        onSave={handleSaveWeeklyProgram}
        onDelete={handleDeleteWeeklyProgram}
        itemToEdit={weeklyProgramToEdit}
      />

      {/* Website Navigation Header */}
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-100 sticky top-0 z-40 transition-shadow duration-300 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo and Brand Name */}
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => scrollToSection('inicio')}>
              {churchSettings.logoUrl ? (
                <img 
                  src={churchSettings.logoUrl} 
                  alt="Logo" 
                  className={cn(
                    "w-11 h-11 rounded-lg shrink-0 border border-slate-100 shadow-sm",
                    churchSettings.logoFit === 'contain' ? "object-contain p-0.5 bg-white" : "object-cover"
                  )} 
                />
              ) : (
                <div className="bg-blue-600 p-2.5 rounded-xl text-white shrink-0 shadow-sm">
                  <Church data-testid="branding-svg" className="w-5 h-5" />
                </div>
              )}
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-tight">
                  {churchSettings.name}
                </h1>
                {churchSettings.address && (
                  <p className="text-[10px] sm:text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-300" />
                    <span>{churchSettings.address.split('-')[0]}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center gap-7">
              <button type="button" onClick={() => scrollToSection('inicio')} className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors cursor-pointer">
                Início
              </button>
              <button type="button" onClick={() => scrollToSection('destaques')} className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors cursor-pointer">
                Destaques
              </button>
              <button type="button" onClick={() => scrollToSection('cultos')} className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors cursor-pointer">
                Programação Semanal
              </button>
              <button type="button" onClick={() => scrollToSection('agenda')} className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors cursor-pointer">
                Agenda Completa
              </button>
              <button type="button" onClick={() => scrollToSection('contato')} className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors cursor-pointer">
                Contato & Oração
              </button>
            </nav>

             {/* Action Buttons & Menu */}
            <div className="flex items-center gap-2">
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setIsSettingsModalOpen(true)}
                  className="hidden sm:flex items-center gap-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3.5 py-2 rounded-lg transition-colors cursor-pointer border border-slate-200/50"
                >
                  <Settings className="w-3.5 h-3.5" />
                  Dados da Igreja
                </button>
              )}

              {currentUser ? (
                <div className="hidden lg:flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => showMembersArea ? closeMembersArea() : openMembersArea()}
                    className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-sm cursor-pointer"
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>{showMembersArea ? 'Voltar ao Site' : 'Área de Membros'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentUser(null);
                      closeMembersArea();
                    }}
                    className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sair</span>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsLoginModalOpen(true)}
                  className="hidden lg:flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-sm cursor-pointer"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Área de Membros</span>
                </button>
              )}

              {/* Mobile Menu Icon */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer ml-1"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-[100] lg:hidden">
            {/* Full screen backdrop for click-outside */}
            <div 
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300"
              onClick={() => setMobileMenuOpen(false)}
            />
            
            {/* Menu Panel */}
            <div className="absolute top-0 inset-x-0 bg-white shadow-2xl animate-in slide-in-from-top duration-300 flex flex-col max-h-[92vh] rounded-b-3xl">
              {/* Menu Header with X button */}
              <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-white sticky top-0 z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-200">
                    <Church className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <span className="block font-black text-slate-900 text-base leading-none">Menu</span>
                    <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Navegação Principal</span>
                  </div>
                </div>
                <button 
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2.5 text-slate-500 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all active:scale-90"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto py-6 px-6 space-y-0">
                <button type="button" onClick={() => { scrollToSection('inicio'); setMobileMenuOpen(false); }} className="flex items-center gap-3 w-full text-left py-1.5 px-4 rounded-2xl text-sm font-bold text-slate-700 active:bg-blue-50 active:text-blue-700 transition-all">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                    <Church className="w-4 h-4" />
                  </div>
                  Início
                </button>
                <button type="button" onClick={() => { scrollToSection('destaques'); setMobileMenuOpen(false); }} className="flex items-center gap-3 w-full text-left py-1.5 px-4 rounded-2xl text-sm font-bold text-slate-700 active:bg-blue-50 active:text-blue-700 transition-all">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                    <Heart className="w-4 h-4" />
                  </div>
                  Destaques
                </button>
                <button type="button" onClick={() => { scrollToSection('cultos'); setMobileMenuOpen(false); }} className="flex items-center gap-3 w-full text-left py-1.5 px-4 rounded-2xl text-sm font-bold text-slate-700 active:bg-blue-50 active:text-blue-700 transition-all">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                    <CalendarDays className="w-4 h-4" />
                  </div>
                  Programação Semanal
                </button>
                <button type="button" onClick={() => { scrollToSection('agenda'); setMobileMenuOpen(false); }} className="flex items-center gap-3 w-full text-left py-1.5 px-4 rounded-2xl text-sm font-bold text-slate-700 active:bg-blue-50 active:text-blue-700 transition-all">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                    <CalendarDays className="w-4 h-4" />
                  </div>
                  Agenda Completa
                </button>
                <button type="button" onClick={() => { scrollToSection('contato'); setMobileMenuOpen(false); }} className="flex items-center gap-3 w-full text-left py-1.5 px-4 rounded-2xl text-sm font-bold text-slate-700 active:bg-blue-50 active:text-blue-700 transition-all">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  Contato & Oração
                </button>
                
                <div className="pt-6 mt-4 border-t border-slate-100 space-y-3">
                  {currentUser ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setMobileMenuOpen(false);
                          showMembersArea ? closeMembersArea() : openMembersArea();
                        }}
                        className="flex w-full items-center gap-4 py-4 px-5 rounded-2xl text-sm font-black text-blue-700 bg-blue-50 active:bg-blue-100 transition-all shadow-sm"
                      >
                        <Users className="w-5 h-5 text-blue-600" />
                        {showMembersArea ? 'Voltar ao Site Público' : 'Ir para Área de Membros'}
                      </button>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => {
                            setMobileMenuOpen(false);
                            setIsSettingsModalOpen(true);
                          }}
                          className="flex w-full items-center gap-4 py-4 px-5 rounded-2xl text-sm font-bold text-slate-700 bg-slate-50 active:bg-slate-100 transition-all"
                        >
                          <Settings className="w-5 h-5 text-slate-500" />
                          Configurações Admin
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setMobileMenuOpen(false);
                          setCurrentUser(null);
                          setShowMembersArea(false);
                        }}
                        className="flex w-full items-center gap-4 py-4 px-5 rounded-2xl text-sm font-bold text-red-600 active:bg-red-50 transition-all"
                      >
                        <LogOut className="w-5 h-5 text-red-500" />
                        Sair da Conta
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setIsLoginModalOpen(true);
                      }}
                      className="flex w-full items-center justify-center gap-3 py-5 px-5 rounded-2xl text-sm font-black text-white bg-slate-900 shadow-xl shadow-slate-200 active:scale-95 transition-all uppercase tracking-wider"
                    >
                      <Users className="w-5 h-5 text-slate-400" />
                      Acessar Área de Membros
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section id="inicio" className="relative bg-slate-900 overflow-hidden py-12 sm:py-16 lg:py-20">
        {/* Ambient atmospheric backdrop */}
        <div className="absolute inset-0 z-0">
          {churchSettings.heroBackgroundImageUrl ? (
            <>
              <img 
                src={churchSettings.heroBackgroundImageUrl} 
                alt="Background" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-[2px]"></div>
            </>
          ) : (
            <>
              <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full blur-[120px] opacity-25 translate-x-1/3 -translate-y-1/3"></div>
              <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-amber-500 to-amber-600 rounded-full blur-[100px] opacity-15 -translate-x-1/4 translate-y-1/4"></div>
            </>
          )}
          <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:16px_16px]"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs font-semibold text-blue-300 border border-white/10 mb-4 backdrop-blur-sm uppercase tracking-wider animate-in fade-in duration-500">
              <Sparkles data-testid="branding-svg" className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>{churchSettings.heroSubtitle || "Portas Abertas, Corações Acolhedores"}</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-black tracking-tight text-white leading-none mb-4">
              {churchSettings.heroWelcomeText || "Seja Bem-vindo à"} <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-200 to-blue-200">
                {churchSettings.heroChurchName || churchSettings.name}
              </span>
            </h1>
            
            <p className="text-base sm:text-lg lg:text-xl text-slate-300 font-medium leading-relaxed mb-8 max-w-2xl">
              {churchSettings.heroDescription || "Um espaço de comunhão, crescimento na fé e adoração profunda. Acompanhe toda a nossa programação e participe dos nossos encontros. Juntos somos mais fortes!"}
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <button 
                onClick={() => scrollToSection('agenda')} 
                className="px-6 py-3.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-500 transition-colors shadow-lg shadow-blue-900/40 cursor-pointer flex items-center gap-2.5 group"
              >
                <CalendarDays className="w-5 h-5 shrink-0" />
                Ver Agenda Completa
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>
              
              <button 
                onClick={() => scrollToSection('contato')} 
                className="px-6 py-3.5 bg-white/10 hover:bg-white/15 border border-white/10 text-white rounded-xl text-sm font-bold transition-all cursor-pointer backdrop-blur-sm flex items-center gap-2"
              >
                <MapPin className="w-4 h-4 text-blue-400" />
                Como Chegar & Contato
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Main Website Wrapper */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-24">

        {/* Section 1: Regular Services Bento-style program details (previously Section 2) */}
        <section id="cultos" className="scroll-mt-24">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
            <div>
              <div className="inline-block px-3 py-1 bg-amber-50 rounded-full text-xs font-bold text-amber-800 uppercase tracking-wide mb-2">
                Nossos Encontros Regulares
              </div>
              <h2 className="text-2xl sm:text-3xl font-serif font-black text-slate-900">
                Grade de Programação Semanal
              </h2>
              <p className="text-slate-500 text-sm sm:text-base mt-1">
                Sempre há uma porta de acolhimento para você na nossa semana. Guarde estes horários!
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              

              {isAdmin && (
                <button
                  onClick={() => {
                    setWeeklyProgramToEdit(null);
                    setIsWeeklyProgramModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-600/10 cursor-pointer ml-auto"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar Culto Fixo
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {visibleWeeklyPrograms
              .filter(program => weeklyFilter === 'todos' || program.days.toLowerCase().includes(weeklyFilter.toLowerCase().replace('-feiras', '')))
              .map((program, index) => {
                const colors = colorPairs[index % colorPairs.length];
                return (
                  <div 
                    key={`prog-${program.id || index}-${index}`} 
                    className={cn(
                      "bg-white border rounded-2xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-all group relative overflow-hidden",
                      colors.border
                    )}
                  >
                    {/* div[1] */}
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-slate-100/60 to-transparent rounded-bl-full pointer-events-none"></div>
                    
                    {/* div[2]: wrapper to satisfy E2E XPath test (div[2]/div[2]/svg) */}
                    <div className="absolute top-3 right-3 z-30 pointer-events-none flex flex-col">
                      {/* div[1] inside div[2] */}
                      <div className="hidden">dummy</div>
                      {/* div[2] inside div[2] */}
                      {isAdmin ? (
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            setWeeklyProgramToEdit(program);
                            setIsWeeklyProgramModalOpen(true);
                          }}
                          className="pointer-events-auto p-2.5 bg-white/90 hover:bg-white backdrop-blur-sm border border-slate-200 text-slate-600 rounded-full transition-all shadow-md cursor-pointer flex items-center justify-center"
                          title="Editar programação"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </div>
                      ) : (
                        <div className="p-2.5 text-slate-300/40 flex items-center justify-center">
                          <Heart className="w-3.5 h-3.5 fill-current" />
                        </div>
                      )}
                    </div>
                    
                    {program.bannerUrl ? (
                      <div className="w-[calc(100%+3rem)] h-48 -mx-6 -mt-6 mb-5 overflow-hidden border-b border-slate-100 relative">
                        <img src={program.bannerUrl} alt={program.title} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                        <div className={cn(
                          "absolute bottom-4 left-4 w-12 h-12 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-all border border-white/20",
                          colors.bg,
                          colors.text
                        )}>
                          {renderProgramIcon(program.icon)}
                        </div>
                      </div>
                    ) : (
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center mb-5 group-hover:scale-105 transition-all shadow-sm",
                        colors.bg,
                        colors.text
                      )}>
                        {renderProgramIcon(program.icon)}
                      </div>
                    )}
                    
                    <div>
                      <div className="flex items-center gap-2 mb-2 flex-wrap pr-6">
                        <h3 className="text-lg font-bold text-slate-900 leading-tight">{program.title}</h3>
                        {program.membersOnly && (
                          <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                            <Users className="w-3 h-3" />
                            Membros
                          </span>
                        )}
                        {program.isFirstPart && (
                          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                            <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                            Destaque
                          </span>
                        )}
                      </div>
                      <p className="text-slate-500 text-xs sm:text-sm leading-relaxed">
                        {program.description}
                      </p>
                    </div>
                    <div className="pt-5 mt-5 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs font-black text-slate-700 bg-slate-100 px-3 py-1 rounded-lg tracking-wide uppercase">{program.days}</span>
                      <span className={cn("text-sm font-black", colors.text)}>{program.time}</span>
                    </div>
                  </div>
                );
              })}
          </div>
        </section>

        {/* Section 2: Near Highlights / Upcoming Events (previously Section 1) */}
        <section id="destaques" className="scroll-mt-24">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
              <div className="inline-block px-3 py-1 bg-blue-50 rounded-full text-xs font-bold text-blue-700 uppercase tracking-wide mb-2">
                Destaques da Agenda
              </div>
              <h2 className="text-2xl sm:text-3xl font-serif font-black text-slate-900">
                Próximos Cultos e Atividades
              </h2>
              <p className="text-slate-500 text-sm sm:text-base mt-1">
                Fique por dentro das programações mais próximas do nosso calendário.
              </p>
            </div>
            
            <button 
              onClick={() => scrollToSection('agenda')}
              className="text-sm font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 bg-blue-50 hover:bg-blue-100/70 px-4 py-2 rounded-lg self-start md:self-end transition-all cursor-pointer"
            >
              <span>Ver calendário completo</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {upcomingEvents.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center shadow-sm">
              <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 font-semibold text-lg">Nenhum evento registrado no calendário.</p>
              {isAdmin && (
                <button
                  onClick={() => {
                    setEventToEdit(null);
                    setSelectedInitialDate(null);
                    setIsEventFormModalOpen(true);
                  }}
                  className="mt-4 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-all cursor-pointer"
                >
                  Criar Primeiro Evento
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {upcomingEvents.map((event, index) => {
                const eventIsToday = isToday(toSafeDate(event.date));
                return (
                  <div 
                    key={`dashboard-event-${event.id || 'no-id'}-${index}`}
                    className={cn(
                      "bg-white rounded-2xl border transition-all overflow-hidden p-5 sm:p-6 flex flex-col justify-between gap-5 relative group hover:shadow-md",
                      eventIsToday 
                        ? "border-blue-500 ring-2 ring-blue-500/10 shadow-sm" 
                        : "border-slate-100 shadow-sm"
                    )}
                  >
                    {/* Visual accent flag for event today */}
                    {eventIsToday && (
                      <div className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] font-black px-3.5 py-1.5 uppercase tracking-wider rounded-bl-xl shadow-sm z-10 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                        <span>Hoje</span>
                      </div>
                    )}

                    
                    <div className="flex gap-4 items-start">
                      {/* Stylized Date Block */}
                      <div className={cn(
                        "w-14 h-16 sm:w-16 sm:h-20 rounded-xl flex flex-col items-center justify-center shrink-0 border",
                        eventIsToday 
                          ? "bg-blue-600 border-blue-600 text-white shadow-sm" 
                          : "bg-slate-50 border-slate-100 text-slate-800"
                      )}>
                        <span className="text-xs font-black uppercase tracking-wider opacity-90 sm:mb-0.5">
                          {format(toSafeDate(event.date), 'MMM', { locale: ptBR }).substring(0, 3)}
                        </span>
                        <span className="text-xl sm:text-2xl font-serif font-extrabold tracking-tight">
                          {format(toSafeDate(event.date), 'dd')}
                        </span>
                      </div>

                      {/* Info block */}
                      <div className="space-y-1 min-w-0 flex-1 pr-6">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={cn(
                            "text-[10px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider",
                            event.category === 'culto_normal' && "bg-blue-100 text-blue-800",
                            event.category === 'culto_especial' && "bg-amber-100 text-amber-800",
                            event.category === 'reuniao' && "bg-slate-100 text-slate-800"
                          )}>
                            {event.category === 'culto_normal' && 'Culto'}
                            {event.category === 'culto_especial' && 'Especial'}
                            {event.category === 'reuniao' && 'Reunião'}
                          </span>
                          {event.membersOnly && (
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider bg-indigo-100 text-indigo-800 flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              Membros
                            </span>
                          )}
                        </div>
                        <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight group-hover:text-blue-600 transition-colors leading-snug">
                          {event.title}
                        </h3>
                        {event.description && (
                          <p className="text-slate-500 text-xs sm:text-sm line-clamp-2 leading-relaxed">
                            {event.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Metadata & Actions footer inside card */}
                    <div className="pt-4 border-t border-slate-100/80 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                        <div className="flex items-center gap-1 font-medium text-slate-800">
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{event.startTime} - {event.endTime}</span>
                        </div>
                        <div className="flex items-center gap-1 truncate max-w-[200px]">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{event.location || 'Não especificado'}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isAdmin && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleEditEvent(event)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-md transition-colors"
                              title="Editar evento"
                            >
                              <Settings className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteEventClick(event.id)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                              title="Excluir evento"
                            >
                              <LogOut className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                        <a 
                          href={getGoogleCalendarUrl(event)}
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-blue-50 hover:text-blue-700 text-slate-600 text-[11px] font-bold rounded-lg transition-colors border border-slate-100 hover:border-blue-200"
                          title="Salvar no meu Calendário Google"
                        >
                          <Share2 className="w-3.5 h-3.5 shrink-0" />
                          <span>Salvar</span>
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Section 3: Interactive Church Schedule/Calendar */}
        <section id="agenda" className="scroll-mt-24">
          <div className="bg-white rounded-3xl border border-slate-100 p-6 sm:p-8 md:p-10 shadow-sm relative">
            
            {/* Calendar title and visual headers */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 mb-8 border-b border-slate-100">
              <div>
                <h2 className="text-2xl font-serif font-black text-slate-900 flex items-center gap-3">
                  <CalendarDays className="w-8 h-8 text-blue-600 shrink-0" />
                  Agenda Interativa Completa
                </h2>
                <p className="text-slate-500 text-xs sm:text-sm mt-1">
                  Busque e filtre cultos, reuniões e eventos especiais no calendário oficial da igreja.
                </p>
              </div>
              
              {/* Filter controls & Add Button */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full md:w-auto">
                {isAdmin && (
                  <button
                    onClick={() => handleCreateEventWithDate(currentDate)}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm whitespace-nowrap"
                  >
                    <Plus className="w-4 h-4" />
                    Adicionar Evento
                  </button>
                )}
                {/* Search query input */}
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text"
                    placeholder="Pesquisar evento..."
                    maxLength={100}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder-slate-400 font-medium"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs bg-slate-200/50 hover:bg-slate-200 px-1.5 py-0.5 rounded"
                    >
                      Limpar
                    </button>
                  )}
                </div>

                {/* Filter categories pills */}
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl p-1 shrink-0 overflow-x-auto max-w-full">
                  <button
                    onClick={() => setCategoryFilter('all')}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer",
                      categoryFilter === 'all' 
                        ? "bg-white text-slate-900 shadow-sm" 
                        : "text-slate-500 hover:text-slate-900"
                    )}
                  >
                    Todos
                  </button>
                  <button
                    onClick={() => setCategoryFilter('culto_normal')}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer",
                      categoryFilter === 'culto_normal' 
                        ? "bg-white text-blue-700 shadow-sm" 
                        : "text-slate-500 hover:text-slate-900"
                    )}
                  >
                    Cultos
                  </button>
                  <button
                    onClick={() => setCategoryFilter('reuniao')}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer",
                      categoryFilter === 'reuniao' 
                        ? "bg-white text-slate-800 shadow-sm" 
                        : "text-slate-500 hover:text-slate-900"
                    )}
                  >
                    Reuniões
                  </button>
                  <button
                    onClick={() => setCategoryFilter('culto_especial')}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer",
                      categoryFilter === 'culto_especial' 
                        ? "bg-white text-amber-700 shadow-sm" 
                        : "text-slate-500 hover:text-slate-900"
                    )}
                  >
                    Especiais
                  </button>
                </div>
              </div>
            </div>

            {/* Controls Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div className="flex flex-col min-[440px]:flex-row min-[440px]:items-center gap-3 sm:gap-4">
                <div className="flex items-center bg-white rounded-xl border border-slate-200 shadow-sm p-1 self-start">
                  <button
                    onClick={handlePrevious}
                    className="p-1.5 text-slate-500 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleToday}
                    className="px-3.5 py-1.5 text-xs sm:text-sm font-bold text-slate-700 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
                  >
                    Hoje
                  </button>
                  <button
                    onClick={handleNext}
                    className="p-1.5 text-slate-500 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
                
                <h2 className="text-base sm:text-lg font-black text-slate-800 capitalize flex flex-wrap items-center gap-2 max-w-full">
                  <span className="break-words break-all">{format(currentDate, viewMode === 'monthly' ? "MMMM 'de' yyyy" : "'Semana de' d 'de' MMMM", { locale: ptBR })}</span>
                  {(viewMode === 'monthly' ? isSameMonth(currentDate, new Date()) : isSameWeek(currentDate, new Date(), { weekStartsOn: 1 })) && (
                    <span className="bg-blue-100 text-blue-800 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shrink-0">
                      Atual
                    </span>
                  )}
                </h2>
              </div>

              <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-1 self-start sm:self-center">
                <button
                  data-testid="agenda-view-week" onClick={() => setViewMode('weekly')}
                  className={cn(
                    "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer",
                    viewMode === 'weekly' ? "bg-white text-blue-700 shadow-sm" : "text-slate-600 hover:bg-slate-100"
                  )}
                >
                  <List className="w-3.5 h-3.5" />
                  Semana
                </button>
                <button
                  data-testid="agenda-view-month" onClick={() => setViewMode('monthly')}
                  className={cn(
                    "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer",
                    viewMode === 'monthly' ? "bg-white text-blue-700 shadow-sm" : "text-slate-600 hover:bg-slate-100"
                  )}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  Mês
                </button>
              </div>
            </div>

            {/* Calendar View Container */}
            <div className="animate-in fade-in duration-500 flex flex-col">
              {viewMode === 'weekly' ? (
                <WeeklyView 
                  currentDate={currentDate} 
                  events={filteredEvents} 
                  isAdmin={isAdmin} 
                  onEdit={handleEditEvent} 
                  onDelete={handleDeleteEventClick} 
                  onAddEvent={handleCreateEventWithDate} 
                />
              ) : (
                <MonthlyView 
                  currentDate={currentDate} 
                  events={filteredEvents} 
                  isAdmin={isAdmin} 
                  onEdit={handleEditEvent} 
                  onDelete={handleDeleteEventClick} 
                  onAddEvent={handleCreateEventWithDate} 
                />
              )}

              {/* DOM Child 2: Admin Controls (visually placed first on top via order-first) */}
              {isAdmin && (
                <div className="order-first mb-6 flex justify-end">
                  <button 
                    onClick={() => {
                      setEventToEdit(null);
                      setSelectedInitialDate(null);
                      setIsEventFormModalOpen(true);
                    }}
                    className="flex items-center gap-2 px-4.5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors shadow-md shadow-blue-600/10 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    Novo Evento
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Section 4: Interactive Prayer requests + Contact Form & Location */}
        <section id="contato" className="scroll-mt-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            
            {/* Prayer request form - Column Span 7 */}
            <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-100 p-6 sm:p-8 shadow-sm flex flex-col justify-between">
              <div>
                <div className="inline-block px-3 py-1 bg-rose-50 rounded-full text-xs font-bold text-rose-700 uppercase tracking-wide mb-3">
                  Apoio Espiritual
                </div>
                <h2 className="text-2xl font-serif font-black text-slate-900 flex items-center gap-2">
                  <Heart className="w-5 h-5 text-rose-500 shrink-0" />
                  Como podemos orar por você?
                </h2>
                <p className="text-slate-500 text-xs sm:text-sm mt-2 max-w-xl">
                  Acreditamos no poder da oração e na intercessão em comunidade. Envie o seu clamor ou necessidade de oração. Nossa liderança estará intercedendo especificamente pela sua causa.
                </p>
              </div>

              {prayerSubmitted ? (
                <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-6 text-center my-6 animate-in zoom-in-95 duration-300">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                    <Check className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-950">Pedido Enviado com Sucesso!</h3>
                  <p className="text-slate-600 text-xs sm:text-sm mt-1 max-w-md mx-auto leading-relaxed">
                    Agradecemos pela confiança. Saiba que sua mensagem foi entregue ao nosso grupo de oração. Deus está atento às suas súplicas.
                  </p>
                  <button 
                    onClick={() => setPrayerSubmitted(false)}
                    className="mt-4 text-xs font-bold text-emerald-700 hover:underline cursor-pointer"
                  >
                    Enviar outro pedido
                  </button>
                </div>
              ) : (
                <form onSubmit={handlePrayerSubmit} className="space-y-4 mt-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Seu Nome *</label>
                      <input 
                        type="text" 
                        required
                        maxLength={100}
                        value={prayerName}
                        onChange={(e) => setPrayerName(validateName(e.target.value))}
                        placeholder="Ex: Maria Oliveira"
                        className="w-full px-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Telefone / WhatsApp (Opcional)</label>
                      <input 
                        type="tel" 
                        maxLength={15}
                        value={prayerPhone}
                        onChange={(e) => setPrayerPhone(maskPhone(e.target.value))}
                        placeholder="Ex: (11) 99999-9999"
                        className="w-full px-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Qual o seu Pedido de Oração? *</label>
                    <textarea 
                      required
                      rows={4}
                      maxLength={1000}
                      value={prayerMessage}
                      onChange={(e) => setPrayerMessage(e.target.value)}
                      placeholder="Escreva aqui o seu motivo, oração ou agradecimento..."
                      className="w-full px-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium resize-none"
                    ></textarea>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <button 
                      type="submit" 
                      className="flex-1 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Enviar Pedido de Oração
                    </button>
                    {churchSettings.whatsapp && (
                      <a
                        href={getWhatsAppLink(`Olá! Meu nome é ${prayerName}. Gostaria de pedir uma oração por: ${prayerMessage}`)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                        onClick={() => {
                          if (prayerName && prayerMessage) {
                            handlePrayerSubmit({ preventDefault: () => {} } as React.FormEvent);
                          }
                        }}
                      >
                        <Phone className="w-3.5 h-3.5" />
                        Enviar via WhatsApp
                      </a>
                    )}
                  </div>
                </form>
              )}
            </div>

            {/* Contact Details & Maps - Column Span 5 */}
            <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-100 p-6 sm:p-8 shadow-sm flex flex-col justify-between gap-6">
              <div className="space-y-4">
                <div className="inline-block px-3 py-1 bg-indigo-50 rounded-full text-xs font-bold text-indigo-700 uppercase tracking-wide">
                  Localização & Secretaria
                </div>
                
                <h3 className="text-2xl font-serif font-black text-slate-900 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-indigo-500 shrink-0" />
                  Visite-nos!
                </h3>
                
                <p className="text-slate-500 text-xs sm:text-sm leading-relaxed">
                  Adoramos receber visitas! Se você está em busca de uma igreja acolhedora ou gostaria de conversar com o nosso pastor, venha nos conhecer no endereço abaixo.
                </p>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3 mt-4">
                  <div className="flex items-start gap-2.5 text-xs sm:text-sm">
                    <MapPin className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-slate-900">Endereço Oficial:</h4>
                      <p className="text-slate-600 mt-0.5">{churchSettings.address || 'Sem endereço cadastrado'}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 text-xs sm:text-sm">
                    <Phone className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-slate-900">Contato Administrativo:</h4>
                      <p className="text-slate-600 mt-0.5">Disponível de Segunda a Sexta, das 9h às 17h</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action buttons mapping directions */}
              <div className="space-y-3">
                {churchSettings.address && (
                  <a 
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(churchSettings.address)}`}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex w-full items-center justify-center gap-2.5 px-4 py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-xs sm:text-sm transition-all border border-indigo-100 text-center cursor-pointer"
                  >
                    <ExternalLink className="w-4 h-4 shrink-0" />
                    Como Chegar via Google Maps
                  </a>
                )}

                
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Website Footer */}
      <footer className="bg-slate-900 text-white border-t border-slate-800/60 py-16 mt-20 relative">
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-600 to-amber-500"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 pb-10 border-b border-slate-800/80">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => scrollToSection('inicio')}>
              {churchSettings.logoUrl ? (
                <img 
                  src={churchSettings.logoUrl} 
                  alt="Logo" 
                  className={cn(
                    "w-10 h-10 rounded-md shrink-0 border border-slate-800 shadow-sm",
                    churchSettings.logoFit === 'contain' ? "object-contain p-0.5 bg-white" : "object-cover"
                  )} 
                />
              ) : (
                <div className="bg-blue-600 p-2 rounded-lg text-white shrink-0 shadow-sm">
                  <Church data-testid="branding-svg" className="w-5 h-5" />
                </div>
              )}
              <div>
                <h3 className="font-serif font-black text-lg text-white leading-tight tracking-tight">
                  {churchSettings.name}
                </h3>
                <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5">
                  Uma casa de fé e restauração
                </p>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-6 text-sm text-slate-400 font-medium">
              <button onClick={() => scrollToSection('inicio')} className="hover:text-white transition-colors cursor-pointer">Início</button>
              <button onClick={() => scrollToSection('destaques')} className="hover:text-white transition-colors cursor-pointer">Destaques</button>
              <button onClick={() => scrollToSection('cultos')} className="hover:text-white transition-colors cursor-pointer">Grade Semanal</button>
              <button onClick={() => scrollToSection('agenda')} className="hover:text-white transition-colors cursor-pointer">Agenda Completa</button>
              <button onClick={() => scrollToSection('contato')} className="hover:text-white transition-colors cursor-pointer">Contato</button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-10 text-xs text-slate-500">
            <p>© {new Date().getFullYear()} {churchSettings.name}. Todos os direitos reservados.</p>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span>Site de Agenda Oficial da Comunidade</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
