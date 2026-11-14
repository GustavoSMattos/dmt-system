import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import jwt from 'jsonwebtoken';

export async function POST(req) {
  try {
    const { email, senha } = await req.json();

    // Validação com procedure do Supabase usando pgcrypto
    const { data: usuario, error } = await supabaseAdmin.rpc('validar_senha_usuario', {
      p_email: email,
      p_senha: senha,
    });

    if (error || !usuario || usuario.length === 0) {
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 });
    }

    const user = usuario[0];

    // Geração do token JWT
    const token = jwt.sign(
      { id: user.id, nome: user.nome, perfil: user.perfil },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    const response = NextResponse.json({ success: true });

    // Armazenamento em cookie HTTP-Only seguro
    response.cookies.set('session_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 8,
      path: '/',
    });

    return response;
  } catch (err) {
    return NextResponse.json({ error: 'Erro interno no servidor ao realizar login' }, { status: 500 });
  }
}