import React from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { ChurchEvent } from '../types';

interface DeleteEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (deleteAll: boolean) => void;
  event: ChurchEvent | null;
}

export function DeleteEventModal({ isOpen, onClose, onConfirm, event }: DeleteEventModalProps) {
  if (!isOpen || !event) return null;

  const isRecurring = !!event.groupId;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            <h3 className="text-lg font-semibold">Excluir Evento</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          <p className="text-slate-600 mb-6">
            Você tem certeza que deseja excluir o evento <strong className="text-slate-900">{event.title}</strong>?
          </p>

          <div className="flex flex-col gap-3">
            {isRecurring ? (
              <>
                <button
                  onClick={() => onConfirm(false)}
                  className="w-full py-2 px-4 bg-white border border-red-200 text-red-600 font-medium rounded-md hover:bg-red-50 transition-colors"
                >
                  Excluir apenas este evento
                </button>
                <button
                  onClick={() => onConfirm(true)}
                  className="w-full py-2 px-4 bg-red-600 text-white font-medium rounded-md hover:bg-red-700 transition-colors shadow-sm"
                >
                  Excluir todos os eventos desta repetição
                </button>
              </>
            ) : (
              <button
                onClick={() => onConfirm(false)}
                className="w-full py-2 px-4 bg-red-600 text-white font-medium rounded-md hover:bg-red-700 transition-colors shadow-sm"
              >
                Sim, excluir evento
              </button>
            )}
            <button
              onClick={onClose}
              className="w-full py-2 px-4 bg-white border border-slate-200 text-slate-700 font-medium rounded-md hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
