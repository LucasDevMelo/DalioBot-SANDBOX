'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Topbar from '@/components/topbar';
import Sidebar from '@/components/sidebar';
import CreateAnalysis from './components/CreateAnalysis';
import SavedAnalyses from './components/SavedAnalyses';

export default function AnalysisPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [activeTab, setActiveTab] = useState<'new' | 'saved'>('new');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    
    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab === 'new' || tab === 'saved') {
            setActiveTab(tab);
        }
    }, [searchParams]);

    const handleTabChange = (tab: 'new' | 'saved') => {
        // Note: The route path has been translated from '/analise' to '/analysis'
        router.push(`/analysis?tab=${tab}`, { scroll: false });
    };
    
    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            <Topbar />
            <div className="md:hidden p-2 bg-white shadow z-40">
                <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-purple-700 font-bold text-xl">☰ Menu</button>
            </div>
            <div className="flex flex-1">
                <div className={`absolute md:static z-50 transition-transform duration-300 transform bg-white shadow-md md:shadow-none h-full md:h-auto ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
                    <Sidebar />
                </div>
                <main className="flex-1 bg-gray-50 p-4 md:p-6 overflow-y-auto" onClick={() => isSidebarOpen && setIsSidebarOpen(false)}>
                    <div className="max-w-7xl mx-auto">
                        <h1 className="text-2xl md:text-3xl font-bold mb-6 text-gray-800">Consistency Analysis</h1>
                        <Suspense fallback={<div className="text-center p-8">Loading...</div>}>
                            {activeTab === 'new' && <CreateAnalysis />}
                            {activeTab === 'saved' && <SavedAnalyses />}
                        </Suspense>
                    </div>
                </main>
            </div>
        </div>
    );
}