'use client';

import { useState, useEffect } from 'react';
import EstoqueTab from '@/components/estoque/EstoqueTab';
import CadastrarProdutoTab from '@/components/estoque/CadastrarProdutoTab';
import ServicosTab from '@/components/servicos/ServicosTab';
import FornecedoresTab from '@/components/fornecedores/FornecedoresTab';
import MovimentacaoLoteTab from '@/components/estoque/MovimentacaoLoteTab';
import LeituraNFTab from '@/components/estoque/LeituraNFTab';
import DesperdicioTab from '@/components/estoque/DesperdicioTab';
import BomTrailersTab from '@/components/bom/BomTrailersTab';
import LogsTab from '@/components/logs/LogsTab';
import AlterarSenhaTab from '@/components/perfil/AlterarSenhaTab';

export default function DashboardLayout({ children }) {
  const [abaAtiva, setAbaAtiva] = useState('dashboard');
  const [perfilUsuario, setPerfilUsuario] = useState(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.perfil) setPerfilUsuario(data.perfil);
      })
      .catch(() => {});
  }, []);

  const todosMenuItens = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'produtos', label: 'Estoque de Produtos' },
    { id: 'novo_produto', label: '+ Cadastrar Produto' },
    { id: 'servicos', label: 'Serviços' },
    { id: 'fornecedores', label: 'Fornecedores' },
    { id: 'lote', label: 'Entrada/Saída em Lote' },
    { id: 'xml', label: 'Entrada por NF-e' },
    { id: 'bom', label: 'Estruturas BOM' },
    { id: 'logs', label: 'Log de Atividades', apenasAdmin: true },
    { id: 'desperdicio', label: 'Desperdício' },
  ];

  // Oculta a aba Log de Atividades para operador (e enquanto o perfil não for confirmado como admin)
  const menuItens = todosMenuItens.filter(
    (item) => !item.apenasAdmin || perfilUsuario === 'admin'
  );

  const renderConteudoAba = () => {
    try {
      switch (abaAtiva) {
        case 'dashboard':
          return children;
        case 'produtos':
          return <EstoqueTab />;
        case 'novo_produto':
          return <CadastrarProdutoTab />;
        case 'servicos':
          return <ServicosTab />;
        case 'fornecedores':
          return <FornecedoresTab />;
        case 'lote':
          return <MovimentacaoLoteTab />;
        case 'xml':
          return <LeituraNFTab />;
        case 'desperdicio':
          return <DesperdicioTab />;
        case 'bom':
          return <BomTrailersTab />;
        case 'logs':
          return perfilUsuario === 'admin' ? <LogsTab /> : children;
        case 'senha':
          return <AlterarSenhaTab />;
        default:
          return children;
      }
    } catch {
      return (
        <div
          style={{
            padding: '24px',
            backgroundColor: 'rgba(185, 28, 28, 0.15)',
            color: '#fca5a5',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            borderRadius: '10px',
          }}
        >
          <h4>Erro ao carregar a aba selecionada</h4>
          <p style={{ fontSize: '14px', marginTop: '4px' }}>
            Verifique as conexões de API ou as variáveis de ambiente.
          </p>
        </div>
      );
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#0c0d10', color: '#f8fafc' }}>
      {/* SIDEBAR MINIMALISTA DARK GOLD */}
      <aside
        style={{
          width: '250px',
          backgroundColor: '#111216',
          borderRight: '1px solid rgba(212, 175, 55, 0.25)',
          padding: '24px 16px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          onClick={() => setAbaAtiva('dashboard')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '8px 12px 24px 12px',
            marginBottom: '16px',
            borderBottom: '1px solid rgba(212, 175, 55, 0.15)',
            cursor: 'pointer',
          }}
        >
          <img
            src="/logo.png"
            alt="Logotipo"
            style={{
              maxWidth: '170px',
              maxHeight: '56px',
              width: 'auto',
              height: 'auto',
              objectFit: 'contain',
              display: 'block',
            }}
          />
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
          {menuItens.map((item) => {
            const ativo = abaAtiva === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setAbaAtiva(item.id)}
                style={{
                  padding: '12px 16px',
                  textAlign: 'left',
                  background: ativo
                    ? 'linear-gradient(90deg, #d4af37 0%, #b58e22 100%)'
                    : 'transparent',
                  color: ativo ? '#0c0d10' : '#d1d5db',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: ativo ? '700' : '400',
                  fontSize: '14px',
                  letterSpacing: '0.2px',
                  transition: 'all 0.2s ease',
                }}
              >
                {item.label}
              </button>
            );
          })}

          <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid rgba(212, 175, 55, 0.15)' }}>
            <button
              onClick={() => setAbaAtiva('senha')}
              style={{
                width: '100%',
                padding: '12px 16px',
                textAlign: 'left',
                background: abaAtiva === 'senha'
                  ? 'linear-gradient(90deg, #d4af37 0%, #b58e22 100%)'
                  : 'transparent',
                color: abaAtiva === 'senha' ? '#0c0d10' : '#9ca3af',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: abaAtiva === 'senha' ? '700' : '400',
                fontSize: '14px',
              }}
            >
              Alterar Senha
            </button>
          </div>
        </nav>
      </aside>

      {/* CONTEÚDO PRINCIPAL */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <header
          style={{
            backgroundColor: '#111216',
            padding: '20px 32px',
            borderBottom: '1px solid rgba(212, 175, 55, 0.25)',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: '18px', fontWeight: '500', color: '#f8fafc', letterSpacing: '0.3px' }}>
            Painel de Controle de Estoque
          </span>
        </header>

        <main style={{ padding: '28px 32px', flex: 1 }}>
          {renderConteudoAba()}
        </main>
      </div>
    </div>
  );
}