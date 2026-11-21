import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    const token = req.cookies.get('session_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const user = jwt.verify(token, process.env.JWT_SECRET);
    return NextResponse.json({
      id: user.id,
      nome: user.nome,
      email: user.email,
      perfil: user.perfil,
    });
  } catch {
    return NextResponse.json({ error: 'Sessão inválida.' }, { status: 401 });
  }
}