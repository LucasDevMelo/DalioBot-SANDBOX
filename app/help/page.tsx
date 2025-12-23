'use client';

import React from 'react';
import Link from 'next/link'; // Importante para a navegação
import {
  LayoutDashboard,
  LineChart,
  Dices,
  Target,
  Briefcase,
  Zap,
  Bot,
  Library,
  HelpCircle,
  ArrowRight
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Topbar from '@/components/topbar';
import Sidebar from '@/components/sidebar';

/* ===============================
   Estrutura estilo Help Center
================================ */

const helpLevels = [
  {
    level: 1,
    title: 'The Basics',
    subtitle: "You're new? Start here!",
    description:
      'Learn the DalioBot fundamentals and understand how to navigate, configure robots, and organize your files.',
    articles: [
      {
        title: 'Dashboard',
        slug: 'dashboard',
        icon: <LayoutDashboard className="w-5 h-5 text-purple-400" />,
        description: 'Overview of metrics, balance, and robot status.'
      },
      {
        title: 'Robots',
        slug: 'robots',
        icon: <Bot className="w-5 h-5 text-cyan-400" />,
        description: 'Manage, configure, and track your robots.'
      },
      {
        title: 'Library',
        slug: 'library',
        icon: <Library className="w-5 h-5 text-pink-400" />,
        description: 'Store .set files, versions, and strategies.'
      }
    ]
  },
  {
    level: 2,
    title: 'Analysis & Validation',
    subtitle: 'Test your edge before going live',
    description:
      'Advanced tools to validate results, avoid overfitting, and test strategy robustness.',
    articles: [
      {
        title: 'Analysis',
        slug: 'analysis',
        icon: <LineChart className="w-5 h-5 text-blue-400" />,
        description: 'Deep analysis of MetaTrader 5 backtests.'
      },
      {
        title: 'Monte Carlo',
        slug: 'monte-carlo',
        icon: <Dices className="w-5 h-5 text-red-400" />,
        description: 'Risk simulations and future scenarios.'
      },
      {
        title: 'Optimizer',
        slug: 'optimizer',
        icon: <Target className="w-5 h-5 text-green-400" />,
        description: 'Evaluate parameters and find stable regions.'
      }
    ]
  },
  {
    level: 3,
    title: 'Execution & Scaling',
    subtitle: 'From strategy to real money',
    description:
      'Connect your real account, track live results, and scale with multiple robots.',
    articles: [
      {
        title: 'Portfolios',
        slug: 'portfolios',
        icon: <Briefcase className="w-5 h-5 text-yellow-400" />,
        description: 'Combine robots and reduce risk with diversification.'
      },
      {
        title: 'Realtime',
        slug: 'realtime',
        icon: <Zap className="w-5 h-5 text-orange-400" />,
        description: 'Live monitoring via MetaTrader 5.'
      }
    ]
  }
];

export default function HelpCenterPage() {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-slate-900">
      <Topbar />

      {/* Mobile Sidebar Toggle */}
      <div className="md:hidden p-2 bg-slate-800/50 border-b border-slate-700">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="text-purple-400 text-xl font-bold"
        >
          ☰
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div
          className={`absolute md:static z-50 h-full bg-slate-900 border-r border-slate-800 transition-transform ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } md:translate-x-0`}
        >
          <Sidebar />
        </div>

        <main className="flex-1 p-6 md:p-10 overflow-y-auto">
          {/* Header */}
          <div className="max-w-6xl mx-auto mb-12">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
                <HelpCircle className="w-7 h-7 text-purple-400" />
              </div>
              <h1 className="text-4xl font-bold text-white">
                Help Center
              </h1>
            </div>
            <p className="text-slate-400 text-lg max-w-2xl">
              Official documentation to understand every DalioBot tool, 
              from basics to advanced.
            </p>
          </div>

          {/* Levels */}
          <div className="max-w-6xl mx-auto space-y-8">
            {helpLevels.map((level) => (
              <Card
                key={level.level}
                className="bg-slate-800 border-slate-700 hover:border-slate-500 transition"
              >
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 flex items-center justify-center rounded-full bg-slate-900 border border-slate-700 text-white font-bold text-lg">
                      {level.level}
                    </div>
                    <div>
                      <CardTitle className="text-2xl text-white">
                        Level {level.level}: {level.title}
                      </CardTitle>
                      <p className="text-slate-400 text-sm">
                        {level.subtitle}
                      </p>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <p className="text-slate-300 mb-6 max-w-3xl">
                    {level.description}
                  </p>

                  <div className="space-y-3">
                    {level.articles.map((article, idx) => (
                      <Link href={`/help/${article.slug}`} key={idx} className="block group">
                        <div
                          className="flex items-center justify-between p-4 rounded-lg bg-slate-900 border border-slate-700 group-hover:border-purple-500 transition cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            {article.icon}
                            <div>
                              <p className="text-white font-medium group-hover:text-purple-400 transition-colors">
                                {article.title}
                              </p>
                              <p className="text-slate-400 text-sm">
                                {article.description}
                              </p>
                            </div>
                          </div>
                          <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-purple-400 transition-colors" />
                        </div>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}