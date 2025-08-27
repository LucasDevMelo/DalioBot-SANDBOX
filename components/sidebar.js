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
        <SidebarItem label="Consistency analysis" href="/analise" />
        <SidebarItem label="Portfolios" href="/portfolios" />
        <SidebarItem label="Optimized Portfolio Builder" href="/optimizer" />
        
      </nav>

      {/* Parte de baixo (Perfil) */}
      <div className="border-t pt-4">
        <SidebarItem label="Profile" href="/profile" icon="👤" />
      </div>
    </aside>
  );
}

function SidebarItem({ label, href, icon, small = false }) {
  return (
    <Link href={href}>
      <div className={`flex items-center px-3 py-2 rounded hover:bg-gray-200 cursor-pointer ${small ? 'text-sm text-gray-600' : 'text-base font-medium'}`}>
        {icon && <span className="mr-2">{icon}</span>}
        {label}
      </div>
    </Link>
  );
}
