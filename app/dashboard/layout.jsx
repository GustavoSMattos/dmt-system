'use client';

import { useState } from 'react';
import EstoqueTab from '@/components/estoque/EstoqueTab';
import CadastrarProdutoTab from '@/components/estoque/CadastrarProdutoTab';
import FornecedoresTab from '@/components/fornecedores/FornecedoresTab';
import MovimentacaoLoteTab from '@/components/estoque/MovimentacaoLoteTab';
import LeituraNFTab from '@/components/estoque/LeituraNFTab';
import BomTrailersTab from '@/components/bom/BomTrailersTab';
import LogsTab from '@/components/logs/LogsTab';

export default function DashboardLayout({ children }) {
  const [abaAtiva, setAbaAtiva] = useState('dashboard');

  const renderConteudoAba = () => {
    try {
      switch (abaAtiva) {
        case 'dashboard':
          return children;
        case 'produtos':
          return <EstoqueTab />;
        case 'novo_produto':
          return <CadastrarProdutoTab />;
        case 'fornecedores':
          return <FornecedoresTab />;
        case 'lote':
          return <MovimentacaoLoteTab />;
        case 'xml':
          return <LeituraNFTab />;
        case 'bom':
          return <BomTrailersTab />;
        case 'logs':
          return <LogsTab />;
        default:
          return children;
      }
    } catch (err) {
      return (
        <div style={{ padding: '24px', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: '8px' }}>
          <h4>Erro ao carregar a aba selecionada</h4>
          <p style={{ fontSize: '14px' }}>Verifique as conexões de API ou as variáveis de ambiente.</p>
        </div>
      );
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      {/* Sidebar */}
      <aside style={{ width: '260px', backgroundColor: '#0f172a', color: '#fff', padding: '24px', display: 'flex', flexDirection: 'column' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 'bold', color: '#38bdf8', marginBottom: '32px' }}>dmt-system</h1>
        
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
          <button onClick={() => setAbaAtiva('dashboard')} style={{ padding: '12px 16px', textAlign: 'left', backgroundColor: abaAtiva === 'dashboard' ? '#1e293b' : 'transparent', color: abaAtiva === 'dashboard' ? '#38bdf8' : '#94a3b8', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}>Dashboard</button>
          <button onClick={() => setAbaAtiva('produtos')} style={{ padding: '12px 16px', textAlign: 'left', backgroundColor: abaAtiva === 'produtos' ? '#1e293b' : 'transparent', color: abaAtiva === 'produtos' ? '#38bdf8' : '#94a3b8', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}>Estoque de Produtos</button>
          <button onClick={() => setAbaAtiva('novo_produto')} style={{ padding: '12px 16px', textAlign: 'left', backgroundColor: abaAtiva === 'novo_produto' ? '#1e293b' : 'transparent', color: abaAtiva === 'novo_produto' ? '#38bdf8' : '#94a3b8', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}>+ Cadastrar Produto</button>
          <button onClick={() => setAbaAtiva('fornecedores')} style={{ padding: '12px 16px', textAlign: 'left', backgroundColor: abaAtiva === 'fornecedores' ? '#1e293b' : 'transparent', color: abaAtiva === 'fornecedores' ? '#38bdf8' : '#94a3b8', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}>Fornecedores</button>
          <button onClick={() => setAbaAtiva('lote')} style={{ padding: '12px 16px', textAlign: 'left', backgroundColor: abaAtiva === 'lote' ? '#1e293b' : 'transparent', color: abaAtiva === 'lote' ? '#38bdf8' : '#94a3b8', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}>Entrada/Saída em Lote</button>
          <button onClick={() => setAbaAtiva('xml')} style={{ padding: '12px 16px', textAlign: 'left', backgroundColor: abaAtiva === 'xml' ? '#1e293b' : 'transparent', color: abaAtiva === 'xml' ? '#38bdf8' : '#94a3b8', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}>Entrada por NF-e (XML)</button>
          <button onClick={() => setAbaAtiva('bom')} style={{ padding: '12px 16px', textAlign: 'left', backgroundColor: abaAtiva === 'bom' ? '#1e293b' : 'transparent', color: abaAtiva === 'bom' ? '#38bdf8' : '#94a3b8', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}>Estruturas BOM</button>
          <button onClick={() => setAbaAtiva('logs')} style={{ padding: '12px 16px', textAlign: 'left', backgroundColor: abaAtiva === 'logs' ? '#1e293b' : 'transparent', color: abaAtiva === 'logs' ? '#38bdf8' : '#94a3b8', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}>Log de Atividades</button>
        </nav>
      </aside>

      {/* Conteúdo Principal */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <header style={{ backgroundColor: '#fff', padding: '16px 32px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: '600', color: '#334155' }}>Painel de Controle de Estoque</span>
        </header>

        <main style={{ padding: '32px', flex: 1 }}>
          {renderConteudoAba()}
        </main>
      </div>
    </div>
  );
}