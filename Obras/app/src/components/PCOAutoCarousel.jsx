import React, { useEffect, useState } from "react";

const cards = [
  {
    title: "Planejamento Estratégico",
    text: "Defina metas claras e alinhe o cronograma de execução para garantir o sucesso da obra."
  },
  {
    title: "Controle de Custos",
    text: "Monitore gastos em tempo real e evite surpresas no orçamento."
  },
  {
    title: "Gestão de Cronograma",
    text: "Acompanhe o progresso das etapas e antecipe possíveis atrasos."
  },
  {
    title: "Indicadores de Desempenho",
    text: "Utilize KPIs para medir eficiência e produtividade da equipe."
  },
  {
    title: "Gestão de Riscos",
    text: "Identifique, avalie e mitigue riscos para evitar impactos negativos."
  },
  {
    title: "Gestão de Equipes",
    text: "Distribua tarefas de forma eficiente e acompanhe a performance dos colaboradores."
  },
  {
    title: "Controle de Materiais",
    text: "Gerencie o estoque e o uso de materiais para evitar desperdícios."
  },
  {
    title: "Gestão da Qualidade",
    text: "Garanta padrões de qualidade em todas as fases da obra."
  },
  {
    title: "Comunicação Integrada",
    text: "Centralize informações e facilite a comunicação entre todos os envolvidos."
  },
  {
    title: "Gestão de Documentação",
    text: "Organize contratos, projetos e relatórios em um só lugar."
  },
  {
    title: "Integração de Processos",
    text: "Unifique planejamento, execução e controle em uma única plataforma."
  },
  {
    title: "Benefícios do PCO",
    text: "Mais previsibilidade, eficiência e controle para suas obras."
  }
];

const CARDS_PER_VIEW = 4;
const INTERVAL = 4000; // ms

export default function PCOAutoCarousel() {
  const [start, setStart] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStart((prev) => (prev + CARDS_PER_VIEW) % cards.length);
    }, INTERVAL);
    return () => clearInterval(interval);
  }, []);

  // Garante rotação circular
  const visibleCards = [];
  for (let i = 0; i < CARDS_PER_VIEW; i++) {
    visibleCards.push(cards[(start + i) % cards.length]);
  }

  return (
    <div className="w-full h-full flex flex-col items-center justify-center">
      <div
        className="flex items-center justify-center w-full max-w-lg"
        style={{ minHeight: 200, height: 200 }} // grid como balão fixo
      >
        <div className="grid grid-cols-2 gap-3 w-full">
          {visibleCards.map((card, idx) => (
            <div
              key={idx}
              className="rounded-xl flex flex-col items-center justify-center text-center transition-all duration-500"
              style={{
                background: 'rgba(255,255,255,0.08)',
                minHeight: 90,
                maxHeight: 160,
                padding: '18px 10px',
                borderRadius: 18,
                border: 'none',
                boxShadow: '0 1px 4px 0 rgba(0,0,0,0.04)',
                width: '100%',
                overflow: 'auto',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center'
              }}
            >
              <h3 className="font-bold text-base mb-1" style={{ color: '#FFC82D', letterSpacing: 0.2 }}>{card.title}</h3>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.85)' }}>{card.text}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="flex gap-2 justify-center mt-14 mb-2 w-full">
        {Array.from({ length: Math.ceil(cards.length / CARDS_PER_VIEW) }).map((_, i) => (
          <span
            key={i}
            className={`w-2 h-2 rounded-full ${i === Math.floor(start / CARDS_PER_VIEW) ? "bg-yellow-400" : "bg-gray-300"}`}
          />
        ))}
      </div>
    </div>
  );
}
