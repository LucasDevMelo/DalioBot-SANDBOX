import { NextResponse } from 'next/server';
import { realtimeDB } from '@/src/firebase'; // Utiliza a exportação já existente
import { ref, update } from 'firebase/database';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { uid, metrics } = data;

    if (!uid) {
      return NextResponse.json({ error: 'UID do utilizador é obrigatório' }, { status: 400 });
    }

    // Referência no Realtime Database: analysis/ID_DO_USER
    const analysisRef = ref(realtimeDB, `analysis/${uid}`);
    
    await update(analysisRef, {
      ...metrics,
      lastUpdate: new Date().toISOString()
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro na ponte MT5:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}