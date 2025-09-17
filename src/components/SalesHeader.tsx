import React, { useEffect, useState } from 'react';
import { Plus, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { useSalesContext } from '../context/SalesContext';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import moment from 'moment-timezone';
import { apiRequest } from '../utils/queryClient';
import { useQueryClient } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import { ptBR } from 'date-fns/locale';

interface SalesHeaderProps {
  onAddNew: () => void;
}

const SalesHeader: React.FC<SalesHeaderProps> = ({ onAddNew }) => {
  const {
    selectedDate,
    setSelectedDate,
    filterMode,
    setFilterMode,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
  } = useSalesContext();

  const queryClient = useQueryClient();
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isCreatingWeek, setIsCreatingWeek] = useState(false);
  const [modalMessage, setModalMessage] = useState('');

  useEffect(() => {
    if (!selectedDate) {
      const hojeBrasilia = moment().tz('America/Sao_Paulo').startOf('day');
      setSelectedDate(hojeBrasilia.format('YYYY-MM-DD'));
    }
  }, [selectedDate, setSelectedDate]);

  const handleCreateWeek = () => {
    setShowConfirmModal(true);
  };

  const handleConfirmCreateWeek = async () => {
    setShowConfirmModal(false);
    setIsCreatingWeek(true);
    
    try {
     
      const res = await apiRequest('POST', `/vendas/criar-semana?startDate=${selectedDate}`);
      
      if (res.ok) {
        const responseData = await res.json();
        await queryClient.invalidateQueries({ queryKey: ['vendas'] });
        
        setModalMessage(
          `✅ Sucesso!\n\n${responseData.message || 'Vendas criadas com sucesso!'}\n\n` +
          `Total de vendas criadas: ${responseData.total || 0}`
        );
        setShowSuccessModal(true);
      } else {
        const errorData = await res.json().catch(() => ({}));
        setModalMessage(
          `❌ Erro ao criar semana:\n\n${errorData.message || 'Erro desconhecido'}`
        );
        setShowSuccessModal(true);
      }
    } catch (error: any) {
      console.error('Erro ao criar semana:', error);
      setModalMessage(
        `❌ Erro ao criar semana:\n\n${error.message || 'Erro de conexão'}`
      );
      setShowSuccessModal(true);
    } finally {
      setIsCreatingWeek(false);
    }
  };

  const handleExportToExcel = () => {
    const vendasParaExportar: any[] = queryClient.getQueryData(['vendas']) || [];

    const vendasFiltradas = vendasParaExportar.filter((venda) => {
      const vendaDate = moment(venda.dataVenda).tz('America/Sao_Paulo').format('YYYY-MM-DD');
      if (filterMode === 'day') return vendaDate === selectedDate;
      if (filterMode === 'week') return vendaDate >= startDate && vendaDate <= endDate;
      return false;
    });

   
    const rows: any[] = [];
    vendasFiltradas.forEach((venda) => {
      (venda.itens || []).forEach((item: any) => {
        
        let valorTotal = 0;
        if (item.precoTotal !== undefined && !isNaN(Number(item.precoTotal))) {
          valorTotal = Number(item.precoTotal);
        } else {
          
          const valorUnitario = Number(
            item.preco_unitario ??
            item.valor_unitario ??
            item.produto?.valor_unitario ??
            item.produto?.preco_unitario ??
            0
          );
          const quantidade = Number(item.quantidade ?? 0);
          valorTotal = valorUnitario * quantidade;
        }
        rows.push({
          'Data': moment.tz(venda.dataVenda, 'America/Sao_Paulo').format('DD/MM/YYYY'),
          'Cliente': venda.cliente?.nome || '',
          'Endereço': venda.cliente?.endereco || '',
          'Bairro': venda.cliente?.bairro || '',
          'Dia': venda.cliente?.dia_semana || '',
          'Tipo': venda.cliente?.status || '',
          'Produto': item.produto?.nomeProduto || 'Produto desconhecido',
          'Quantidade': item.quantidade ?? '',
          'Grandeza': item.unidade ?? '',
          'Valor Total': valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
          'Pagamento': venda.statusPagamento || '',
          'Data Pagamento': venda.dataPagamento ? moment.tz(venda.dataPagamento, 'America/Sao_Paulo').format('DD/MM/YYYY') : '',
          'Observações': venda.observacoes || '',
        });
      });
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Vendas');
    XLSX.writeFile(wb, `Vendas_${filterMode}_${moment().format('YYYYMMDD_HHmmss')}.xlsx`);
  };

  const parsedDate = moment.tz(selectedDate, 'YYYY-MM-DD', 'America/Sao_Paulo').toDate();
  const parsedStart = moment.tz(startDate, 'YYYY-MM-DD', 'America/Sao_Paulo').toDate();
  const parsedEnd = moment.tz(endDate, 'YYYY-MM-DD', 'America/Sao_Paulo').toDate();

  const handlePreviousDay = () => {
    const novaData = moment(parsedDate).subtract(1, 'day').tz('America/Sao_Paulo');
    setSelectedDate(novaData.format('YYYY-MM-DD'));
  };

  const handleNextDay = () => {
    const novaData = moment(parsedDate).add(1, 'day').tz('America/Sao_Paulo');
    setSelectedDate(novaData.format('YYYY-MM-DD'));
  };

  const handleFilterModeChange = (mode: 'day' | 'week') => {
    setFilterMode(mode);
  };

  const vendas: any[] = queryClient.getQueryData(['vendas']) || [];
  let vendasFiltradas: any[] = [];
  if (filterMode === 'day') {
    vendasFiltradas = vendas.filter((venda) => {
      const vendaDate = moment(venda.dataVenda).tz('America/Sao_Paulo').format('YYYY-MM-DD');
      return vendaDate === selectedDate;
    });
  } else if (filterMode === 'week') {
    vendasFiltradas = vendas.filter((venda) => {
      const vendaDate = moment(venda.dataVenda).tz('America/Sao_Paulo').format('YYYY-MM-DD');
      return vendaDate >= startDate && vendaDate <= endDate;
    });
  }

  const totalVendas = vendasFiltradas.length;

  const totalFaturamento = vendasFiltradas.reduce((acc, v) => acc + (Number(v.valorTotal) || 0), 0);
  
  const totalRecebido = vendasFiltradas
    .filter((v) => String(v.statusPagamento).toLowerCase() === 'pago')
    .reduce((acc, v) => acc + (Number(v.valorTotal) || 0), 0);
  
  const totalAReceber = vendasFiltradas
    .filter((v) => ['pendente', 'parcial'].includes(String(v.statusPagamento).toLowerCase()))
    .reduce((acc, v) => acc + (Number(v.valorTotal) || 0), 0);

  return (
    <>
   
      <div className="flex flex-wrap gap-4 items-center p-2 bg-gray-50 border-b text-sm mb-2">
      <div className="flex flex-col items-center px-2">
        <span className="text-xs text-gray-500">Total de vendas</span>
        <span className="font-bold text-lg text-gray-800">{totalVendas}</span>
      </div>
      <div className="flex flex-col items-center px-2">
        <span className="text-xs text-gray-500">Faturamento (todas)</span>
        <span className="font-bold text-lg text-blue-700">R$ {totalFaturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
      </div>
      <div className="flex flex-col items-center px-2">
        <span className="text-xs text-gray-500">Recebimento (pagas)</span>
        <span className="font-bold text-lg text-green-700">R$ {totalRecebido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
      </div>
      <div className="flex flex-col items-center px-2">
        <span className="text-xs text-gray-500">A receber (pendente/parcial)</span>
        <span className="font-bold text-lg text-yellow-700">R$ {totalAReceber.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
      </div>
      </div>
      <div className="flex justify-between flex-wrap gap-2 items-center p-2 bg-white border-b text-sm">

   
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onAddNew}
            className="flex items-center px-2 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-xs"
          >
            <Plus size={14} className="mr-1" />
            Nova Venda
          </button>

          <button
            onClick={handleCreateWeek}
            className="flex items-center px-2 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
          >
            Criar Semana
          </button>

          <button
            onClick={handleExportToExcel}
            className="flex items-center px-2 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-xs"
          >
            <Download size={14} className="mr-1" />
            Exportar Excel
          </button>

          <button
            onClick={() => handleFilterModeChange('day')}
            className={`px-2 py-2 rounded text-xs ${filterMode === 'day' ? 'bg-green-700 text-white' : 'bg-gray-200'}`}
          >
            Dia
          </button>

          <button
            onClick={() => handleFilterModeChange('week')}
            className={`px-2 py-2 rounded text-xs ${filterMode === 'week' ? 'bg-green-700 text-white' : 'bg-gray-200'}`}
          >
            Período
          </button>
        </div>

       
        <div className="flex items-center gap-1">
          {filterMode === 'day' && (
            <>
              <button onClick={handlePreviousDay} className="p-1 rounded hover:bg-gray-100 border text-xs">
                <ChevronLeft size={14} />
              </button>
             <DatePicker
  selected={parsedDate}
  onChange={(date: Date | null) => {
    if (date) {
      const dataBrasilia = moment(date).tz('America/Sao_Paulo');
      setSelectedDate(dataBrasilia.format('YYYY-MM-DD'));
    }
  }}
  dateFormat="dd/MM/yyyy"
  locale={ptBR}
  popperContainer={({ children }) => <div>{children}</div>}

  popperClassName="z-50"
  className="border rounded px-2 py-1 text-xs w-[100px] text-center"
/>

              <button onClick={handleNextDay} className="p-1 rounded hover:bg-gray-100 border text-xs">
                <ChevronRight size={14} />
              </button>
            </>
          )}

          {filterMode === 'week' && (
  <div className="flex items-center gap-1 text-xs text-gray-600">
    <span>De:</span>
    <DatePicker
      selected={parsedStart}
      onChange={(date: Date | null) => {
        if (date) {
          const dataBrasilia = moment(date).tz('America/Sao_Paulo');
          setStartDate(dataBrasilia.format('YYYY-MM-DD'));
        }
      }}
      dateFormat="dd/MM/yyyy"
      locale={ptBR}
      popperPlacement="top-start"
      popperClassName="z-50"
      className="border rounded px-2 py-1 text-xs w-[100px]"
    />
    <span>Até:</span>
    <DatePicker
      selected={parsedEnd}
      onChange={(date: Date | null) => {
        if (date) {
          const dataBrasilia = moment(date).tz('America/Sao_Paulo');
          setEndDate(dataBrasilia.format('YYYY-MM-DD'));
        }
      }}
      dateFormat="dd/MM/yyyy"
      locale={ptBR}
      popperPlacement="top-start"
      popperClassName="z-50"
      className="border rounded px-2 py-1 text-xs w-[100px]"
    />
  </div>
)}

        </div>

      </div>

     
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fadeIn">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full mx-4 shadow-2xl transform transition-all duration-300 scale-100">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center mr-4 shadow-sm">
                <span className="text-blue-600 text-2xl">🗓️</span>
              </div>
              <h2 className="text-xl font-bold text-gray-800">
                Criar Semana Automaticamente
              </h2>
            </div>
            
            <div className="text-gray-700 mb-6 space-y-4">
              <p className="text-base font-medium text-gray-800">
                Deseja criar automaticamente as vendas para a próxima semana?
              </p>
              
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-200 shadow-inner">
                <div className="space-y-3">
                  <div className="flex items-center">
                    <span className="text-lg mr-2">📅</span>
                    <span className="text-sm">
                      <strong>Data de referência:</strong> <span className="text-blue-700 font-semibold">{moment(selectedDate, 'YYYY-MM-DD').format('DD/MM/YYYY')}</span>
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-lg mr-2">🎯</span>
                    <span className="text-sm">
                      <strong>Clientes elegíveis:</strong> Status <span className="px-2 py-1 bg-green-100 text-green-700 rounded font-semibold text-xs">SEMANAL</span> e <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded font-semibold text-xs">CHAMAR</span>
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-lg mr-2">📋</span>
                    <span className="text-sm">
                      <strong>Baseado em:</strong> Última venda registrada de cada cliente
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="flex items-center">
                  <span className="text-amber-600 text-lg mr-2">⚠️</span>
                  <span className="text-sm text-amber-800">
                    <strong>Atenção:</strong> Esta ação criará vendas automaticamente. Certifique-se de que é o que deseja fazer.
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all duration-200 font-medium border border-gray-300 hover:shadow-md"
              >
                ❌ Cancelar
              </button>
              <button
                onClick={handleConfirmCreateWeek}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                ✅ Sim, Criar Semana
              </button>
            </div>
          </div>
        </div>
      )}

      {isCreatingWeek && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 animate-fadeIn">
          <div className="bg-white rounded-xl p-8 max-w-sm w-full mx-4 shadow-2xl text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Criando Semana</h3>
            <p className="text-gray-600 text-sm">
              Processando clientes e criando vendas automáticas...
            </p>
            <div className="mt-4 bg-blue-50 rounded-lg p-3">
              <p className="text-xs text-blue-700">
                ⏳ Esta operação pode levar alguns segundos
              </p>
            </div>
          </div>
        </div>
      )}

      {showSuccessModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4">
            <div className="text-center">
              <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 ${
                modalMessage.includes('❌') 
                  ? 'bg-red-100' 
                  : 'bg-green-100'
              }`}>
                <span className="text-3xl">
                  {modalMessage.includes('❌') ? '❌' : '✅'}
                </span>
              </div>
              
              <h2 className={`text-xl font-bold mb-4 ${
                modalMessage.includes('❌') ? 'text-red-700' : 'text-green-700'
              }`}>
                {modalMessage.includes('✅') ? 'Sucesso!' : 
                 modalMessage.includes('❌') ? 'Erro!' : 'Aviso'}
              </h2>
              
              <div className="text-gray-700 text-left whitespace-pre-line text-sm bg-gray-50 p-4 rounded-lg mb-6 border">
                {modalMessage}
              </div>
              
              <button
                onClick={() => setShowSuccessModal(false)}
                className={`w-full px-6 py-3 rounded-lg font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 ${
                  modalMessage.includes('❌') 
                    ? 'bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800'
                    : 'bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800'
                }`}
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SalesHeader;
