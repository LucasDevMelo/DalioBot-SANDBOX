'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/src/context/authcontext';
import { getDatabase, ref as dbRefFirebase, get, remove } from 'firebase/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Tipagem
interface SavedAnalysis { id: string; analysisName: string; creationDate: string; periodType: string; results: any[]; }

export default function SavedAnalyses() {
    const { user } = useAuth();
    const [analyses, setAnalyses] = useState<SavedAnalysis[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!user?.uid) {
            setIsLoading(false);
            return;
        }
        const fetchAnalyses = async () => {
            try {
                const db = getDatabase();
                const analysesRef = dbRefFirebase(db, `consistency_analyses/${user.uid}`);
                const snapshot = await get(analysesRef);
                if (snapshot.exists()) {
                    const data = snapshot.val();
                    const loadedAnalyses = Object.entries(data).map(([id, value]: [string, any]) => ({ id, ...value }));
                    setAnalyses(loadedAnalyses.sort((a, b) => new Date(b.creationDate).getTime() - new Date(a.creationDate).getTime()));
                }
            } catch (err) {
                setError("Falha ao carregar as análises salvas.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchAnalyses();
    }, [user]);

    const handleRemove = async (id: string) => {
        if (!user?.uid || !window.confirm("Tem certeza?")) return;
        try {
            await remove(dbRefFirebase(getDatabase(), `consistency_analyses/${user.uid}/${id}`));
            setAnalyses(prev => prev.filter(a => a.id !== id));
        } catch {
            setError("Falha ao remover a análise.");
        }
    };

    if (isLoading) return <p>Loading saved analyses...</p>;
    if (error) return <p className="text-red-500">{error}</p>;

    return (
        <div>
            <h2 className="text-xl font-semibold mb-4 text-gray-800">My Consistency Analysis</h2>
            {analyses.length === 0 ? (
                <p>No saved analyzes found.</p>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {analyses.map(analysis => (
                        <Card key={analysis.id}>
                            <CardHeader>
                                <CardTitle className="text-lg text-purple-700">{analysis.analysisName}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-xs text-gray-500 mb-4">
                                    Saved in: {new Date(analysis.creationDate).toLocaleDateString('pt-BR')}
                                </p>
                                <button onClick={() => handleRemove(analysis.id)} className="w-full bg-red-500 text-white text-sm py-2 px-4 rounded-md hover:bg-red-600">
                                    Remove
                                </button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}