'use client';

import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';

export default function CadastrarProdutoTab() {
  const [modo, setModo] = useState('manual'); // 'manual' | 'planilha'
  const [fornecedores, setFornecedores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });

  // Estado do Cadastro Manual
  const [form, setForm] = useState({
    codigo: '',
    nome: '',
    categoria: '',
    unidade: 'UN',
    quantidade: '0',
    valor_unitario: '0',
    estoque_minimo: '0',
    leadtime: '0',
    id_fornecedor: '',
  });

  // Estado da Importação por Planilha
  const [itensPlanilha, setItensPlanilha] = useState([]);
  const [nomeArquivo, setNomeArquivo] = useState('');
  const [resultadoImportacao, setResultadoImportacao] = useState(null);

  useEffect(() => {
    fetch('/api/fornecedores')
      .then((res) => res.json())
      .then((data) => setFornecedores(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const handleChangeManual = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSalvarManual = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMensagem({ tipo: '', texto: '' });

    try {
      const res = await fetch('/api/produtos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao cadastrar produto.');

      setMensagem({ tipo: 'sucesso', texto: 'Produto cadastrado com sucesso!' });
      setForm({
        codigo: '',
        nome: '',
        categoria: '',
        unidade: 'UN',
        quantidade: '0',
        valor_unitario: '0',
        estoque_minimo: '0',
        leadtime: '0',
        id_fornecedor: '',
      });
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setLoading(false);
    }
  };

  // Baixar arquivo modelo .xlsx
  const handleBaixarModelo = () => {
    const dadosModelo = [
      {
        codigo: 'CH-3MM-10',
        nome: 'Chapa de Aço Carbono 3mm',
        categoria: 'Insumos',
        unidade: 'MT',
        quantidade: 25.5,
        valor_unitario: 180.0,
        estoque_minimo: 10,
        leadtime: 5,
        cnpj_fornecedor: '',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(dadosModelo);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Produtos');
    XLSX.writeFile(wb, 'modelo_cadastro_produtos_dmt.xlsx');
  };

  // Ler arquivo .xlsx ou .csv selecionado
  const handleArquivoPlanilha = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setNomeArquivo(file.name);
    setMensagem({ tipo: '', texto: '' });
    setResultadoImportacao(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const primeiraAba = workbook.SheetNames[0];
        const linhas = XLSX.utils.sheet_to_json(workbook.Sheets[primeiraAba], { defval: '' });

        if (linhas.length === 0) {
          setMensagem({ tipo: 'erro', texto: 'A planilha está vazia.' });
          setItensPlanilha([]);
          return;
        }

        // Normaliza nomes das colunas (ignora maiúsculas/espaços)
        const normalizados = linhas
          .map((row) => {
            const obj = {};
            Object.keys(row).forEach((k) => {
              obj[k.trim().toLowerCase()] = row[k];
            });
            return {
              codigo: String(obj.codigo || '').trim(),
              nome: String(obj.nome || '').trim(),
              categoria: String(obj.categoria || 'Geral').trim(),
              unidade: String(obj.unidade || 'UN').trim().toUpperCase(),
              quantidade: parseFloat(String(obj.quantidade || 0).replace(',', '.')) || 0,
              valor_unitario: parseFloat(String(obj.valor_unitario || 0).replace(',', '.')) || 0,
              estoque_minimo: parseFloat(String(obj.estoque_minimo || 0).replace(',', '.')) || 0,
              leadtime: parseInt(obj.leadtime, 10) || 0,
              cnpj_fornecedor: String(obj.cnpj_fornecedor || '').trim(),
            };
          })
          .filter((item) => item.codigo && item.nome);

        if (normalizados.length === 0) {
          setMensagem({
            tipo: 'erro',
            texto: 'Nenhuma linha válida encontrada. Verifique se as colunas "codigo" e "nome" estão preenchidas.',
          });
          setItensPlanilha([]);
          return;
        }

        setItensPlanilha(normalizados);
      } catch {
        setMensagem({ tipo: 'erro', texto: 'Falha ao ler o arquivo. Certifique-se de que é um .xlsx ou .csv válido.' });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleRemoverLinha = (idx) => {
    setItensPlanilha((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleConfirmarPlanilha = async () => {
    if (itensPlanilha.length === 0) return;
    setLoading(true);
    setMensagem({ tipo: '', texto: '' });

    try {
      const res = await fetch('/api/produtos/importar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ produtos: itensPlanilha }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao importar produtos.');

      setResultadoImportacao(data);
      setItensPlanilha([]);
      setNomeArquivo('');
      setMensagem({ tipo: 'sucesso', texto: data.message });
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
      {/* Alternador de Modo */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <h3 style={{ margin: 0, color: '#0f172a' }}>Cadastro de Produtos</h3>
        <div style={{ display: 'flex', gap: '8px', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '8px' }}>
          <button
            type="button"
            onClick={() => { setModo('manual'); setMensagem({ tipo: '', texto: '' }); }}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: '600',
              backgroundColor: modo === 'manual' ? '#0284c7' : 'transparent',
              color: modo === 'manual' ? '#fff' : '#475569',
            }}
          >
            Cadastro Manual
          </button>
          <button
            type="button"
            onClick={() => { setModo('planilha'); setMensagem({ tipo: '', texto: '' }); }}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: '600',
              backgroundColor: modo === 'planilha' ? '#0284c7' : 'transparent',
              color: modo === 'planilha' ? '#fff' : '#475569',
            }}
          >
            Importar Planilha (.xlsx / .csv)
          </button>
        </div>
      </div>

      {mensagem.texto && (
        <div style={{
          padding: '12px',
          borderRadius: '6px',
          marginBottom: '16px',
          backgroundColor: mensagem.tipo === 'sucesso' ? '#dcfce7' : '#fee2e2',
          color: mensagem.tipo === 'sucesso' ? '#15803d' : '#b91c1c',
          fontSize: '14px',
        }}>
          {mensagem.texto}
        </div>
      )}

      {/* MODO 1: CADASTRO MANUAL */}
      {modo === 'manual' && (
        <form onSubmit={handleSalvarManual} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>Código / SKU *</label>
            <input type="text" name="codigo" required value={form.codigo} onChange={handleChangeManual} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>Nome do Produto *</label>
            <input type="text" name="nome" required value={form.nome} onChange={handleChangeManual} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>Categoria *</label>
            <input type="text" name="categoria" required value={form.categoria} onChange={handleChangeManual} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>Unidade *</label>
            <select name="unidade" value={form.unidade} onChange={handleChangeManual} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
              <option value="UN">UN (Unidade)</option>
              <option value="KG">KG (Quilograma)</option>
              <option value="MT">MT (Metro)</option>
              <option value="M2">M2 (Metro Quadrado)</option>
              <option value="LT">LT (Litro)</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>Quantidade Inicial</label>
            <input type="number" step="0.01" min="0" name="quantidade" value={form.quantidade} onChange={handleChangeManual} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>Valor Unitário (R$)</label>
            <input type="number" step="0.01" min="0" name="valor_unitario" value={form.valor_unitario} onChange={handleChangeManual} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>Estoque Mínimo</label>
            <input type="number" step="0.01" min="0" name="estoque_minimo" value={form.estoque_minimo} onChange={handleChangeManual} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>Lead Time (dias)</label>
            <input type="number" min="0" name="leadtime" value={form.leadtime} onChange={handleChangeManual} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>Fornecedor</label>
            <select name="id_fornecedor" value={form.id_fornecedor} onChange={handleChangeManual} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
              <option value="">-- Selecione (Opcional) --</option>
              {fornecedores.map((f) => (
                <option key={f.id} value={f.id}>{f.nome_empresa}</option>
              ))}
            </select>
          </div>
          <div style={{ gridColumn: '1 / -1', marginTop: '8px' }}>
            <button type="submit" disabled={loading} style={{ padding: '12px 24px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
              {loading ? 'Salvando...' : 'Salvar Produto'}
            </button>
          </div>
        </form>
      )}

      {/* MODO 2: IMPORTAÇÃO POR PLANILHA (.XLSX / .CSV) */}
      {modo === 'planilha' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <strong style={{ color: '#0f172a', fontSize: '14px' }}>Colunas esperadas:</strong>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#475569' }}>
                <code>codigo</code>, <code>nome</code>, <code>categoria</code>, <code>unidade</code>, <code>quantidade</code>, <code>valor_unitario</code>, <code>estoque_minimo</code>, <code>leadtime</code>, <code>cnpj_fornecedor</code>
              </p>
            </div>
            <button
              type="button"
              onClick={handleBaixarModelo}
              style={{ padding: '8px 14px', backgroundColor: '#fff', color: '#0284c7', border: '1px solid #0284c7', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}
            >
              Baixar Planilha Modelo (.xlsx)
            </button>
          </div>

          <div style={{ border: '2px dashed #cbd5e1', padding: '28px', borderRadius: '8px', textAlign: 'center', backgroundColor: '#f8fafc', marginBottom: '20px' }}>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleArquivoPlanilha}
              id="planilha-upload"
              style={{ display: 'none' }}
            />
            <label htmlFor="planilha-upload" style={{ cursor: 'pointer', color: '#0284c7', fontWeight: 'bold' }}>
              {nomeArquivo ? `Arquivo carregado: ${nomeArquivo}` : 'Clique para selecionar um arquivo .xlsx ou .csv'}
            </label>
          </div>

          {/* Pré-visualização antes de gravar */}
          {itensPlanilha.length > 0 && (
            <div>
              <h4 style={{ marginBottom: '12px', color: '#0f172a' }}>
                Pré-visualização ({itensPlanilha.length} item(ns) prontos para importar)
              </h4>
              <div style={{ overflowX: 'auto', marginBottom: '16px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f1f5f9', color: '#334155' }}>
                      <th style={{ padding: '8px', border: '1px solid #cbd5e1' }}>Código</th>
                      <th style={{ padding: '8px', border: '1px solid #cbd5e1' }}>Nome</th>
                      <th style={{ padding: '8px', border: '1px solid #cbd5e1' }}>Categoria</th>
                      <th style={{ padding: '8px', border: '1px solid #cbd5e1' }}>Unid.</th>
                      <th style={{ padding: '8px', border: '1px solid #cbd5e1' }}>Qtd</th>
                      <th style={{ padding: '8px', border: '1px solid #cbd5e1' }}>Valor Unit.</th>
                      <th style={{ padding: '8px', border: '1px solid #cbd5e1' }}>Est. Mín.</th>
                      <th style={{ padding: '8px', border: '1px solid #cbd5e1', textAlign: 'center' }}>Remover</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itensPlanilha.map((item, idx) => (
                      <tr key={idx}>
                        <td style={{ padding: '8px', border: '1px solid #e2e8f0' }}>{item.codigo}</td>
                        <td style={{ padding: '8px', border: '1px solid #e2e8f0' }}>{item.nome}</td>
                        <td style={{ padding: '8px', border: '1px solid #e2e8f0' }}>{item.categoria}</td>
                        <td style={{ padding: '8px', border: '1px solid #e2e8f0' }}>{item.unidade}</td>
                        <td style={{ padding: '8px', border: '1px solid #e2e8f0' }}>{item.quantidade}</td>
                        <td style={{ padding: '8px', border: '1px solid #e2e8f0' }}>R$ {item.valor_unitario.toFixed(2)}</td>
                        <td style={{ padding: '8px', border: '1px solid #e2e8f0' }}>{item.estoque_minimo}</td>
                        <td style={{ padding: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleRemoverLinha(idx)}
                            style={{ padding: '4px 8px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                          >
                            X
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                type="button"
                onClick={handleConfirmarPlanilha}
                disabled={loading}
                style={{ padding: '12px 24px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                {loading ? 'Importando...' : `Confirmar e Gravar ${itensPlanilha.length} Produto(s)`}
              </button>
            </div>
          )}

          {/* Resumo pós-importação */}
          {resultadoImportacao?.itens && (
            <div style={{ marginTop: '20px' }}>
              <h4 style={{ color: '#15803d', marginBottom: '8px' }}>Resumo da Importação:</h4>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9' }}>
                    <th style={{ padding: '8px', border: '1px solid #cbd5e1' }}>Código</th>
                    <th style={{ padding: '8px', border: '1px solid #cbd5e1' }}>Produto</th>
                    <th style={{ padding: '8px', border: '1px solid #cbd5e1' }}>Qtd</th>
                    <th style={{ padding: '8px', border: '1px solid #cbd5e1' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {resultadoImportacao.itens.map((it, i) => (
                    <tr key={i}>
                      <td style={{ padding: '8px', border: '1px solid #e2e8f0' }}>{it.codigo}</td>
                      <td style={{ padding: '8px', border: '1px solid #e2e8f0' }}>{it.nome}</td>
                      <td style={{ padding: '8px', border: '1px solid #e2e8f0' }}>{it.quantidade}</td>
                      <td style={{ padding: '8px', border: '1px solid #e2e8f0', fontWeight: 'bold' }}>{it.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}