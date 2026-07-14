import React from 'react';
import { X, Clock, MapPin, Calendar as CalendarIcon, Edit2, Trash2, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useIsMobile } from '../hooks/useIsMobile';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChurchEvent } from '../types';
import { EventBadge } from './EventBadge';

interface DayEventsModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date | null;
  events: ChurchEvent[];
  isAdmin?: boolean;
  onEdit?: (event: ChurchEvent) => void;
  onDelete?: (id: string) => void;
  onAddEvent?: (date: Date) => void;
}

export function DayEventsModal({ isOpen, onClose, date, events, isAdmin, onEdit, onDelete, onAddEvent }: DayEventsModalProps) {
  const isMobile = useIsMobile();
  if (!date) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            {...(!isMobile ? {
              initial: { opacity: 0 },
              animate: { opacity: 1 },
              exit: { opacity: 0 }
            } : {})}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            {...(!isMobile ? {
              initial: { opacity: 0, scale: 0.95, y: 10 },
              animate: { opacity: 1, scale: 1, y: 0 },
              exit: { opacity: 0, scale: 0.95, y: 10 }
            } : {})}
            className="relative bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh]"
          >
            <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2.5">
                <CalendarIcon className="w-6 h-6 text-blue-600 shrink-0" />
                <h3 className="text-lg font-semibold text-slate-800 capitalize">
                  {format(date, "dd 'de' MMMM", { locale: ptBR })}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const d = date;
                    onClose();
                    setTimeout(() => {
                      onAddEvent?.(d);
                    }, 50);
                  }}
                  className="flex items-center gap-1.5 px-2 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                  title="Adicionar evento para este dia"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Adicionar</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1 text-slate-400 hover:bg-slate-200 rounded-md transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="p-4 overflow-y-auto flex-1 bg-slate-50/50">
              {events.length === 0 ? (
                <div className="text-center text-slate-500 py-10 flex flex-col items-center justify-center gap-4">
                  <p className="text-slate-500 font-medium">Nenhum evento registrado neste dia.</p>
                  <button
                    onClick={() => {
                      const d = date;
                      onClose();
                      setTimeout(() => {
                        onAddEvent?.(d);
                      }, 50);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    Adicionar Evento
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {events.map((event, index) => (
                    <div key={`daymodal-event-${event.id || 'no-id'}-${index}`} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                      {event.bannerUrl && (
                        <div className="w-full h-32 rounded-lg overflow-hidden mb-3 border border-slate-100">
                          <img src={event.bannerUrl} alt={event.title} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="flex justify-between items-start mb-2 gap-2">
                        <div className="flex flex-wrap items-center gap-2 min-w-0 flex-1">
                          <h4 className="font-bold text-slate-900 break-words break-all leading-tight flex-1 min-w-0">{event.title}</h4>
                          <EventBadge category={event.category} />
                        </div>
                        {isAdmin && (
                          <div className="flex items-center gap-1 -mt-1 -mr-1 shrink-0">
                            <button
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                              title="Editar evento"
                              onClick={() => {
                                const ev = event;
                                onClose();
                                setTimeout(() => {
                                  onEdit?.(ev);
                                }, 50);
                              }}
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                              title="Excluir evento"
                              onClick={() => onDelete?.(event.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-slate-600 mb-3 break-words break-all whitespace-pre-line">{event.description}</p>
                      
                      <div className="flex flex-col gap-1.5 text-sm text-slate-500">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-slate-400" />
                          <span>{event.startTime} - {event.endTime}</span>
                        </div>
                        <div className="flex items-center gap-2 min-w-0">
                          <MapPin className="w-4 h-4 text-slate-400" />
                          <span className="truncate">{event.location}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
