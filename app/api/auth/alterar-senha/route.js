import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import jwt from 'jsonwebtoken';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const token = req.cookies.get('session_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Sessão expirada. Faça login novamente.' }, { status: 401 });
    }

    let user;
    try {
      user = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return NextResponse.json({ error: 'Token de autenticação inválido.' }, { status: 401 });
    }

    const { senhaAtual, novaSenha } = await req.json();

    if (!senhaAtual || !novaSenha) {
      return NextResponse.json({ error: 'Preencha a senha atual e a nova senha.' }, { status: 400 });
    }

    if (novaSenha.length < 6) {
      return NextResponse.json({ error: 'A nova senha deve ter no mínimo 6 caracteres.' }, { status: 400 });
    }

    if (senhaAtual === novaSenha) {
      return NextResponse.json({ error: 'A nova senha deve ser diferente da senha atual.' }, { status: 400 });
    }

    // Executa a função RPC no Supabase que valida e criptografa a nova senha
    const { data: sucesso, error } = await supabaseAdmin.rpc('alterar_senha_usuario', {
      p_user_id: user.id,
      p_senha_atual: senhaAtual,
      p_nova_senha: novaSenha,
    });

    if (error) {
      return NextResponse.json({ error: 'Erro ao atualizar senha: ' + error.message }, { status: 500 });
    }

    if (!sucesso) {
      return NextResponse.json({ error: 'A senha atual informada está incorreta.' }, { status: 400 });
    }

    // Registra a alteração no log de auditoria
    await supabaseAdmin.from('logs_atividade').insert({
      id_usuario: user.id,
      acao: 'ALTERACAO_SENHA_PROPRIA',
      detalhes: { usuario: user.nome || user.email },
    });

    return NextResponse.json({
      success: true,
      message: 'Senha alterada e criptografada com sucesso!',
    });
  } catch (err) {
    return NextResponse.json({ error: 'Erro interno ao alterar senha: ' + err.message }, { status: 500 });
  }
}