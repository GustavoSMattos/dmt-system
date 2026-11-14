'use client';

import { useState, useEffect } from 'react';

export default function CadastrarProdutoTab() {
  const [fornecedores, setFornecedores] = useState([]);
  const [form, setForm] = useState({
    codigo: '',
    nome: '',
    categoria: '',
    unidade: 'UN',
    quantidade: '0',
    estoque_minimo: '0',
    valor_unitario: '0.00',
    id_fornecedor: '',
  });
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });

  useEffect(() => {
    // Carrega a lista de fornecedores para o dropdown
    fetch('/api/fornecedores')
      .then((res) => res.json())
      .then((data) => setFornecedores(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMensagem({ tipo: '', texto: '' });

    try {
      const payload = {
        ...form,
        quantidade: parseFloat(form.quantidade) || 0,
        valor_unitario: parseFloat(form.valor_unitario) || 0,
        id_fornecedor: form.id_fornecedor || null,
      };

      const res = await fetch('/api/produtos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao cadastrar produto.');

      setMensagem({ tipo: 'sucesso', texto: `Produto "${data.nome}" cadastrado com sucesso!` });
      setForm({
        codigo: '',
        nome: '',
        categoria: '',
        unidade: 'UN',
        quantidade: '0',
        valor_unitario: '0.00',
        id_fornecedor: '',
      });
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
      <h3 style={{ marginBottom: '8px', color: '#0f172a' }}>Cadastro Manual de Produto</h3>
      <p style={{ color: '#64748b', marginBottom: '24px', fontSize: '14px' }}>
        Preencha os dados do novo item. O código/SKU deve ser único no sistema.
      </p>

      {mensagem.texto && (
        <div
          style={{
            padding: '12px',
            borderRadius: '6px',
            marginBottom: '20px',
            backgroundColor: mensagem.tipo === 'sucesso' ? '#dcfce7' : '#fee2e2',
            color: mensagem.tipo === 'sucesso' ? '#15803d' : '#b91c1c',
            fontSize: '14px',
          }}
        >
          {mensagem.texto}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
            Código / SKU *
          </label>
          <input
            type="text"
            name="codigo"
            value={form.codigo}
            onChange={handleChange}
            placeholder="Ex: PRD-001 ou Código de Barras"
            required
            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
            Nome do Produto *
          </label>
          <input
            type="text"
            name="nome"
            value={form.nome}
            onChange={handleChange}
            placeholder="Ex: Chapa de Aço 3mm"
            required
            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
            Categoria *
          </label>
          <input
            type="text"
            name="categoria"
            value={form.categoria}
            onChange={handleChange}
            placeholder="Ex: Insumos, Peças, Tintas"
            required
            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
            Unidade de Medida *
          </label>
          <select
            name="unidade"
            value={form.unidade}
            onChange={handleChange}
            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
          >
            <option value="UN">Unidade (UN)</option>
            <option value="KG">Quilograma (KG)</option>
            <option value="MT">Metro (MT)</option>
            <option value="M2">Metro Quadrado (M²)</option>
            <option value="LT">Litro (LT)</option>
            <option value="CX">Caixa (CX)</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
            Quantidade Inicial
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            name="quantidade"
            value={form.quantidade}
            onChange={handleChange}
            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
          Estoque Mínimo
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            name="estoque_minimo"
            value={form.estoque_minimo}
            onChange={handleChange}
            placeholder="0.00"
            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
            Valor Unitário (R$)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            name="valor_unitario"
            value={form.valor_unitario}
            onChange={handleChange}
            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
          />
        </div>

        <div style={{ gridColumn: 'span 2' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
            Fornecedor Principal (Opcional)
          </label>
          <select
            name="id_fornecedor"
            value={form.id_fornecedor}
            onChange={handleChange}
            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
          >
            <option value="">Selecione um fornecedor (opcional)</option>
            {fornecedores.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nome_empresa} - {f.cnpj}
              </option>
            ))}
          </select>
        </div>

        <div style={{ gridColumn: 'span 2', marginTop: '12px' }}>
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '12px 24px',
              backgroundColor: loading ? '#0369a1' : '#0284c7',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 'bold',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Cadastrando Produto...' : 'Salvar Novo Produto'}
          </button>
        </div>
      </form>
    </div>
  );
}