import { NextResponse } from 'next/server';
import { realtimeDB } from '@/src/firebase';
import { ref, update } from 'firebase/database';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // 1. ADICIONE chartData AQUI NA LEITURA
    const { uid, metrics, positions, closedHistory, chartData } = data; 

    if (!uid) return NextResponse.json({ error: 'UID is required' }, { status: 400 });

    const analysisRef = ref(realtimeDB, `analysis/${uid}`);
    
    await update(analysisRef, {
      metrics,
      positions: positions || [],
      closedHistory: closedHistory || [],
      
      // 2. ADICIONE chartData AQUI PARA SALVAR NO BANCO
      chartData: chartData || [], 
      
      lastUpdate: new Date().toISOString()
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
  }
}