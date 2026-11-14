'use client';

import { useEffect, useState } from 'react';

export default function DashboardPage() {
  const [stats, setStats] = useState({ totalProdutos: 0, fornecedores: 0 });

  useEffect(() => {
    Promise.all([
      fetch('/api/produtos').then((res) => res.json()),
      fetch('/api/fornecedores').then((res) => res.json()),
    ]).then(([prods, forns]) => {
      setStats({
        totalProdutos: Array.isArray(prods) ? prods.length : 0,
        fornecedores: Array.isArray(forns) ? forns.length : 0,
      });
    }).catch(() => {});
  }, []);

  return (
    <div>
      <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px', color: '#0f172a' }}>Visão Geral</h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
        <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '8px' }}>Total de Produtos Cadastrados</p>
          <h3 style={{ fontSize: '32px', fontWeight: 'bold', color: '#0f172a' }}>{stats.totalProdutos}</h3>
        </div>

        <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '8px' }}>Fornecedores Ativos</p>
          <h3 style={{ fontSize: '32px', fontWeight: 'bold', color: '#0284c7' }}>{stats.fornecedores}</h3>
        </div>

        <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '8px' }}>Status da Conexão</p>
          <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#16a34a' }}>Supabase Ativo</h3>
        </div>
      </div>
    </div>
  );
}