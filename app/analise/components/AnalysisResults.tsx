'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Type definition for the data this component expects to receive
interface PeriodAnalysis {
    periodName: string;
    netProfit: number;
    netProfitPercent: number;
    maxDrawdownPercent: number;
}

interface AnalysisResultsProps {
    analysisName: string;
    analysisResults: PeriodAnalysis[];
}

export default function AnalysisResults({ analysisName, analysisResults }: AnalysisResultsProps) {
    if (!analysisResults || analysisResults.length === 0) {
        return <p>There are no results to display.</p>;
    }

    return (
        <div className="space-y-8">
            <h2 className="text-2xl font-bold text-gray-800">{analysisName}</h2>

            <Card>
                <CardHeader><CardTitle>Performance by Period</CardTitle></CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={analysisResults}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="periodName" fontSize={12} />
                            <YAxis fontSize={12} tickFormatter={(value) => `$${value.toFixed(0)}`} />
                            <Tooltip formatter={(value: number) => [`$${value.toFixed(2)}`, "Result"]} />
                            <Legend />
                            <Bar dataKey="netProfit" name="Result ($)" fill="#9C27B0" />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>Detailed Results</CardTitle></CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    {['Period', 'Result (%)', 'Max DD (%)'].map(header => (
                                        <th key={header} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{header}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {analysisResults.map(p => (
                                    <tr key={p.periodName}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{p.periodName}</td>
                                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${p.netProfitPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {p.netProfitPercent.toFixed(2)}%
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">{p.maxDrawdownPercent.toFixed(2)}%</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}