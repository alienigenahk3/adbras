import React, { useState, useEffect } from 'react';
import { X, Calendar as CalendarIcon, Clock, MapPin, AlignLeft, Repeat, Type, Image, Upload, Users, Image as ImageIcon, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useIsMobile } from '../hooks/useIsMobile';
import { format } from 'date-fns';
import { ChurchEvent, EventCategory, RecurrenceType, ChurchSettings } from '../types';
import { cn, parseLocalDate, toSafeDate } from '../lib/utils';
import { ImageCropperModal } from './ImageCropperModal';
import { ImageGalleryModal } from './ImageGalleryModal';
import { uploadImage, deleteImage } from '../lib/firebase';

interface EventFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (event: Partial<ChurchEvent>) => void;
  eventToEdit?: ChurchEvent | null;
  churchSettings?: ChurchSettings;
  initialDate?: Date | null;
  initialCategory?: EventCategory;
}

export function EventFormModal({ isOpen, onClose, onSave, eventToEdit, churchSettings, initialDate, initialCategory }: EventFormModalProps) {
  const isMobile = useIsMobile();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventType, setEventType] = useState<'date' | 'weekday'>('date');
  const [date, setDate] = useState('');
  const [startMonth, setStartMonth] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [category, setCategory] = useState<EventCategory>('culto_normal');
  const [locationType, setLocationType] = useState<'na_igreja' | 'outro'>('na_igreja');
  const [location, setLocation] = useState('');
  const [recurrence, setRecurrence] = useState<RecurrenceType>('none');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState<string>('');
  const [monthlyType, setMonthlyType] = useState<'date' | 'weekday'>('date');
  const [customRecurrenceDays, setCustomRecurrenceDays] = useState<number[]>([]);
  const [customRecurrenceWeekday, setCustomRecurrenceWeekday] = useState<number>(0);
  const [membersOnly, setMembersOnly] = useState(false);
  const [bannerUrl, setBannerUrl] = useState('');
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setError('');
      if (eventToEdit) {
        setTitle(eventToEdit.title || '');
        setDescription(eventToEdit.description || '');
        const evDate = toSafeDate(eventToEdit.date);
        setDate(!isNaN(evDate.getTime()) ? format(evDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
        setStartMonth(!isNaN(evDate.getTime()) ? format(evDate, 'yyyy-MM') : format(new Date(), 'yyyy-MM'));
        setStartTime(eventToEdit.startTime || '19:00');
        setEndTime(eventToEdit.endTime || '21:00');
        setCategory(eventToEdit.category || 'culto_normal');
        setMembersOnly(eventToEdit.membersOnly || false);
        setBannerUrl(eventToEdit.bannerUrl || '');
        if (eventToEdit.location === 'Na Igreja' || (churchSettings?.address && eventToEdit.location === churchSettings.address)) {
          setLocationType('na_igreja');
          setLocation('');
        } else {
          setLocationType('outro');
          setLocation(eventToEdit.location || '');
        }
        setRecurrence(eventToEdit.recurrence || 'none');
        const recEnd = eventToEdit.recurrenceEndDate ? toSafeDate(eventToEdit.recurrenceEndDate) : null;
        setRecurrenceEndDate(recEnd && !isNaN(recEnd.getTime()) ? format(recEnd, 'yyyy-MM-dd') : '');
        if (eventToEdit.recurrence === 'monthly' && eventToEdit.customRecurrenceDays?.length) {
          setEventType('weekday');
          setMonthlyType('weekday');
          setCustomRecurrenceDays(eventToEdit.customRecurrenceDays);
          setCustomRecurrenceWeekday(eventToEdit.customRecurrenceWeekday ?? (!isNaN(evDate.getTime()) ? evDate.getDay() : 0));
        } else {
          setEventType('date');
          setMonthlyType('date');
          setCustomRecurrenceDays([]);
          setCustomRecurrenceWeekday(!isNaN(evDate.getTime()) ? evDate.getDay() : 0);
        }
      } else {
        const baseDate = initialDate ? new Date(initialDate) : new Date();
        const safeBaseDate = !isNaN(baseDate.getTime()) ? baseDate : new Date();
        setTitle('');
        setDescription('');
        setEventType('date');
        setDate(format(safeBaseDate, 'yyyy-MM-dd'));
        setStartMonth(format(safeBaseDate, 'yyyy-MM'));
        setStartTime('19:00');
        setEndTime('21:00');
        setCategory(initialCategory || 'culto_normal');
        setLocationType('na_igreja');
        setLocation('');
        setRecurrence('none');
        setRecurrenceEndDate('');
        setMonthlyType('date');
        setCustomRecurrenceDays([]);
        setCustomRecurrenceWeekday(safeBaseDate.getDay());
        setMembersOnly(false);
        setBannerUrl('');
      }
    }
  }, [isOpen, eventToEdit, churchSettings, initialDate, initialCategory]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        if (result) {
          setImageToCrop(result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCropSave = async (croppedImage: string) => {
    await uploadImage(croppedImage, 'event-banner.jpg');
    setBannerUrl(croppedImage);
    setImageToCrop(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (startTime && endTime) {
      const [startH, startM] = startTime.split(':').map(Number);
      const [endH, endM] = endTime.split(':').map(Number);
      const startMin = startH * 60 + startM;
      const endMin = endH * 60 + endM;
      if (endMin <= startMin) {
        setError('O horário de término deve ser posterior ao horário de início.');
        return;
      }
    }

    const finalLocation = locationType === 'na_igreja' 
      ? (churchSettings?.address || 'Na Igreja') 
      : location;

    const finalDate = eventType === 'weekday' ? parseLocalDate(`${startMonth}-01`) : parseLocalDate(date);
    const finalRecurrence = eventType === 'weekday' ? 'monthly' : recurrence;

    onSave({
      id: eventToEdit?.id,
      title,
      description,
      date: finalDate,
      startTime,
      endTime,
      category,
      location: finalLocation,
      recurrence: finalRecurrence,
      recurrenceEndDate: recurrenceEndDate ? parseLocalDate(recurrenceEndDate) : undefined,
      customRecurrenceDays: eventType === 'weekday' ? customRecurrenceDays : undefined,
      customRecurrenceWeekday: eventType === 'weekday' ? customRecurrenceWeekday : undefined,
      groupId: eventToEdit?.groupId,
      bannerUrl: bannerUrl || undefined,
      membersOnly,
    });
    onClose();
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <div key="event-form-modal-overlay-wrapper" className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            <motion.div
              {...(!isMobile ? {
                initial: { opacity: 0 },
                animate: { opacity: 1 },
                exit: { opacity: 0 }
              } : {})}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-md"
              onClick={onClose}
            />
            <motion.div
              {...(!isMobile ? {
                initial: { opacity: 0, scale: 0.95, y: 15 },
                animate: { opacity: 1, scale: 1, y: 0 },
                exit: { opacity: 0, scale: 0.95, y: 15 }
              } : {})}
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-100 z-10 my-auto"
            >
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600/30 flex items-center justify-center border border-blue-400/20 text-blue-400 shadow-inner">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold tracking-tight">
                    {eventToEdit ? 'Editar Atividade / Evento' : 'Nova Atividade na Agenda'}
                  </h3>
                  <p className="text-xs text-slate-300">
                    Preencha os dados abaixo para publicar na grade da igreja
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="overflow-y-auto p-6 sm:p-8 space-y-6">
              {error && (
                <div className="p-3.5 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs font-bold flex items-center gap-2">
                  <X className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{error}</span>
                </div>
              )}
              <form id="event-form" onSubmit={handleSubmit} className="space-y-6">
                
                {/* Event Type Switcher */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 p-1.5 bg-slate-100 rounded-xl border border-slate-200/60">
                  <button
                    type="button"
                    onClick={() => {
                      setEventType('date');
                      if (monthlyType === 'weekday') {
                        setRecurrence('none');
                      }
                    }}
                    className={cn(
                      "py-2.5 px-4 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2",
                      eventType === 'date'
                        ? "bg-white text-blue-700 shadow-sm border border-slate-200/50"
                        : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    <CalendarIcon className="w-4 h-4 text-blue-500" />
                    Data Específica
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEventType('weekday');
                      setRecurrence('monthly');
                      setMonthlyType('weekday');
                    }}
                    className={cn(
                      "py-2.5 px-4 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2",
                      eventType === 'weekday'
                        ? "bg-white text-blue-700 shadow-sm border border-slate-200/50"
                        : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    <Repeat className="w-4 h-4 text-blue-500" />
                    Dia da Semana Recorrente
                  </button>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">Título do Evento / Culto</label>
                  <div className="relative">
                    <Type className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      maxLength={100}
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none transition-all text-sm font-semibold text-slate-800 placeholder:text-slate-400 placeholder:font-normal"
                      placeholder="Ex: Culto de Celebração e Adoração"
                    />
                  </div>
                </div>

                {/* Date & Category Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {eventType === 'date' ? (
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">Data do Evento</label>
                      <div className="relative">
                        <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="date"
                          required={eventType === 'date'}
                          value={date}
                          onChange={(e) => setDate(e.target.value)}
                          className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none transition-all text-sm font-medium text-slate-800"
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">Mês de Início</label>
                      <div className="relative">
                        <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="month"
                          required={eventType === 'weekday'}
                          value={startMonth}
                          onChange={(e) => setStartMonth(e.target.value)}
                          className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none transition-all text-sm font-medium text-slate-800"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">Categoria</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as EventCategory)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none transition-all text-sm font-medium text-slate-800"
                    >
                      <option value="culto_normal">Culto Normal</option>
                      <option value="culto_especial">Culto Especial</option>
                      <option value="reuniao">Reunião / Encontro</option>
                    </select>
                  </div>
                </div>

                {/* Time Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">Horário de Início</label>
                    <div className="relative">
                      <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="time"
                        required
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none transition-all text-sm font-medium text-slate-800"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">Horário de Término</label>
                    <div className="relative">
                      <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="time"
                        required
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none transition-all text-sm font-medium text-slate-800"
                      />
                    </div>
                  </div>
                </div>

                {/* Location Selection */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">Localização</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 mb-3">
                    <button
                      type="button"
                      onClick={() => setLocationType('na_igreja')}
                      className={cn(
                        "py-2.5 px-4 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-2",
                        locationType === 'na_igreja' 
                          ? "bg-blue-50 border-blue-200 text-blue-700 shadow-sm" 
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      )}
                    >
                      <MapPin className="w-4 h-4" />
                      Na Sede da Igreja
                    </button>
                    <button
                      type="button"
                      onClick={() => setLocationType('outro')}
                      className={cn(
                        "py-2.5 px-4 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-2",
                        locationType === 'outro' 
                          ? "bg-blue-50 border-blue-200 text-blue-700 shadow-sm" 
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      )}
                    >
                      <MapPin className="w-4 h-4" />
                      Outro Local
                    </button>
                  </div>
                  
                  {locationType === 'na_igreja' && (
                    <div className="flex items-center gap-2.5 p-3.5 bg-blue-50/50 rounded-xl border border-blue-100 text-xs text-slate-700">
                      <MapPin className="w-4 h-4 text-blue-600 shrink-0" />
                      <span className="truncate">
                        <strong>Endereço Cadastrado:</strong> {churchSettings?.address || 'Sem endereço cadastrado nas configurações'}
                      </span>
                    </div>
                  )}
                  
                  {locationType === 'outro' && (
                    <div className="relative">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        required
                        maxLength={150}
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none transition-all text-sm font-medium text-slate-800"
                        placeholder="Informe o endereço completo do local..."
                      />
                    </div>
                  )}
                </div>

                {/* Recurrence config */}
                {eventType === 'date' ? (
                  <div className="space-y-4 p-4 bg-slate-50 border border-slate-200/80 rounded-xl">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">Regra de Repetição</label>
                      <div className="relative">
                        <Repeat className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <select
                          value={recurrence}
                          onChange={(e) => setRecurrence(e.target.value as RecurrenceType)}
                          className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none transition-all text-sm font-medium text-slate-800"
                        >
                          <option value="none">Não repetir (Evento Único)</option>
                          <option value="daily">Diariamente</option>
                          <option value="weekly">Semanalmente</option>
                          <option value="monthly">Mensalmente (mesmo dia do mês)</option>
                          <option value="yearly">Anualmente</option>
                        </select>
                      </div>
                    </div>
                    {recurrence !== 'none' && (
                      <div className="animate-in fade-in slide-in-from-top-2 pt-2 border-t border-slate-200">
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">Repetir até (opcional)</label>
                        <div className="relative">
                          <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input
                            type="date"
                            value={recurrenceEndDate}
                            onChange={(e) => setRecurrenceEndDate(e.target.value)}
                            min={date}
                            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none transition-all text-sm font-medium text-slate-800"
                          />
                        </div>
                        <p className="mt-1 text-xs text-slate-500">Se não informado, repetirá por até 5 anos.</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                        Qual dia da semana?
                      </label>
                      <select
                        value={customRecurrenceWeekday}
                        onChange={(e) => setCustomRecurrenceWeekday(Number(e.target.value))}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none transition-all text-sm font-medium text-slate-800"
                      >
                        <option value={0}>Domingo</option>
                        <option value={1}>Segunda-feira</option>
                        <option value={2}>Terça-feira</option>
                        <option value={3}>Quarta-feira</option>
                        <option value={4}>Quinta-feira</option>
                        <option value={5}>Sexta-feira</option>
                        <option value={6}>Sábado</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                        Quais semanas do mês?
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { value: 1, label: '1ª Semana' },
                          { value: 2, label: '2ª Semana' },
                          { value: 3, label: '3ª Semana' },
                          { value: 4, label: '4ª Semana' },
                          { value: 5, label: '5ª Semana' }
                        ].map((week, index) => (
                          <label key={`rec-week-${week.value}-${index}`} className="flex items-center gap-2 bg-white px-3.5 py-2.5 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-all shadow-sm">
                            <input
                              type="checkbox"
                              checked={customRecurrenceDays.includes(week.value)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setCustomRecurrenceDays([...customRecurrenceDays, week.value].sort());
                                } else {
                                  setCustomRecurrenceDays(customRecurrenceDays.filter(d => d !== week.value));
                                }
                              }}
                              className="text-blue-600 focus:ring-blue-500 rounded border-slate-300 w-4 h-4 cursor-pointer"
                            />
                            <span className="text-xs font-bold text-slate-700">{week.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Members Only toggle */}
                <div className="flex items-center gap-3 bg-slate-50 border border-slate-200/80 rounded-xl p-4">
                  <label className="flex items-center gap-3.5 cursor-pointer select-none w-full">
                    <input
                      type="checkbox"
                      checked={membersOnly}
                      onChange={(e) => setMembersOnly(e.target.checked)}
                      className="text-blue-600 focus:ring-blue-500 rounded border-slate-300 w-5 h-5 cursor-pointer"
                    />
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-blue-600" />
                        Apenas para Membros
                      </span>
                      <span className="text-xs text-slate-500">
                        Atividades e reuniões exclusivas para membros logados na Área de Membros
                      </span>
                    </div>
                  </label>
                </div>

                {/* Banner Upload */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">Banner do Evento (Opcional)</label>
                  <div 
                    className="border-2 border-dashed border-slate-200 rounded-xl p-5 text-center cursor-pointer hover:bg-slate-50/80 transition-all flex flex-col items-center justify-center bg-slate-50/40 group"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {bannerUrl ? (
                      <div className="relative w-full h-36 rounded-lg overflow-hidden group shadow-sm">
                        <img src={bannerUrl} alt="Banner" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-slate-900/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1.5">
                          <Upload className="w-4 h-4" /> Trocar Imagem do Banner
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center py-3 text-slate-500 group-hover:text-blue-600 transition-colors">
                        <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-2 shadow-sm">
                          <Upload className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold text-slate-700">Clique para enviar imagem do banner</span>
                        <span className="text-[11px] text-slate-400 mt-0.5">Formatos suportados: PNG, JPG, WebP</span>
                      </div>
                    )}
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleImageUpload} 
                    accept="image/*" 
                    className="hidden" 
                  />
                  
                  <div className="flex items-center justify-between mt-2 px-1">
                    <button
                      type="button"
                      onClick={() => setIsGalleryOpen(true)}
                      className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1.5 cursor-pointer"
                    >
                      <ImageIcon className="w-4 h-4" /> Escolher da Galeria de Imagens da Igreja
                    </button>

                    {bannerUrl && (
                      <div className="flex items-center gap-3">
                        <button 
                          type="button" 
                          onClick={() => setImageToCrop(bannerUrl)} 
                          className="text-xs font-semibold text-slate-600 hover:text-blue-600 cursor-pointer"
                        >
                          Ajustar / Recortar
                        </button>
                        <button 
                          type="button" 
                          onClick={() => {
                            if (bannerUrl) deleteImage(bannerUrl);
                            setBannerUrl('');
                          }} 
                          className="text-xs font-semibold text-red-500 hover:text-red-600 cursor-pointer"
                        >
                          Remover Banner
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">Descrição / Informações Adicionais</label>
                  <div className="relative">
                    <AlignLeft className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                    <textarea
                      rows={3}
                      maxLength={500}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none transition-all text-sm font-medium text-slate-800 resize-none placeholder:text-slate-400 placeholder:font-normal"
                      placeholder="Detalhes sobre a programação, preter ou orientações..."
                    />
                  </div>
                </div>
              </form>
            </div>
            
            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-col-reverse sm:flex-row justify-end gap-2.5 sm:gap-3 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl transition-all cursor-pointer shadow-sm text-center"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="event-form"
                className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-600/20 cursor-pointer flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Salvar Evento
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
    {imageToCrop && (
      <ImageCropperModal
        isOpen={!!imageToCrop}
        onClose={() => setImageToCrop(null)}
        image={imageToCrop}
        onSave={handleCropSave}
        aspect={16 / 9}
      />
    )}

    <ImageGalleryModal
      isOpen={isGalleryOpen}
      onClose={() => setIsGalleryOpen(false)}
      onSelect={(url) => {
        setBannerUrl(url);
        uploadImage(url, 'event-banner.jpg');
        setIsGalleryOpen(false);
      }}
    />
  </>
  );
}
