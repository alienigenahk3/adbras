import React from 'react';
import { format, isToday, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, MapPin, CalendarDays } from 'lucide-react';
import { ChurchEvent } from '../types';
import { EventBadge } from './EventBadge';
import { toSafeDate } from '../lib/utils';

interface TodayHighlightProps {
  events: ChurchEvent[];
  onDateClick: (date: Date) => void;
}

export function TodayHighlight({ events, onDateClick }: TodayHighlightProps) {
  const today = new Date();
  const todaysEvents = events.filter(e => isSameDay(toSafeDate(e.date), today));

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-8">
      <div className="bg-slate-900 text-white p-6 relative overflow-hidden">
        {/* Background Accents */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 rounded-full blur-3xl opacity-20 translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-amber-500 rounded-full blur-3xl opacity-20 -translate-x-1/2 translate-y-1/2"></div>
        
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-medium text-slate-300 uppercase tracking-widest mb-1">
              Hoje
            </h2>
            <div className="text-3xl font-bold text-white mb-2 capitalize">
              {format(today, "EEEE, d 'de' MMMM", { locale: ptBR })}
            </div>
            <p className="text-slate-300">
              {todaysEvents.length === 0 
                ? 'Nenhum evento programado para hoje.'
                : `Você tem ${todaysEvents.length} evento${todaysEvents.length > 1 ? 's' : ''} hoje.`
              }
            </p>
          </div>
          <button 
            onClick={() => onDateClick(today)}
            className="self-start sm:self-center px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-md font-medium flex items-center gap-2 transition-colors"
          >
            <CalendarDays className="w-6 h-6 shrink-0 text-slate-100" />
            <span>Ver na agenda</span>
          </button>
        </div>
      </div>

      {todaysEvents.length > 0 && (
        <div className="divide-y divide-slate-100">
          {todaysEvents.map((event, index) => (
            <div key={`today-event-${event.id || 'no-id'}-${index}`} className="p-4 sm:p-6 hover:bg-slate-50 transition-colors">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex flex-col sm:flex-row gap-4 items-start flex-1">
                  {event.bannerUrl && (
                    <div className="w-full sm:w-32 h-32 sm:h-20 rounded-xl overflow-hidden border border-slate-100 shadow-sm shrink-0">
                      <img src={event.bannerUrl} alt={event.title} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="text-lg font-bold text-slate-900 leading-snug">{event.title}</h3>
                    <EventBadge category={event.category} />
                  </div>
                  {event.description && (
                    <p className="text-slate-500 text-sm max-w-2xl leading-relaxed">{event.description}</p>
                  )}
                </div>
              </div>
              <div className="flex flex-row lg:flex-col gap-4 lg:gap-2 min-w-[140px] text-xs font-semibold text-slate-600 bg-slate-50 lg:bg-transparent p-2.5 lg:p-0 rounded-xl shrink-0">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="font-bold text-slate-800">
                    {event.startTime} - {event.endTime}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="truncate max-w-[180px]">{event.location}</span>
                </div>
              </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
