'use client';

import Link from 'next/link';

// --- Ícones para o Sidebar ---
const Icon = ({ path, className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-5 h-5"}>
    <path strokeLinecap="round" strokeLinejoin="round" d={path} />
  </svg>
);

const HomeIcon = () => <Icon path="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h7.5" />;
const AddIcon = () => <Icon path="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />;
const RobotIcon = () => <Icon path="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25zm.75-12h9v9h-9v-9z" />;
const LibraryIcon = () => <Icon path="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />;
const MonteCarloIcon = () => <Icon path="M3.75 3v11.25A2.25 2.25 0 006 16.5h12A2.25 2.25 0 0020.25 14.25V3M3.75 14.25v-1.25a3.375 3.375 0 013.375-3.375h9.75a3.375 3.375 0 013.375 3.375v1.25m-16.5 0h16.5" />;
const AnalysisIcon = () => <Icon path="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />;
const PortfolioIcon = () => <Icon path="M2.25 7.125A3.375 3.375 0 005.625 10.5h12.75c1.72 0 3.125-1.12 3.375-2.625S20.08 4.5 18.375 4.5H5.625A3.375 3.375 0 002.25 7.125zM2.25 13.125A3.375 3.375 0 005.625 16.5h12.75c1.72 0 3.125-1.12 3.375-2.625S20.08 10.5 18.375 10.5H5.625A3.375 3.375 0 002.25 13.125z" />;
const OptimizerIcon = () => <Icon path="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />;
const ProfileIcon = () => <Icon path="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />;

function SidebarItem({ label, href, icon, isBetaAvailable = true }) {
  const isFeatureNotAvailable = isBetaAvailable === false;

  const content = (
    <div className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200 ${isFeatureNotAvailable
        ? 'text-gray-500 cursor-not-allowed'
        : 'text-gray-300 hover:bg-slate-800 hover:text-white'
      }`}>
      {icon && <span className="mr-3 text-gray-400">{icon}</span>}
      {label}
      {isFeatureNotAvailable && (
        <span className="ml-auto bg-purple-500/10 text-purple-400 text-xs font-semibold px-2 py-0.5 rounded-full">
          Coming soon
        </span>
      )}
    </div>
  );

  return isFeatureNotAvailable ? (
    <div>{content}</div>
  ) : (
    <Link href={href}>{content}</Link> // ✅ troca feita aqui
  );
}

export default function Sidebar() {
  return (
    <aside className="w-64 h-full bg-slate-900 border-r border-slate-800 p-4 flex flex-col justify-between">
      <nav className="space-y-1">
        <SidebarItem label="Home" href="/welcome" icon={<HomeIcon />} />
        <SidebarItem
          label="Live Analysis"
          href="/realtime"
          icon={<AnalysisIcon />}
          isBetaAvailable={true} // Ative o acesso aqui
        />        <SidebarItem label="Add Robot" href="/add" icon={<AddIcon />} />
        <SidebarItem label="My Robots" href="/robots" icon={<RobotIcon />} />
        <SidebarItem label="Setup Library" href="/library" icon={<LibraryIcon />} />
        <SidebarItem label="Monte Carlo Simulator" href="/montecarlo" icon={<MonteCarloIcon />} />
        <SidebarItem label="Consistency Analysis" href="/analise" icon={<AnalysisIcon />} isBetaAvailable={false} />
        <SidebarItem label="Portfolios" href="/portfolios" icon={<PortfolioIcon />} />
        <SidebarItem label="Portfolio Optimizer" href="/optimizer" icon={<OptimizerIcon />} isBetaAvailable={false} />
        <SidebarItem label="Account Settings" href="/settings" icon={<OptimizerIcon />} />
      </nav>

      <div className="border-t border-slate-800 pt-4">
        <SidebarItem label="My Profile" href="/profile" icon={<ProfileIcon />} />
      </div>
    </aside>
  );
}
