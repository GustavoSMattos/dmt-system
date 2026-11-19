'use client';

import { useState, useEffect } from 'react';

export default function BomTrailersTab() {
  const [boms, setBoms] = useState([]);
  const [itensCatalogo, setItensCatalogo] = useState([]); // Produtos + Serviços unificados
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });

  const [categoriaFiltro, setCategoriaFiltro] = useState('');
  const [buscaTexto, setBuscaTexto] = useState('');
  const [bomExpandidaId, setBomExpandidaId] = useState(null);

  const [modoEdicao, setModoEdicao] = useState(false);
  const [bomEditandoId, setBomEditandoId] = useState(null);
  const [form, setForm] = useState({
    nome: '',
    categoria: '',
    descricao: '',
  });
  const [componentesForm, setComponentesForm] = useState([
    { id_item: '', tipo: '', termoBusca: '', dropdownAberto: false, quantidade_necessaria: 1 },
  ]);

  const [bomParaConfirmarEdicao, setBomParaConfirmarEdicao] = useState(null);
  const [nomeDigitadoConfirmacao, setNomeDigitadoConfirmacao] = useState('');

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [resBoms, resProds, resServs] = await Promise.all([
        fetch('/api/trailers'),
        fetch('/api/produtos'),
        fetch('/api/servicos'),
      ]);

      const dataBoms = await resBoms.json();
      const dataProds = await resProds.json();
      const dataServs = await resServs.json();

      if (resBoms.ok) setBoms(Array.isArray(dataBoms) ? dataBoms : []);

      const listaProdutos = (resProds.ok && Array.isArray(dataProds) ? dataProds : []).map((p) => ({
        id: p.id,
        tipo: 'PRODUTO',
        codigo: p.codigo,
        nome: p.nome,
        unidade: p.unidade,
        valor: Number(p.valor_unitario || 0),
        saldo: Number(p.quantidade || 0),
      }));

      const listaServicos = (resServs.ok && Array.isArray(dataServs) ? dataServs : []).map((s) => ({
        id: s.id,
        tipo: 'SERVICO',
        codigo: s.codigo,
        nome: s.nome,
        unidade: s.unidade,
        valor: Number(s.valor || 0),
        saldo: null,
      }));

      setItensCatalogo([...listaProdutos, ...listaServicos]);
    } catch {
      setMensagem({ tipo: 'erro', texto: 'Erro ao carregar dados de BOM, produtos e serviços.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const categoriasCadastradas = Array.from(new Set(boms.map((b) => b.categoria).filter(Boolean))).sort();

  const bomsFiltradas = boms.filter((bom) => {
    const bateCategoria = categoriaFiltro ? bom.categoria === categoriaFiltro : true;
    const bateNome = bom.nome?.toLowerCase().includes(buscaTexto.toLowerCase());
    return bateCategoria && bateNome;
  });

  const handleAddComponente = () => {
    setComponentesForm([
      ...componentesForm,
      { id_item: '', tipo: '', termoBusca: '', dropdownAberto: false, quantidade_necessaria: 1 },
    ]);
  };

  const handleRemoveComponente = (index) => {
    const novaLista = componentesForm.filter((_, i) => i !== index);
    setComponentesForm(
      novaLista.length > 0
        ? novaLista
        : [{ id_item: '', tipo: '', termoBusca: '', dropdownAberto: false, quantidade_necessaria: 1 }]
    );
  };

  const handleBuscaComponenteChange = (index, texto) => {
    const novaLista = [...componentesForm];
    novaLista[index].termoBusca = texto;
    novaLista[index].id_item = '';
    novaLista[index].tipo = '';
    novaLista[index].dropdownAberto = true;
    setComponentesForm(novaLista);
  };

  const handleSelecionarComponente = (index, item) => {
    const novaLista = [...componentesForm];
    novaLista[index].id_item = item.id;
    novaLista[index].tipo = item.tipo;
    novaLista[index].termoBusca = `[${item.tipo === 'SERVICO' ? 'SERVIÇO' : 'PRODUTO'}] ${item.codigo} - ${item.nome} (${item.unidade})`;
    novaLista[index].dropdownAberto = false;
    setComponentesForm(novaLista);
  };

  const handleComponenteChange = (index, field, value) => {
    const novaLista = [...componentesForm];
    novaLista[index][field] = value;
    setComponentesForm(novaLista);
  };

  const handleSalvarBom = async (e) => {
    e.preventDefault();
    setMensagem({ tipo: '', texto: '' });

    const itemInvalido = componentesForm.find((comp) => !comp.id_item || !comp.tipo);
    if (itemInvalido) {
      return setMensagem({
        tipo: 'erro',
        texto: 'Selecione um produto ou serviço válido da lista suspensa para todos os itens antes de salvar a BOM.',
      });
    }

    setSalvando(true);
    try {
      const metodo = modoEdicao ? 'PUT' : 'POST';
      const payload = {
        ...(modoEdicao && { id: bomEditandoId }),
        nome: form.nome,
        categoria: form.categoria.trim(),
        descricao: form.descricao,
        componentes: componentesForm.map((comp) => ({
          id_item: comp.id_item,
          tipo: comp.tipo,
          quantidade_necessaria: comp.quantidade_necessaria,
        })),
      };

      const res = await fetch('/api/trailers', {
        method: metodo,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar estrutura BOM.');

      setMensagem({
        tipo: 'sucesso',
        texto: modoEdicao ? `BOM "${data.nome}" atualizada com sucesso!` : `BOM "${data.nome}" cadastrada com sucesso!`,
      });

      cancelarEdicao();
      carregarDados();
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setSalvando(false);
    }
  };

  const solicitarConfirmacaoEdicao = (bom) => {
    setBomParaConfirmarEdicao(bom);
    setNomeDigitadoConfirmacao('');
  };

  const confirmarEAbrirEdicao = () => {
    if (!bomParaConfirmarEdicao || nomeDigitadoConfirmacao !== bomParaConfirmarEdicao.nome) return;

    const bom = bomParaConfirmarEdicao;
    setModoEdicao(true);
    setBomEditandoId(bom.id);
    setForm({
      nome: bom.nome,
      categoria: bom.categoria,
      descricao: bom.descricao || '',
    });

    const itensMapeados = (bom.trailer_componentes || []).map((tc) => {
      if (tc.id_servico || tc.servicos) {
        const serv = tc.servicos || itensCatalogo.find((i) => i.tipo === 'SERVICO' && i.id === tc.id_servico);
        const rotulo = serv ? `[SERVIÇO] ${serv.codigo} - ${serv.nome} (${serv.unidade})` : '';
        return {
          id_item: tc.id_servico,
          tipo: 'SERVICO',
          termoBusca: rotulo,
          dropdownAberto: false,
          quantidade_necessaria: tc.quantidade_necessaria,
        };
      } else {
        const prod = tc.produtos || itensCatalogo.find((i) => i.tipo === 'PRODUTO' && i.id === tc.id_produto);
        const rotulo = prod ? `[PRODUTO] ${prod.codigo} - ${prod.nome} (${prod.unidade})` : '';
        return {
          id_item: tc.id_produto,
          tipo: 'PRODUTO',
          termoBusca: rotulo,
          dropdownAberto: false,
          quantidade_necessaria: tc.quantidade_necessaria,
        };
      }
    });

    setComponentesForm(
      itensMapeados.length > 0
        ? itensMapeados
        : [{ id_item: '', tipo: '', termoBusca: '', dropdownAberto: false, quantidade_necessaria: 1 }]
    );

    setBomParaConfirmarEdicao(null);
    setNomeDigitadoConfirmacao('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelarEdicao = () => {
    setModoEdicao(false);
    setBomEditandoId(null);
    setForm({ nome: '', categoria: '', descricao: '' });
    setComponentesForm([{ id_item: '', tipo: '', termoBusca: '', dropdownAberto: false, quantidade_necessaria: 1 }]);
  };

  const handleBaixarCSV = (bom) => {
    const linhas = [
      ['BOM', 'Categoria', 'Descricao', 'Tipo', 'Codigo', 'Item', 'Unidade', 'Qtd_Necessaria', 'Valor_Unitario', 'Subtotal'],
    ];

    (bom.trailer_componentes || []).forEach((item) => {
      const isServico = Boolean(item.id_servico || item.servicos);
      const dadosItem = isServico ? item.servicos || {} : item.produtos || {};
      const qtd = Number(item.quantidade_necessaria || 0);
      const valUnit = Number(isServico ? dadosItem.valor || 0 : dadosItem.valor_unitario || 0);
      const subtotal = (qtd * valUnit).toFixed(2);

      linhas.push([
        `"${bom.nome}"`,
        `"${bom.categoria}"`,
        `"${(bom.descricao || '').replace(/"/g, '""')}"`,
        `"${isServico ? 'SERVICO' : 'PRODUTO'}"`,
        `"${dadosItem.codigo || ''}"`,
        `"${dadosItem.nome || ''}"`,
        `"${dadosItem.unidade || ''}"`,
        qtd.toString().replace('.', ','),
        valUnit.toFixed(2).replace('.', ','),
        subtotal.replace('.', ','),
      ]);
    });

    const csvContent = '\uFEFF' + linhas.map((e) => e.join(';')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `BOM_${bom.nome.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* FORMULÁRIO DE CADASTRO / EDIÇÃO DE BOM */}
      <div style={{ backgroundColor: '#15171c', padding: '24px', borderRadius: '12px', border: modoEdicao ? '2px solid #d4af37' : '1px solid rgba(212, 175, 55, 0.4)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h3 style={{ color: '#f8fafc', margin: 0, fontSize: '18px' }}>
            {modoEdicao ? `Editando Estrutura BOM: ${form.nome}` : 'Cadastrar Nova Estrutura BOM'}
          </h3>
          {modoEdicao && (
            <button
              type="button"
              onClick={cancelarEdicao}
              style={{ padding: '6px 12px', backgroundColor: '#1e2028', color: '#d1d5db', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}
            >
              Cancelar Edição
            </button>
          )}
        </div>
        <p style={{ color: '#9ca3af', marginBottom: '20px', fontSize: '14px' }}>
          Defina o nome, a categoria e busque os produtos ou serviços cadastrados pelo código ou nome.
        </p>

        {mensagem.texto && (
          <div
            style={{
              padding: '12px',
              borderRadius: '6px',
              marginBottom: '16px',
              backgroundColor: mensagem.tipo === 'sucesso' ? 'rgba(22, 163, 74, 0.15)' : 'rgba(185, 28, 28, 0.15)',
              color: mensagem.tipo === 'sucesso' ? '#4ade80' : '#fca5a5',
              border: `1px solid ${mensagem.tipo === 'sucesso' ? 'rgba(74, 222, 128, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
              fontSize: '14px',
            }}
          >
            {mensagem.texto}
          </div>
        )}

        <form onSubmit={handleSalvarBom}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#d1d5db' }}>
                Nome da BOM *
              </label>
              <input
                type="text"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                placeholder="Ex: Trailer Modelo Standard 2 Eixos"
                required
                style={{ width: '100%', padding: '10px', borderRadius: '6px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#d1d5db' }}>
                Categoria da BOM *
              </label>
              <input
                type="text"
                list="categorias-bom-list"
                value={form.categoria}
                onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                placeholder="Digite ou selecione uma categoria..."
                required
                style={{ width: '100%', padding: '10px', borderRadius: '6px' }}
              />
              <datalist id="categorias-bom-list">
                {categoriasCadastradas.map((cat, i) => (
                  <option key={i} value={cat} />
                ))}
              </datalist>
            </div>

            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#d1d5db' }}>
                Descrição / Especificações Técnicas
              </label>
              <textarea
                rows="2"
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                placeholder="Detalhes construtivos, dimensões ou observações da BOM..."
                style={{ width: '100%', padding: '10px', borderRadius: '6px', resize: 'vertical' }}
              />
            </div>
          </div>

          <h4 style={{ marginBottom: '12px', color: '#e5c158', fontSize: '15px' }}>Componentes e Serviços da Estrutura</h4>
          {itensCatalogo.length === 0 ? (
            <p style={{ color: '#6b7280', fontSize: '14px' }}>Cadastre produtos ou serviços antes de montar uma BOM.</p>
          ) : (
            <div>
              {componentesForm.map((comp, index) => {
                const termo = comp.termoBusca.trim().toLowerCase();
                const sugestoes = itensCatalogo.filter(
                  (item) =>
                    item.codigo?.toLowerCase().includes(termo) ||
                    item.nome?.toLowerCase().includes(termo) ||
                    item.tipo?.toLowerCase().includes(termo)
                );

                return (
                  <div key={index} style={{ display: 'flex', gap: '12px', marginBottom: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ flex: 3, minWidth: '280px', position: 'relative' }}>
                      <input
                        type="text"
                        placeholder="Digite o código ou nome do produto ou serviço..."
                        value={comp.termoBusca}
                        onChange={(e) => handleBuscaComponenteChange(index, e.target.value)}
                        onFocus={() => handleComponenteChange(index, 'dropdownAberto', true)}
                        onBlur={() => {
                          setTimeout(() => handleComponenteChange(index, 'dropdownAberto', false), 180);
                        }}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: '6px',
                          border: comp.id_item ? '1px solid #d4af37' : undefined,
                          fontSize: '14px',
                        }}
                      />

                      {comp.dropdownAberto && (
                        <div
                          style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            right: 0,
                            maxHeight: '240px',
                            overflowY: 'auto',
                            backgroundColor: '#111216',
                            border: '1px solid rgba(212, 175, 55, 0.45)',
                            borderRadius: '6px',
                            boxShadow: '0 8px 20px rgba(0,0,0,0.6)',
                            zIndex: 50,
                            marginTop: '4px',
                          }}
                        >
                          {sugestoes.length === 0 ? (
                            <div style={{ padding: '10px 12px', fontSize: '13px', color: '#6b7280' }}>
                              Nenhum produto ou serviço encontrado para "{comp.termoBusca}".
                            </div>
                          ) : (
                            sugestoes.map((item) => {
                              const isServ = item.tipo === 'SERVICO';
                              return (
                                <div
                                  key={`${item.tipo}-${item.id}`}
                                  onMouseDown={() => handleSelecionarComponente(index, item)}
                                  style={{
                                    padding: '10px 12px',
                                    cursor: 'pointer',
                                    borderBottom: '1px solid rgba(212, 175, 55, 0.12)',
                                    fontSize: '13px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    color: '#f8fafc',
                                  }}
                                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1e2028')}
                                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                >
                                  <span>
                                    <span
                                      style={{
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        fontSize: '10px',
                                        fontWeight: 'bold',
                                        marginRight: '8px',
                                        backgroundColor: isServ ? 'rgba(56, 189, 248, 0.2)' : 'rgba(212, 175, 55, 0.2)',
                                        color: isServ ? '#7dd3fc' : '#e5c158',
                                      }}
                                    >
                                      {isServ ? 'SERVIÇO' : 'PRODUTO'}
                                    </span>
                                    <strong style={{ color: '#e5c158', fontFamily: 'monospace' }}>
                                      {item.codigo}
                                    </strong>{' '}
                                    - {item.nome} ({item.unidade})
                                  </span>
                                  <span style={{ color: '#9ca3af', fontSize: '12px', marginLeft: '8px' }}>
                                    {isServ
                                      ? `Valor: R$ ${item.valor.toFixed(2)}`
                                      : `Saldo: ${item.saldo} ${item.unidade}`}
                                  </span>
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>

                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={comp.quantidade_necessaria}
                      onChange={(e) => handleComponenteChange(index, 'quantidade_necessaria', e.target.value)}
                      placeholder="Qtd"
                      required
                      style={{ width: '130px', padding: '10px', borderRadius: '6px' }}
                    />

                    {componentesForm.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveComponente(index)}
                        style={{ padding: '10px 14px', backgroundColor: '#991b1b', color: '#fff', border: '1px solid #ef4444', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                      >
                        X
                      </button>
                    )}
                  </div>
                );
              })}

              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={handleAddComponente}
                  style={{ padding: '10px 16px', backgroundColor: '#1e2028', color: '#e5c158', border: '1px solid rgba(212, 175, 55, 0.4)', borderRadius: '6px', cursor: 'pointer' }}
                >
                  + Adicionar Item
                </button>
                <button
                  type="submit"
                  disabled={salvando}
                  style={{ padding: '10px 24px', background: 'linear-gradient(90deg, #d4af37 0%, #b58e22 100%)', color: '#0c0d10', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: salvando ? 'not-allowed' : 'pointer' }}
                >
                  {salvando ? 'Salvando...' : modoEdicao ? 'Salvar Alterações da BOM' : 'Cadastrar BOM'}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>

      {/* LISTAGEM E FILTRO DE BOMs */}
      <div style={{ backgroundColor: '#15171c', padding: '24px', borderRadius: '12px', border: '1px solid rgba(212, 175, 55, 0.4)' }}>
        <h3 style={{ marginBottom: '16px', color: '#f8fafc', fontSize: '18px' }}>Estruturas BOM Cadastradas</h3>

        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
          <input
            type="text"
            placeholder="Buscar BOM por nome..."
            value={buscaTexto}
            onChange={(e) => setBuscaTexto(e.target.value)}
            style={{ flex: 2, padding: '10px 14px', borderRadius: '6px', fontSize: '14px' }}
          />

          <select
            value={categoriaFiltro}
            onChange={(e) => setCategoriaFiltro(e.target.value)}
            style={{ flex: 1, padding: '10px 14px', borderRadius: '6px', fontSize: '14px' }}
          >
            <option value="">Todas as Categorias Cadastradas</option>
            {categoriasCadastradas.map((cat, idx) => (
              <option key={idx} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#9ca3af' }}>Carregando estruturas BOM...</div>
        ) : bomsFiltradas.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>Nenhuma BOM encontrada.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {bomsFiltradas.map((bom) => {
              const estaExpandida = bomExpandidaId === bom.id;
              const itens = bom.trailer_componentes || [];
              const custoTotalBom = itens.reduce((acc, item) => {
                const isServ = Boolean(item.id_servico || item.servicos);
                const val = Number(isServ ? item.servicos?.valor || 0 : item.produtos?.valor_unitario || 0);
                return acc + val * Number(item.quantidade_necessaria || 0);
              }, 0);

              return (
                <div key={bom.id} style={{ border: '1px solid rgba(212, 175, 55, 0.35)', borderRadius: '8px', overflow: 'hidden' }}>
                  <div style={{ padding: '16px', backgroundColor: '#111216', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontWeight: 'bold', fontSize: '16px', color: '#f8fafc' }}>{bom.nome}</span>
                        <span style={{ backgroundColor: 'rgba(212, 175, 55, 0.15)', color: '#e5c158', border: '1px solid rgba(212, 175, 55, 0.4)', padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '600' }}>
                          {bom.categoria}
                        </span>
                      </div>
                      <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#9ca3af' }}>
                        {itens.length} item(ns) | Custo Estimado Total: <strong style={{ color: '#e5c158' }}>R$ {custoTotalBom.toFixed(2)}</strong>
                      </p>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => setBomExpandidaId(estaExpandida ? null : bom.id)}
                        style={{ padding: '8px 14px', backgroundColor: '#1e2028', color: '#f8fafc', border: '1px solid rgba(212, 175, 55, 0.4)', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}
                      >
                        {estaExpandida ? 'Recolher' : 'Expandir BOM'}
                      </button>

                      <button
                        type="button"
                        onClick={() => solicitarConfirmacaoEdicao(bom)}
                        style={{ padding: '8px 14px', backgroundColor: '#d4af37', color: '#0c0d10', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '700' }}
                      >
                        Editar BOM
                      </button>

                      <button
                        type="button"
                        onClick={() => handleBaixarCSV(bom)}
                        style={{ padding: '8px 14px', backgroundColor: 'rgba(22, 163, 74, 0.2)', color: '#4ade80', border: '1px solid rgba(74, 222, 128, 0.5)', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}
                      >
                        Baixar CSV
                      </button>
                    </div>
                  </div>

                  {estaExpandida && (
                    <div style={{ padding: '20px', backgroundColor: '#15171c', borderTop: '1px solid rgba(212, 175, 55, 0.25)' }}>
                      {bom.descricao && (
                        <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#111216', borderRadius: '6px', fontSize: '14px', color: '#d1d5db', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
                          <strong style={{ color: '#e5c158' }}>Descrição:</strong> {bom.descricao}
                        </div>
                      )}

                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                          <thead>
                            <tr style={{ backgroundColor: '#111216', color: '#d4af37', fontSize: '13px' }}>
                              <th style={{ padding: '10px', borderBottom: '1px solid rgba(212, 175, 55, 0.35)' }}>Tipo</th>
                              <th style={{ padding: '10px', borderBottom: '1px solid rgba(212, 175, 55, 0.35)' }}>Código</th>
                              <th style={{ padding: '10px', borderBottom: '1px solid rgba(212, 175, 55, 0.35)' }}>Item (Produto / Serviço)</th>
                              <th style={{ padding: '10px', borderBottom: '1px solid rgba(212, 175, 55, 0.35)' }}>Qtd Necessária</th>
                              <th style={{ padding: '10px', borderBottom: '1px solid rgba(212, 175, 55, 0.35)' }}>Disponibilidade</th>
                              <th style={{ padding: '10px', borderBottom: '1px solid rgba(212, 175, 55, 0.35)' }}>Custo Unit.</th>
                              <th style={{ padding: '10px', borderBottom: '1px solid rgba(212, 175, 55, 0.35)' }}>Subtotal</th>
                            </tr>
                          </thead>
                          <tbody>
                            {itens.map((item) => {
                              const isServ = Boolean(item.id_servico || item.servicos);
                              const dados = isServ ? item.servicos || {} : item.produtos || {};
                              const qtdNec = Number(item.quantidade_necessaria || 0);
                              const valUnit = Number(isServ ? dados.valor || 0 : dados.valor_unitario || 0);
                              const saldoAtual = isServ ? null : Number(dados.quantidade || 0);
                              const faltaEstoque = !isServ && saldoAtual < qtdNec;

                              return (
                                <tr key={item.id} style={{ borderBottom: '1px solid rgba(212, 175, 55, 0.12)', fontSize: '14px' }}>
                                  <td style={{ padding: '10px' }}>
                                    <span
                                      style={{
                                        padding: '2px 7px',
                                        borderRadius: '4px',
                                        fontSize: '11px',
                                        fontWeight: 'bold',
                                        backgroundColor: isServ ? 'rgba(56, 189, 248, 0.15)' : 'rgba(212, 175, 55, 0.15)',
                                        color: isServ ? '#7dd3fc' : '#e5c158',
                                      }}
                                    >
                                      {isServ ? 'SERVIÇO' : 'PRODUTO'}
                                    </span>
                                  </td>
                                  <td style={{ padding: '10px', fontFamily: 'monospace', color: '#e5c158', fontWeight: 'bold' }}>
                                    {dados.codigo}
                                  </td>
                                  <td style={{ padding: '10px', color: '#f8fafc' }}>{dados.nome}</td>
                                  <td style={{ padding: '10px', fontWeight: 'bold', color: '#e2e8f0' }}>
                                    {qtdNec} {dados.unidade}
                                  </td>
                                  <td style={{ padding: '10px', fontWeight: 'bold', color: isServ ? '#7dd3fc' : faltaEstoque ? '#f87171' : '#4ade80' }}>
                                    {isServ
                                      ? 'Serviço sob demanda'
                                      : `${saldoAtual} ${dados.unidade}${faltaEstoque ? ' (Insuficiente)' : ''}`}
                                  </td>
                                  <td style={{ padding: '10px', color: '#9ca3af' }}>R$ {valUnit.toFixed(2)}</td>
                                  <td style={{ padding: '10px', fontWeight: 'bold', color: '#e5c158' }}>
                                    R$ {(qtdNec * valUnit).toFixed(2)}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL DE CONFIRMAÇÃO PARA INICIAR EDIÇÃO DA BOM */}
      {bomParaConfirmarEdicao && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ backgroundColor: '#15171c', border: '1px solid rgba(212, 175, 55, 0.5)', padding: '24px', borderRadius: '10px', width: '100%', maxWidth: '450px', color: '#f8fafc' }}>
            <h4 style={{ margin: '0 0 12px 0', color: '#e5c158' }}>Confirmar Edição da BOM</h4>
            <p style={{ fontSize: '14px', color: '#d1d5db', marginBottom: '12px' }}>
              Para liberar a edição desta estrutura BOM, digite o nome exato abaixo:
            </p>
            <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#e5c158', backgroundColor: '#0e1014', padding: '8px', borderRadius: '4px', border: '1px solid rgba(212, 175, 55, 0.3)', marginBottom: '12px', userSelect: 'all' }}>
              {bomParaConfirmarEdicao.nome}
            </p>

            <input
              type="text"
              placeholder="Digite o nome exato da BOM..."
              value={nomeDigitadoConfirmacao}
              onChange={(e) => setNomeDigitadoConfirmacao(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '4px', marginBottom: '20px', fontSize: '14px' }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setBomParaConfirmarEdicao(null)}
                style={{ padding: '8px 16px', backgroundColor: '#1e2028', color: '#d1d5db', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '4px', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarEAbrirEdicao}
                disabled={nomeDigitadoConfirmacao !== bomParaConfirmarEdicao.nome}
                style={{
                  padding: '8px 16px',
                  backgroundColor: nomeDigitadoConfirmacao === bomParaConfirmarEdicao.nome ? '#d4af37' : '#3f3f46',
                  color: nomeDigitadoConfirmacao === bomParaConfirmarEdicao.nome ? '#0c0d10' : '#9ca3af',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: nomeDigitadoConfirmacao === bomParaConfirmarEdicao.nome ? 'pointer' : 'not-allowed',
                  fontWeight: 'bold',
                }}
              >
                Iniciar Edição
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}