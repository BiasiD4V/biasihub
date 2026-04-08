import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, X, Printer } from 'lucide-react';

interface Props {
  itemId: string;
  codigo: string;
  descricao: string;
  localizacao?: string | null;
}

export function QRCodeItem({ itemId, codigo, descricao, localizacao }: Props) {
  const [open, setOpen] = useState(false);
  // URL que o scanner vai resolver — pode ser a página do item ou apenas o ID
  const qrValue = `almoxarifado:item:${itemId}`;

  function imprimir() {
    const janela = window.open('', '_blank', 'width=400,height=500');
    if (!janela) return;
    janela.document.write(`
      <html><head><title>Etiqueta QR — ${codigo}</title>
      <style>
        body { font-family: sans-serif; display:flex; flex-direction:column; align-items:center; padding:20px; }
        .titulo { font-size:18px; font-weight:bold; margin-bottom:4px; text-align:center; }
        .subtitulo { font-size:12px; color:#555; margin-bottom:12px; text-align:center; }
        .local { font-size:11px; color:#888; margin-top:8px; }
        svg { border: 1px solid #eee; padding: 8px; border-radius: 8px; }
      </style>
      </head><body>
      <div class="titulo">${codigo}</div>
      <div class="subtitulo">${descricao.length > 40 ? descricao.substring(0, 40) + '...' : descricao}</div>
      ${document.getElementById(`qr-print-${itemId}`)?.outerHTML || ''}
      ${localizacao ? `<div class="local">📍 ${localizacao}</div>` : ''}
      </body></html>
    `);
    janela.document.close();
    janela.focus();
    setTimeout(() => { janela.print(); janela.close(); }, 300);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Ver QR Code"
        className="p-1.5 text-slate-400 hover:text-violet-600 rounded-lg transition-colors"
      >
        <QrCode size={15} />
      </button>

      {/* QR oculto para impressão */}
      <div className="hidden">
        <QRCodeSVG id={`qr-print-${itemId}`} value={qrValue} size={180} />
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-2xl p-6 w-64 text-center" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between mb-4">
              <div className="text-left">
                <p className="font-bold text-slate-800">{codigo}</p>
                <p className="text-xs text-slate-500">{descricao.length > 30 ? descricao.substring(0, 30) + '...' : descricao}</p>
              </div>
              <button onClick={() => setOpen(false)}><X size={18} className="text-slate-400" /></button>
            </div>
            <div className="flex justify-center mb-3">
              <QRCodeSVG value={qrValue} size={160} includeMargin />
            </div>
            {localizacao && <p className="text-xs text-slate-400 mb-3">📍 {localizacao}</p>}
            <button
              onClick={imprimir}
              className="w-full flex items-center justify-center gap-2 py-2 bg-slate-800 text-white text-sm font-medium rounded-xl hover:bg-slate-900"
            >
              <Printer size={15} /> Imprimir etiqueta
            </button>
          </div>
        </div>
      )}
    </>
  );
}
