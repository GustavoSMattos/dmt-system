import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

export async function middleware(req) {
  const token = req.cookies.get('session_token')?.value;
  const { pathname } = req.nextUrl;

  // Libera rotas públicas e arquivos estáticos
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth/login') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // Se não estiver autenticado, redireciona para a página de login
  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', req.url));
  }

  try {
    // Decodifica e valida o token JWT
    const { payload } = await jwtVerify(token, JWT_SECRET);

    // Regra de segurança: a rota /api/logs é exclusiva para o perfil 'admin'
    if (pathname.startsWith('/api/logs') && payload.perfil !== 'admin') {
      return NextResponse.json(
        { error: 'Acesso negado: Rota restrita para Administradores' },
        { status: 403 }
      );
    }

    // Injeta os dados do usuário autenticado no cabeçalho para uso das API Routes
    const response = NextResponse.next();
    response.headers.set('x-user-id', payload.id);
    response.headers.set('x-user-perfil', payload.perfil);
    return response;
  } catch (err) {
    // Token inválido ou expirado -> Redireciona para o login
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Sessão expirada' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', req.url));
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};