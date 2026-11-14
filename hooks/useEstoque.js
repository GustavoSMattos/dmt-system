import { useState, useEffect } from 'react';
import { estoqueService } from '@/services/estoqueService';

export function useEstoque() {
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  const recarregarEstoque = async () => {
    setLoading(true);
    try {
      const data = await estoqueService.listarProdutos();
      setProdutos(Array.isArray(data) ? data : []);
      setErro('');
    } catch (err) {
      setErro(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    recarregarEstoque();
  }, []);

  return { produtos, loading, erro, recarregarEstoque };
}