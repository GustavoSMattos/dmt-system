'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function useAuth() {
  const [usuario, setUsuario] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Verifica se há sessão ativa ao carregar a página
    async function checarSessao() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          setUsuario(data.usuario);
        } else {
          setUsuario(null);
        }
      } catch (err) {
        setUsuario(null);
      } finally {
        setLoading(false);
      }
    }

    checarSessao();
  }, []);

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUsuario(null);
      router.push('/login');
    } catch (err) {
      console.error('Erro ao efetuar logout:', err);
    }
  };

  return {
    usuario,
    loading,
    logout,
    isAdmin: usuario?.perfil === 'admin',
    isOperador: usuario?.perfil === 'operador' || usuario?.perfil === 'admin',
    isVisualizador: usuario?.perfil === 'visualizador',
  };
}