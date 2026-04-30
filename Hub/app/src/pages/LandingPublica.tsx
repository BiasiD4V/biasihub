import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const IDENT_KEY = 'biasi_public_ident_v1';

export function LandingPublica() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const nomeParam = (params.get('nome') || '').trim();
  const telParam = (params.get('tel') || '').replace(/\D/g, '').slice(0, 11);

  const [nome, setNome] = useState(nomeParam);
  const [tel, setTel] = useState(telParam);
  const [erroIdent, setErroIdent] = useState('');

  function formatTel(v: string) {
    return v.replace(/\D/g, '').slice(0, 11);
  }

  useEffect(() => {
    if (nomeParam || telParam) {
      setNome(nomeParam);
      setTel(telParam);
      localStorage.setItem(IDENT_KEY, JSON.stringify({ nome: nomeParam, tel: telParam }));
      return;
    }

    try {
      const raw = localStorage.getItem(IDENT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { nome?: string; tel?: string };
      if (parsed?.nome) setNome(parsed.nome);
      if (parsed?.tel) setTel(formatTel(parsed.tel));
    } catch {
      // ignore
    }
  }, [nomeParam, telParam]);

  useEffect(() => {
    const nomeTrim = nome.trim();
    const telFmt = formatTel(tel);
    if (!nomeTrim || !telFmt) return;
    localStorage.setItem(IDENT_KEY, JSON.stringify({ nome: nomeTrim, tel: telFmt }));
  }, [nome, tel]);

  function validarIdentificacao() {
    const nomeTrim = nome.trim();
    const telFmt = formatTel(tel);

    if (!nomeTrim) {
      setErroIdent('Informe seu nome para continuar.');
      return null;
    }

    if (telFmt.length < 10) {
      setErroIdent('Informe um WhatsApp valido para continuar.');
      return null;
    }

    setErroIdent('');
    return { nome: nomeTrim, tel: telFmt };
  }

  function irRequisicao() {
    const ident = validarIdentificacao();
    if (!ident) return;

    const p = new URLSearchParams({
      nome: ident.nome,
      tel: ident.tel,
    });

    navigate(`/req?${p.toString()}`);
  }

  function irFila() {
    const ident = validarIdentificacao();
    if (!ident) return;

    const p = new URLSearchParams({
      nome: ident.nome,
      tel: ident.tel,
    });

    navigate(`/fila?${p.toString()}`);
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-white flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-2">
            Almoxarifado - Biasi Engenharia
          </p>
          <h1 className="text-3xl font-black text-white leading-tight">O que voce precisa fazer?</h1>
        </div>

        <div className="space-y-3 mb-8">
          <input
            type="text"
            placeholder="Seu nome *"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="w-full bg-[#1e293b] border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-indigo-500 transition"
            required
          />
          <input
            type="tel"
            placeholder="Seu WhatsApp *"
            value={tel}
            onChange={(e) => setTel(e.target.value)}
            className="w-full bg-[#1e293b] border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-indigo-500 transition"
            required
          />

          {erroIdent && <p className="text-amber-400 text-xs px-1">{erroIdent}</p>}

          <p className="text-[11px] text-slate-400 px-1">
            Nome e WhatsApp ficam salvos neste aparelho para nao precisar digitar sempre.
          </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={irRequisicao}
            className="w-full bg-indigo-600 hover:bg-indigo-500 active:scale-95 transition rounded-2xl px-6 py-5 text-left flex items-center gap-4"
          >
            <span className="text-3xl">📋</span>
            <div>
              <p className="font-bold text-white text-base leading-tight">Fazer Requisicao</p>
              <p className="text-indigo-300 text-xs mt-0.5">Pedir material, ferramenta ou veiculo</p>
            </div>
          </button>

          <button
            onClick={irFila}
            className="w-full bg-[#1e293b] hover:bg-slate-700 active:scale-95 transition border border-slate-600 rounded-2xl px-6 py-5 text-left flex items-center gap-4"
          >
            <span className="text-3xl">📦</span>
            <div>
              <p className="font-bold text-white text-base leading-tight">Ver meus pedidos</p>
              <p className="text-slate-400 text-xs mt-0.5">Acompanhar status das requisicoes</p>
            </div>
          </button>
        </div>

        <p className="text-center text-slate-600 text-xs mt-10">BiasiHub - Biasi Engenharia e Instalacoes</p>
      </div>
    </div>
  );
}
