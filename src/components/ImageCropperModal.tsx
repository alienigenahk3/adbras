import React, { useState, useCallback } from 'react';
import Cropper, { Area } from 'react-easy-crop';
import { X, Check } from 'lucide-react';
import { motion } from 'motion/react';

interface ImageCropperModalProps {
  isOpen: boolean;
  onClose: () => void;
  image: string;
  onSave: (croppedImage: string) => void;
  aspect?: number;
}

export function ImageCropperModal({ isOpen, onClose, image, onSave, aspect = 1 }: ImageCropperModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const onCropComplete = useCallback((_: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const getCroppedImg = async () => {
    if (!croppedAreaPixels) return;
    
    const imageElement = document.createElement('img');
    imageElement.src = image;
    await new Promise((resolve, reject) => {
      imageElement.onload = resolve;
      imageElement.onerror = reject;
    });

    const MAX_WIDTH = 400;
    const scale = croppedAreaPixels.width > MAX_WIDTH ? MAX_WIDTH / croppedAreaPixels.width : 1;
    
    const canvas = document.createElement('canvas');
    canvas.width = croppedAreaPixels.width * scale;
    canvas.height = croppedAreaPixels.height * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      alert('Erro ao processar a imagem. Por favor, tente novamente.');
      return;
    }

    // Apply crop
    try {
      ctx.drawImage(
        imageElement,
        croppedAreaPixels.x,
        croppedAreaPixels.y,
        croppedAreaPixels.width,
        croppedAreaPixels.height,
        0,
        0,
        canvas.width,
        canvas.height
      );

      onSave(canvas.toDataURL('image/jpeg', 0.7));
      onClose();
    } catch (error) {
      console.error('Error drawing image:', error);
      alert('Erro ao cortar a imagem. Por favor, tente novamente.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col h-[80vh]"
      >
        <div className="flex justify-between items-center p-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">Ajustar Imagem</h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:bg-slate-100 rounded-md">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="relative flex-1 bg-slate-100">
          <Cropper
            image={image}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={setCrop}
            onCropComplete={onCropComplete}
            onZoomChange={setZoom}
          />
        </div>

        <div className="p-4 flex flex-col gap-4 border-t border-slate-100 bg-slate-50">
          <div className="flex gap-4 items-center">
            <span className="text-sm text-slate-600 font-medium w-16">Zoom</span>
            <input
              type="range"
              value={zoom}
              min={1}
              max={3}
              step={0.1}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-md transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={getCroppedImg}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Check className="w-4 h-4" />
              Salvar
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
