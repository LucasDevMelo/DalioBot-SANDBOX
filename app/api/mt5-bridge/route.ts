import { NextResponse } from 'next/server';
import { realtimeDB } from '@/src/firebase'; // Utiliza a exportação já existente
import { ref, update } from 'firebase/database';

// app/api/mt5-bridge/route.ts

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { uid, metrics, positions } = data; // Captura as posições também

    if (!uid) {
      return NextResponse.json({ error: 'UID do utilizador é obrigatório' }, { status: 400 });
    }

    const analysisRef = ref(realtimeDB, `analysis/${uid}`);
    
    // Salva mantendo a estrutura que o frontend espera
    await update(analysisRef, {
      metrics: metrics,    // Salva o objeto metrics inteiro
      positions: positions, // Salva o array de posições
      lastUpdate: new Date().toISOString()
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro na ponte MT5:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}