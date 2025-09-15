'use client';
import Image from 'next/image';

export default function Topbar() {
  return (
    <header className="w-full bg-purple-600 text-white px-6 py-3 shadow-md flex flex-col sm:flex-row sm:items-center sm:justify-between items-center justify-center">
      {/* Logo + Título centralizado no mobile, alinhado à esquerda no desktop */}
      <div className="flex items-center gap-2">
        <img src="/logo.png" alt="Estagnação" className="w-9 h-9" />
        <h1 className="text-2xl font-bold text-center sm:text-left">
          Dalio<span className="text-black bg-white px-1 rounded">Bot</span>
        </h1>
        {/* Adicionado o badge "Beta Edition" */}
        <span className="ml-2 px-2 py-0.5 text-xs font-semibold text-white bg-purple-500 rounded-full">
          Beta Version
        </span>
      </div>

      {/* Espaço para ícones ou botões no futuro */}
    </header>
  );
}