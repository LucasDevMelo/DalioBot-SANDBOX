import { NextRequest } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';

export async function POST(req: NextRequest) {
  const data = await req.formData();
  const file: File | null = data.get('file') as unknown as File;

  if (!file) {
    return new Response('Arquivo não encontrado', { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const filePath = path.join(process.cwd(), 'public', 'uploads', file.name);
  await writeFile(filePath, buffer);

  return new Response(`Arquivo ${file.name} salvo com sucesso`);
}
