import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, Building, MapPin, Image as ImageIcon, Trash2, Phone } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useIsMobile } from '../hooks/useIsMobile';
import { ChurchSettings } from '../types';
import { cn, maskPhone, validateName } from '../lib/utils';
import { ImageCropperModal } from './ImageCropperModal';
import { ImageGalleryModal } from './ImageGalleryModal';
import { uploadImage, deleteImage } from '../lib/firebase';

interface ChurchSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ChurchSettings;
  onSave: (settings: ChurchSettings) => void;
}

export function ChurchSettingsModal({ isOpen, onClose, settings, onSave }: ChurchSettingsModalProps) {
  const isMobile = useIsMobile();
  const [name, setName] = useState(settings.name);
  const [address, setAddress] = useState(settings.address);
  const [heroSubtitle, setHeroSubtitle] = useState(settings.heroSubtitle || '');
  const [heroWelcomeText, setHeroWelcomeText] = useState(settings.heroWelcomeText || '');
  const [heroChurchName, setHeroChurchName] = useState(settings.heroChurchName || '');
  const [heroDescription, setHeroDescription] = useState(settings.heroDescription || '');
  const [heroBackgroundImageUrl, setHeroBackgroundImageUrl] = useState(settings.heroBackgroundImageUrl || '');
  
  const heroFileInputRef = useRef<HTMLInputElement>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(settings.logoUrl);
  const [logoFit, setLogoFit] = useState<'cover' | 'contain'>(settings.logoFit || 'cover');
  const [whatsapp, setWhatsapp] = useState(settings.whatsapp || '');
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setName(settings.name);
      setAddress(settings.address);
      setLogoUrl(settings.logoUrl);
      setLogoFit(settings.logoFit || 'cover');
      setWhatsapp(settings.whatsapp || '');
      setHeroSubtitle(settings.heroSubtitle || '');
      setHeroWelcomeText(settings.heroWelcomeText || '');
      setHeroChurchName(settings.heroChurchName || '');
      setHeroDescription(settings.heroDescription || '');
      setHeroBackgroundImageUrl(settings.heroBackgroundImageUrl || '');
    }
  }, [isOpen, settings]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ name, address, logoUrl, logoFit, whatsapp, heroSubtitle, heroWelcomeText, heroChurchName, heroDescription, heroBackgroundImageUrl });
    onClose();
  };

  const handleHeroFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const result = reader.result as string;
        if (result) {
          await uploadImage(result, 'hero_bg.jpg');
          setHeroBackgroundImageUrl(result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    await uploadImage(croppedImage, 'logo.jpg');
    setLogoUrl(croppedImage);
    setImageToCrop(null);
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <div key="church-settings-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
              className="relative bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]"
            >
            <div className="flex justify-between items-center p-4 border-b border-slate-100 shrink-0">
              <h3 className="text-lg font-semibold text-slate-800">Dados da Igreja</h3>
              <button
                type="button"
                onClick={onClose}
                className="p-1 text-slate-400 hover:bg-slate-100 rounded-md transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
              
              <div className="flex flex-col items-center justify-center gap-4 mb-2">
                <div 
                  className="w-24 h-24 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center bg-slate-50 overflow-hidden cursor-pointer hover:bg-slate-100 transition-colors shadow-inner"
                  onClick={() => fileInputRef.current?.click()}
                  title="Clique para carregar uma logo"
                >
                  {logoUrl ? (
                    <img 
                      src={logoUrl} 
                      alt="Logo" 
                      className={cn(
                        "w-full h-full transition-all",
                        logoFit === 'cover' ? "object-cover" : "object-contain p-1 bg-white"
                      )} 
                    />
                  ) : (
                    <div className="flex flex-col items-center text-slate-400">
                      <Upload className="w-6 h-6 mb-1" />
                      <span className="text-xs font-medium">Logo</span>
                    </div>
                  )}
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept="image/*" 
                  className="hidden" 
                />
                <button
                  type="button"
                  onClick={() => setIsGalleryOpen(true)}
                  className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-medium cursor-pointer"
                >
                  <ImageIcon className="w-3.5 h-3.5" /> Escolher da Galeria de Imagens
                </button>
                
                {logoUrl && (
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                      <button
                        type="button"
                        onClick={() => setLogoFit('cover')}
                        className={cn(
                          "px-3 py-1 text-xs font-medium rounded-md transition-all cursor-pointer",
                          logoFit === 'cover'
                            ? "bg-white text-slate-900 shadow-sm"
                            : "text-slate-500 hover:text-slate-900"
                        )}
                      >
                        Preencher
                      </button>
                      <button
                        type="button"
                        onClick={() => setLogoFit('contain')}
                        className={cn(
                          "px-3 py-1 text-xs font-medium rounded-md transition-all cursor-pointer",
                          logoFit === 'contain'
                            ? "bg-white text-slate-900 shadow-sm"
                            : "text-slate-500 hover:text-slate-900"
                        )}
                      >
                        Ajustar
                      </button>
                    </div>
                    <div className="flex items-center gap-3">
                      <button 
                        type="button" 
                        onClick={() => setImageToCrop(logoUrl)} 
                        className="text-xs text-blue-600 hover:underline cursor-pointer font-medium"
                      >
                        Recortar / Ajustar
                      </button>
                      <button 
                        type="button" 
                        onClick={() => {
                          if (logoUrl) deleteImage(logoUrl);
                          setLogoUrl(null);
                        }} 
                        className="text-xs text-red-500 hover:underline cursor-pointer"
                      >
                        Remover logo
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome da Igreja</label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    required
                    maxLength={100}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
                    placeholder="Ex: Igreja Batista Central"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Endereço</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    maxLength={150}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
                    placeholder="Ex: Rua das Flores, 123 - Centro"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">WhatsApp / Telefone</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    maxLength={15}
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(maskPhone(e.target.value))}
                    className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
                    placeholder="Ex: (11) 99999-9999"
                  />
                </div>
              </div>
              
              
              

              <div className="pt-4 border-t border-slate-100">
                <h4 className="text-sm font-bold text-slate-800 mb-3">Seção Inicial (Capa)</h4>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Subtítulo</label>
                    <input
                      type="text"
                      maxLength={150}
                      value={heroSubtitle}
                      onChange={(e) => setHeroSubtitle(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500 outline-none"
                      placeholder="Ex: Portas Abertas, Corações Acolhedores"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Texto de Boas-vindas</label>
                    <input
                      type="text"
                      maxLength={100}
                      value={heroWelcomeText}
                      onChange={(e) => setHeroWelcomeText(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500 outline-none"
                      placeholder="Ex: Seja Bem-vindo à"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nome da Igreja (Capa)</label>
                    <input
                      type="text"
                      maxLength={100}
                      value={heroChurchName}
                      onChange={(e) => setHeroChurchName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500 outline-none"
                      placeholder="Ex: Comunidade Cristã ICTUS"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
                    <textarea
                      value={heroDescription}
                      maxLength={500}
                      onChange={(e) => setHeroDescription(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                      placeholder="Ex: Um espaço de comunhão..."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Imagem de Fundo (Plano de Fundo)</label>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-24 h-16 rounded-md border border-slate-300 bg-slate-100 flex items-center justify-center overflow-hidden cursor-pointer shrink-0"
                          onClick={() => heroFileInputRef.current?.click()}
                        >
                          {heroBackgroundImageUrl ? (
                            <img src={heroBackgroundImageUrl} alt="Bg" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xs text-slate-500">Sem imagem</span>
                          )}
                        </div>
                        <input 
                           type="file" 
                           ref={heroFileInputRef} 
                           onChange={handleHeroFileChange} 
                           accept="image/*" 
                           className="hidden" 
                        />
                        <div className="flex flex-col gap-1">
                          <button
                            type="button"
                            onClick={() => heroFileInputRef.current?.click()}
                            className="text-xs text-blue-600 hover:underline text-left font-medium cursor-pointer"
                          >
                            Alterar imagem
                          </button>
                          {heroBackgroundImageUrl && (
                            <button
                              type="button"
                              onClick={() => {
                                if (heroBackgroundImageUrl) deleteImage(heroBackgroundImageUrl);
                                setHeroBackgroundImageUrl('');
                              }}
                              className="text-xs text-red-500 hover:underline text-left cursor-pointer"
                            >
                              Remover imagem
                            </button>
                          )}
                        </div>
                      </div>
                      
                      <input
                        type="text"
                        maxLength={500}
                        value={heroBackgroundImageUrl}
                        onChange={(e) => setHeroBackgroundImageUrl(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500 outline-none text-xs"
                        placeholder="Ou digite/cole o caminho ou URL da imagem (ex: /images/bg.jpg)..."
                      />
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer"
              >
                Salvar Dados
              </button>

            </form>
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
      />
    )}

    <ImageGalleryModal
      isOpen={isGalleryOpen}
      onClose={() => setIsGalleryOpen(false)}
      onSelect={(url) => {
        setLogoUrl(url);
        uploadImage(url, 'logo.jpg');
        setIsGalleryOpen(false);
      }}
    />
  </>
  );
}
