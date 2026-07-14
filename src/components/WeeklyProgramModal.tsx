import React, { useState, useEffect } from 'react';
import { X, Compass, BookOpen, Sparkles, Heart, Church, Users, Music, Calendar, Trash2, Image, Upload, Image as ImageIcon, Star } from 'lucide-react';
import { useIsMobile } from '../hooks/useIsMobile';
import { WeeklyProgramItem } from '../types';
import { cn, validateTimeRangeString } from '../lib/utils';
import { ImageCropperModal } from './ImageCropperModal';
import { ImageGalleryModal } from './ImageGalleryModal';
import { uploadImage, deleteImage } from '../lib/firebase';


interface WeeklyProgramModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: WeeklyProgramItem) => void;
  onDelete?: (id: string) => void;
  itemToEdit: WeeklyProgramItem | null;
}

const iconsList = [
  { value: 'compass', label: 'Bússola / Direção', icon: Compass },
  { value: 'bookOpen', label: 'Livro / Ensino', icon: BookOpen },
  { value: 'sparkles', label: 'Brilho / Especial', icon: Sparkles },
  { value: 'heart', label: 'Coração / Comunhão', icon: Heart },
  { value: 'church', label: 'Igreja / Templo', icon: Church },
  { value: 'users', label: 'Pessoas / Célula', icon: Users },
  { value: 'music', label: 'Música / Louvor', icon: Music },
  { value: 'calendar', label: 'Calendário / Evento', icon: Calendar },
] as const;

export function WeeklyProgramModal({ isOpen, onClose, onSave, onDelete, itemToEdit }: WeeklyProgramModalProps) {
  const isMobile = useIsMobile();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [days, setDays] = useState('');
  const [time, setTime] = useState('');
  const [icon, setIcon] = useState<WeeklyProgramItem['icon']>('church');
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [membersOnly, setMembersOnly] = useState(false);
  const [isFirstPart, setIsFirstPart] = useState(false);
  const [bannerUrl, setBannerUrl] = useState('');
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    setShowConfirmDelete(false);
    setError('');
    if (itemToEdit) {
      setTitle(itemToEdit.title);
      setDescription(itemToEdit.description);
      setDays(itemToEdit.days);
      setTime(itemToEdit.time);
      setIcon(itemToEdit.icon);
      setMembersOnly(itemToEdit.membersOnly || false);
      setIsFirstPart(itemToEdit.isFirstPart || false);
      setBannerUrl(itemToEdit.bannerUrl || '');
    } else {
      setTitle('');
      setDescription('');
      setDays('');
      setTime('');
      setIcon('church');
      setMembersOnly(false);
      setIsFirstPart(false);
      setBannerUrl('');
    }
  }, [itemToEdit, isOpen]);

  if (!isOpen) return null;

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
    await uploadImage(croppedImage, 'program-banner.jpg');
    setBannerUrl(croppedImage);
    setImageToCrop(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!title || !days || !time) return;

    const validation = validateTimeRangeString(time);
    if (!validation.isValid) {
      setError(validation.error || 'O horário de término deve ser posterior ao horário de início.');
      return;
    }

    onSave({
      id: itemToEdit?.id || crypto.randomUUID(),
      title,
      description,
      days: days.toUpperCase(),
      time,
      icon,
      bannerUrl: bannerUrl || undefined,
      membersOnly,
      isFirstPart,
    });
    onClose();
  };


  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm ${isMobile ? '' : 'animate-in fade-in duration-200'}`}>
      <div className={`relative w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh] ${isMobile ? '' : 'animate-in zoom-in-95 duration-200'}`}>
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
          <h2 className="text-lg font-bold text-slate-900">
            {itemToEdit ? 'Editar Atividade Semanal' : 'Nova Atividade Semanal'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs font-bold flex items-center gap-2">
              <X className="w-4 h-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Título da Atividade *
            </label>
            <input
              type="text"
              required
              maxLength={100}
              placeholder="Ex: Culto de Celebração, Escola Dominical"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-colors font-medium placeholder-slate-400"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Banner da Atividade (Opcional)
            </label>
            <div 
              className="border-2 border-dashed border-slate-300 rounded-lg p-3 text-center cursor-pointer hover:bg-slate-50 transition-colors flex flex-col items-center justify-center bg-slate-50/50"
              onClick={() => fileInputRef.current?.click()}
            >
              {bannerUrl ? (
                <div className="relative w-full h-28 rounded-md overflow-hidden group">
                  <img src={bannerUrl} alt="Banner" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-medium">
                    Trocar Banner
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center py-1 text-slate-500">
                  <Upload className="w-5 h-5 mb-1 text-slate-400" />
                  <span className="text-xs font-semibold">Enviar imagem do banner</span>
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
            <button
              type="button"
              onClick={() => setIsGalleryOpen(true)}
              className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-medium cursor-pointer mt-1"
            >
              <ImageIcon className="w-3.5 h-3.5" /> Escolher da Galeria de Imagens
            </button>
            {bannerUrl && (
              <div className="flex items-center gap-3 mt-1">
                <button 
                  type="button" 
                  onClick={() => setImageToCrop(bannerUrl)} 
                  className="text-xs text-blue-600 hover:underline cursor-pointer font-medium"
                >
                  Recortar / Ajustar
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    if (bannerUrl) deleteImage(bannerUrl);
                    setBannerUrl('');
                  }} 
                  className="text-xs text-red-500 hover:underline cursor-pointer"
                >
                  Remover banner
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Descrição
            </label>
            <textarea
              placeholder="Descreva brevemente o objetivo ou dinâmica desta atividade..."
              value={description}
              maxLength={500}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-colors font-medium placeholder-slate-400 resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Dia(s) da Semana *
              </label>
              <input
                type="text"
                required
                maxLength={50}
                placeholder="Ex: DOMINGOS, QUARTAS"
                value={days}
                onChange={(e) => setDays(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-colors font-medium placeholder-slate-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Horário *
              </label>
              <input
                type="text"
                required
                maxLength={50}
                placeholder="Ex: 19:30h, 18:00h"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-colors font-medium placeholder-slate-400"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 bg-slate-50 border border-slate-200/60 rounded-xl p-3.5 hover:bg-slate-100/50 transition-colors">
            <label className="flex items-center gap-3 cursor-pointer select-none w-full">
              <input
                type="checkbox"
                checked={membersOnly}
                onChange={(e) => setMembersOnly(e.target.checked)}
                className="text-blue-600 focus:ring-blue-500 rounded border-slate-300 w-4 h-4 cursor-pointer"
              />
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                  <Users className="w-4 h-4 text-blue-600" />
                  Apenas para Membros
                </span>
                <span className="text-[10px] text-slate-500 mt-0.5">
                  Esta atividade semanal será exibida exclusivamente para membros logados
                </span>
              </div>
            </label>
          </div>

          <div className="flex items-center gap-3 bg-slate-50 border border-slate-200/60 rounded-xl p-3.5 hover:bg-slate-100/50 transition-colors">
            <label className="flex items-center gap-3 cursor-pointer select-none w-full">
              <input
                type="checkbox"
                checked={isFirstPart}
                onChange={(e) => setIsFirstPart(e.target.checked)}
                className="text-amber-600 focus:ring-amber-500 rounded border-slate-300 w-4 h-4 cursor-pointer"
              />
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                  Fixar na Primeira Parte da Grade Semanal
                </span>
                <span className="text-[10px] text-slate-500 mt-0.5">
                  Exibir este culto/atividade em destaque no início da grade de programação semanal
                </span>
              </div>
            </label>
          </div>

          {/* Icon Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Ícone Representativo
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {iconsList.map((item, index) => {
                const IconComponent = item.icon;
                const isSelected = icon === item.value;
                return (
                  <button
                    key={`program-icon-${item.value}-${index}`}
                    type="button"
                    onClick={() => setIcon(item.value)}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/50 text-blue-600 ring-2 ring-blue-500/10'
                        : 'border-slate-100 hover:border-slate-200 text-slate-500 hover:text-slate-700 bg-slate-50/50'
                    }`}
                    title={item.label}
                  >
                    <IconComponent className="w-5 h-5 mb-1" />
                    <span className="text-[9px] font-bold leading-tight truncate w-full">{item.label.split(' / ')[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Banner Selector */}
          

          {/* Footer actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
            {itemToEdit && onDelete ? (
              showConfirmDelete ? (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200/50 p-1.5 rounded-xl animate-in fade-in duration-200">
                  <span className="text-[10px] font-black uppercase text-red-700 px-1.5">Excluir?</span>
                  <button
                    type="button"
                    onClick={() => {
                      onDelete(itemToEdit.id);
                      onClose();
                    }}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-black transition-colors cursor-pointer"
                  >
                    Sim
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowConfirmDelete(false)}
                    className="px-2.5 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    Não
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowConfirmDelete(true)}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-red-200/50"
                >
                  <Trash2 className="w-4 h-4" />
                  Excluir
                </button>
              )
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-md shadow-blue-600/10 cursor-pointer"
              >
                {itemToEdit ? 'Salvar Alterações' : 'Criar Atividade'}
              </button>
            </div>
          </div>
        </form>
      </div>
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
          uploadImage(url, 'program-banner.jpg');
          setIsGalleryOpen(false);
        }}
      />
    </div>
  );
}
