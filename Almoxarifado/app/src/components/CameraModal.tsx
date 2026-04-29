import { useEffect, useRef, useState } from 'react';
import { Camera, RefreshCw, StopCircle, Video, X } from 'lucide-react';

/**
 * Modal de camera que usa getUserMedia para abrir a camera real no Electron,
 * navegador e Capacitor Android. No APK, o prompt nativo aparece quando as
 * permissoes CAMERA/RECORD_AUDIO existem no AndroidManifest.
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
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  useEffect(() => {
    let active = true;

    function stopStream() {
      try {
        if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
      } catch {
        /* noop */
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setReady(false);
      setRecording(false);
    }

    async function start() {
      try {
        setError('');
        stopStream();

        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: facingMode } },
            audio: mode === 'video',
          });
        } catch (preferredErr) {
          console.warn('[CameraModal] camera preferida falhou, tentando fallback:', preferredErr);
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: mode === 'video',
          });
        }

        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
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
        setError('Nao foi possivel acessar a camera/microfone. Verifique as permissoes do app no Android.');
      }
    }

    void start();
    return () => {
      active = false;
      stopStream();
    };
  }, [mode, facingMode]);

  function virarCamera() {
    if (recording) return;
    setFacingMode((current) => (current === 'environment' ? 'user' : 'environment'));
  }

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
      const mimeType = MediaRecorder.isTypeSupported('video/webm') ? 'video/webm' : '';
      const mr = mimeType ? new MediaRecorder(streamRef.current, { mimeType }) : new MediaRecorder(streamRef.current);
      mr.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) chunksRef.current.push(event.data);
      };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType || 'video/webm' });
        const file = new File([blob], `video-${Date.now()}.webm`, { type: mimeType || 'video/webm' });
        onCapture(file);
        onClose();
      };
      recorderRef.current = mr;
      mr.start();
      setRecording(true);
    } catch (err) {
      console.error('[CameraModal] MediaRecorder falhou:', err);
      setError('Nao foi possivel iniciar a gravacao de video.');
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
            {mode === 'photo' ? 'Tirar foto' : 'Gravar video'}
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
              <button
                type="button"
                onClick={virarCamera}
                disabled={recording}
                className="inline-flex items-center gap-2 font-extrabold py-3 px-5 rounded-[18px] border border-[rgba(113,154,255,0.28)] bg-white/[0.03] text-[#f4f7ff] disabled:opacity-50"
              >
                <RefreshCw size={16} />
                Virar camera
              </button>

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
                  Iniciar gravacao
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopRecording}
                  className="inline-flex items-center gap-2 font-extrabold py-3 px-5 rounded-[18px] border border-[rgba(255,107,107,0.6)] bg-[rgba(255,107,107,0.18)] text-[#ff9797] animate-pulse"
                >
                  <StopCircle size={16} />
                  Parar gravacao
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
