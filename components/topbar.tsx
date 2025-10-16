'use client';

// O import do 'next/image' foi removido pois o componente usa a tag <img> padrão.
// import Image from 'next/image';

export default function Topbar() {
  return (
    <header className="w-full bg-slate-900/70 text-white px-6 py-3 border-b border-slate-800 backdrop-blur-lg sticky top-0 z-50 flex items-center justify-between">
      
      {/* Logo + Título */}
      <div className="flex items-center gap-3">
        <img src="/logo.png" alt="DalioBot Logo" className="w-8 h-8" />
        <h1 className="text-2xl font-extrabold">
          <span className="text-white">Dalio</span>
          <span className="text-purple-400">Bot</span>
        </h1>
        
        {/* Selo "Beta Version" com novo estilo */}
        <span className="ml-2 px-2.5 py-0.5 text-xs font-semibold text-purple-300 bg-purple-500/10 border border-purple-500/20 rounded-full">
          Beta Version
        </span>
      </div>

      {/* Espaço reservado para futuros botões ou ícones de perfil */}
      <div>
        {/* Exemplo: <button className="p-2 rounded-full hover:bg-slate-800">...</button> */}
      </div>
      
    </header>
  );
}
