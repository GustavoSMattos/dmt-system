'use client';

import { useState, useEffect } from 'react';

export default function FornecedoresTab() {
  const [fornecedores, setFornecedores] = useState([]);
  const [nome, setNome] = useState('');
  const [cnpj, setCnpj] = useState('');

  const carregarFornecedores = () => {
    fetch('/api/fornecedores')
      .then((res) => res.json())
      .then((data) => setFornecedores(Array.isArray(data) ? data : []));
  };

  useEffect(() => {
    carregarFornecedores();
  }, []);

  const handleCadastrar = async (e) => {
    e.preventDefault();
    await fetch('/api/fornecedores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome_empresa: nome, cnpj }),
    });

    setNome('');
    setCnpj('');
    carregarFornecedores();
  };

  return (
    <div style={{ background: '#fff', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
      <h3 style={{ marginBottom: '16px' }}>Cadastro de Fornecedores</h3>
      
      <form onSubmit={handleCadastrar} style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        <input
          type="text"
          placeholder="Razão Social / Nome Fantasia"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          required
          style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
        />
        <input
          type="text"
          placeholder="CNPJ"
          value={cnpj}
          onChange={(e) => setCnpj(e.target.value)}
          required
          style={{ width: '200px', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
        />
        <button type="submit" style={{ padding: '10px 20px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '6px' }}>
          Salvar Fornecedor
        </button>
      </form>

      <h4>Fornecedores Parceiros</h4>
      <ul>
        {fornecedores.map((f) => (
          <li key={f.id} style={{ padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
            <strong>{f.nome_empresa}</strong> - CNPJ: {f.cnpj}
          </li>
        ))}
      </ul>
    </div>
  );
}