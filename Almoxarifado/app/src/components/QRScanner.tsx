import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/library';
import { Camera, X, AlertCircle } from 'lucide-react';

interface Props {
  onScan: (itemId: string) => void;
  onClose: () => void;
}

export function QRScanner({ onScan, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [erro, setErro] = useState('');
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;

    reader.decodeFromVideoDevice(null, videoRef.current!, (result, err) => {
      if (result) {
        const texto = result.getText();
        // Formato esperado: almoxarifado:item:<uuid>
        if (texto.startsWith('almoxarifado:item:')) {
          const id = texto.replace('almoxarifado:item:', '');
          reader.reset();
          onScan(id);
        } else {
          setErro('QR Code não reconhecido. Use etiquetas do Almoxarifado.');
        }
      }
    }).catch(() => {
      setErro('Não foi possível acessar a câmera. Verifique as permissões.');
    });

    return () => { reader.reset(); };
  }, [onScan]);

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl overflow-hidden w-full max-w-sm">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <p className="font-semibold text-slate-700 flex items-center gap-2">
            <Camera size={18} className="text-blue-600" /> Escanear item
          </p>
          <button onClick={() => { readerRef.current?.reset(); onClose(); }}>
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        <div className="relative bg-black aspect-square">
          <video ref={videoRef} className="w-full h-full object-cover" />
          {/* Mira */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-48 h-48 border-2 border-white/60 rounded-2xl" />
          </div>
        </div>

        {erro ? (
          <div className="flex items-center gap-2 p-4 text-rose-600 text-sm">
            <AlertCircle size={16} /> {erro}
          </div>
        ) : (
          <p className="text-center text-slate-400 text-xs py-3">Aponte a câmera para o QR Code do item</p>
        )}
      </div>
    </div>
  );
}
