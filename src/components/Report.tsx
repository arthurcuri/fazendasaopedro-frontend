import React, { useState, useEffect } from 'react';
import { useReportFilter } from '../context/ReportFilterContext';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { ShoppingCart, DollarSign } from 'lucide-react';

interface DashboardData {
  totalVendas: number;
  faturamento: number;
  aReceber: number;
  clientesNovos: number;
  mediaOvosPorCliente: number;
  vendasPorDiaOuMes: { label: string; sales: number; revenue: number }[];
  clientesDestaque: {
    nome: string;
    compras: number;
    media_ovos: number;
    ultimoPedido: string;
  }[];
}

interface TipoRelatorio{
  tipo: string;
  quantidade: number;
  totalVendas: number;
  totalDuzias?: number;
  totalCaixas?: number;
  faturamento: number;
  produtos?: string[];
  label?: string; 
}

export default function Report() {

  
  function calcularMediaOvosPorCliente(vendas: any[]): number {
    if (!Array.isArray(vendas) || vendas.length === 0) return 0;
    
    const normalize = (str: string) => (str || '').normalize('NFD').replace(/[0-\u036f]/g, '').toLowerCase();
    
    const vendasPorCliente: Record<string, any[]> = {};
    vendas.forEach(venda => {
      const idCliente = venda.cliente?.id || venda.id_cliente || venda.cliente;
      if (!idCliente) return;
      if (!vendasPorCliente[idCliente]) vendasPorCliente[idCliente] = [];
      vendasPorCliente[idCliente].push(venda);
    });
    
    let somaMedias = 0;
    let clientesComVenda = 0;
    Object.values(vendasPorCliente).forEach(vendasCliente => {
      let somaOvos = 0;
      vendasCliente.forEach(venda => {
        if (Array.isArray(venda.itens)) {
          venda.itens.forEach((item: any) => {
            const tipoProduto = normalize(item.produto?.tipo || item.tipo || '');
            const unidade = normalize(item.unidade || '');
            const quantidade = Number(item.quantidade) || 0;
            if (tipoProduto === 'ovos' || unidade === 'duzia' || unidade === 'pente') {
              if (unidade === 'duzia') {
                somaOvos += quantidade * 12;
              } else if (unidade === 'pente') {
                somaOvos += quantidade * 30;
              } else {
                somaOvos += quantidade;
              }
            }
          });
        }
      });
      if (vendasCliente.length > 0) {
        somaMedias += somaOvos / vendasCliente.length;
        clientesComVenda++;
      }
    });
    return clientesComVenda > 0 ? somaMedias / clientesComVenda : 0;
  }

  
  function getFaturamento(vendas: any[]) {
    if (!Array.isArray(vendas)) return 0;
    return vendas.reduce((acc, v) => acc + (Number(v.valorTotal) || 0), 0);
  }

  
  function getRecebido(vendas: any[]) {
    if (!Array.isArray(vendas)) return 0;
    return vendas
      .filter((v) => {
        const status = String(v.statusPagamento ?? v.status ?? '').toLowerCase();
        return status === 'pago';
      })
      .reduce((acc, v) => acc + (Number(v.valorTotal) || 0), 0);
  }

  
  function getAReceber(vendas: any[]) {
    if (!Array.isArray(vendas)) return 0;
    return vendas
      .filter((v) => ['pendente', 'parcial'].includes(String(v.statusPagamento).toLowerCase()))
      .reduce((acc, v) => acc + (Number(v.valorTotal) || 0), 0);
  }
  const { selectedPeriod, setSelectedPeriod, selectedMonth, setSelectedMonth, selectedYear, setSelectedYear } = useReportFilter();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [historicoVendas, setHistoricoVendas] = useState<{ label: string; sales: number; revenue: number, pago?: number, aReceber?: number }[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [porTipo, setPorTipo] = useState<TipoRelatorio[]>([]);
  const [vendasPagas, setVendasPagas] = useState<any[]>([]);
  const [vendasPorBairro, setVendasPorBairro] = useState<any[]>([]);
  const [vendasPendentes, setVendasPendentes] = useState<any[]>([]);

  
  let historicoPagas, historicoAReceber;
  if (historicoVendas.length > 0 && (historicoVendas[0].hasOwnProperty('pago') || historicoVendas[0].hasOwnProperty('aReceber'))) {
    historicoPagas = historicoVendas.map(item => ({
      label: item.label,
      sales: item.pago ?? 0,
      revenue: item.pago ?? 0
    }));
    historicoAReceber = historicoVendas.map(item => ({
      label: item.label,
      sales: item.aReceber ?? 0,
      revenue: item.aReceber ?? 0
    }));
  } else {
    historicoPagas = historicoVendas.map(item => ({
      label: item.label,
      sales: item.sales,
      revenue: item.revenue
    }));
    historicoAReceber = historicoVendas.map(item => ({
      label: item.label,
      sales: 0,
      revenue: 0
    }));
  }
  
 
  const [searchTermPagamentos, setSearchTermPagamentos] = useState<string>('');
  const [selectedClientePagamentos, setSelectedClientePagamentos] = useState<string>('');
  const [sortByPagamentos, setSortByPagamentos] = useState<'dataPagamento' | 'valor' | 'cliente'>('dataPagamento');
  const [sortOrderPagamentos, setSortOrderPagamentos] = useState<'asc' | 'desc'>('desc');

  
  const [searchTermPendentes, setSearchTermPendentes] = useState<string>('');
  const [selectedClientePendentes, setSelectedClientePendentes] = useState<string>('');
  const [sortByPendentes, setSortByPendentes] = useState<'dataVenda' | 'valor' | 'cliente'>('dataVenda');
  const [sortOrderPendentes, setSortOrderPendentes] = useState<'asc' | 'desc'>('desc');


  const [searchTermBairro, setSearchTermBairro] = useState<string>('');
  const [sortByBairro, setSortByBairro] = useState<'faturamento' | 'totalVendas' | 'totalClientes' | 'bairro'>('faturamento');
  const [sortOrderBairro, setSortOrderBairro] = useState<'asc' | 'desc'>('desc');

  
  const [searchTermTipo, setSearchTermTipo] = useState<string>('');


  
  const getBackendMonth = (mes: string) => {
    if (!mes) return '';
    const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    
    const normalizado = mes.slice(0,3).toLowerCase();
    const idx = meses.findIndex(m => m.toLowerCase().startsWith(normalizado));
    return idx !== -1 ? meses[idx] : mes;
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        let url = `https://api.fazendasaopedro.appsirius.com/api/vendas/dashboard?period=${selectedPeriod}`;
        if (selectedPeriod === 'monthly' && selectedMonth && selectedYear) {
          url += `&month=${getBackendMonth(selectedMonth)}&year=${selectedYear}`;
        }
        const response = await axios.get<DashboardData>(url);
        
        let vendasOvos: any[] = [];
        try {
          const vendasResp = await axios.get<any[]>(`https://api.fazendasaopedro.appsirius.com/api/vendas?period=${selectedPeriod}` + (selectedPeriod === 'monthly' && selectedMonth && selectedYear ? `&month=${getBackendMonth(selectedMonth)}&year=${selectedYear}` : ''));
          vendasOvos = vendasResp.data;
        } catch (e) { vendasOvos = []; }
        const mediaOvos = calcularMediaOvosPorCliente(vendasOvos);
        setDashboardData({ ...response.data, mediaOvosPorCliente: mediaOvos });
      } catch (error) {
        console.error('Erro ao buscar dados do dashboard:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, [selectedPeriod, selectedMonth, selectedYear]);

  useEffect(() => {
    const fetchHistoricoVendas = async () => {
      try {
        const response = await axios.get<{ label: string; sales: number; revenue: number }[]>(
          'https://api.fazendasaopedro.appsirius.com/api/vendas/vendas-por-mes-historico'
        );
        setHistoricoVendas(response.data);
        
        if (
          selectedPeriod === 'monthly' &&
          response.data.length > 0 &&
          (!selectedMonth || !selectedYear)
        ) {
          const now = new Date();
          const mesAtual = now.toLocaleString('pt-BR', { month: 'long' });
          const anoAtual = now.getFullYear().toString();
          const encontrado = response.data.find((item) => {
            const [mes, ano] = item.label.split('/');
            return mes.toLowerCase().includes(mesAtual.toLowerCase()) && ano === anoAtual;
          });
          if (encontrado) {
            const [mes, ano] = encontrado.label.split('/');
            setSelectedMonth(mes);
            setSelectedYear(ano);
          } else {
            const [mes, ano] = response.data[response.data.length - 1].label.split('/');
            setSelectedMonth(mes);
            setSelectedYear(ano);
          }
        }
      } catch (error) {
        console.error('Erro ao buscar histórico de vendas por mês:', error);
      }
    };

    fetchHistoricoVendas();
  }, [selectedPeriod]);

  useEffect(() => {
    const fetchPorTipo = async () => {
      try {
        let url = `https://api.fazendasaopedro.appsirius.com/api/vendas/report/por-tipo?period=${selectedPeriod}`;
        if (selectedPeriod === 'monthly' && selectedMonth && selectedYear) {
          url += `&month=${getBackendMonth(selectedMonth)}&year=${selectedYear}`;
        }
        const resp = await axios.get<TipoRelatorio[]>(url);
        setPorTipo(resp.data);
      } catch (err) {
        console.error('Erro ao buscar vendas por tipo:', err);
      }
    };
    fetchPorTipo();
  }, [selectedPeriod, selectedMonth, selectedYear]);

  useEffect(() => {
    const fetchVendasPagas = async () => {
      try {
        let url = `https://api.fazendasaopedro.appsirius.com/api/vendas/report/vendas-pagas?period=${selectedPeriod}`;
        if (selectedPeriod === 'monthly' && selectedMonth && selectedYear) {
          url += `&month=${getBackendMonth(selectedMonth)}&year=${selectedYear}`;
        }
        const resp = await axios.get<any[]>(url);
        setVendasPagas(resp.data);
      } catch (err) {
        console.error('Erro ao buscar vendas pagas:', err);
      }
    };
    fetchVendasPagas();
  }, [selectedPeriod, selectedMonth, selectedYear]);

  useEffect(() => {
    const fetchVendasPorBairro = async () => {
      try {
        let url = `https://api.fazendasaopedro.appsirius.com/api/vendas/report/por-bairro?period=${selectedPeriod}`;
        if (selectedPeriod === 'monthly' && selectedMonth && selectedYear) {
          url += `&month=${getBackendMonth(selectedMonth)}&year=${selectedYear}`;
        }
        const resp = await axios.get<any[]>(url);
        setVendasPorBairro(resp.data);
      } catch (err) {
        console.error('Erro ao buscar vendas por bairro:', err);
      }
    };
    fetchVendasPorBairro();
  }, [selectedPeriod, selectedMonth, selectedYear]);

  useEffect(() => {
    const fetchVendasPendentes = async () => {
      try {
        let url = `https://api.fazendasaopedro.appsirius.com/api/vendas/report/vendas-pendentes?period=${selectedPeriod}`;
        if (selectedPeriod === 'monthly' && selectedMonth && selectedYear) {
          url += `&month=${getBackendMonth(selectedMonth)}&year=${selectedYear}`;
        }
        const resp = await axios.get<any[]>(url);
        setVendasPendentes(resp.data);
      } catch (err) {
        console.error('Erro ao buscar vendas pendentes:', err);
      }
    };
    fetchVendasPendentes();
  }, [selectedPeriod, selectedMonth, selectedYear]);


  const exportToExcel = () => {
    if (!dashboardData) return;

    
    let vendasPagasFiltrado = vendasPagas;
    let vendasPendentesFiltrado = vendasPendentes;
    let vendasPorBairroFiltrado = vendasPorBairro;
    let porTipoFiltrado = porTipo;
    let dashboardDataFiltrado = dashboardData;

    
    let todasVendasFiltrado = [...vendasPagasFiltrado];
    vendasPendentesFiltrado.forEach(vp => {
      if (!todasVendasFiltrado.some(v => v.id === vp.id)) {
        todasVendasFiltrado.push(vp);
      }
    });

    

    if (selectedPeriod === 'monthly' && selectedMonth && selectedYear) {
      const label = `${selectedMonth}/${selectedYear}`;
      vendasPagasFiltrado = vendasPagas.filter(v => v.mes === label || v.label === label);
      vendasPendentesFiltrado = vendasPendentes.filter(v => v.mes === label || v.label === label);
      vendasPorBairroFiltrado = vendasPorBairro.filter(v => v.mes === label || v.label === label);
      porTipoFiltrado = porTipo.filter(v => (v as any).label === label);
      
      let todasVendasFiltradoMes = [...vendasPagasFiltrado];
      vendasPendentesFiltrado.forEach(vp => {
        if (!todasVendasFiltradoMes.some(v => v.id === vp.id)) {
          todasVendasFiltradoMes.push(vp);
        }
      });
      const mes = historicoVendas.find((item) => item.label === label);
      if (mes) {
        dashboardDataFiltrado = {
          ...dashboardData,
          vendasPorDiaOuMes: [mes],
          totalVendas: mes.sales,
          faturamento: getFaturamento(todasVendasFiltradoMes),
        };
      }
    }

    setTimeout(() => {
      const wb = XLSX.utils.book_new();
      
      const todasVendasFiltrado = [...vendasPagasFiltrado];
      vendasPendentesFiltrado.forEach(vp => {
        if (!todasVendasFiltrado.some(v => v.id === vp.id)) {
          todasVendasFiltrado.push(vp);
        }
      });
      dashboardDataFiltrado = {
        ...dashboardDataFiltrado,
        faturamento: getFaturamento(todasVendasFiltrado),
      };

    
    const resumoData = [
      ['🐓 FAZENDA SÃO PEDRO - RELATÓRIO EXECUTIVO', '', '', ''],
      ['Período: ' + (selectedPeriod === 'weekly' ? 'Semanal' : 'Mensal'), '', '', ''],
      ['Data de Geração: ' + new Date().toLocaleDateString('pt-BR'), '', '', ''],
      ['', '', '', ''],
      ['📊 INDICADORES PRINCIPAIS', '', '', ''],
      ['Indicador', 'Valor', 'Descrição', ''],
      ['🛒 Total de Vendas', dashboardDataFiltrado.totalVendas, 'Vendas realizadas no período', ''],
      ['💰 Faturamento Pago', 'R$ ' + dashboardDataFiltrado.faturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 }), 'Valores já recebidos', ''],
      ['⏰ A Receber', 'R$ ' + dashboardDataFiltrado.aReceber.toLocaleString('pt-BR', { minimumFractionDigits: 2 }), 'Pendente de recebimento', ''],
      ['👥 Clientes Novos', dashboardDataFiltrado.clientesNovos, 'Novos clientes no período', ''],
      ['🥚 Média Ovos/Cliente', dashboardDataFiltrado.mediaOvosPorCliente.toFixed(1) + ' dúzias', 'Consumo médio por cliente', ''],
      ['', '', '', ''],
      ['💡 DICAS DA FAZENDA:', '', '', ''],
      ['• Acompanhe clientes com consumo acima da média', '', '', ''],
      ['• Monitore valores a receber regularmente', '', '', ''],
      ['• Identifique oportunidades com novos clientes', '', '', '']
    ];

    const resumoWs = XLSX.utils.aoa_to_sheet(resumoData);
  
    resumoWs['!cols'] = [
      { wch: 35 }, 
      { wch: 20 }, 
      { wch: 35 }, 
      { wch: 10 }  
    ];

    resumoWs['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }, 
      { s: { r: 4, c: 0 }, e: { r: 4, c: 3 } }, 
      { s: { r: 12, c: 0 }, e: { r: 12, c: 3 } }  
    ];

    XLSX.utils.book_append_sheet(wb, resumoWs, '🏡 Resumo Executivo');

    
    const vendasPorDiaOuMesFiltradas = dashboardDataFiltrado.vendasPorDiaOuMes.map(item => ({
      ...item,
      revenue: item.revenue
    }));
    const totalFaturamentoPeriodo = vendasPorDiaOuMesFiltradas.reduce((sum, i) => sum + i.revenue, 0);
    const vendasPorDiaOuMesData = [
      ['📅 VENDAS POR ' + (selectedPeriod === 'weekly' ? 'DIA DA SEMANA' : 'MÊS'), '', '', ''],
      ['', '', '', ''],
      [selectedPeriod === 'weekly' ? 'Dia' : 'Mês', 'Qtd Vendas', 'Faturamento (R$)', '% do Total'],
      ...vendasPorDiaOuMesFiltradas.map(item => {
        const percentual = totalFaturamentoPeriodo > 0 ? ((item.revenue / totalFaturamentoPeriodo) * 100).toFixed(1) + '%' : '0%';
        return [item.label, item.sales, item.revenue, percentual];
      }),
      ['', '', '', ''],
      ['TOTAL', 
       vendasPorDiaOuMesFiltradas.reduce((sum, item) => sum + item.sales, 0),
       totalFaturamentoPeriodo,
       '100%']
    ];

    const vendasPeriodoWs = XLSX.utils.aoa_to_sheet(vendasPorDiaOuMesData);
    vendasPeriodoWs['!cols'] = [{ wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 12 }];
    vendasPeriodoWs['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }];

    XLSX.utils.book_append_sheet(wb, vendasPeriodoWs, '📊 Vendas por Período');

   
    const tipoData = [
      ['🥚 VENDAS POR TIPO DE PRODUTO', '', '', '', ''],
      ['', '', '', '', ''],
      ['Tipo', 'Qtd Total', 'Vendas', 'Produtos'],
      ...getFilteredVendasPorTipo().map(tipo => [
        tipo.tipo,
        tipo.quantidade,
        tipo.totalVendas,
        getFaturamento(Array.isArray(tipo.vendas) ? tipo.vendas : []),
        tipo.produtos ? tipo.produtos.join(', ') : ''
      ]),
      ['', '', '', '', ''],
      ['OBSERVAÇÕES:', '', '', '', ''],
      ['• Ovos: Principal produto da fazenda', '', '', '', ''],
      ['• Mel: Produto complementar de alta qualidade', '', '', '', ''],
      ['• Outros: Produtos sazonais e especiais', '', '', '', '']
    ];

    const tipoWs = XLSX.utils.aoa_to_sheet(tipoData);
    tipoWs['!cols'] = [{ wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 15 }, { wch: 40 }];
    tipoWs['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
      { s: { r: 5, c: 0 }, e: { r: 5, c: 4 } }
    ];

    XLSX.utils.book_append_sheet(wb, tipoWs, '🥚 Tipos de Produto');


    const vendasPagasData = [
      ['💰 VENDAS PAGAS NO PERÍODO', '', '', ''],
      ['', '', '', ''],
      ['Cliente', 'Data Pagamento', 'Valor (R$)', 'Produtos'],
      ...getFilteredVendasPagas().map(venda => [
        venda.cliente,
        venda.dataPagamento,
        venda.valorTotal,
        venda.produtos.map((p: any) => p.nome).join(', ')
      ]),
      ['', '', '', ''],
      ['TOTAL RECEBIDO:', '', getFilteredVendasPagas().reduce((sum: number, v: any) => sum + v.valorTotal, 0), ''],
      ['', '', '', ''],
      ['✅ STATUS: Valores confirmados e recebidos', '', '', '']
    ];

    const pagasWs = XLSX.utils.aoa_to_sheet(vendasPagasData);
    pagasWs['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 12 }, { wch: 40 }];
    pagasWs['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
      { s: { r: 7, c: 0 }, e: { r: 7, c: 3 } }
    ];

    XLSX.utils.book_append_sheet(wb, pagasWs, '💰 Vendas Pagas');

    const vendasPendentesData = [
      ['⏰ VENDAS PENDENTES', '', '', ''],
      ['', '', '', ''],
      ['🔍 Filtros aplicados:', '', '', ''],
      ['Período:', selectedPeriod === 'weekly' ? 'Semanal' : 'Mensal', '', ''],
      ['Filtros:', searchTermPendentes || 'Nenhum', '', ''],
      ['', '', '', ''],
      ['Cliente', 'Data Venda', 'Valor Devido (R$)', 'Produtos'],
      ...getFilteredVendasPendentes().map(venda => [
        venda.cliente,
        venda.dataVenda,
        venda.valorDevido,
        venda.produtos.map((p: any) => p.nome).join(', ')
      ]),
      ['', '', '', ''],
      ['TOTAL A RECEBER:', '', getFilteredVendasPendentes().reduce((sum: number, v: any) => sum + v.valorDevido, 0), ''],
      ['', '', '', ''],
      ['🔴 STATUS: Valores pendentes de pagamento', '', '', '']
    ];

    const pendentesWs = XLSX.utils.aoa_to_sheet(vendasPendentesData);
    pendentesWs['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 12 }, { wch: 40 }];
    pendentesWs['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
      { s: { r: 7, c: 0 }, e: { r: 7, c: 3 } }
    ];

    XLSX.utils.book_append_sheet(wb, pendentesWs, '⏰ Vendas Pendentes');

 
    const bairroData = [
      ['🏘️ VENDAS POR BAIRRO', '', '', '', ''],
      ['', '', '', '', ''],
      ['Bairro', 'Total Clientes', 'Total Vendas', 'Faturamento (R$)', ''],
      ...getFilteredVendasPorBairro().map(bairro => [
        bairro.bairro,
        bairro.totalClientes,
        bairro.totalVendas,
        getFaturamento(Array.isArray(bairro.vendas) ? bairro.vendas : []),
        ''
      ]),
      ['', '', '', '', ''],
      ['TOTAIS:', 
       getFilteredVendasPorBairro().reduce((sum, b) => sum + b.totalClientes, 0),
       getFilteredVendasPorBairro().reduce((sum, b) => sum + b.totalVendas, 0),
       getFilteredVendasPorBairro().reduce((sum, b) => sum + getFaturamento(Array.isArray(b.vendas) ? b.vendas : []), 0),
       ''],
      ['', '', '', '', ''],
      ['📍 DICA: Identifique bairros com potencial de crescimento', '', '', '', '']
    ];

    const bairroWs = XLSX.utils.aoa_to_sheet(bairroData);
    bairroWs['!cols'] = [{ wch: 20 }, { wch: 10 }, { wch: 10 }, { wch: 15 }, { wch: 15 }];
    bairroWs['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
      { s: { r: 7, c: 0 }, e: { r: 7, c: 4 } }
    ];

    XLSX.utils.book_append_sheet(wb, bairroWs, '🏘️ Vendas por Bairro');

    
    const clientesData = [
      ['⭐ CLIENTES EM DESTAQUE', '', '', ''],
      ['', '', '', ''],
      ['Nome', 'Compras', 'Média Ovos (dúzias)', 'Última Compra'],
      ...dashboardData.clientesDestaque.map(client => [
        client.nome,
        client.compras,
        client.media_ovos.toFixed(1),
        client.ultimoPedido,
      ]),
      ['', '', '', ''],
      ['🌟 CLIENTES FIÉIS DA FAZENDA SÃO PEDRO', '', '', ''],
      ['', '', '', ''],
      ['Estratégias de relacionamento:', '', '', ''],
      ['• Mantenha contato regular', '', '', ''],
      ['• Ofereça produtos sazonais', '', '', ''],
      ['• Reconheça a fidelidade', '', '', '']
    ];

    const clientesWs = XLSX.utils.aoa_to_sheet(clientesData);
    clientesWs['!cols'] = [{ wch: 25 }, { wch: 10 }, { wch: 18 }, { wch: 15 }];
    clientesWs['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
      { s: { r: 5, c: 0 }, e: { r: 5, c: 3 } }
    ];

    XLSX.utils.book_append_sheet(wb, clientesWs, '⭐ Clientes Destaque');

   
    if (selectedPeriod === 'monthly' && historicoVendas.length > 0) {
      if (selectedMonth) {
        const monthLabel = `${selectedMonth}/${selectedYear}`;
        const item = historicoVendas.find((h) => h.label === monthLabel);
        if (item) {
          const historicoData = [
            [`📈 HISTÓRICO - ${selectedMonth} - FAZENDA SÃO PEDRO`, '', ''],
            ['', '', ''],
            ['Mês', 'Vendas', 'Faturamento (R$)'],
            [item.label, item.sales, item.revenue],
            ['', '', ''],
            ['TENDÊNCIAS:', '', ''],
            ['• Analise sazonalidade', '', ''],
            ['• Identifique picos de demanda', '', ''],
            ['• Planeje estoques', '', '']
          ];
          const historicoWs = XLSX.utils.aoa_to_sheet(historicoData);
          historicoWs['!cols'] = [{ wch: 15 }, { wch: 12 }, { wch: 15 }];
          historicoWs['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }];
          XLSX.utils.book_append_sheet(wb, historicoWs, `📈 ${selectedMonth}`);
        }
      } else {
        
        const historicoData = [
          ['📈 HISTÓRICO ANUAL - FAZENDA SÃO PEDRO', '', ''],
          ['', '', ''],
          ['Mês', 'Vendas', 'Faturamento (R$)'],
          ...historicoVendas.map(item => [item.label, item.sales, item.revenue]),
          ['', '', ''],
          ['TENDÊNCIAS:', '', ''],
          ['• Analise sazonalidade', '', ''],
          ['• Identifique picos de demanda', '', ''],
          ['• Planeje estoques', '', '']
        ];
        const historicoWs = XLSX.utils.aoa_to_sheet(historicoData);
        historicoWs['!cols'] = [{ wch: 15 }, { wch: 12 }, { wch: 15 }];
        historicoWs['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }];
        XLSX.utils.book_append_sheet(wb, historicoWs, '📈 Histórico Anual');
      }
    }

    const nomeArquivo = `Relatório Fazenda São Pedro ${selectedPeriod}_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.xlsx`;
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([wbout], { type: 'application/octet-stream' }), nomeArquivo);

   
    const button = document.querySelector('[data-export-btn]') as HTMLButtonElement;
    if (button) {
      button.disabled = false;
      button.innerHTML = '<span class="text-lg">📊</span> <span class="font-medium">Exportar Relatório</span> <span class="text-sm opacity-90">(.xlsx)</span>';
    }
    
    }, 500); 
  };



  const labelMesAno = selectedMonth && selectedYear ? `${selectedMonth}/${selectedYear}` : '';


  const dashboardDataFiltrado = dashboardData;

function filtrarPorMesAno(arr: any[]) {
  return arr;
}


  const vendasPagasFiltradas = React.useMemo(() => filtrarPorMesAno(vendasPagas), [vendasPagas, selectedPeriod, selectedMonth, selectedYear]);

  const vendasPendentesFiltradas = React.useMemo(() => filtrarPorMesAno(vendasPendentes), [vendasPendentes, selectedPeriod, selectedMonth, selectedYear]);
  
  const vendasPorBairroFiltradas = React.useMemo(() => filtrarPorMesAno(vendasPorBairro), [vendasPorBairro, selectedPeriod, selectedMonth, selectedYear]);

  const porTipoFiltrado = React.useMemo(() => filtrarPorMesAno(porTipo), [porTipo, selectedPeriod, selectedMonth, selectedYear]);

 
  const todasVendasFiltrado = React.useMemo(() => {
    const todas = [...vendasPagasFiltradas];
    vendasPendentesFiltradas.forEach(vp => {
      if (!todas.some(v => v.id === vp.id)) {
        todas.push(vp);
      }
    });
    return todas;
  }, [vendasPagasFiltradas, vendasPendentesFiltradas]);


const clientesDestaqueFiltrados = React.useMemo(() => {
  if (!dashboardData?.clientesDestaque || todasVendasFiltrado.length === 0) return [];
 
  const clientesComVenda = new Set(
    todasVendasFiltrado.map(v => (v.cliente?.nome || v.cliente || '').toLowerCase())
  );

  return dashboardData.clientesDestaque.filter(cd => clientesComVenda.has((cd.nome || '').toLowerCase()));
}, [dashboardData, todasVendasFiltrado]);



  const getFilteredVendasPagas = () => {
    if (!vendasPagasFiltradas || vendasPagasFiltradas.length === 0) return [];
    let filtered = vendasPagasFiltradas.filter(venda => {
      const cliente = (venda.cliente || '').toString();
      const produtos = Array.isArray(venda.produtos) ? venda.produtos : [];
      const matchesSearch = searchTermPagamentos === '' || 
        cliente.toLowerCase().includes(searchTermPagamentos.toLowerCase()) ||
        produtos.some((p: any) => (p?.nome || '').toLowerCase().includes(searchTermPagamentos.toLowerCase()));
      const matchesCliente = selectedClientePagamentos === '' || cliente === selectedClientePagamentos;
      return matchesSearch && matchesCliente;
    });
   
    filtered.sort((a, b) => {
      let compareValue = 0;
      switch (sortByPagamentos) {
        case 'dataPagamento':
          const dateA = new Date(a.dataPagamento.split('/').reverse().join('/'));
          const dateB = new Date(b.dataPagamento.split('/').reverse().join('/'));
          compareValue = dateA.getTime() - dateB.getTime();
          break;
        case 'valor':
          compareValue = a.valorTotal - b.valorTotal;
          break;
        case 'cliente':
          compareValue = a.cliente.localeCompare(b.cliente);
          break;
      }
      return sortOrderPagamentos === 'asc' ? compareValue : -compareValue;
    });
    return filtered;
  };


  const getFilteredVendasPendentes = () => {
    if (!vendasPendentesFiltradas || vendasPendentesFiltradas.length === 0) return [];
    let filtered = vendasPendentesFiltradas.filter(venda => {
      const cliente = (venda.cliente || '').toString();
      const produtos = Array.isArray(venda.produtos) ? venda.produtos : [];
      const matchesSearch = searchTermPendentes === '' || 
        cliente.toLowerCase().includes(searchTermPendentes.toLowerCase()) ||
        produtos.some((p: any) => (p?.nome || '').toLowerCase().includes(searchTermPendentes.toLowerCase()));
      const matchesCliente = selectedClientePendentes === '' || cliente === selectedClientePendentes;
      return matchesSearch && matchesCliente;
    });
 
    filtered.sort((a, b) => {
      let compareValue = 0;
      switch (sortByPendentes) {
        case 'dataVenda':
          const dateA = new Date(a.dataVenda.split('/').reverse().join('/'));
          const dateB = new Date(b.dataVenda.split('/').reverse().join('/'));
          compareValue = dateA.getTime() - dateB.getTime();
          break;
        case 'valor':
          compareValue = a.valorDevido - b.valorDevido;
          break;
        case 'cliente':
          compareValue = a.cliente.localeCompare(b.cliente);
          break;
      }
      return sortOrderPendentes === 'asc' ? compareValue : -compareValue;
    });
    return filtered;
  };


  const getFilteredVendasPorBairro = () => {
    if (!vendasPorBairroFiltradas) return [];
    let filtered = vendasPorBairroFiltradas.filter(bairro => {
      const matchesSearch = searchTermBairro === '' || 
        bairro.bairro.toLowerCase().includes(searchTermBairro.toLowerCase());
      return matchesSearch;
    });
 
    filtered.sort((a, b) => {
      let compareValue = 0;
      switch (sortByBairro) {
        case 'bairro':
          compareValue = a.bairro.localeCompare(b.bairro);
          break;
        case 'faturamento':
          compareValue = a.faturamento - b.faturamento;
          break;
        case 'totalVendas':
          compareValue = a.totalVendas - b.totalVendas;
          break;
        case 'totalClientes':
          compareValue = a.totalClientes - b.totalClientes;
          break;
      }
      return sortOrderBairro === 'asc' ? compareValue : -compareValue;
    });
    return filtered;
  };

  const getFilteredVendasPorTipo = () => {
    if (!porTipoFiltrado) return [];
    return porTipoFiltrado.filter(tipo => {
      const matchesSearch = searchTermTipo === '' || 
        tipo.tipo.toLowerCase().includes(searchTermTipo.toLowerCase()) ||
        (tipo.produtos && tipo.produtos.some((produto: string) => 
          produto.toLowerCase().includes(searchTermTipo.toLowerCase())
        ));
      return matchesSearch;
    });
  };


  if (!dashboardData || loading) {
    return <div className="p-8">Carregando...</div>;
  }

  
  const dashboardDataComClientesFiltrados = {
    ...dashboardData,
    clientesDestaque: clientesDestaqueFiltrados
  };

  const maxSales = Math.max(...dashboardData.vendasPorDiaOuMes.map(item => item.sales));

  const MetricCard = ({
    title,
    value,
    icon: Icon,
    color = 'green',
  }: {
    title: string;
    value: React.ReactNode;
    icon: React.ElementType;
    color?: 'green' | 'orange' | 'blue' | 'purple';
  }) => {
    const colorClasses = {
      green: 'bg-green-50 text-green-600 border-green-200',
      orange: 'bg-orange-50 text-orange-600 border-orange-200',
      blue: 'bg-blue-50 text-blue-600 border-blue-200',
      purple: 'bg-purple-50 text-purple-600 border-purple-200',
    };

    return (
      <div className={`rounded-lg border-2 p-6 flex flex-col justify-between min-h-[140px] ${colorClasses[color as keyof typeof colorClasses]}`}>
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-sm font-medium">{title}</p>
            <p className="text-3xl font-bold">{value}</p>
          </div>
          <div className={`w-12 h-12 rounded-lg bg-opacity-50 flex items-center justify-center`}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </div>
    );
  };



  const getUniqueClientesPagamentos = () => {
    if (!vendasPagasFiltradas || vendasPagasFiltradas.length === 0) return [];
    const clientes = vendasPagasFiltradas.map(v => v.cliente);
    return [...new Set(clientes)].sort();
  };


  const getUniqueClientesPendentes = () => {
    if (!vendasPendentesFiltradas || vendasPendentesFiltradas.length === 0) return [];
    const clientes = vendasPendentesFiltradas.map(v => v.cliente);
    return [...new Set(clientes)].sort();
  };

  const MesAnoSelector = () => {
    if (selectedPeriod !== 'monthly' || historicoVendas.length === 0) return null;
   
    const mesesDisponiveis = Array.from(new Set(historicoVendas
      .filter(item => !selectedYear || item.label.endsWith('/' + selectedYear))
      .map(item => item.label.split('/')[0])));
   
    const anosDisponiveis = Array.from(new Set(historicoVendas
      .filter(item => !selectedMonth || item.label.startsWith(selectedMonth + '/'))
      .map(item => item.label.split('/')[1])));

  
    React.useEffect(() => {
      if (selectedMonth && selectedYear) {
        const existe = historicoVendas.some(item => item.label === `${selectedMonth}/${selectedYear}`);
        if (!existe) {
      
          const primeiro = historicoVendas[0];
          if (primeiro) {
            const [mes, ano] = primeiro.label.split('/');
            setSelectedMonth(mes);
            setSelectedYear(ano);
          }
        }
      }
    }, [selectedMonth, selectedYear, historicoVendas]);

    return (
      <div className="flex items-center gap-1 bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded px-2 py-0.5 shadow-sm h-9 min-w-0">
        <span className="font-medium text-blue-800 flex items-center gap-1 text-sm">
          <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          Mês:
        </span>
        <select
          value={selectedMonth}
          onChange={e => {
            const mes = e.target.value;
           
            const anoParaMes = historicoVendas.find(item => item.label.startsWith(mes + '/'));
            if (anoParaMes) {
              const [, ano] = anoParaMes.label.split('/');
              setSelectedMonth(mes);
              setSelectedYear(ano);
            } else {
              setSelectedMonth(mes);
            }
          }}
          className="px-2 py-1 rounded border border-blue-300 bg-white text-blue-900 font-semibold shadow focus:outline-none focus:ring-2 focus:ring-blue-400 hover:border-blue-400 transition-all h-7 text-xs"
          style={{ minWidth: 48, maxWidth: 70 }}
        >
          {mesesDisponiveis.map((mes) => (
            <option key={mes} value={mes}>{mes}</option>
          ))}
        </select>
        <span className="font-medium text-blue-800 flex items-center gap-1 text-sm ml-2">Ano:</span>
        <select
          value={selectedYear}
          onChange={e => {
            const ano = e.target.value;
           
            const mesParaAno = historicoVendas.find(item => item.label.endsWith('/' + ano));
            if (mesParaAno) {
              const [mes] = mesParaAno.label.split('/');
              setSelectedMonth(mes);
              setSelectedYear(ano);
            } else {
              setSelectedYear(ano);
            }
          }}
          className="px-2 py-1 rounded border border-blue-300 bg-white text-blue-900 font-semibold shadow focus:outline-none focus:ring-2 focus:ring-blue-400 hover:border-blue-400 transition-all h-7 text-xs"
          style={{ minWidth: 48, maxWidth: 70 }}
        >
          {anosDisponiveis.map((ano) => (
            <option key={ano} value={ano}>{ano}</option>
          ))}
        </select>
      </div>
    );
  };

  return (
    <div className="p-8">

      <h2 className="text-2xl font-bold mb-2">Relatório de Faturamento</h2>
      {selectedPeriod === 'monthly' && selectedMonth && selectedYear && (
        <div className="mb-4 flex items-center gap-2">
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-sm font-semibold border border-blue-300 shadow-sm">
            <svg className="w-4 h-4 mr-1 text-blue-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            Mês selecionado: <span className="ml-1 font-bold">{selectedMonth}/{selectedYear}</span>
          </span>
        </div>
      )}

  
      <div className="flex items-center mb-4 gap-2">
        <button
          onClick={() => setSelectedPeriod('weekly')}
          className={`px-4 py-2 rounded ${selectedPeriod === 'weekly' ? 'bg-green-600 text-white' : 'bg-gray-200'}`}
        >
          Semanal
        </button>
        <button
          onClick={() => setSelectedPeriod('monthly')}
          className={`px-4 py-2 rounded ${selectedPeriod === 'monthly' ? 'bg-green-600 text-white' : 'bg-gray-200'}`}
        >
          Mensal
        </button>
       
        {selectedPeriod === 'monthly' && (
          <div className="flex items-center gap-2 bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-300 rounded-lg px-3 py-2 shadow-sm">
            <label className="text-sm font-medium text-blue-700 flex items-center gap-1">
              Mês:
            </label>
            <select
              value={selectedMonth || ''}
              onChange={e => setSelectedMonth(e.target.value)}
              className="px-3 py-1 rounded-lg border border-blue-400 focus:ring-2 focus:ring-blue-400/60 focus:outline-none bg-blue-50 text-blue-900 font-semibold shadow-sm transition-all duration-150 hover:bg-blue-100"
            >
              <option value="">Mês</option>
              <option value="Jan">Jan</option>
              <option value="Fev">Fev</option>
              <option value="Mar">Mar</option>
              <option value="Abr">Abr</option>
              <option value="Mai">Mai</option>
              <option value="Jun">Jun</option>
              <option value="Jul">Jul</option>
              <option value="Ago">Ago</option>
              <option value="Set">Set</option>
              <option value="Out">Out</option>
              <option value="Nov">Nov</option>
              <option value="Dez">Dez</option>
            </select>
            <label className="text-sm font-medium text-blue-700 flex items-center gap-1 ml-2">
              Ano:
            </label>
            <select
              value={selectedYear || ''}
              onChange={e => setSelectedYear(e.target.value)}
              className="px-3 py-1 rounded-lg border border-blue-400 focus:ring-2 focus:ring-blue-400/60 focus:outline-none bg-blue-50 text-blue-900 font-semibold shadow-sm transition-all duration-150 hover:bg-blue-100"
            >
              <option value="">Ano</option>
              
              {Array.from({ length: (new Date().getFullYear() - 2021) }, (_, i) => 2022 + i).map(ano => (
                <option key={ano} value={ano}>{ano}</option>
              ))}
            </select>
          </div>
        )}
        <button
          onClick={exportToExcel}
          data-export-btn
          className={`px-4 py-2 rounded flex items-center gap-2 font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none bg-green-600 text-white h-10`}
          style={{ height: 40, minWidth: 120, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <span className="text-lg">📊</span>
          <span className="font-medium">Exportar Relatório</span>
          <span className="text-sm opacity-90">(.xlsx)</span>
        </button>
      </div>

      
      <div className="bg-white rounded-lg border p-4 mb-6 shadow-sm">
        <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
          <span className="text-lg mr-2">🧭</span>
          Navegar para Seção
        </h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => document.getElementById('indicadores')?.scrollIntoView({ behavior: 'smooth' })}
            className="px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm border border-blue-200"
          >
            📊 Indicadores
          </button>
          <button
            onClick={() => document.getElementById('vendas-dia-mes')?.scrollIntoView({ behavior: 'smooth' })}
            className="px-3 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors text-sm border border-green-200"
          >
            📅 Vendas por Período
          </button>
          {selectedPeriod === 'monthly' && (
            <button
              onClick={() => document.getElementById('historico-mensal')?.scrollIntoView({ behavior: 'smooth' })}
              className="px-3 py-2 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors text-sm border border-purple-200"
            >
              📈 Histórico Mensal
            </button>
          )}
          <button
            onClick={() => document.getElementById('vendas-tipo')?.scrollIntoView({ behavior: 'smooth' })}
            className="px-3 py-2 bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 transition-colors text-sm border border-orange-200"
          >
            🥚 Vendas por Tipo
          </button>
          <button
            onClick={() => document.getElementById('vendas-bairro')?.scrollIntoView({ behavior: 'smooth' })}
            className="px-3 py-2 bg-cyan-50 text-cyan-700 rounded-lg hover:bg-cyan-100 transition-colors text-sm border border-cyan-200"
          >
            🏘️ Vendas por Bairro
          </button>
          <button
            onClick={() => document.getElementById('pagamentos')?.scrollIntoView({ behavior: 'smooth' })}
            className="px-3 py-2 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors text-sm border border-emerald-200"
          >
            💰 Pagamentos
          </button>
          <button
            onClick={() => document.getElementById('vendas-pendentes')?.scrollIntoView({ behavior: 'smooth' })}
            className="px-3 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors text-sm border border-red-200"
          >
            ⏰ Vendas Pendentes
          </button>
          <button
            onClick={() => document.getElementById('clientes-destaque')?.scrollIntoView({ behavior: 'smooth' })}
            className="px-3 py-2 bg-yellow-50 text-yellow-700 rounded-lg hover:bg-yellow-100 transition-colors text-sm border border-yellow-200"
          >
            ⭐ Clientes Destaque
          </button>
        </div>
      </div>

    
      <div id="indicadores" className="bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-lg p-4 mb-6">
        <h3 className="text-lg font-semibold mb-3 text-gray-800">📊 Indicadores do Período ({selectedPeriod === 'weekly' ? 'Semana' : 'Mês'} Atual)</h3>
        <div className="text-sm text-gray-700 space-y-2">
          <p><strong>• Total de Vendas:</strong> Quantidade total de vendas realizadas no período</p>
          <p><strong>• Faturamento:</strong> Valores vendidos no período independente do status de pagamento</p>
          <p><strong>• Recebido:</strong> Valores de vendas pagas no período</p>
          <p><strong>• A Receber:</strong> Soma dos valores das vendas pendentes de pagamento no período</p>
          
          
        </div>
      </div>

    

  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8 items-stretch">
        <MetricCard
          title="Total de Vendas"
          value={dashboardDataFiltrado?.totalVendas ?? 0}
          icon={ShoppingCart}
          color="green"
        />
        <MetricCard
          title="Faturamento"
          value={`R$ ${getFaturamento(todasVendasFiltrado).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={DollarSign}
          color="orange"
        />
        <MetricCard
          title="Recebido"
          value={`R$ ${(getFaturamento(todasVendasFiltrado) - getAReceber(todasVendasFiltrado)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={DollarSign}
          color="green"
        />
        <MetricCard
          title="A Receber"
          value={`R$ ${getAReceber(todasVendasFiltrado).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={DollarSign}
          color="blue"
        />
      </div>

   
    <div className="bg-gradient-to-r from-green-50 to-blue-50 border-l-4 border-green-400 p-4 mb-6">
      <h4 className="font-medium text-green-900 mb-2">💰 Entenda os valores dos cards principais:</h4>
      <div className="text-sm text-green-800 space-y-1">
        <p><strong>• Faturamento (card laranja):</strong> Mostra apenas valores JÁ RECEBIDOS (vendas pagas)</p>
        <p><strong>• A Receber (card cinza):</strong> Valores pendentes de recebimento (vendas não pagas)</p>
        <p><strong>• Faturamento Total:</strong> Faturamento + A Receber = Total de vendas realizadas no período</p>
        <p><strong>• Nas seções abaixo:</strong> Os valores podem incluir tanto vendas pagas quanto pendentes</p>
      </div>
    </div>


      <div id="vendas-dia-mes" className="bg-white rounded-lg border p-4 mb-6">
        <h3 className="text-lg font-semibold mb-3">Vendas por Mês <span className="text-xs text-green-700 font-bold">(Faturamento Recebido)</span></h3>
        <div className="mb-2 text-sm text-green-800 bg-green-50 border-l-4 border-green-400 rounded p-2">
          Esta sessão mostra o <b>faturamento já recebido</b> mês a mês. Os valores representam vendas pagas e confirmadas.
        </div>
        <div className="space-y-2">
          {historicoPagas.map((item, index) => (
            <div key={index} className="flex items-center space-x-3 text-sm">
              <span className="w-14 font-medium">{item.label}</span>
              <div className="flex-1 h-3 bg-gray-100 rounded">
                <div
                  className="h-3 bg-green-500 rounded"
                  style={{ width: `${(item.sales / Math.max(...historicoPagas.map(m => m.sales), 1)) * 100}%` }}
                ></div>
              </div>
              <span className="w-10 text-right">{item.sales}</span>
              <span className="w-20 text-right text-orange-600 font-semibold">
                R$ {item.revenue.toLocaleString('pt-BR')}
              </span>
            </div>
          ))}
        </div>
      </div>

      {selectedPeriod === 'monthly' && (
        <div id="historico-mensal" className="bg-white rounded-lg border p-6 mb-8">
          <h3 className="text-lg font-semibold mb-4">Histórico de Vendas por Mês <span className="text-xs text-blue-700 font-bold">(Valores a Receber)</span></h3>
          <div className="mb-2 text-sm text-blue-800 bg-blue-50 border-l-4 border-blue-400 rounded p-2">
            Esta sessão mostra o <b>histórico de valores a receber</b> de todos os meses. Os valores representam vendas ainda não pagas.
          </div>
          <div className="space-y-2">
            {historicoAReceber.map((item, index) => (
              <div key={index} className="flex items-center space-x-4">
                <span className="w-16 font-medium">{item.label}</span>
                <div className="flex-1 h-4 bg-gray-100 rounded">
                  <div
                    className="h-4 bg-blue-500 rounded"
                    style={{ width: `${(item.sales / Math.max(...historicoAReceber.map(m => m.sales), 1)) * 100}%` }}
                  ></div>
                </div>
                <span className="w-12 text-right">{item.sales}</span>
                <span className="w-20 text-right text-blue-600 font-semibold">
                  R$ {item.revenue.toLocaleString('pt-BR')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

 
<div id="vendas-tipo" className="bg-white rounded-lg border p-4 mb-6">
  <h3 className="text-lg font-semibold mb-4 text-gray-800 border-b pb-2">📊 Vendas Pagas por Tipo de Produto</h3>
  

  <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
    <h4 className="font-medium text-blue-900 mb-2">💡 Entenda os valores apresentados:</h4>
    <div className="text-sm text-blue-800 space-y-1">
      <p><strong>• Quantidade Total:</strong> Total de unidades vendidas deste tipo no período ({selectedPeriod === 'weekly' ? 'semana' : 'mês'} atual)</p>
      <p><strong>• Nº de Vendas:</strong> Quantidade total de vendas realizadas deste tipo no período</p>
      <p><strong>• Para Ovos:</strong> Dúzias = unidades de 12 ovos, Pentes = unidades de 30 ovos</p>
      <p><strong>• Barra de Progresso:</strong> Representa a proporção da quantidade deste tipo</p>
    </div>
    <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded">
      <p className="text-sm text-amber-800">
        <strong>⚠️ Importante:</strong> Os valores podem diferir dos cards principais devido a diferenças metodológicas:
      </p>
      <ul className="text-xs text-amber-700 mt-1 space-y-1">
        <li>• <strong>Cards principais:</strong> Consideram o valor total de cada venda</li>
        <li>• <strong>Relatório por tipo:</strong> Distribui o valor entre os itens individuais de cada venda</li>
        <li>• <strong>Exemplo:</strong> Uma venda de R$ 100 com ovos + mel será contada como R$ 100 nos cards principais, mas dividida entre os tipos aqui</li>
      </ul>
    </div>
    <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded">
      <p className="text-sm text-green-800">
        <strong>✅ Foco na Produção:</strong> Estes cards mostram apenas informações de <strong>quantidade</strong> 
        e <strong>produção</strong>, sem valores financeiros para simplificar a visualização.
      </p>
    </div>
  </div>
  
  <div className="mb-4">
    <label className="block text-sm font-medium text-gray-700 mb-1">
      Buscar por tipo ou produto
    </label>
    <input
      type="text"
      value={searchTermTipo}
      onChange={(e) => setSearchTermTipo(e.target.value)}
      className="block w-full max-w-md p-2 border rounded-md focus:ring focus:ring-blue-200"
      placeholder="Digite o tipo de produto ou nome do produto..."
    />
  </div>


  {searchTermTipo && (
    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
      <p className="text-sm text-blue-800">
        Mostrando {porTipoFiltrado.length} de {porTipoFiltrado.length} tipos de produto
      </p>
    </div>
  )}

  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
  {getFilteredVendasPorTipo().map((t, i) => (
      <div key={i} className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
        <div className="text-center mb-3">
          <div className="text-2xl mb-1">
            {t.tipo === 'Ovos' ? '🥚' : t.tipo === 'Mel' ? '🍯' : '📦'}
          </div>
          <h4 className="text-lg font-bold text-gray-800 capitalize">{t.tipo}</h4>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between items-center p-2 bg-white rounded text-sm">
            <span className="font-medium text-gray-600">Quantidade Total</span>
            <span className="font-bold text-blue-600">{t.quantidade}</span>
          </div>
          
          {t.tipo === 'Ovos' && (
            <>
              <div className="flex justify-between items-center p-2 bg-white rounded text-sm">
                <span className="font-medium text-gray-600">Total Dúzias</span>
                <span className="font-bold text-orange-600">{t.totalDuzias || 0}</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-white rounded text-sm">
                <span className="font-medium text-gray-600">Total Pentes</span>
                <span className="font-bold text-purple-600">{t.totalCaixas || 0}</span>
              </div>
            </>
          )}
          
          <div className="flex justify-between items-center p-2 bg-white rounded text-sm">
            <span className="font-medium text-gray-600">Nº de Vendas</span>
            <span className="font-bold text-green-600">{t.totalVendas}</span>
          </div>
          
       
          {t.produtos && t.produtos.length > 0 && (
            <div className="p-2 bg-blue-50 rounded text-sm border border-blue-200">
              <span className="font-medium text-gray-700 block mb-1">
                Produtos ({t.produtos.length}):
              </span>
              <div className="flex flex-wrap gap-1">
                {t.produtos.slice(0, 3).map((produto: string, idx: number) => (
                  <span 
                  key={idx} 
                  className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium"
                  >
                  {produto}
                  </span>
                ))}
                {t.produtos.length > 3 && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                    +{t.produtos.length - 3} mais
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
        
        <div className="mt-3">
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${
                t.tipo === 'Ovos' ? 'bg-gradient-to-r from-blue-400 to-blue-600' :
                t.tipo === 'Mel' ? 'bg-gradient-to-r from-yellow-400 to-orange-500' :
                'bg-gradient-to-r from-purple-400 to-purple-600'
              }`}
              style={{
                width: `${(t.quantidade / Math.max(...getFilteredVendasPorTipo().map(p => p.quantidade), 1)) * 100}%`,
              }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1 text-center">
            {((t.quantidade / Math.max(...getFilteredVendasPorTipo().map(p => p.quantidade), 1)) * 100).toFixed(1)}% da quantidade {searchTermTipo ? 'filtrada' : 'total'}
          </p>
        </div>
      </div>
    ))}
  </div>
</div>


    
      <div id="vendas-bairro" className="bg-white rounded-lg border p-4 mb-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-800 border-b pb-2">
          🏘️ Vendas por Bairro
        </h3>
        
    
        <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-6">
          <h4 className="font-medium text-green-900 mb-2">💡 Entenda os valores apresentados:</h4>
          <div className="text-sm text-green-800 space-y-1">
            <p><strong>• Faturamento:</strong> Soma total dos valores de todas as vendas realizadas neste bairro no período</p>
            <p><strong>• Total de Vendas:</strong> Quantidade de vendas realizadas neste bairro no período</p>
            <p><strong>• Total de Clientes:</strong> Número de clientes únicos que compraram neste bairro no período</p>
            <p><strong>• Ticket Médio:</strong> Valor médio por venda no bairro (Faturamento ÷ Total de Vendas)</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center mb-4">
          <div className="flex-1 mb-3 sm:mb-0">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Buscar por bairro
            </label>
            <input
              type="text"
              value={searchTermBairro}
              onChange={(e) => setSearchTermBairro(e.target.value)}
              className="block w-full p-2 border rounded-md focus:ring focus:ring-blue-200"
              placeholder="Nome do bairro..."
            />
          </div>
          <div className="flex-1 mb-3 sm:mb-0 sm:ml-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ordenar por
            </label>
            <select
              value={sortByBairro}
              onChange={(e) => setSortByBairro(e.target.value as 'faturamento' | 'totalVendas' | 'totalClientes' | 'bairro')}
              className="block w-full p-2 border rounded-md focus:ring focus:ring-blue-200"
            >
              <option value="faturamento">Faturamento</option>
              <option value="totalVendas">Total de Vendas</option>
              <option value="totalClientes">Total de Clientes</option>
              <option value="bairro">Nome do Bairro</option>
            </select>
          </div>
          <div className="flex-1 mb-3 sm:mb-0 sm:ml-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ordem
            </label>
            <select
              value={sortOrderBairro}
              onChange={(e) => setSortOrderBairro(e.target.value as 'asc' | 'desc')}
              className="block w-full p-2 border rounded-md focus:ring focus:ring-blue-200"
            >
              <option value="desc">Decrescente</option>
              <option value="asc">Crescente</option>
            </select>
          </div>
        </div>
        

        <div className="mb-4 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            Mostrando {vendasPorBairroFiltradas.length} de {vendasPorBairroFiltradas.length} bairros
          </div>
          {searchTermBairro && (
            <button
              onClick={() => setSearchTermBairro('')}
              className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300 transition-colors"
            >
              Limpar Filtros
            </button>
          )}
        </div>
        
        {getFilteredVendasPorBairro().length > 0 ? (
          <div className="space-y-4">
            {getFilteredVendasPorBairro().map((bairro, idx) => (
              <div key={idx} className="bg-gray-50 rounded-lg p-4 border">
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900">
                      {bairro.bairro}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {bairro.totalClientes} cliente{bairro.totalClientes !== 1 ? 's' : ''} • 
                      {bairro.totalVendas} venda{bairro.totalVendas !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-blue-700">
                      R$ {bairro.faturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-gray-500">
                      Ticket médio: R$ {bairro.ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
                
          
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-blue-400 to-blue-600 h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${(bairro.faturamento / Math.max(...getFilteredVendasPorBairro().map(b => b.faturamento), 1)) * 100}%`,
                    }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {((bairro.faturamento / Math.max(...getFilteredVendasPorBairro().map(b => b.faturamento), 1)) * 100).toFixed(1)}% do faturamento filtrado
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">
              {vendasPorBairroFiltradas.length === 0 ? '🏘️' : '🔍'}
            </div>
            <p className="text-gray-500">
              {vendasPorBairroFiltradas.length === 0 
                ? 'Nenhuma venda por bairro neste período' 
                : 'Nenhum bairro encontrado com os filtros aplicados'}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              {vendasPorBairroFiltradas.length === 0 
                ? 'As vendas aparecerão aqui quando houver dados de bairro dos clientes'
                : 'Tente ajustar os filtros de pesquisa'}
            </p>
          </div>
        )}
      </div>

 
      <div id="pagamentos" className="bg-white rounded-lg border p-4 mb-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-800 border-b pb-2">
          💰 Pagamentos de Vendas
        </h3>
        
 
        <div className="bg-emerald-50 border-l-4 border-emerald-400 p-4 mb-6">
          <h4 className="font-medium text-emerald-900 mb-2">💡 Entenda os valores apresentados:</h4>
          <div className="text-sm text-emerald-800 space-y-1">
            <p><strong>• Valor Total:</strong> Valor total da venda que foi paga pelo cliente</p>
            <p><strong>• Data Pagamento:</strong> Data em que o pagamento foi confirmado/recebido</p>
            <p><strong>• Data Venda:</strong> Data em que a venda foi realizada</p>
            <p><strong>• Status:</strong> Somente vendas com status "PAGO" aparecem nesta lista</p>
            <p><strong>• Período:</strong> Mostra apenas vendas pagas no período selecionado ({selectedPeriod === 'weekly' ? 'semana' : 'mês'} atual)</p>
          </div>
        </div>
        
 
        <div className="flex flex-col sm:flex-row sm:items-center mb-4">
          <div className="flex-1 mb-3 sm:mb-0">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Buscar por cliente ou produto
            </label>
            <input
              type="text"
              value={searchTermPagamentos}
              onChange={(e) => setSearchTermPagamentos(e.target.value)}
              className="block w-full p-2 border rounded-md focus:ring focus:ring-blue-200"
              placeholder="Nome do cliente ou produto..."
            />
          </div>
          <div className="flex-1 mb-3 sm:mb-0 sm:ml-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Selecionar cliente
            </label>
            <select
              value={selectedClientePagamentos}
              onChange={(e) => setSelectedClientePagamentos(e.target.value)}
              className="block w-full p-2 border rounded-md focus:ring focus:ring-blue-200"
            >
              <option value="">Todos os Clientes</option>
              {getUniqueClientesPagamentos().map((client, index) => (
                <option key={index} value={client}>
                  {client}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 mb-3 sm:mb-0 sm:ml-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ordenar por
            </label>
            <select
              value={sortByPagamentos}
              onChange={(e) => setSortByPagamentos(e.target.value as 'dataPagamento' | 'valor' | 'cliente')}
              className="block w-full p-2 border rounded-md focus:ring focus:ring-blue-200"
            >
              <option value="dataPagamento">Data do Pagamento</option>
              <option value="valor">Valor</option>
              <option value="cliente">Cliente</option>
            </select>
          </div>
          <div className="flex-1 mb-3 sm:mb-0 sm:ml-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ordem
            </label>
            <select
              value={sortOrderPagamentos}
              onChange={(e) => setSortOrderPagamentos(e.target.value as 'asc' | 'desc')}
              className="block w-full p-2 border rounded-md focus:ring focus:ring-blue-200"
            >
              <option value="desc">Decrescente</option>
              <option value="asc">Crescente</option>
            </select>
          </div>
        </div>
        

        <div className="mb-4 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            Mostrando {getFilteredVendasPagas().length} de {vendasPagasFiltradas.length} vendas pagas
          </div>
          {(searchTermPagamentos || selectedClientePagamentos) && (
            <button
              onClick={() => {
                setSearchTermPagamentos('');
                setSelectedClientePagamentos('');
              }}
              className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300 transition-colors"
            >
              Limpar Filtros
            </button>
          )}
        </div>
        
        {getFilteredVendasPagas().length > 0 ? (
          <div className="space-y-4">
            {getFilteredVendasPagas()
              .map((venda, idx) => (
                <div key={idx} className="bg-gray-50 rounded-lg p-4 border">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        {venda.cliente}
                      </h4>
                      <p className="text-sm text-gray-600">
                        📅 Venda: {venda.dataVenda} | 💰 Pago: {venda.dataPagamento}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-700">
                        R$ {venda.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                        ✅ Pago
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-3">
                    <h5 className="text-sm font-medium text-gray-700 mb-2">Produtos:</h5>
                    <div className="flex flex-wrap gap-2">
                      {venda.produtos.map((produto: any, prodIdx: number) => (
                        <span 
                          key={prodIdx}
                          className="inline-flex items-center px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                        >
                          <span className="text-base mr-1">
                            {produto.tipo === 'ovos' ? '🥚' : produto.tipo === 'mel' ? '🍯' : '📦'}
                          </span>
                          {produto.nome}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">
              {vendasPagasFiltradas.length === 0 ? '💸' : '🔍'}
            </div>
            <p className="text-gray-500">
              {vendasPagasFiltradas.length === 0 
                ? 'Nenhuma venda paga neste período' 
                : 'Nenhuma venda encontrada com os filtros aplicados'}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              {vendasPagasFiltradas.length === 0 
                ? 'Os pagamentos aparecerão aqui quando as vendas forem marcadas como pagas'
                : 'Tente ajustar os filtros de pesquisa ou cliente'}
            </p>
          </div>
        )}
      </div>

      <div id="vendas-pendentes" className="bg-white rounded-lg border p-4">
        <h3 className="text-lg font-semibold mb-4 text-gray-800 border-b pb-2">
          ⏰ Vendas Pendentes
        </h3>
        
 
        <div className="mb-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              type="text"
              placeholder="Buscar cliente ou produto..."
              value={searchTermPendentes}
              onChange={(e) => setSearchTermPendentes(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm"
            />
            
            <select
              value={selectedClientePendentes}
              onChange={(e) => setSelectedClientePendentes(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm"
            >
              <option value="">Todos os clientes</option>
              {getUniqueClientesPendentes().map(cliente => (
                <option key={cliente} value={cliente}>{cliente}</option>
              ))}
            </select>
            
            <select
              value={`${sortByPendentes}-${sortOrderPendentes}`}
              onChange={(e) => {
                const [sortBy, sortOrder] = e.target.value.split('-');
                setSortByPendentes(sortBy as 'dataVenda' | 'valor' | 'cliente');
                setSortOrderPendentes(sortOrder as 'asc' | 'desc');
              }}
              className="px-3 py-2 border rounded-lg text-sm"
            >
              <option value="dataVenda-desc">Data ↓</option>
              <option value="dataVenda-asc">Data ↑</option>
              <option value="valor-desc">Valor ↓</option>
              <option value="valor-asc">Valor ↑</option>
              <option value="cliente-asc">Cliente A-Z</option>
              <option value="cliente-desc">Cliente Z-A</option>
            </select>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <div className="text-gray-500">
              <p><strong>• Período:</strong> Mostra apenas vendas pendentes no período selecionado ({selectedPeriod === 'weekly' ? 'semana' : 'mês'} atual)</p>
              
            </div>
            <div className="text-right">
              <p className="font-semibold text-red-600">
                Total a receber: R$ {getFilteredVendasPendentes().reduce((sum, v) => sum + v.valorDevido, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-gray-500">
                Mostrando {getFilteredVendasPendentes().length} de {vendasPendentesFiltradas.length} vendas pendentes
              </p>
            </div>
          </div>
        </div>

        {getFilteredVendasPendentes().length > 0 ? (
          <div className="space-y-3">
            {getFilteredVendasPendentes()
              .map((venda, index) => (
                <div key={index} className="border rounded-lg p-4 bg-red-50 border-red-200">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-medium text-gray-800">{venda.cliente}</h4>
                      <p className="text-sm text-gray-600">
                        Data da venda: {venda.dataVenda}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-red-600">
                        R$ {venda.valorDevido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded">
                        ⏰ Pendente
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-3">
                    <h5 className="text-sm font-medium text-gray-700 mb-2">Produtos:</h5>
                    <div className="flex flex-wrap gap-2">
                      {venda.produtos.map((produto: any, prodIdx: number) => (
                        <span 
                          key={prodIdx}
                          className="inline-flex items-center px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                        >
                          <span className="text-base mr-1">
                            {produto.tipo === 'ovos' ? '🥚' : produto.tipo === 'mel' ? '🍯' : '📦'}
                          </span>
                          {produto.nome}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">
              {vendasPendentesFiltradas.length === 0 ? '✅' : '🔍'}
            </div>
            <p className="text-gray-500">
              {vendasPendentesFiltradas.length === 0 
                ? 'Nenhuma venda pendente neste período' 
                : 'Nenhuma venda encontrada com os filtros aplicados'}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              {vendasPendentesFiltradas.length === 0 
                ? 'Todas as vendas estão pagas! 🎉'
                : 'Tente ajustar os filtros de pesquisa ou cliente'}
            </p>
          </div>
        )}
      </div>

    
      <div id="clientes-destaque" className="bg-white rounded-lg border shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full mr-4 shadow-lg">
              <span className="text-white font-bold text-xl">⭐</span>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-800">Clientes em Destaque</h3>
              <p className="text-sm text-gray-600">Nossos melhores clientes do período</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Período: {selectedPeriod === 'weekly' ? 'Semanal' : 'Mensal'}</p>
            <p className="text-xs text-gray-400">{new Date().toLocaleDateString('pt-BR')}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-5 border border-blue-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-700 font-medium">Total de Clientes</p>
                <p className="text-3xl font-bold text-blue-800">{dashboardDataComClientesFiltrados.clientesDestaque.length}</p>
                <p className="text-xs text-blue-600 mt-1">
                  {dashboardDataComClientesFiltrados.clientesDestaque.length > 0 ? 'Clientes ativos' : 'Nenhum cliente'}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-200 rounded-full flex items-center justify-center shadow-sm">
                <span className="text-blue-700 text-xl">👥</span>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-5 border border-green-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700 font-medium">Total de Compras</p>
                <p className="text-3xl font-bold text-green-800">
                  {dashboardDataComClientesFiltrados.clientesDestaque.reduce((sum, client) => sum + client.compras, 0)}
                </p>
                <p className="text-xs text-green-600 mt-1">
                  Pedidos realizados
                </p>
              </div>
              <div className="w-12 h-12 bg-green-200 rounded-full flex items-center justify-center shadow-sm">
                <span className="text-green-700 text-xl">🛒</span>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-5 border border-orange-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-700 font-medium">Média de Ovos</p>
                <p className="text-3xl font-bold text-orange-800">
                  {dashboardDataComClientesFiltrados.clientesDestaque.length > 0 ? (dashboardDataComClientesFiltrados.clientesDestaque.reduce((sum, client) => sum + client.media_ovos, 0) / dashboardDataComClientesFiltrados.clientesDestaque.length).toFixed(1) : '0'}
                </p>
                <p className="text-xs text-orange-600 mt-1">
                  Unidades por compra
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-200 rounded-full flex items-center justify-center shadow-sm">
                <span className="text-orange-700 text-xl">🥚</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-5 border border-purple-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-700 font-medium">Cliente Top</p>
                <p className="text-lg font-bold text-purple-800 truncate">
                  {dashboardDataComClientesFiltrados.clientesDestaque.length > 0 ? 
                    dashboardDataComClientesFiltrados.clientesDestaque.sort((a, b) => b.compras - a.compras)[0].nome.split(' ')[0] : 
                    'N/A'
                  }
                </p>
                <p className="text-xs text-purple-600 mt-1">
                  {dashboardDataComClientesFiltrados.clientesDestaque.length > 0 ? 
                    `${dashboardDataComClientesFiltrados.clientesDestaque.sort((a, b) => b.compras - a.compras)[0].compras} compras` : 
                    'Nenhum cliente'
                  }
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-200 rounded-full flex items-center justify-center shadow-sm">
                <span className="text-purple-700 text-xl">🏆</span>
              </div>
            </div>
          </div>
        </div>

     
        <div className="mb-6 p-4 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg border border-indigo-200">
          <div className="flex items-center mb-3">
            <div className="w-8 h-8 bg-indigo-200 rounded-full flex items-center justify-center mr-3">
              <span className="text-indigo-700 text-sm">📊</span>
            </div>
            <h4 className="font-semibold text-indigo-800">Insights Estatísticos</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div className="bg-white rounded-lg p-3 border border-indigo-100">
              <p className="text-indigo-700 font-medium">Fidelidade dos Clientes</p>
              <p className="text-indigo-600">
                {dashboardDataComClientesFiltrados.clientesDestaque.length > 0 ? 
                  `${((dashboardDataComClientesFiltrados.clientesDestaque.filter(c => c.compras >= 3).length / dashboardDataComClientesFiltrados.clientesDestaque.length) * 100).toFixed(1)}%` : 
                  '0%'
                } dos clientes fizeram 3+ compras
              </p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-indigo-100">
              <p className="text-indigo-700 font-medium">Consumo Médio</p>
              <p className="text-indigo-600">
                {dashboardDataComClientesFiltrados.clientesDestaque.length > 0 ? 
                  `${(dashboardDataComClientesFiltrados.clientesDestaque.reduce((sum, client) => sum + client.compras, 0) / dashboardDataComClientesFiltrados.clientesDestaque.length).toFixed(1)}` : 
                  '0'
                } compras por cliente
              </p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-indigo-100">
              <p className="text-indigo-700 font-medium">Potencial de Crescimento</p>
              <p className="text-indigo-600">
                {dashboardDataComClientesFiltrados.clientesDestaque.length > 0 ? 
                  `${dashboardDataComClientesFiltrados.clientesDestaque.filter(c => c.compras === 1).length}` : 
                  '0'
                } clientes com 1 compra
              </p>
            </div>
          </div>
        </div>

       
        <div className="space-y-4">
          {clientesDestaqueFiltrados.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">👥</div>
              <h4 className="text-xl font-semibold text-gray-600 mb-2">Nenhum cliente encontrado</h4>
              <p className="text-gray-500">Não há clientes registrados no período selecionado</p>
            </div>
          ) : (
            clientesDestaqueFiltrados.map((client, index) => {
              const isTopClient = index === 0;
              const performance = Math.min(100, Math.round((client.compras / Math.max(...dashboardData.clientesDestaque.map(c => c.compras))) * 100));
              const frequencyBadge = client.compras >= 5 ? 'VIP' : client.compras >= 3 ? 'Frequente' : 'Novo';
              const frequencyColor = client.compras >= 5 ? 'from-gold-400 to-yellow-500' : client.compras >= 3 ? 'from-blue-400 to-blue-500' : 'from-green-400 to-green-500';
              
              return (
                <div key={index} className={`rounded-xl p-6 border transition-all duration-300 hover:shadow-lg ${
                  isTopClient ? 
                    'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-300 shadow-md' : 
                    'bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200 hover:shadow-md'
                }`}>
                  {isTopClient && (
                    <div className="flex items-center justify-center w-full mb-4">
                      <div className="bg-gradient-to-r from-yellow-400 to-amber-500 text-white px-4 py-1 rounded-full text-sm font-bold flex items-center">
                        <span className="mr-2">🏆</span>
                        Cliente Destaque #1
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-5">
                      <div className="relative">
                        <div className={`flex items-center justify-center w-16 h-16 rounded-full text-white font-bold text-xl shadow-lg ${
                          isTopClient ? 'bg-gradient-to-br from-yellow-400 to-amber-500' : 'bg-gradient-to-br from-purple-400 to-indigo-500'
                        }`}>
                          {client.nome.charAt(0).toUpperCase()}
                        </div>
                        {isTopClient && (
                          <div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs font-bold">1</span>
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center space-x-3 mb-1">
                          <h4 className="font-bold text-gray-800 text-xl">{client.nome}</h4>
                          <span className={`px-3 py-1 rounded-full text-xs font-bold text-white bg-gradient-to-r ${frequencyColor}`}>
                            {frequencyBadge}
                          </span>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span className="inline-flex items-center">
                            <svg className="w-4 h-4 mr-1 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            Última compra: {client.ultimoPedido}
                          </span>
                          <span className="inline-flex items-center">
                            <svg className="w-4 h-4 mr-1 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                            </svg>
                            Ranking: #{index + 1}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-6">
                      <div className="text-center">
                        <div className="flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full text-white shadow-lg">
                          <div className="text-center">
                            <div className="text-xl font-bold">{client.compras}</div>
                            <div className="text-xs opacity-90">compras</div>
                          </div>
                        </div>
                        <div className="mt-2 text-xs text-gray-500">
                          {client.compras > 1 ? 'Cliente fiel' : 'Primeira compra'}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center w-20 h-20 bg-gradient-to-br from-orange-400 to-red-500 rounded-full text-white shadow-lg">
                          <div className="text-center">
                            <div className="text-xl font-bold">{client.media_ovos}</div>
                            <div className="text-xs opacity-90 leading-tight">ovos<br/>média</div>
                          </div>
                        </div>
                        <div className="mt-2 text-xs text-gray-500">
                          {client.media_ovos >= 30 ? 'Alto consumo' : client.media_ovos >= 12 ? 'Consumo médio' : 'Baixo consumo'}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                 
                  <div className="mt-6">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">Performance do Cliente</span>
                      <span className="text-sm text-gray-500">{performance}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className={`h-3 rounded-full transition-all duration-500 ${
                          performance === 100 ? 'bg-gradient-to-r from-yellow-400 to-amber-500' : 
                          performance >= 75 ? 'bg-gradient-to-r from-green-400 to-emerald-500' :
                          performance >= 50 ? 'bg-gradient-to-r from-blue-400 to-blue-500' :
                          'bg-gradient-to-r from-purple-400 to-pink-500'
                        }`}
                        style={{ width: `${performance}%` }}
                      ></div>
                    </div>
                  </div>

        
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="bg-white rounded-lg p-3 border border-gray-200">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Tipo de Cliente</span>
                        <span className="text-sm font-semibold text-gray-800">
                          {client.compras >= 5 ? '🌟 VIP' : client.compras >= 3 ? '👤 Frequente' : '🆕 Novo'}
                        </span>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-gray-200">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Potencial</span>
                        <span className="text-sm font-semibold text-gray-800">
                          {client.media_ovos >= 30 ? '🚀 Alto' : client.media_ovos >= 12 ? '📈 Médio' : '🌱 Crescimento'}
                        </span>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-gray-200">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Fidelidade</span>
                        <span className="text-sm font-semibold text-gray-800">
                          {client.compras >= 5 ? '💎 Excelente' : client.compras >= 3 ? '⭐ Boa' : '🔄 Iniciante'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="mt-8 space-y-4">
       
          <div className="p-5 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-lg border border-yellow-200">
            <div className="flex items-start">
              <div className="w-10 h-10 bg-yellow-200 rounded-full flex items-center justify-center mr-4 mt-0.5">
                <span className="text-yellow-700 text-lg">💡</span>
              </div>
              <div>
                <h5 className="font-semibold text-yellow-800 mb-2">Dica da Fazenda:</h5>
                <p className="text-sm text-yellow-700 mb-3">
                  Mantenha contato regular com estes clientes especiais! Eles representam a base sólida do seu negócio.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div className="bg-yellow-100 rounded-lg p-3">
                    <p className="font-medium text-yellow-800">🌟 Para clientes VIP:</p>
                    <p className="text-yellow-700">Ofereça desconto especial ou produtos exclusivos</p>
                  </div>
                  <div className="bg-yellow-100 rounded-lg p-3">
                    <p className="font-medium text-yellow-800">🆕 Para clientes novos:</p>
                    <p className="text-yellow-700">Envie mensagem de boas-vindas e dicas de uso</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

        
          <div className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
            <div className="flex items-start">
              <div className="w-10 h-10 bg-blue-200 rounded-full flex items-center justify-center mr-4 mt-0.5">
                <span className="text-blue-700 text-lg">🚀</span>
              </div>
              <div>
                <h5 className="font-semibold text-blue-800 mb-2">Estratégias de Crescimento:</h5>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                  <div className="bg-blue-100 rounded-lg p-3">
                    <p className="font-medium text-blue-800">📱 WhatsApp Business</p>
                    <p className="text-blue-700">Crie grupos para ofertas especiais e novidades</p>
                  </div>
                  <div className="bg-blue-100 rounded-lg p-3">
                    <p className="font-medium text-blue-800">🎁 Programa de Fidelidade</p>
                    <p className="text-blue-700">A cada 10 compras, ganhe 1 dúzia grátis</p>
                  </div>
                  <div className="bg-blue-100 rounded-lg p-3">
                    <p className="font-medium text-blue-800">👥 Indicação de Amigos</p>
                    <p className="text-blue-700">Desconto para quem trouxer novos clientes</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-5 bg-gradient-to-r from-red-50 to-pink-50 rounded-lg border border-red-200">
            <div className="flex items-start">
              <div className="w-10 h-10 bg-red-200 rounded-full flex items-center justify-center mr-4 mt-0.5">
                <span className="text-red-700 text-lg">⚠️</span>
              </div>
              <div>
          
                <div className="space-y-2 text-sm">
                  {dashboardData.clientesDestaque.filter(c => c.compras === 1).length > 0 && (
                    <div className="bg-red-100 rounded-lg p-3">
                      <p className="font-medium text-red-800">
                        🔔 {dashboardData.clientesDestaque.filter(c => c.compras === 1).length} cliente(s) fizeram apenas 1 compra
                      </p>
                      <p className="text-red-700">Entre em contato para garantir a segunda compra!</p>
                    </div>
                  )}
                  
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    


  );
}