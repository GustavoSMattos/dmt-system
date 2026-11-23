'use client';

import { useState, useEffect } from 'react';

export default function DashboardPage() {
  const [produtos, setProdutos] = useState([]);
  const [fornecedoresCount, setFornecedoresCount] = useState(0);
  const [perfilUsuario, setPerfilUsuario] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  // Estados para Contagem de Inventário
  const [categoriaInventario, setCategoriaInventario] = useState('');
  const [baixandoInventario, setBaixandoInventario] = useState(false);

  const carregarDados = async () => {
    setLoading(true);
    setErro('');
    try {
      const [resProd, resForn, resMe] = await Promise.all([
        fetch('/api/produtos'),
        fetch('/api/fornecedores'),
        fetch('/api/auth/me'),
      ]);

      const dataProd = await resProd.json();
      if (!resProd.ok) throw new Error(dataProd.error || 'Erro ao carregar indicadores do estoque.');
      setProdutos(Array.isArray(dataProd) ? dataProd : []);

      if (resForn.ok) {
        const dataForn = await resForn.json();
        setFornecedoresCount(Array.isArray(dataForn) ? dataForn.length : 0);
      }

      if (resMe.ok) {
        const dataMe = await resMe.json();
        setPerfilUsuario(dataMe?.perfil || null);
      }
    } catch (err) {
      setErro(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  // Lista única de categorias cadastradas nos produtos
  const categoriasDisponiveis = Array.from(
    new Set(produtos.map((p) => p.categoria).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));

  // Gera e baixa o CSV filtrado pela categoria e grava o log no servidor
  const handleBaixarContagemInventario = async () => {
    if (!categoriaInventario) {
      alert('Selecione uma categoria antes de baixar o CSV.');
      return;
    }

    const itensFiltrados = produtos
      .filter((p) => p.categoria === categoriaInventario)
      .sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || '')));

    if (itensFiltrados.length === 0) {
      alert('Nenhum produto encontrado nesta categoria.');
      return;
    }

    setBaixandoInventario(true);
    try {
      // 1. Registra o download no Log de Atividades com a categoria
      await fetch('/api/inventario/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoria: categoriaInventario,
          total_itens: itensFiltrados.length,
        }),
      });

      // 2. Monta o CSV com: Código, Nome do Produto, Quantidade em Estoque e Estoque Atual (vazia)
      const linhas = [
        ['Codigo', 'Nome_do_Produto', 'Quantidade_em_Estoque', 'Estoque_Atual'],
      ];

      itensFiltrados.forEach((prod) => {
        const qtd = Number(prod.quantidade || 0).toString().replace('.', ',');
        linhas.push([
          `"${String(prod.codigo || '').replace(/"/g, '""')}"`,
          `"${String(prod.nome || '').replace(/"/g, '""')}"`,
          qtd,
          '',
        ]);
      });

      const csvContent = '\uFEFF' + linhas.map((e) => e.join(';')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);

      const categoriaSlug = categoriaInventario
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '_');

      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Contagem_Inventario_${categoriaSlug}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      alert('Erro ao gerar planilha de contagem de inventário.');
    } finally {
      setBaixandoInventario(false);
    }
  };

  const produtosUrgencia = [];
  const produtosAtencao = [];

  produtos.forEach((prod) => {
    const qtd = Number(prod.quantidade || 0);
    const min = Number(prod.estoque_minimo || 0);

    if (min > 0) {
      const percentualAcima = ((qtd - min) / min) * 100;
      const itemComCalculo = { ...prod, percentualAcima };

      if (percentualAcima <= 10) {
        produtosUrgencia.push(itemComCalculo);
      } else if (percentualAcima > 10 && percentualAcima <= 25) {
        produtosAtencao.push(itemComCalculo);
      }
    }
  });

  produtosUrgencia.sort((a, b) => a.percentualAcima - b.percentualAcima);
  produtosAtencao.sort((a, b) => a.percentualAcima - b.percentualAcima);

  const valorTotalEstoque = produtos.reduce(
    (acc, p) => acc + Number(p.quantidade || 0) * Number(p.valor_unitario || 0),
    0
  );

  const cardStyle = {
    backgroundColor: '#15171c',
    padding: '22px 24px',
    borderRadius: '12px',
    border: '1px solid rgba(212, 175, 55, 0.45)',
  };

  const panelStyle = {
    backgroundColor: '#15171c',
    padding: '24px',
    borderRadius: '12px',
    border: '1px solid rgba(212, 175, 55, 0.45)',
    display: 'flex',
    flexDirection: 'column',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {erro && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: 'rgba(185, 28, 28, 0.15)',
            color: '#fca5a5',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            borderRadius: '8px',
            fontSize: '14px',
          }}
        >
          {erro}
        </div>
      )}

      {/* CARDS DE RESUMO MINIMALISTAS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
        <div style={cardStyle}>
          <span style={{ fontSize: '13px', color: '#9ca3af', fontWeight: '400' }}>
            Total de Produtos Cadastrados:
          </span>
          <div style={{ fontSize: '30px', fontWeight: '600', color: '#f8fafc', marginTop: '8px' }}>
            {loading ? '...' : produtos.length}
          </div>
        </div>

        <div style={cardStyle}>
          <span style={{ fontSize: '13px', color: '#9ca3af', fontWeight: '400' }}>
            Fornecedores Ativos:
          </span>
          <div style={{ fontSize: '30px', fontWeight: '600', color: '#f8fafc', marginTop: '8px' }}>
            {loading ? '...' : fornecedoresCount}
          </div>
        </div>

        {/* EXIBIDO APENAS PARA ADMIN */}
        {perfilUsuario === 'admin' && (
          <div style={cardStyle}>
            <span style={{ fontSize: '13px', color: '#9ca3af', fontWeight: '400' }}>
              Valor Total em Estoque:
            </span>
            <div style={{ fontSize: '28px', fontWeight: '600', color: '#e5c158', marginTop: '8px' }}>
              {loading
                ? '...'
                : `R$ ${valorTotalEstoque.toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`}
            </div>
          </div>
        )}

        {/* CARD: CONTAGEM DE INVENTÁRIO */}
        <div
          style={{
            ...cardStyle,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '14px',
          }}
        >
          <span style={{ fontSize: '15px', fontWeight: '600', color: '#e5c158', letterSpacing: '0.3px' }}>
            Contagem de Inventário
          </span>

          <select
            value={categoriaInventario}
            onChange={(e) => setCategoriaInventario(e.target.value)}
            disabled={loading}
            style={{
              width: '100%',
              maxWidth: '240px',
              padding: '9px 12px',
              borderRadius: '8px',
              fontSize: '13px',
              textAlign: 'center',
            }}
          >
            <option value="">Categoria</option>
            {categoriasDisponiveis.map((cat, idx) => (
              <option key={idx} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleBaixarContagemInventario}
            disabled={!categoriaInventario || baixandoInventario}
            style={{
              width: '100%',
              maxWidth: '240px',
              padding: '9px 16px',
              background:
                !categoriaInventario || baixandoInventario
                  ? '#272a34'
                  : 'linear-gradient(90deg, #d4af37 0%, #b58e22 100%)',
              color: !categoriaInventario || baixandoInventario ? '#6b7280' : '#0c0d10',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '700',
              cursor: !categoriaInventario || baixandoInventario ? 'not-allowed' : 'pointer',
              transition: 'opacity 0.2s ease',
            }}
          >
            {baixandoInventario ? 'Gerando CSV...' : 'Baixar CSV'}
          </button>
        </div>
      </div>

      {/* PAINÉIS LADO A LADO: URGÊNCIA E ATENÇÃO */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '24px' }}>
        {/* COLUNA 1: PRODUTOS EM URGÊNCIA */}
        <div style={panelStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#f8fafc', letterSpacing: '0.3px' }}>
              PRODUTOS EM URGÊNCIA (≤ 10% do estoque mínimo)
            </h3>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              paddingBottom: '10px',
              borderBottom: '1px solid rgba(212, 175, 55, 0.35)',
              fontSize: '13px',
              color: '#d4af37',
              fontWeight: '500',
            }}
          >
            <span>Item</span>
            <span>Status</span>
          </div>

          {loading ? (
            <div style={{ padding: '24px 0', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>
              Analisando níveis de estoque...
            </div>
          ) : produtosUrgencia.length === 0 ? (
            <div style={{ padding: '24px 0', textAlign: 'center', color: '#6b7280', fontSize: '14px' }}>
              Nenhum produto em urgência no momento.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {produtosUrgencia.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '14px 0',
                    borderBottom: '1px solid rgba(212, 175, 55, 0.15)',
                    gap: '12px',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '14px', color: '#f8fafc', fontWeight: '500' }}>
                      {item.nome}
                    </div>
                    <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>
                      SKU: {item.codigo} · Saldo: {item.quantidade} {item.unidade} (Mín: {item.estoque_minimo})
                    </div>
                  </div>

                  <span
                    style={{
                      padding: '5px 14px',
                      borderRadius: '999px',
                      fontSize: '12px',
                      fontWeight: '600',
                      background: 'linear-gradient(180deg, #991b1b 0%, #7f1d1d 100%)',
                      color: '#fef2f2',
                      border: '1px solid #ef4444',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Urgência ({item.percentualAcima >= 0 ? `+${item.percentualAcima.toFixed(0)}%` : `${item.percentualAcima.toFixed(0)}%`})
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* COLUNA 2: PRODUTOS EM ATENÇÃO */}
        <div style={panelStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#f8fafc', letterSpacing: '0.3px' }}>
              PRODUTOS EM ATENÇÃO (10,01% a 25% do estoque mínimo)
            </h3>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              paddingBottom: '10px',
              borderBottom: '1px solid rgba(212, 175, 55, 0.35)',
              fontSize: '13px',
              color: '#d4af37',
              fontWeight: '500',
            }}
          >
            <span>Item</span>
            <span>Status</span>
          </div>

          {loading ? (
            <div style={{ padding: '24px 0', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>
              Analisando níveis de estoque...
            </div>
          ) : produtosAtencao.length === 0 ? (
            <div style={{ padding: '24px 0', textAlign: 'center', color: '#6b7280', fontSize: '14px' }}>
              Nenhum produto em atenção no momento.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {produtosAtencao.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '14px 0',
                    borderBottom: '1px solid rgba(212, 175, 55, 0.15)',
                    gap: '12px',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '14px', color: '#f8fafc', fontWeight: '500' }}>
                      {item.nome}
                    </div>
                    <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>
                      SKU: {item.codigo} · Saldo: {item.quantidade} {item.unidade} (Mín: {item.estoque_minimo})
                    </div>
                  </div>

                  <span
                    style={{
                      padding: '5px 14px',
                      borderRadius: '999px',
                      fontSize: '12px',
                      fontWeight: '700',
                      background: 'linear-gradient(180deg, #e5c158 0%, #b58e22 100%)',
                      color: '#0c0d10',
                      border: '1px solid #f3d576',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Atenção (+{item.percentualAcima.toFixed(0)}%)
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}