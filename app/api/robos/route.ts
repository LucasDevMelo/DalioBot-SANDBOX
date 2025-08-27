import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads');

  try {
    const files = fs.readdirSync(uploadsDir);
    const robos = files.map((file) => {
      const stats = fs.statSync(path.join(uploadsDir, file));
      return {
        nome: file,
        criadoEm: stats.birthtime,
        caminho: `/uploads/${file}`,
      };
    });

    return NextResponse.json(robos);
  } catch (error) {
    console.error('Erro ao ler arquivos:', error);
    return NextResponse.json({ error: 'Erro ao listar robôs.' }, { status: 500 });
  }
}
