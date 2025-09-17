import React, { useState, useEffect } from 'react';
import { apiRequest } from '../utils/queryClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface Cliente {
  id_cliente: number;
  nome: string;
  endereco: string;
  bairro: string;
  dia_semana: string;
  status: string;
  produto: string;
  valor: number;
  dezenas_padrao: number;
  pentes_padrao: number;
  status_pagamento: string;
  data_entrega: string;
}

interface NewSaleRowProps {
  onCancel: () => void;
  isEditMode?: boolean;
  cliente?: Cliente;
}

const NewSaleRow: React.FC<NewSaleRowProps> = ({ onCancel, isEditMode = false, cliente }) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    id_cliente: undefined as number | undefined,
    nome: '',
    endereco: '',
    bairro: '',
    dia_semana: '',
    status: '',
    produto: '',
    valor: 0,
    dezenas_padrao: 0,
    pentes_padrao: 0,
    status_pagamento: '',
    data_entrega: new Date().toISOString().split('T')[0],
  });

  const { data: clientes = [] } = useQuery<Cliente[]>({
    queryKey: ['clientes'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/cliente');
      return res.json();
    },
  });

  useEffect(() => {
    if (isEditMode && cliente && cliente.id_cliente !== undefined) {
      setForm({
        id_cliente: cliente.id_cliente,
        nome: cliente.nome,
        endereco: cliente.endereco,
        bairro: cliente.bairro,
        dia_semana: cliente.dia_semana,
        status: cliente.status,
        produto: cliente.produto,
        valor: cliente.valor,
        dezenas_padrao: cliente.dezenas_padrao,
        pentes_padrao: cliente.pentes_padrao,
        status_pagamento: cliente.status_pagamento,
        data_entrega: cliente.data_entrega.split('T')[0],
      });
    }
  }, [isEditMode, cliente]);

  const handleChange = (field: string, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleClientSelect = async (nome: string) => {
    const encontrado = clientes.find((c) => c.nome.toLowerCase() === nome.toLowerCase());
    if (encontrado) {
      setForm((prev) => ({
        ...prev,
        id_cliente: encontrado.id_cliente,
        nome: encontrado.nome,
        endereco: encontrado.endereco,
        bairro: encontrado.bairro,
        dia_semana: encontrado.dia_semana,
        status: encontrado.status,
        status_pagamento: encontrado.status_pagamento,
      }));
    } else {
      const confirmar = window.confirm(`Cliente \"${nome}\" não encontrado. Deseja cadastrá-lo?`);
      if (confirmar) {
        const novo = {
          nome,
          endereco: '',
          bairro: '',
          dia_semana: 'variavel',
          status: 'defina status do cliente',
          status_pagamento: 'nao_pago',
        };
        const res = await apiRequest('POST', '/cliente', novo);
        const novoCliente = await res.json();
        queryClient.invalidateQueries({ queryKey: ['clientes'] });
        setForm((prev) => ({
          ...prev,
          id_cliente: novoCliente.id_cliente,
          nome: novoCliente.nome,
        }));
      }
    }
  };

  const handleSubmit = async () => {
    try {
      if (isEditMode) {
        if (!form.id_cliente) {
          console.error('ID do cliente não encontrado.');
          return;
        }
        await apiRequest('PATCH', `/cliente/${form.id_cliente}`, form);
      } else {
        await apiRequest('POST', `/cliente`, form);
      }
      onCancel();
    } catch (err) {
      console.error('Erro ao salvar:', err);
    }
  };

  return (
    <div className="grid grid-cols-12 border-b text-sm bg-yellow-50">
      <div className="p-2 border-r">
        <input
          type="date"
          value={form.data_entrega}
          onChange={(e) => handleChange('data_entrega', e.target.value)}
          className="w-full p-1 border rounded text-sm"
        />
      </div>
      <div className="p-2 border-r">
        <input
          list="clientes"
          value={form.nome}
          onChange={(e) => handleChange('nome', e.target.value)}
          onBlur={(e) => handleClientSelect(e.target.value)}
          className="w-full p-1 border rounded text-sm"
          placeholder="Buscar cliente"
        />
        <datalist id="clientes">
          {clientes.map((c) => (
            <option key={c.id_cliente} value={c.nome} />
          ))}
        </datalist>
      </div>
      {[
        'endereco',
        'bairro',
        'dia_semana',
        'status',
        'produto',
        'valor',
        'dezenas_padrao',
        'pentes_padrao',
        'status_pagamento',
      ].map((field) => (
        <div className="p-2 border-r" key={field}>
          <input
            type={['valor', 'dezenas_padrao', 'pentes_padrao'].includes(field) ? 'number' : 'text'}
            value={form[field as keyof typeof form] as string | number}
            onChange={(e) =>
              handleChange(
                field,
                ['valor', 'dezenas_padrao', 'pentes_padrao'].includes(field)
                  ? parseFloat(e.target.value) || 0
                  : e.target.value
              )
            }
            className="w-full p-1 border rounded text-sm"
          />
        </div>
      ))}
      <div className="p-2 flex space-x-1">
        <button
          onClick={handleSubmit}
          className="px-2 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors"
        >
          Salvar
        </button>
        <button
          onClick={onCancel}
          className="px-2 py-1 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
};

export default NewSaleRow;
