import React, { useState } from 'react';
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  startOfMonth,
  endOfMonth,
  isSameMonth,
  isSameDay,
  isToday,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChurchEvent } from '../types';
import { cn, toSafeDate } from '../lib/utils';
import { EventBadge } from './EventBadge';
import { DayEventsModal } from './DayEventsModal';

interface MonthlyViewProps {
  currentDate: Date;
  events: ChurchEvent[];
  isAdmin?: boolean;
  onEdit?: (event: ChurchEvent) => void;
  onDelete?: (id: string) => void;
  onAddEvent?: (date: Date) => void;
}

export function MonthlyView({ currentDate, events, isAdmin, onEdit, onDelete, onAddEvent }: MonthlyViewProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const dateFormat = 'd';
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const weekDays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
  const mobileWeekDays = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header Days */}
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
        {weekDays.map((dayName, idx) => (
          <div key={dayName} className="py-2.5 sm:py-3 text-center text-[10px] sm:text-xs font-black text-slate-500 uppercase tracking-tight sm:tracking-wider border-r border-slate-200 last:border-0">
            <span className="hidden sm:inline">{dayName}</span>
            <span className="sm:hidden">{mobileWeekDays[idx]}</span>
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 auto-rows-fr">
        {days.map((day, idx) => {
          const dayEvents = events.filter((e) => isSameDay(toSafeDate(e.date), day));
          const isCurrentMonth = isSameMonth(day, monthStart);
          
          return (
            <div
              key={`month-day-${format(day, 'yyyy-MM-dd')}-${idx}`}
              onClick={() => setSelectedDate(day)}
              className={cn(
                'min-h-[64px] sm:min-h-[120px] p-1 sm:p-2 border-r border-b border-slate-200 last:border-r-0 relative transition-colors cursor-pointer hover:bg-slate-50 flex flex-col justify-between',
                !isCurrentMonth && 'bg-slate-50 text-slate-400',
                idx % 7 === 6 && 'border-r-0' // Rightmost column
              )}
            >
              <div>
                <div className="relative flex justify-center sm:justify-between items-center mb-1">
                  <span className={cn(
                    'text-xs sm:text-sm font-semibold w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-full',
                    isToday(day) 
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
                      : !isCurrentMonth ? 'text-slate-400' : 'text-slate-700'
                  )}>
                    {format(day, dateFormat)}
                  </span>
                  {dayEvents.length > 0 && (
                    <span className="text-[8px] bg-slate-100 text-slate-600 px-1 py-0.2 rounded-full font-black sm:hidden absolute top-0 right-0">
                      {dayEvents.length}
                    </span>
                  )}
                </div>

                {/* Desktop View: Full Event Details */}
                <div className="mt-1 space-y-1 hidden sm:block">
                  {dayEvents.map((event, index) => (
                    <div
                      key={`monthly-event-${event.id || 'no-id'}-${index}-${format(day, 'yyyy-MM-dd')}`}
                      className="group relative cursor-pointer"
                    >
                      <div className={cn(
                        'text-[10px] md:text-xs px-1.5 py-0.5 rounded truncate',
                        event.category === 'culto_normal' && 'bg-indigo-50 text-indigo-700 border border-indigo-100',
                        event.category === 'culto_especial' && 'bg-amber-50 text-amber-700 border border-amber-100',
                        event.category === 'reuniao' && 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                      )}>
                        <span className="font-semibold mr-1">{event.startTime}</span>
                        {event.title}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mobile View: Small indicator dots */}
              <div className="flex flex-wrap gap-1 justify-center mt-auto pb-1 sm:hidden">
                {dayEvents.slice(0, 3).map((event, index) => (
                  <span
                    key={`monthly-dot-${event.id || 'no-id'}-${index}-${format(day, 'yyyy-MM-dd')}`}
                    className={cn(
                      'w-1.5 h-1.5 rounded-full',
                      event.category === 'culto_normal' && 'bg-indigo-500',
                      event.category === 'culto_especial' && 'bg-amber-500',
                      event.category === 'reuniao' && 'bg-emerald-500'
                    )}
                    title={event.title}
                  />
                ))}
                {dayEvents.length > 3 && (
                  <span className="text-[8px] font-black text-slate-400 leading-none">+</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <DayEventsModal 
        isOpen={!!selectedDate} 
        onClose={() => setSelectedDate(null)} 
        date={selectedDate} 
        events={selectedDate ? events.filter(e => isSameDay(toSafeDate(e.date), selectedDate)) : []} 
        isAdmin={isAdmin}
        onEdit={onEdit}
        onDelete={onDelete}
        onAddEvent={onAddEvent}
      />
    </div>
  );
}
