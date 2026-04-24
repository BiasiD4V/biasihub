import { useEffect, useRef, useState } from 'react';
import { Camera, StopCircle, Video, X } from 'lucide-react';

/**
 * Modal de câmera que usa navigator.mediaDevices.getUserMedia para abrir a
 * câmera real — tanto em Electron desktop quanto em navegador mobile. Evita
 * o comportamento de `<input type=file capture="environment">`, que no
 * Electron/Chrome desktop cai no seletor de arquivos.
 */
export function CameraModal({
  mode,
  onCapture,
  onClose,
}: {
  mode: 'photo' | 'video';
  onCapture: (file: File) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: mode === 'video',
        });
        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play().catch(() => undefined);
            setReady(true);
          };
        }
      } catch (err) {
        console.error('[CameraModal] getUserMedia falhou:', err);
        setError('Não foi possível acessar a câmera. Verifique as permissões do app.');
      }
    }
    void start();
    return () => {
      active = false;
      try {
        if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
      } catch {
        /* noop */
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [mode]);

  function tirarFoto() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `foto-${Date.now()}.jpg`, { type: 'image/jpeg' });
        onCapture(file);
        onClose();
      },
      'image/jpeg',
      0.9
    );
  }

  function startRecording() {
    if (!streamRef.current) return;
    chunksRef.current = [];
    try {
      const mr = new MediaRecorder(streamRef.current, { mimeType: 'video/webm' });
      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const file = new File([blob], `video-${Date.now()}.webm`, { type: 'video/webm' });
        onCapture(file);
        onClose();
      };
      recorderRef.current = mr;
      mr.start();
      setRecording(true);
    } catch (err) {
      console.error('[CameraModal] MediaRecorder falhou:', err);
      setError('Não foi possível iniciar a gravação de vídeo.');
    }
  }

  function stopRecording() {
    try {
      recorderRef.current?.stop();
    } catch {
      /* noop */
    }
    setRecording(false);
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/85 grid place-items-center p-4">
      <div className="rounded-[18px] border border-[rgba(113,154,255,0.4)] bg-[#0d2258] p-4 max-w-[720px] w-full shadow-2xl">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-extrabold text-[1.1rem] m-0">
            {mode === 'photo' ? 'Tirar foto' : 'Gravar vídeo'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-white p-1 rounded hover:bg-white/10"
            title="Fechar"
          >
            <X size={20} />
          </button>
        </div>
        {error ? (
          <div className="text-[#ff9797] py-10 text-center px-4">{error}</div>
        ) : (
          <>
            <video
              ref={videoRef}
              muted
              playsInline
              className="w-full rounded-[12px] bg-black aspect-video object-cover"
            />
            <div className="flex gap-2 justify-center mt-3 flex-wrap">
              {mode === 'photo' ? (
                <button
                  type="button"
                  onClick={tirarFoto}
                  disabled={!ready}
                  className="inline-flex items-center gap-2 font-extrabold py-3 px-5 rounded-[18px] bg-[linear-gradient(180deg,#4b7bf0,#3d6fe0)] text-white shadow-[0_10px_24px_rgba(52,104,223,0.35)] disabled:opacity-50"
                >
                  <Camera size={16} />
                  Capturar foto
                </button>
              ) : !recording ? (
                <button
                  type="button"
                  onClick={startRecording}
                  disabled={!ready}
                  className="inline-flex items-center gap-2 font-extrabold py-3 px-5 rounded-[18px] bg-[linear-gradient(180deg,#4b7bf0,#3d6fe0)] text-white shadow-[0_10px_24px_rgba(52,104,223,0.35)] disabled:opacity-50"
                >
                  <Video size={16} />
                  Iniciar gravação
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopRecording}
                  className="inline-flex items-center gap-2 font-extrabold py-3 px-5 rounded-[18px] border border-[rgba(255,107,107,0.6)] bg-[rgba(255,107,107,0.18)] text-[#ff9797] animate-pulse"
                >
                  <StopCircle size={16} />
                  Parar gravação
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-2 font-extrabold py-3 px-5 rounded-[18px] border border-[rgba(113,154,255,0.28)] bg-white/[0.03] text-[#f4f7ff]"
              >
                Cancelar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
