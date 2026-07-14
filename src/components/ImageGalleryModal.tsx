import React, { useState, useEffect } from 'react';
import { X, Trash2, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useIsMobile } from '../hooks/useIsMobile';
import { listImages, deleteImage } from '../lib/firebase';
import { cn } from '../lib/utils';

interface ImageGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
}

export function ImageGalleryModal({ isOpen, onClose, onSelect }: ImageGalleryModalProps) {
  const isMobile = useIsMobile();
  const [images, setImages] = useState<{ id?: string, name: string, url: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadImages();
    }
  }, [isOpen]);

  const loadImages = async () => {
    setLoading(true);
    const imgs = await listImages();
    setImages(imgs);
    setLoading(false);
  };

  const handleDelete = async (e: React.MouseEvent, url: string) => {
    e.stopPropagation();
    if (confirm('Tem certeza que deseja excluir esta imagem?')) {
      await deleteImage(url);
      loadImages();
    }
  };

  if (!isOpen) return null;

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
            className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden z-10"
          >
          <div className="flex items-center justify-between p-4 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-800">Galeria de Imagens</h2>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full">
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>
          
          <div className="p-4 overflow-y-auto flex-1">
            {loading ? (
              <div className="text-center py-8">Carregando...</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {images.map((img, index) => (
                  <div key={`gallery-${img.id || 'img'}-${index}`} className="relative group aspect-square rounded-lg overflow-hidden border border-slate-200 cursor-pointer" onClick={() => onSelect(img.url)}>
                    <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button onClick={(e) => handleDelete(e, img.url)} className="p-2 bg-red-500 text-white rounded-full">
                        <Trash2 className="w-4 h-4" />
                      </button>
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
