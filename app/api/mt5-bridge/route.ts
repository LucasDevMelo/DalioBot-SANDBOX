import { NextResponse } from 'next/server';
import { realtimeDB } from '@/src/firebase';
import { ref, update } from 'firebase/database';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { uid, metrics, positions, closedHistory } = data;

    if (!uid) return NextResponse.json({ error: 'UID is required' }, { status: 400 });

    const analysisRef = ref(realtimeDB, `analysis/${uid}`);
    
    await update(analysisRef, {
      metrics,
      positions: positions || [],
      closedHistory: closedHistory || [], // Novo campo
      lastUpdate: new Date().toISOString()
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
  }
}