'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  LayoutDashboard, LineChart, Dices, Target, Briefcase, Zap, Bot, Library,
  ArrowLeft, CheckCircle2, AlertCircle, TrendingUp, ShieldAlert, BookOpen, 
  Layers, Activity, Settings, Save, AlertTriangle, Scale, Clock, Trash2, Edit, Plus,
  LayoutGrid, MousePointerClick
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import Topbar from '@/components/topbar';
import Sidebar from '@/components/sidebar';

// ==================================================================================
// CONTEÚDO DOS ARTIGOS
// ==================================================================================

const articlesData: any = {
  // --------------------------------------------------------------------------------
  // LEVEL 1: THE BASICS
  // --------------------------------------------------------------------------------
  'dashboard': {
    title: 'Dashboard',
    icon: <LayoutDashboard className="w-8 h-8 text-purple-400" />,
    level: 'The Basics',
    description: 'The definitive guide to interpreting every number on your dashboard. Understand what is noise and what is signal in your robot\'s performance.',
    content: (
      <div className="space-y-12 text-slate-300">
        
        {/* INTRODUÇÃO */}
        <section className="border-b border-slate-800 pb-8">
          <p className="lead text-lg text-slate-400 mb-4">
            The DalioBot Dashboard doesn't just show "how much you earned". It was designed to answer the question: 
            <span className="text-white font-semibold"> "Is this risk worth taking?"</span>. 
            Below, we explain each information block in detail.
          </p>
        </section>

        {/* 1. MÉTRICAS DE EFICIÊNCIA (KPIS) */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-green-500/10 rounded-lg border border-green-500/20">
              <Scale className="w-6 h-6 text-green-400" />
            </div>
            <h3 className="text-2xl text-white font-bold">1. Strategy Efficiency</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900/50 p-5 rounded-xl border border-slate-700 hover:border-green-500/50 transition duration-300">
              <strong className="text-white text-lg block mb-2">Profit Factor</strong>
              <p className="text-sm text-slate-400 mb-3">
                Gross Profit divided by Gross Loss. Answers: "For every $1 the robot lost, how many dollars did it gain?"
              </p>
              <ul className="text-xs space-y-1 text-slate-500">
                <li>• <strong>Below 1.0:</strong> Losing strategy.</li>
                <li>• <strong>1.2 to 1.5:</strong> Acceptable.</li>
                <li>• <strong>Above 1.6:</strong> Excellent robustness.</li>
              </ul>
            </div>

            <div className="bg-slate-900/50 p-5 rounded-xl border border-slate-700 hover:border-green-500/50 transition duration-300">
              <strong className="text-white text-lg block mb-2">Recovery Factor</strong>
              <p className="text-sm text-slate-400 mb-3">
                Net Profit divided by Maximum Drawdown. Measures the strategy's ability to get out of the hole.
              </p>
              <div className="bg-green-500/10 p-2 rounded text-xs text-green-300 border border-green-500/20">
                <strong>Dalio Tip:</strong> We prefer robots with a Recovery Factor greater than 3.0. This indicates it recovers losses quickly.
              </div>
            </div>

            <div className="bg-slate-900/50 p-5 rounded-xl border border-slate-700 hover:border-green-500/50 transition duration-300">
              <strong className="text-white text-lg block mb-2">Payoff (Risk vs Return per Trade)</strong>
              <p className="text-sm text-slate-400">
                Average Win / Average Loss. If the Payoff is <strong>2.0</strong>, it means your average win is double your average loss. Trend-following strategies usually have high Payoff and lower Win Rate.
              </p>
            </div>

            <div className="bg-slate-900/50 p-5 rounded-xl border border-slate-700 hover:border-green-500/50 transition duration-300">
              <strong className="text-white text-lg block mb-2">Win Rate</strong>
              <p className="text-sm text-slate-400">
                Percentage of days (or trades) that closed positive. Warning: A 90% win rate can go bust if the Payoff is very low (wins by a spoonful, loses by a bucket).
              </p>
            </div>
          </div>
        </section>

        {/* 2. GESTÃO DE RISCO */}
        <section>
          <div className="flex items-center gap-3 mb-6 mt-8">
            <div className="p-2 bg-red-500/10 rounded-lg border border-red-500/20">
              <ShieldAlert className="w-6 h-6 text-red-400" />
            </div>
            <h3 className="text-2xl text-white font-bold">2. Risk & Drawdown</h3>
          </div>

          <div className="space-y-4">
            <div className="bg-slate-900 p-6 rounded-xl border-l-4 border-red-500">
              <h4 className="text-white font-bold text-lg">Maximum Drawdown (DD)</h4>
              <p className="text-slate-400 mt-1">
                The largest percentage or financial drop the account suffered from a historical peak to the subsequent trough. 
                <br/><span className="text-sm italic opacity-70">Example: If you had $10,000, dropped to $8,000 and then rose to $12,000, your Drawdown was 20% ($2,000).</span>
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-900 p-4 rounded-lg border border-slate-800">
                <strong className="text-white block">VaR 95% (Value at Risk)</strong>
                <p className="text-sm text-slate-400 mt-2">
                  A statistical estimate. Says: "With 95% confidence, your maximum loss in a single day will not exceed this value". It is your expected daily "pain threshold".
                </p>
              </div>
              <div className="bg-slate-900 p-4 rounded-lg border border-slate-800">
                <strong className="text-white block">Largest Daily Loss</strong>
                <p className="text-sm text-slate-400 mt-2">
                  The worst financial day recorded in history. Unlike VaR (which is theoretical), this value actually happened.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 3. ESTATÍSTICAS DE TEMPO & CONSISTÊNCIA */}
        <section>
          <div className="flex items-center gap-3 mb-6 mt-8">
            <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <Clock className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-2xl text-white font-bold">3. Time & Consistency</h3>
          </div>

          <ul className="space-y-4">
            <li className="flex flex-col md:flex-row gap-4 p-4 bg-slate-900 rounded-lg border border-slate-700">
              <div className="min-w-[150px]">
                <strong className="text-blue-400">Stagnation</strong>
              </div>
              <div className="text-sm text-slate-300">
                Also known as <em>Time to Recovery</em>. It represents the longest number of days the robot stayed "sideways" or in loss without renewing the historical profit high. 
                <br/><strong>Alert:</strong> Stagnations longer than 180 days may indicate the strategy stopped working.
              </div>
            </li>
            <li className="flex flex-col md:flex-row gap-4 p-4 bg-slate-900 rounded-lg border border-slate-700">
              <div className="min-w-[150px]">
                <strong className="text-blue-400">CAGR</strong>
              </div>
              <div className="text-sm text-slate-300">
                <em>Compound Annual Growth Rate</em>. The best way to compare robot profitability with traditional investments (like S&P500).
              </div>
            </li>
            <li className="flex flex-col md:flex-row gap-4 p-4 bg-slate-900 rounded-lg border border-slate-700">
              <div className="min-w-[150px]">
                <strong className="text-blue-400">Sample Error</strong>
              </div>
              <div className="text-sm text-slate-300">
                Standard deviation of daily returns. Measures curve volatility. The higher it is, the more "nervous" the profit chart.
              </div>
            </li>
          </ul>
        </section>

        {/* 4. DALIOBOT SCORE */}
        <section className="bg-slate-800/50 p-6 rounded-2xl border border-purple-500/30 mt-8">
          <div className="flex items-center gap-3 mb-4">
            <Activity className="w-6 h-6 text-purple-400" />
            <h3 className="text-xl text-white font-bold">DalioBot Score (0-10)</h3>
          </div>
          <p className="text-slate-300 mb-6">
            Our proprietary algorithm that condenses all the metrics above into a single score to facilitate decision-making.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-slate-900 rounded-lg">
              <span className="text-xs uppercase tracking-wider text-slate-500">Weight 35%</span>
              <strong className="block text-white mt-1">Return</strong>
              <p className="text-xs text-slate-400 mt-2">CAGR and Total Profit</p>
            </div>
            <div className="text-center p-4 bg-slate-900 rounded-lg border border-purple-500/30 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-purple-500"></div>
              <span className="text-xs uppercase tracking-wider text-purple-400 font-bold">Weight 45%</span>
              <strong className="block text-white mt-1">Risk</strong>
              <p className="text-xs text-slate-400 mt-2">Drawdown and VaR</p>
            </div>
            <div className="text-center p-4 bg-slate-900 rounded-lg">
              <span className="text-xs uppercase tracking-wider text-slate-500">Weight 20%</span>
              <strong className="block text-white mt-1">Stability</strong>
              <p className="text-xs text-slate-400 mt-2">Sharpe and Volatility</p>
            </div>
          </div>
        </section>

      </div>
    )
  },

  'robots': {
    title: 'My Robots',
    icon: <Bot className="w-8 h-8 text-cyan-400" />,
    level: 'The Basics',
    description: 'Your strategy garage. Learn to catalog, organize, and manage your backtest portfolio in one place.',
    content: (
      <div className="space-y-12 text-slate-300">
        
        {/* INTRODUÇÃO */}
        <section className="border-b border-slate-800 pb-8">
          <p className="lead text-lg text-slate-400 mb-6">
            The <strong>My Robots</strong> screen is the central repository for all strategies you have tested and imported. 
            Think of it as an organized library where you can quickly compare the performance of different robots before diving into details.
          </p>
          
          <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
            <h4 className="flex items-center gap-2 text-white font-bold mb-4">
              <Activity className="w-5 h-5 text-cyan-400" />
              Card Summary
            </h4>
            <p className="text-sm text-slate-400 mb-4">
              Each robot is represented by a smart "Card" that summarizes vital imported backtest data:
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
               <div className="bg-slate-900 p-3 rounded border border-slate-800">
                 <span className="text-slate-500 text-xs uppercase">Market</span>
                 <strong className="block text-white">Forex/Stocks</strong>
               </div>
               <div className="bg-slate-900 p-3 rounded border border-slate-800">
                 <span className="text-slate-500 text-xs uppercase">Total Balance</span>
                 <strong className="block text-green-400">R$ Profit</strong>
               </div>
               <div className="bg-slate-900 p-3 rounded border border-slate-800">
                 <span className="text-slate-500 text-xs uppercase">Profit Factor</span>
                 <strong className="block text-white">Ex: 1.54</strong>
               </div>
               <div className="bg-slate-900 p-3 rounded border border-slate-800">
                 <span className="text-slate-500 text-xs uppercase">Period</span>
                 <strong className="block text-white">Start - End Date</strong>
               </div>
            </div>
          </div>
        </section>

        {/* 2. GERENCIAMENTO E EDIÇÃO */}
        <section>
          <div className="flex items-center gap-3 mb-6 mt-8">
            <div className="p-2 bg-purple-500/10 rounded-lg border border-purple-500/20">
              <Settings className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="text-2xl text-white font-bold">2. Management and Organization</h3>
          </div>

          <p className="text-slate-400 mb-6">
            Keeping your strategies organized is fundamental when you start testing dozens of variations. Use the editing tools to keep everything in order.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-slate-800 rounded-lg text-pink-400 border border-slate-700">
                  <Edit className="w-5 h-5" />
                </div>
                <div>
                  <strong className="text-white block mb-1">Edit Metadata</strong>
                  <p className="text-sm text-slate-400">
                    By clicking the pencil icon, you can rename the strategy, categorize the <strong>Market</strong> (Forex, Crypto, Indices), define the <strong>Asset</strong> (EURUSD, BTC, etc.), and the <strong>Operational Type</strong> (Scalping, Swing, Day Trade).
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-2 bg-slate-800 rounded-lg text-purple-400 border border-slate-700">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <strong className="text-white block mb-1">Delete Strategies</strong>
                  <p className="text-sm text-slate-400">
                    Remove old tests or discarded strategies to clean up your view. Deletion is permanent and removes data from the cloud.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
               <h4 className="text-white font-bold mb-3 flex items-center gap-2">
                 <BookOpen className="w-4 h-4 text-purple-400" />
                 The Importance of Description
               </h4>
               <p className="text-sm text-slate-400 leading-relaxed">
                 In the edit modal, there is a <strong>Description</strong> field. We strongly recommend using this space to note technical setup details, such as:
               </p>
               <ul className="list-disc pl-5 mt-3 space-y-1 text-sm text-slate-500">
                 <li>Timeframe used (H1, M15).</li>
                 <li>Main indicators (RSI, MA).</li>
                 <li>Test reason or hypothesis.</li>
               </ul>
            </div>
          </div>
        </section>

        {/* 3. AÇÕES RÁPIDAS */}
        <section>
          <div className="flex items-center gap-3 mb-6 mt-8">
            <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <Plus className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-2xl text-white font-bold">3. Adding Strategies</h3>
          </div>

          <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 flex flex-col md:flex-row items-center gap-6">
             <div className="flex-1">
               <p className="text-slate-300 mb-4">
                 The <strong>"+ Add a Strategy"</strong> button is the gateway. It redirects you to the Upload screen, where the system automatically processes MetaTrader 5 files:
               </p>
               <ul className="space-y-2 text-sm text-slate-400">
                 <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> HTML Reports (Standard Backtest).</li>
                 <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> CSV/XLSX Files (History Export).</li>
               </ul>
             </div>
             <div className="w-full md:w-auto">
               <button className="w-full md:w-auto bg-purple-600/20 text-purple-400 border border-purple-500/50 px-6 py-3 rounded-lg font-bold cursor-default">
                 + Add a Strategy
               </button>
             </div>
          </div>
        </section>

      </div>
    )
  },

  'library': {
    title: 'Setup Library',
    icon: <Library className="w-8 h-8 text-pink-400" />,
    level: 'The Basics',
    description: 'Your visual strategy gallery. Quickly compare the performance of all your robots side-by-side with smart cards and preview charts.',
    content: (
      <div className="space-y-8 text-slate-300">
        <section>
          <p className="lead text-lg text-slate-400 mb-6">
            The <strong>Library</strong> transforms your file list into a visual portfolio. 
            Instead of reading filenames, you see real behavior of each strategy in interactive <em>Cards</em> sorted by DalioBot Score.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
             <div className="bg-slate-900/50 p-5 rounded-xl border border-pink-500/20">
               <h4 className="text-pink-400 font-bold mb-3 flex items-center gap-2">
                 <LayoutGrid className="w-5 h-5" /> 
                 The Strategy Card
               </h4>
               <p className="text-sm text-slate-400 mb-3">
                 Each card is a mini-dashboard summarizing robot health:
               </p>
               <ul className="space-y-2 text-sm">
                 <li className="flex justify-between border-b border-slate-800 pb-1">
                   <span>DalioBot Score</span>
                   <strong className="text-white">Overall Score</strong>
                 </li>
                 <li className="flex justify-between border-b border-slate-800 pb-1">
                   <span>Profit Factor</span>
                   <strong className="text-green-400">Efficiency</strong>
                 </li>
                 <li className="flex justify-between border-b border-slate-800 pb-1">
                   <span>Max DD</span>
                   <strong className="text-red-400">Risk ($)</strong>
                 </li>
               </ul>
             </div>

             <div className="bg-slate-900/50 p-5 rounded-xl border border-pink-500/20 flex flex-col justify-center">
               <h4 className="text-pink-400 font-bold mb-3 flex items-center gap-2">
                 <TrendingUp className="w-5 h-5" />
                 Equity Curve
               </h4>
               <p className="text-sm text-slate-400">
                 The purple area chart in the center is not just decorative. It shows the full <strong>capital curve</strong> of the backtest. 
                 <br/><br/>
                 This allows instantly identifying unstable strategies (full of ups and downs) versus consistent ones (straight ascending line) without needing to open details.
               </p>
             </div>
          </div>
        </section>

        <section>
          <h3 className="text-xl text-white font-bold mb-4">Quick Actions</h3>
          <p className="mb-4 text-slate-400">
            From the Library, you can navigate to specific analysis tools:
          </p>
          <div className="flex flex-col gap-3">
             <div className="flex items-center gap-4 p-3 bg-slate-800 rounded-lg border border-slate-700">
               <div className="bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded flex items-center gap-1"><MousePointerClick className="w-3 h-3"/> Details</div>
               <span className="text-sm">Opens the <strong>Full Dashboard</strong> with all advanced metrics (VaR, Stagnation, etc).</span>
             </div>
             <div className="flex items-center gap-4 p-3 bg-slate-800 rounded-lg border border-slate-700">
               <div className="border border-purple-600 text-purple-400 text-xs font-bold px-3 py-1 rounded flex items-center gap-1"><MousePointerClick className="w-3 h-3"/> Daily Analysis</div>
               <span className="text-sm">Takes you to the <strong>Calendar</strong> view, focused on day-to-day results and monthly consistency.</span>
             </div>
          </div>
        </section>
        
        <section className="mt-8 p-4 bg-pink-500/10 border border-pink-500/20 rounded-lg flex items-start gap-3">
             <Activity className="w-5 h-5 text-pink-400 flex-shrink-0 mt-1" />
             <p className="text-sm text-pink-100">
               <strong>Automatic Ranking:</strong> The Library automatically organizes your robots from <strong>highest to lowest Score</strong>. The best strategies always appear first.
             </p>
        </section>
      </div>
    )
  },

  // --------------------------------------------------------------------------------
  // LEVEL 2: ANALYSIS & VALIDATION
  // --------------------------------------------------------------------------------
  'analysis': {
    title: 'Analysis',
    icon: <LineChart className="w-8 h-8 text-blue-400" />,
    level: 'Analysis & Validation',
    description: 'Deep backtest auditing. Visualize hidden metrics, identify error patterns, and validate consistency before risking real money.',
    content: (
      <div className="space-y-8 text-slate-300">
        <section>
          <p className="lead text-lg text-slate-400 mb-4">
            The standard MT5 report is limited. The Analysis tool imports this data and applies a layer of visual intelligence.
          </p>
        </section>

        <section>
          <h3 className="text-xl text-white font-bold mb-4">Key Features</h3>
          <div className="grid grid-cols-1 gap-4">
            <div className="bg-slate-900 p-5 rounded-lg border border-slate-700 hover:border-blue-500 transition">
              <strong className="text-blue-400 text-lg">1. Multi-Format Upload</strong>
              <p className="mt-2 text-sm">
                We support HTML reports (Backtest Report) and CSV (Excel Export) from MetaTrader 5. Just drag the file to generate charts instantly.
              </p>
            </div>
            <div className="bg-slate-900 p-5 rounded-lg border border-slate-700 hover:border-blue-500 transition">
              <strong className="text-blue-400 text-lg">2. Daily Scatter Plot</strong>
              <p className="mt-2 text-sm">
                Visualize every trading day as a point on the chart. This helps identify <em>Outliers</em> (abnormal profits or losses) that may distort strategy reality.
              </p>
            </div>
            <div className="bg-slate-900 p-5 rounded-lg border border-slate-700 hover:border-blue-500 transition">
              <strong className="text-blue-400 text-lg">3. Consistency Analysis</strong>
              <p className="mt-2 text-sm">
                Check monthly and annual profit distribution. A good strategy shouldn't rely on a single "lucky month" to be profitable for the year.
              </p>
            </div>
          </div>
        </section>
      </div>
    )
  },
  'monte-carlo': {
    title: 'Monte Carlo',
    icon: <Dices className="w-8 h-8 text-red-400" />,
    level: 'Analysis & Validation',
    description: 'Alternative scenario simulation. We shuffle your trade order thousands of times to discover the strategy\'s hidden risk.',
    content: (
      <div className="space-y-8 text-slate-300">
        <section>
          <div className="flex items-start gap-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg mb-6">
            <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0" />
            <div>
              <h4 className="text-red-400 font-bold mb-1">Why use it?</h4>
              <p className="text-sm text-red-100/80">
                The backtest shows only <strong>one</strong> historical sequence of events. But the future may present these same events in a different order, which can be fatal to your capital.
              </p>
            </div>
          </div>
          <p>
            The Monte Carlo simulator reorders (shuffles) your daily returns 100, 500, or 1,000 times, creating "parallel universes" of your performance.
          </p>
        </section>

        <section>
          <h3 className="text-xl text-white font-bold mb-4">Interpreting Results</h3>
          <ul className="space-y-4">
            <li className="bg-slate-900 p-4 rounded border-l-4 border-red-500">
              <strong className="text-white block text-lg">Probability Cone</strong>
              <p className="text-sm mt-1">
                The chart shows several colored lines. The center line is the average. Upper and lower lines show where your strategy might go (for better or worse) with <strong>95% or 99% confidence</strong>.
              </p>
            </li>
            <li className="bg-slate-900 p-4 rounded border-l-4 border-red-500">
              <strong className="text-white block text-lg">Estimated Drawdown</strong>
              <p className="text-sm mt-1">
                Often, Monte Carlo reveals your real Drawdown could be 2x higher than the backtest just by changing the order of losing days. <strong>Be prepared for this scenario.</strong>
              </p>
            </li>
          </ul>
        </section>
      </div>
    )
  },
  'optimizer': {
    title: 'Optimizer',
    icon: <Target className="w-8 h-8 text-green-400" />,
    level: 'Analysis & Validation',
    description: 'Find robustness, not just maximum profit. Use heatmaps and parametric analysis to avoid "Overfitting".',
    content: (
      <div className="space-y-8 text-slate-300">
        <section>
          <p className="mb-4">
            Optimizing isn't just finding the parameter that made the most money. This usually leads to <em>Overfitting</em> (excessive adjustment to the past). The DalioBot Optimizer helps find <strong>stability zones</strong>.
          </p>
        </section>

        <section>
          <h3 className="text-xl text-white font-bold mb-4">How to use?</h3>
          <ol className="list-decimal pl-5 space-y-4">
            <li>
              <strong>Import Optimization Results:</strong> Export the MT5 optimization table (XML/CSV) and load it here.
            </li>
            <li>
              <strong>Analyze the Heatmap:</strong>
              <p className="text-sm mt-1 text-slate-400">
                Look for large, continuous green "patches" on the chart. This indicates that even if the market changes slightly (or you slightly miss the parameter), the strategy continues to profit.
              </p>
            </li>
            <li>
              <strong>Avoid Lonely Peaks:</strong>
              <p className="text-sm mt-1 text-slate-400">
                If a parameter generates 500% profit but the neighboring parameter generates a loss, run away! That's luck, not robustness.
              </p>
            </li>
          </ol>
        </section>
      </div>
    )
  },

  // --------------------------------------------------------------------------------
  // LEVEL 3: EXECUTION & SCALING
  // --------------------------------------------------------------------------------
  'portfolios': {
    title: 'Portfolios',
    icon: <Briefcase className="w-8 h-8 text-yellow-400" />,
    level: 'Execution & Scaling',
    description: 'The power of diversification. Combine multiple robots to smooth the equity curve and reduce global account risk.',
    content: (
      <div className="space-y-8 text-slate-300">
        <section>
          <p className="lead text-lg text-slate-400 mb-6">
            The "Holy Grail" of trading isn't a perfect robot, it's a portfolio of imperfect robots that complement each other.
          </p>
          
          <div className="bg-slate-900 border border-slate-700 p-6 rounded-xl flex flex-col md:flex-row gap-6 items-center">
             <div className="flex-1">
               <h4 className="text-yellow-400 font-bold text-lg mb-2">Combined Simulation</h4>
               <p className="text-sm">
                 Select 2, 3, or 10 robots from your list. The system will sum the capital curves day by day. Often, when Robot A loses, Robot B wins, keeping your balance stable.
               </p>
             </div>
             <Layers className="w-16 h-16 text-slate-700" />
          </div>
        </section>

        <section>
          <h3 className="text-xl text-white font-bold mb-4">Correlation Analysis</h3>
          <p className="mb-4">
            For diversification to work, robots must be <strong>uncorrelated</strong>.
          </p>
          <ul className="space-y-2">
            <li className="flex items-center gap-2 text-sm">
              <span className="w-3 h-3 rounded-full bg-green-500"></span>
              <strong>Low/Negative Correlation:</strong> Ideal. Robots operate in different ways.
            </li>
            <li className="flex items-center gap-2 text-sm">
              <span className="w-3 h-3 rounded-full bg-red-500"></span>
              <strong>High Correlation (close to 1):</strong> Danger. If one loses, the other will also lose, doubling your risk.
            </li>
          </ul>
        </section>
      </div>
    )
  },
  'realtime': {
    title: 'Realtime Monitor',
    icon: <Zap className="w-8 h-8 text-orange-400" />,
    level: 'Execution & Scaling',
    description: 'Live connection. Monitor what is happening in your MetaTrader 5 account right now, without needing to open the terminal.',
    content: (
      <div className="space-y-8 text-slate-300">
        <section>
          <p className="mb-4">
            The Realtime Monitor acts as a bridge between the DalioBot web server and your MT5 terminal installed on your PC or VPS.
          </p>
          <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg">
             <h4 className="font-bold text-orange-400 mb-2 flex items-center gap-2">
               <Activity className="w-4 h-4" /> Live Data
             </h4>
             <ul className="list-disc pl-5 space-y-1 text-sm text-orange-100/80">
               <li>Profit/Loss (PnL) of open positions.</li>
               <li>Balance and Equity updated instantly.</li>
               <li>Connection Latency (Ping).</li>
             </ul>
          </div>
        </section>

        <section>
          <h3 className="text-xl text-white font-bold mb-4">Requirements</h3>
          <p className="text-sm mb-4">
            For this feature to work, you need to install the <strong>Bridge Expert Advisor (EA)</strong> on your MetaTrader 5 and enable the "Allow WebRequest" option in terminal settings.
          </p>
          <p className="text-sm text-slate-400">
            <em>Note: This feature depends on the MT5 terminal being open and connected to the internet.</em>
          </p>
        </section>
      </div>
    )
  }
};

// ==================================================================================
// COMPONENTE DA PÁGINA (LÓGICA DE RENDERIZAÇÃO)
// ==================================================================================

export default function HelpArticlePage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  // Busca o artigo no objeto acima
  const article = articlesData[slug];

  // Fallback 404 Estilizado
  if (!article) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-900">
        <Topbar />
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
          <AlertTriangle className="w-16 h-16 text-yellow-500 mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Article not found</h2>
          <p className="text-slate-400 mb-6">The topic "{slug}" has not been documented yet or does not exist.</p>
          <Link href="/help" className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition">
            Back to Help Center
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-900">
      <Topbar />

      {/* Mobile Toggle */}
      <div className="md:hidden p-2 bg-slate-800/50 border-b border-slate-700">
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-purple-400 text-xl font-bold">☰</button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className={`absolute md:static z-50 h-full bg-slate-900 border-r border-slate-800 transition-transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
          <Sidebar />
        </div>

        <main className="flex-1 p-6 md:p-10 overflow-y-auto">
          <div className="max-w-4xl mx-auto">
            
            {/* Breadcrumb / Navigation */}
            <Link href="/help" className="group inline-flex items-center text-slate-400 hover:text-purple-400 mb-8 transition-colors">
              <div className="bg-slate-800 p-2 rounded-full mr-3 group-hover:bg-purple-500/20 transition-colors">
                 <ArrowLeft className="w-4 h-4" />
              </div>
              <span className="text-sm font-medium">Back to Help Center</span>
            </Link>

            {/* Cabeçalho do Artigo */}
            <div className="mb-10 pb-10 border-b border-slate-800">
              <span className="inline-block text-xs font-bold text-purple-400 uppercase tracking-widest bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20 mb-6">
                {article.level}
              </span>
              
              <div className="flex flex-col md:flex-row md:items-center gap-6">
                <div className="w-16 h-16 bg-slate-800 rounded-2xl border border-slate-700 flex items-center justify-center shadow-lg shadow-black/20">
                  {article.icon}
                </div>
                <div>
                    <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{article.title}</h1>
                    <p className="text-lg text-slate-400 max-w-2xl leading-relaxed">
                        {article.description}
                    </p>
                </div>
              </div>
            </div>

            {/* Conteúdo Principal */}
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
                <CardContent className="p-6 md:p-10">
                  {/* Renderização do Conteúdo JSX */}
                  <div className="prose prose-invert prose-purple max-w-none prose-headings:text-white prose-p:text-slate-300 prose-strong:text-white prose-li:text-slate-300">
                      {article.content}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Footer de Ajuda */}
            <div className="mt-12 bg-slate-800 rounded-xl p-8 text-center border border-slate-700">
                <h4 className="text-white font-semibold mb-2">Still have questions about {article.title}?</h4>
                <p className="text-slate-400 text-sm mb-6">Our technical team can help analyze your specific case.</p>
                <div className="flex justify-center gap-4">
                    <button className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-2 rounded-lg transition text-sm font-medium">
                        Watch Video Tutorials
                    </button>
                    <button className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg transition text-sm font-medium shadow-lg shadow-purple-500/20">
                        Contact Support
                    </button>
                </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}