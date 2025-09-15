'use client';
import Link from 'next/link';

export default function Sidebar() {
  return (
    <aside className="w-64 h-full bg-white shadow-md p-4 flex flex-col justify-between">
      {/* Parte de cima (links principais) */}
      <nav className="space-y-2">
        <SidebarItem label="Home" href="/welcome" />
        <SidebarItem label="Add robot" href="/add" />
        <SidebarItem label="My robots" href="/robots" />
        <SidebarItem label="Setup library" href="/library" />
        <SidebarItem label="Monte Carlo" href="/montecarlo" />
        <SidebarItem label="Consistency analysis" href="/analise" isBetaAvailable={false} />
        <SidebarItem label="Portfolios" href="/portfolios" />
        <SidebarItem label="Optimized Portfolio Builder" href="/optimizer" isBetaAvailable={false} />
      </nav>

      {/* Parte de baixo (Perfil) */}
      <div className="border-t pt-4">
        <SidebarItem label="Profile" href="/profile" icon="👤" />
      </div>
    </aside>
  );
}

// Alterado: Adicionada a nova propriedade `isBetaAvailable`
function SidebarItem({ label, href, icon, isBetaAvailable = true }) {
  const isFeatureNotAvailable = isBetaAvailable === false;
  
  return (
    // ALTERADO AQUI: Renderização condicional para o Link/Div
    isFeatureNotAvailable ? (
      <div className={`flex items-center px-3 py-2 rounded text-base font-medium text-gray-400 cursor-not-allowed`}>
        {icon && <span className="mr-2">{icon}</span>}
        {label}
        <span className="ml-auto bg-purple-200 text-purple-700 text-xs font-semibold px-2 py-0.5 rounded-md">
          not in beta
        </span>
      </div>
    ) : (
      <Link href={href} className="flex-1">
        <div className={`flex items-center px-3 py-2 rounded hover:bg-gray-200 cursor-pointer text-base font-medium`}>
          {icon && <span className="mr-2">{icon}</span>}
          {label}
        </div>
      </Link>
    )
  );
}