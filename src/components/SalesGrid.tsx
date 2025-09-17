import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useQuery } from "@tanstack/react-query";
import { Edit, Trash2, Save, X } from "lucide-react";
import { Button } from "./ui/button";
import SalesHeader from "./SalesHeader";
import { apiRequest } from "../utils/queryClient";
import { useSalesContext } from "../context/SalesContext";
import NewSaleRow from "./NewSaleRow";
import moment from "moment-timezone";
import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { ptBR } from "date-fns/locale/pt-BR";
registerLocale("pt-BR", ptBR);
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

interface Cliente {
  id: number;
  nome: string;
  endereco: string;
  bairro: string;
  dia_semana: string;
  status: string;
}

interface Produto {
  id_produto: number;
  nomeProduto: string;
}

interface VendaComCliente {
  id: number;
  dataVenda: string;
  dataPagamento?: string;
  valorTotal: number;
  totalDuzias: number;
  totalCaixas: number;
  statusPagamento: string;
  observacoes: string;
  cliente: Cliente;
  itens: {
    id: number;
    quantidade: number;
    precoTotal: number;
    produto: Produto;
  }[];
}

async function fetchVendas(): Promise<VendaComCliente[]> {
  const res = await apiRequest("GET", "/vendas");
  if (!res.ok) throw new Error("Erro ao buscar vendas");
  const vendas = await res.json();
  console.log("resposta de /vendas:", vendas);
  return vendas;
}

function formatarDataBR(dataISO: string | undefined): string {
  if (!dataISO) return "";
  return moment.tz(dataISO, "America/Sao_Paulo").format("DD/MM/YYYY");
}

function getValorColuna(venda: VendaComCliente, index: number): string {
  const campos = [
    formatarDataBR(venda.dataVenda),
    venda.cliente.nome,
    venda.cliente.endereco,
    venda.cliente.bairro,
    venda.cliente.dia_semana,
    venda.cliente.status,
    venda.itens.map(i => i.produto?.nomeProduto ?? "Produto desconhecido").join(", "),
    `R$ ${Number(venda.valorTotal ?? 0).toFixed(2)}`,
    venda.totalDuzias.toString(),
    venda.totalCaixas.toString(),
    venda.statusPagamento,
    formatarDataBR(venda.dataPagamento),
    venda.observacoes || "",
  ];
  return campos[index] ?? "";
}


const diasSemana = [
   "variavel",
  "segunda",
  "terça",
  "quarta",
  "quinta",
  "sexta",
  "sábado",
  "domingo"

];

const statusCliente = [
  "semanal",
  "potencial",
  "quinzenal",
  "chamar",
  "esporadico",
  "viajando",
];


const SalesGrid: React.FC = () => {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [produtoInputs, setProdutoInputs] = useState<string[]>([]);
  const [showProdutoSuggestions, setShowProdutoSuggestions] = useState<boolean[]>([]);
  
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const [columnWidths, setColumnWidths] = useState<number[]>(() => {
    const widths = Array(14).fill(150);
    widths[6] = 250;
    return widths;
  });
  const [rowHeights, setRowHeights] = useState<number[]>(Array(100).fill(50));
  const [showNewRow, setShowNewRow] = useState(false);
  const [filtros, setFiltros] = useState<string[][]>(Array(14).fill([]));
  const [openFiltroIndex, setOpenFiltroIndex] = useState<number | null>(null);
  const [searchTexts, setSearchTexts] = useState<string[]>(Array(14).fill(""));
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [showDeleteManyModal, setShowDeleteManyModal] = useState(false);
  const queryClient = useQueryClient();
  const { selectedDate, filterMode, startDate, endDate } = useSalesContext();

  const deleteMutation = useMutation<void, unknown, number, { previousVendas?: any[] }>({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/vendas/${id}`);
      if (!res.ok) throw new Error("Erro ao excluir venda");
     
      return;
    },
    onMutate: async (id: number) => {
      
      await queryClient.cancelQueries({ queryKey: ["vendas"] });
      const previousVendas = queryClient.getQueryData<any[]>(["vendas"]);
      if (previousVendas) {
        queryClient.setQueryData(["vendas"], previousVendas.filter(v => v.id !== id));
      }
      return { previousVendas };
    },
    onError: (_error, _variables, context: { previousVendas?: any[] } | undefined) => {
      if (context?.previousVendas) {
        queryClient.setQueryData(["vendas"], context.previousVendas);
      }
      toast.error("Erro ao excluir venda.");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendas"] });
      toast.success("Venda excluída com sucesso!");
    }
  });

  const deleteManyMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      await Promise.all(ids.map(id => apiRequest("DELETE", `/vendas/${id}`)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendas"] });
      toast.success("Vendas excluídas com sucesso!");
      setSelectedIds([]);
    },
    onError: () => {
      toast.error("Erro ao excluir vendas.");
    }
  });

  const { data: vendas = [], isLoading } = useQuery({ queryKey: ["vendas"], queryFn: fetchVendas });
  useEffect(() => {
    setRowHeights(Array(vendas.length).fill(50));
  }, [vendas.length]);

 

  function startRowResize(e: React.MouseEvent<HTMLDivElement>, rowIndex: number) {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = rowHeights[rowIndex];
    function onMouseMove(ev: MouseEvent) {
      const delta = ev.clientY - startY;
      setRowHeights(prev => {
        const next = [...prev];
        next[rowIndex] = Math.max(20, startHeight + delta);
        return next;
      });
    }
    function onMouseUp() {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    }
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }

  function handleSearchTextChange(index: number, value: string) {
    setSearchTexts(prev => {
      const novo = [...prev];
      novo[index] = value;
      return novo;
    });
  }

  function handleOpenFiltro(index: number) {
    setOpenFiltroIndex(prev => (prev === index ? null : index));
  }

  function handleFiltroCheckboxChange(index: number, valor: string) {
    setFiltros(prev => {
      const atual = prev[index] || [];
      const existe = atual.includes(valor);
      const novoFiltro = existe ? atual.filter(v => v !== valor) : [...atual, valor];
      const novoFiltros = [...prev];
      novoFiltros[index] = novoFiltro;
      return novoFiltros;
    });
  }

  function handleClearFiltro(index: number) {
    setFiltros(prev => {
      const novo = [...prev];
      novo[index] = [];
      return novo;
    });
    setOpenFiltroIndex(null);
  }

  const { data: produtos = [] } = useQuery<Produto[]>({
    queryKey: ["produtos"],
    queryFn: async () => (await apiRequest("GET", "/produto")).json(),
  });


  const vendasFiltradas = vendas
    .filter(venda => {
      const vendaDate = moment(venda.dataVenda).tz("America/Sao_Paulo").format("YYYY-MM-DD");
      if (filterMode === "day") return vendaDate === selectedDate;
      if (filterMode === "week") return vendaDate >= startDate && vendaDate <= endDate;
      return false;
    })
    .filter(venda => {
      const campos = [
        formatarDataBR(venda.dataVenda),
        venda.cliente.nome,
        venda.cliente.endereco,
        venda.cliente.bairro,
        venda.cliente.dia_semana,
        venda.cliente.status,
        venda.itens.map(i => i.produto?.nomeProduto ?? "Produto desconhecido").join(", "),
        `R$ ${Number(venda.valorTotal ?? 0).toFixed(2)}`,
        venda.totalDuzias.toString(),
        venda.totalCaixas.toString(),
        venda.statusPagamento,
        formatarDataBR(venda.dataPagamento),
        venda.observacoes || "",
      ];
      return filtros.every((filtroColuna, idx) => {
        if (!filtroColuna || filtroColuna.length === 0) return true;
        
        if (idx === 8) {
        
          return venda.itens.some(item => filtroColuna.includes((item as any).unidade));
        }
        const campo = campos[idx].toLowerCase();
        return filtroColuna.some(valor => campo.includes(valor.toLowerCase()));
      });
    });

  function startResize(e: React.MouseEvent<HTMLDivElement>, index: number): void {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = columnWidths[index];
    function onMouseMove(ev: MouseEvent) {
      const delta = ev.clientX - startX;
      setColumnWidths(prev => {
        const newWidths = [...prev];
        newWidths[index] = Math.max(50, startWidth + delta);
        return newWidths;
      });
    }
    function onMouseUp() {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    }
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }

  function handleCancel(): void {
    setEditingId(null);
    setEditForm({});
  }

  function handleDeleteClick(id: number): void {

    
    setDeleteId(id);
  }

  async function handleSave(event: React.MouseEvent<HTMLButtonElement, MouseEvent>): Promise<void> {
    event.preventDefault();
    if (editingId === null) return;

    const vendaOriginal = vendas.find(v => v.id === editingId);
    if (!vendaOriginal) return;

    const clienteAtualizado = {
      ...vendaOriginal.cliente,
      nome: editForm.nome ?? vendaOriginal.cliente.nome,
      endereco: editForm.endereco ?? vendaOriginal.cliente.endereco,
      bairro: editForm.bairro ?? vendaOriginal.cliente.bairro,
      dia_semana: editForm.dia_semana ?? vendaOriginal.cliente.dia_semana,
      status: editForm.status ?? vendaOriginal.cliente.status,
    };

    
    const itensAtualizados = (editForm.itens || vendaOriginal.itens)
      .map((item: any, idx: number) => {
        // Busca o nome do produto do input ou do objeto
        const nomeProduto = produtoInputs[idx] ?? item.produto?.nomeProduto ?? item.produto ?? '';
        // Busca o produto pelo nome
        const produtoEncontrado = (produtos || []).find((p: any) => p.nomeProduto === nomeProduto);
        // Usa o id_produto do autocomplete, do item, ou do objeto produto
        let id_produto = produtoEncontrado?.id_produto
          ?? item.id_produto
          ?? item.produto?.id_produto
          ?? item.produto?.id;
        id_produto = Number(id_produto);
        // Se não for válido, não inclui esse item
        if (isNaN(id_produto) || !id_produto) {
          return null;
        }
        return {
          id: item.id,
          id_produto,
          quantidade: Number(item.quantidade) || 1,
          unidade: item.unidade ?? "unidade",
        };
      })
      .filter(Boolean); // Remove itens inválidos

    const clienteMudou = (
      clienteAtualizado.nome !== vendaOriginal.cliente.nome ||
      clienteAtualizado.endereco !== vendaOriginal.cliente.endereco ||
      clienteAtualizado.bairro !== vendaOriginal.cliente.bairro ||
      clienteAtualizado.dia_semana !== vendaOriginal.cliente.dia_semana ||
      clienteAtualizado.status !== vendaOriginal.cliente.status
    );

    
    console.log('--- handleSave Debug ---');
    console.log('editingId:', editingId);
    console.log('clienteAtualizado:', clienteAtualizado);

    try {
      
      if (clienteMudou) {
        const resCliente = await apiRequest("PATCH", `/cliente/${vendaOriginal.cliente.id}`, {
          nome: clienteAtualizado.nome,
          endereco: clienteAtualizado.endereco,
          bairro: clienteAtualizado.bairro,
          dia_semana: clienteAtualizado.dia_semana,
          status: clienteAtualizado.status,
        });
        if (!resCliente.ok) {
          const errorText = await resCliente.text();
          console.error('Erro ao atualizar cliente:', errorText);
          throw new Error("Erro ao atualizar cliente: " + errorText);
        }
      }

      const payload = {
        dataVenda: editForm.dataVenda
          ? moment(editForm.dataVenda, "DD/MM/YYYY").format("YYYY-MM-DD")
          : vendaOriginal.dataVenda,
        valorTotal: Number(editForm.valorTotal ?? vendaOriginal.valorTotal),
        statusPagamento: editForm.statusPagamento ?? vendaOriginal.statusPagamento,
        dataPagamento: editForm.dataPagamento
          ? moment(editForm.dataPagamento, "YYYY-MM-DD").format("YYYY-MM-DD")
          : vendaOriginal.dataPagamento,
        observacoes: editForm.observacoes ?? vendaOriginal.observacoes,
        cliente: clienteAtualizado,
        itens: itensAtualizados,
      };

      console.log('payload venda:', payload);
      const res = await apiRequest("PATCH", `/vendas/${editingId}`, payload);
      console.log('API response:', res);
      if (!res.ok) {
        const errorText = await res.text();
        console.error('API error response:', errorText);
        throw new Error("Erro ao atualizar venda: " + errorText);
      }
  
  setEditingId(null);
  setEditForm({});
  setProdutoInputs([]);
  setShowProdutoSuggestions([]);
  await queryClient.invalidateQueries({ queryKey: ["vendas"] });
  toast.success("Venda e cliente atualizados com sucesso!");
    } catch (error) {
      console.error('handleSave error:', error);
      toast.error("Erro ao salvar alterações.");
    }
  }
  function handleEdit(venda: VendaComCliente): void {
    setEditingId(venda.id);
    setEditForm({
      nome: venda.cliente.nome,
      endereco: venda.cliente.endereco,
      bairro: venda.cliente.bairro,
      dia_semana: venda.cliente.dia_semana,
      status: venda.cliente.status,
      dataVenda: formatarDataBR(venda.dataVenda),
      valorTotal: venda.valorTotal,
      statusPagamento: venda.statusPagamento,
      dataPagamento: venda.dataPagamento,
      observacoes: venda.observacoes,
      itens: venda.itens.map(item => ({
        id: item.id,
        id_produto: item.produto.id_produto,
        produto: { ...item.produto },
        quantidade: item.quantidade,
        unidade: (item as any).unidade || "unidade",
      })),
    });
    
    setProdutoInputs(venda.itens.map(item => item.produto.nomeProduto));
    setShowProdutoSuggestions(venda.itens.map(() => false));
  }
  return (
    <div className="bg-white rounded-lg shadow">
      <SalesHeader onAddNew={() => {
        setShowNewRow(true);
        setTimeout(() => {
          window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        }, 100);
      }} />

      {deleteId !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded shadow max-w-sm w-full">
            <p>Tem certeza que deseja excluir esta venda?</p>
            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={async () => {
                  if (deleteId !== null) {
                    await deleteMutation.mutateAsync(deleteId);
                  }
                  setDeleteId(null);
                }}
                className="bg-red-600 text-white px-3 py-1 rounded flex items-center justify-center min-w-[70px]"
                >
                Excluir
              </button>
              <button onClick={() => setDeleteId(null)} className="bg-gray-300 px-3 py-1 rounded">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
  
      {showDeleteManyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded shadow max-w-sm w-full" style={{ marginTop: '80px' }}>
            <p>Tem certeza que deseja excluir {selectedIds.length} venda(s) selecionada(s)?</p>
            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={() => {
                  deleteManyMutation.mutate(selectedIds);
                  setShowDeleteManyModal(false);
                }}
                className="bg-red-600 text-white px-3 py-1 rounded"
              >
                Excluir
              </button>
              <button onClick={() => setShowDeleteManyModal(false)} className="bg-gray-300 px-3 py-1 rounded">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-x-auto relative">
        <div className="flex bg-green-800 text-white text-xs">
          
          <div style={{ width: 40 }} className="p-2 font-semibold border-r border-white/30 flex items-center justify-center">
            <input
              type="checkbox"
              checked={vendasFiltradas.length > 0 && selectedIds.length === vendasFiltradas.length}
              onChange={e => {
                if (e.target.checked) {
                  setSelectedIds(vendasFiltradas.map(v => v.id));
                } else {
                  setSelectedIds([]);
                }
              }}
              aria-label="Selecionar todas"
            />
          </div>
          {[
            "Data",
            "Cliente",
            "Endereço",
            "Bairro",
            "Dia da Semana",
            "Tipo Cliente",
            "Produtos",
            "Quantidade",
            "Grandeza",
            "Valor",
            "Status Pagamento",
            "Data Pagamento",
            "Observações",
            "Ações",
          ].map((h, index) => {
          
            let filtroIndex = index;
            if (index === 7) filtroIndex = 8;
            if (index === 9) filtroIndex = 7;
            const isGrandeza = index === 8;
            return (
              <div key={h}
                style={{ width: columnWidths[index] }}
                className="relative p-2 font-semibold border-r border-white/30"
              >
                <div>{h}</div>
                {index < 13 && (
                  <>
                    
                    <button
                      id={`filtro-btn-${index}`}
                      onClick={() => handleOpenFiltro(index)}
                      className="mt-1 text-[10px] bg-green-700 text-white px-1 py-0.5 rounded"
                    >
                      Filtro
                    </button>
                    {openFiltroIndex === index && (
                      <div
                        className="fixed bg-white border p-2 text-black z-50 max-h-72 overflow-y-auto shadow-lg rounded w-52"
                        style={{
                          top: `${document.getElementById(`filtro-btn-${index}`)?.getBoundingClientRect().bottom ?? 0}px`,
                          left: `${document.getElementById(`filtro-btn-${index}`)?.getBoundingClientRect().left ?? 0}px`,
                        }}
                      >
                        {isGrandeza ? (
                          <>
                            <div className="mb-2 font-semibold text-xs">Filtrar por Grandeza:</div>
                            {["unidade", "Dúzia", "Pente"].map((valor) => (
                              <label key={valor} className="block text-xs cursor-pointer px-1 py-0.5 hover:bg-gray-100">
                                <input
                                  type="checkbox"
                                  checked={filtros[index]?.includes(valor)}
                                  onChange={() => handleFiltroCheckboxChange(index, valor)}
                                  className="mr-1"
                                />
                                {valor.charAt(0).toUpperCase() + valor.slice(1)}
                              </label>
                            ))}
                            <button onClick={() => handleClearFiltro(index)} className="mt-2 text-xs text-blue-600 hover:underline">
                              Limpar
                            </button>
                          </>
                        ) : (
                          <>
                            <input
                              type="text"
                              value={searchTexts[filtroIndex]}
                              onChange={e => handleSearchTextChange(filtroIndex, e.target.value)}
                              placeholder="Buscar..."
                              className="w-full mb-2 p-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-green-500"
                            />
                            {Array.from(new Set(vendas.map(v => getValorColuna(v, filtroIndex))))
                              .filter(valor => valor.toLowerCase().includes(searchTexts[filtroIndex].toLowerCase()))
                              .map((valor, idx) => (
                                <label key={idx} className="block text-xs cursor-pointer px-1 py-0.5 hover:bg-gray-100">
                                  <input
                                    type="checkbox"
                                    checked={filtros[filtroIndex]?.includes(valor)}
                                    onChange={() => handleFiltroCheckboxChange(filtroIndex, valor)}
                                    className="mr-1"
                                  />
                                  {valor || "(Vazio)"}
                                </label>
                              ))}
                            <button onClick={() => handleClearFiltro(filtroIndex)} className="mt-2 text-xs text-blue-600 hover:underline">
                              Limpar
                            </button>
                          </>
                        )}
                      </div>
                    )}
                    <div onMouseDown={e => startResize(e, index)} className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-white/20" />
                  </>
                )}
              </div>
            );
          })}
        </div>

        <div>
          {isLoading ? (
            <div className="p-8 text-center">Carregando dados...</div>
          ) : vendasFiltradas.length === 0 ? (
            <div className="p-8 text-center">Nenhuma venda encontrada.</div>
          ) : (
            <>
              
              {selectedIds.length > 0 && (
                <div className="p-2 bg-red-100 border-b flex items-center gap-2">
                  <button
                    className="bg-red-600 text-white px-3 py-1 rounded text-xs"
                    onClick={() => setShowDeleteManyModal(true)}
                  >
                    Excluir selecionados
                  </button>
                  <span className="text-xs">{selectedIds.length} selecionado(s)</span>
                </div>
              )}
              <div onDoubleClick={() => {
                setShowNewRow(true);
                setTimeout(() => {
                  window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                }, 100);
              }}>
                {vendasFiltradas.map((venda, rowIndex) => (
                  <div
                    key={venda.id}
                    className="flex border-b text-sm relative items-start min-h-[70px]"
                    style={{ height: rowHeights[rowIndex] }}
                  >
                  
                    <div style={{ width: 40, paddingTop: 8, paddingBottom: 8 }} className="flex items-center justify-center border-r">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(venda.id)}
                        onChange={e => {
                          if (e.target.checked) {
                            setSelectedIds(prev => [...prev, venda.id]);
                          } else {
                            setSelectedIds(prev => prev.filter(id => id !== venda.id));
                          }
                        }}
                        aria-label="Selecionar venda"
                        style={{ width: 14, height: 14 }}
                      />
                    </div>
                    
                    {[
                 
                    editingId === venda.id ? (
                      <DatePicker
                        selected={
                          editForm.dataVenda
                            ? moment(editForm.dataVenda, "DD/MM/YYYY").toDate()
                            : undefined
                        }
                        onChange={(date: Date | null) =>
                          date &&
                          setEditForm((f: any) => ({
                            ...f,
                            dataVenda: moment(date).tz("America/Sao_Paulo").format("DD/MM/YYYY"),
                          }))
                        }
                        locale="pt-BR"
                        dateFormat="dd/MM/yyyy"
                        className="w-full p-1 text-xs border"
                        placeholderText="DD/MM/YYYY"
                        calendarClassName="w-32 text-[12px] scale-75 origin-bottom-left"
                        popperPlacement="bottom-start"
                        popperContainer={({children}) => <div style={{zIndex: 9999}}>{children}</div>}
                      />
                    ) : (
                      <div title={formatarDataBR(venda.dataVenda)} className="truncate">{formatarDataBR(venda.dataVenda)}</div>
                    ),
                   
                    editingId === venda.id ? (
                      <input
                        type="text"
                        value={editForm.nome}
                        onChange={e => setEditForm({ ...editForm, nome: e.target.value })}
                        className="w-full p-1 text-xs border"
                        placeholder="Cliente"
                        autoComplete="off"
                      />
                    ) : (
                      <div title={venda.cliente.nome} className="p-2 border-r">{venda.cliente.nome}</div>
                    ),
             
                    editingId === venda.id ? (
                      <input
                        type="text"
                        value={editForm.endereco}
                        onChange={e => setEditForm({ ...editForm, endereco: e.target.value })}
                        className="w-full p-1 text-xs border"
                      />
                    ) : (
                      <div title={venda.cliente.endereco} className="p-2 border-r">{venda.cliente.endereco}</div>
                    ),
                   
                    editingId === venda.id ? (
                      <input
                        type="text"
                        value={editForm.bairro}
                        onChange={e => setEditForm({ ...editForm, bairro: e.target.value })}
                        className="w-full p-1 text-xs border"
                      />
                    ) : (
                      <div title={venda.cliente.bairro} className="p-2 border-r">{venda.cliente.bairro}</div>
                    ),
                   
                    editingId === venda.id ? (
                      <select
                        value={editForm.dia_semana}
                        onChange={e => setEditForm({ ...editForm, dia_semana: e.target.value })}
                        className="w-full p-1 text-xs border rounded"
                      >
                        <option value="">Dia da Semana</option>
                        {diasSemana.map((d: string) => (
                          <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="p-1 text-xs">{venda.cliente.dia_semana}</div>
                    ),
                    
                    editingId === venda.id ? (
                      <select
                        value={editForm.status}
                        onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                        className="w-full p-1 text-xs border rounded"
                      >
                        <option value="">Tipo Cliente</option>
                        {statusCliente.map((s: string) => (
                          <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="p-1 text-xs">{venda.cliente.status}</div>
                    ),
                   
                    editingId === venda.id ? (
                      <div style={{ width: columnWidths[6] }} className="p-2 border-r">
                        <ul className="space-y-1 text-sm">
                          {(editForm.itens || venda.itens).map((item: any, idx: number) => {
                            // ...existing code for rendering product input...
                            const inputValue = produtoInputs[idx] ?? (item.produto?.nomeProduto ?? item.produto ?? '');
                            const filteredProdutos = (produtos || []).filter((p: any) =>
                              p.nomeProduto.toLowerCase().includes((inputValue || '').toLowerCase())
                            );
                            // ...existing code for rendering product input and suggestions...
                            return (
                              <li key={item.id || idx} className="flex flex-col gap-1 items-start relative w-full">
                                <div className="flex items-center w-full gap-2">
                                  <input
                                    type="text"
                                    value={inputValue}
                                    onChange={e => {
                                      const nomeProduto = e.target.value;
                                      setProdutoInputs(inputs => {
                                        const arr = [...inputs];
                                        arr[idx] = nomeProduto;
                                        return arr;
                                      });
                                      setShowProdutoSuggestions(shows => {
                                        const arr = [...shows];
                                        arr[idx] = true;
                                        return arr;
                                      });
                                      const newItens = [...(editForm.itens || venda.itens)];
                                      if (newItens[idx].produto && typeof newItens[idx].produto === 'object') {
                                        newItens[idx].produto = { ...newItens[idx].produto, nomeProduto };
                                      } else {
                                        newItens[idx].produto = nomeProduto;
                                      }
                                      setEditForm((prev: any) => ({ ...prev, itens: newItens }));
                                    }}
                                    onFocus={() => {
                                      setShowProdutoSuggestions(shows => {
                                        const arr = [...shows];
                                        arr[idx] = true;
                                        return arr;
                                      });
                                    }}
                                    onBlur={() => setTimeout(() => {
                                      // Se só houver uma sugestão, seleciona automaticamente
                                      if (filteredProdutos.length === 1) {
                                        const p = filteredProdutos[0];
                                        setProdutoInputs(inputs => {
                                          const arr = [...inputs];
                                          arr[idx] = p.nomeProduto;
                                          return arr;
                                        });
                                        setEditForm((prev: typeof editForm) => {
                                          const newItens = [...(prev.itens || venda.itens)];
                                          newItens[idx] = {
                                            ...newItens[idx],
                                            produto: { ...p },
                                            id_produto: p.id_produto,
                                          };
                                          // Recalcula valor total
                                          let novoValorTotal = 0;
                                          newItens.forEach((item, i) => {
                                            let produtoSelecionado: Produto | undefined;
                                            if (i === idx) {
                                              produtoSelecionado = p;
                                            } else if (typeof item.produto === 'object' && item.produto !== null) {
                                              produtoSelecionado = item.produto;
                                            } else if (typeof item.produto === 'string') {
                                              produtoSelecionado = (produtos || []).find((prod: Produto) => prod.nomeProduto === (item.produto as unknown as string));
                                            } else {
                                              produtoSelecionado = undefined;
                                            }
                                            const preco: number = produtoSelecionado && (produtoSelecionado as any).preco ? Number((produtoSelecionado as any).preco) : 0;
                                            const quantidade: number = Number(item.quantidade) || 1;
                                            novoValorTotal += preco * quantidade;
                                          });
                                          return { ...prev, itens: newItens, valorTotal: novoValorTotal };
                                        });
                                      }
                                      setShowProdutoSuggestions(shows => {
                                        const arr = [...shows];
                                        arr[idx] = false;
                                        return arr;
                                      });
                                    }, 150)}
                                    className="p-1 text-xs border rounded w-36"
                                    placeholder="Produto"
                                    autoComplete="off"
                                  />
                                  {/* Botão de remover produto */}
                                  <button
                                    type="button"
                                    className="ml-1 p-1 text-xs text-red-600 hover:text-white hover:bg-red-600 rounded"
                                    title="Remover produto"
                                    onClick={() => {
                                      setEditForm((prev: any) => {
                                        const newItens = [...(prev.itens || venda.itens)];
                                        newItens.splice(idx, 1);
                                        return { ...prev, itens: newItens };
                                      });
                                      setProdutoInputs(inputs => {
                                        const arr = [...inputs];
                                        arr.splice(idx, 1);
                                        return arr;
                                      });
                                      setShowProdutoSuggestions(shows => {
                                        const arr = [...shows];
                                        arr.splice(idx, 1);
                                        return arr;
                                      });
                                    }}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                                {showProdutoSuggestions[idx] && filteredProdutos.length > 0 && (
                                  <ul className="absolute z-50 bg-white border rounded shadow w-36 max-h-40 overflow-y-auto mt-7 left-0">
                                    {filteredProdutos.map((p: any) => (
                                      <li
                                        key={p.id_produto}
                                        className="px-2 py-1 text-xs cursor-pointer hover:bg-green-100"
                                        onMouseDown={e => {
                                          e.preventDefault();
                                          setProdutoInputs(inputs => {
                                            const arr = [...inputs];
                                            arr[idx] = p.nomeProduto;
                                            return arr;
                                          });
                                          setShowProdutoSuggestions(shows => {
                                            const arr = [...shows];
                                            arr[idx] = false;
                                            return arr;
                                          });
                                          setEditForm((prev: typeof editForm) => {
                                            const newItens = [...(prev.itens || venda.itens)];
                                            newItens[idx] = {
                                              ...newItens[idx],
                                              produto: { ...p },
                                              id_produto: p.id_produto ?? p.id,
                                            };
                                            // Recalcula valor total
                                            let novoValorTotal = 0;
                                            newItens.forEach((item, i) => {
                                              let produtoSelecionado: Produto | undefined;
                                              if (i === idx) {
                                                produtoSelecionado = p;
                                              } else if (typeof item.produto === 'object' && item.produto !== null) {
                                                produtoSelecionado = item.produto;
                                              } else if (typeof item.produto === 'string') {
                                                produtoSelecionado = (produtos || []).find((prod: Produto) => prod.nomeProduto === (item.produto as unknown as string));
                                              } else {
                                                produtoSelecionado = undefined;
                                              }
                                              const preco: number = produtoSelecionado && (produtoSelecionado as any).preco ? Number((produtoSelecionado as any).preco) : 0;
                                              const quantidade: number = Number(item.quantidade) || 1;
                                              novoValorTotal += preco * quantidade;
                                            });
                                            return { ...prev, itens: newItens, valorTotal: novoValorTotal };
                                          });
                                        }}
                                      >
                                        {p.nomeProduto}
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                        <button
                          type="button"
                          className="mt-2 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs"
                          onClick={() => {
                            setEditForm((prev: any) => ({
                              ...prev,
                              itens: [
                                ...(prev.itens || venda.itens),
                                { produto: '', id_produto: '', quantidade: 1 }
                              ]
                            }));
                            setProdutoInputs(inputs => [...inputs, '']);
                            setShowProdutoSuggestions(shows => [...shows, false]);
                          }}
                        >Adicionar produto</button>
                      </div>
                    ) : (
                      <div style={{ width: columnWidths[6] }} className="p-2 border-r">
                        <ul className="list-disc list-inside space-y-1 text-sm">
                          {venda.itens.map(item => (
                            <li key={item.id}>{item.produto.nomeProduto}</li>
                          ))}
                        </ul>
                      </div>
                    ),
                   
                    editingId === venda.id ? (
                      <div style={{ width: columnWidths[7] }} className="p-2 border-r">
                        <ul className="space-y-1 text-sm">
                          {(editForm.itens || venda.itens).map((item: any, idx: number) => (
                            <li key={item.id || idx}>
                              <input
                                type="number"
                                value={item.quantidade ?? 1}
                                min={1}
                                onChange={e => {
                                  const newItens = [...(editForm.itens || venda.itens)];
                                  newItens[idx].quantidade = e.target.value;
                                  setEditForm((prev: any) => ({ ...prev, itens: newItens }));
                                }}
                                className="p-1 text-xs border rounded w-12"
                              />
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <div style={{ width: columnWidths[7] }} className="p-2 border-r">
                        <ul className="list-none space-y-1 text-sm">
                          {venda.itens.map(item => (
                            <li key={item.id}>{item.quantidade}</li>
                          ))}
                        </ul>
                      </div>
                    ),
                    
                    editingId === venda.id ? (
                      <div style={{ width: columnWidths[8] }} className="p-2 border-r">
                        <ul className="space-y-1 text-sm">
                          {(editForm.itens || venda.itens).map((item: any, idx: number) => (
                            <li key={item.id || idx}>
                              <select
                                value={item.unidade || 'unidade'}
                                onChange={e => {
                                  const newItens = [...(editForm.itens || venda.itens)];
                                  newItens[idx].unidade = e.target.value as 'unidade' | 'Dúzia' | 'Pente';
                                  setEditForm((prev: any) => ({ ...prev, itens: newItens }));
                                }}
                                className="p-1 text-xs border rounded w-20"
                              >
                                <option value="unidade">Unidade</option>
                                <option value="Dúzia">Dúzia</option>
                                <option value="Pente">Pente</option>
                              </select>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <div style={{ width: columnWidths[8] }} className="p-2 border-r">
                        <ul className="space-y-1 text-sm">
                          {venda.itens.map((item, idx) => (
                            <li key={item.id || idx}>{(item as any).unidade || 'Unidade'}</li>
                          ))}
                        </ul>
                      </div>
                    ),
                    
                    editingId === venda.id ? (
                      <input
                        type="number"
                        value={editForm.valorTotal || venda.valorTotal || 0}
                        onChange={e => setEditForm({ ...editForm, valorTotal: e.target.value })}
                        className="w-full p-1 text-xs border"
                      />
                    ) : (
                      `R$ ${Number(venda.valorTotal ?? 0).toFixed(2)}`
                    ),
                    
                    editingId === venda.id ? (
                      <select
                        value={editForm.statusPagamento || venda.statusPagamento}
                        onChange={e => setEditForm({ ...editForm, statusPagamento: e.target.value })}
                        className="w-full p-1 text-xs border"
                      >
                        <option value="pago">Pago</option>
                        <option value="pendente">Pendente</option>
                      </select>
                    ) : (
                      venda.statusPagamento
                    ),
               
                    editingId === venda.id ? (
                      <DatePicker
                        selected={
                          editForm.dataPagamento
                            ? moment(editForm.dataPagamento, "YYYY-MM-DD").toDate()
                            : undefined
                        }
                        onChange={(date: Date | null) =>
                          date &&
                          setEditForm((f: any) => ({
                            ...f,
                            dataPagamento: moment(date).tz("America/Sao_Paulo").format("YYYY-MM-DD"),
                          }))
                        }
                        locale="pt-BR"
                        dateFormat="dd/MM/yyyy"
                        className="w-full p-1 text-xs border"
                        placeholderText="DD/MM/YYYY"
                        calendarClassName="w-32 text-[12px] scale-75 origin-bottom-left"
                        popperPlacement="bottom-start"
                        popperContainer={({children}) => <div style={{zIndex: 9999}}>{children}</div>}
                      />
                    ) : (
                      <div title={formatarDataBR(venda.dataPagamento)} className="truncate">{formatarDataBR(venda.dataPagamento)}</div>
                    ),
              
                    editingId === venda.id ? (
                      <input
                        type="text"
                        value={editForm.observacoes || venda.observacoes || ''}
                        onChange={e => setEditForm({ ...editForm, observacoes: e.target.value })}
                        className="w-full p-1 text-xs border"
                      />
                    ) : (
                      <div title={venda.observacoes} className="truncate">{venda.observacoes}</div>
                    ),
               
                    editingId === venda.id ? (
                      <div className="flex space-x-2 justify-center">
                        <Button onClick={handleSave}><Save className="w-4 h-4" /></Button>
                        <Button onClick={handleCancel}><X className="w-4 h-4 text-red-600" /></Button>
                      </div>
                    ) : (
                      <div className="flex justify-center gap-2">
                        <Button onClick={() => handleEdit(venda)} className="p-2 w-8 h-8 flex items-center justify-center rounded bg-green-600 hover:bg-green-700" title="Editar venda">
                          <Edit className="w-4 h-4 text-white" />
                        </Button>
                        <Button onClick={() => handleDeleteClick(venda.id)} className="p-2 w-8 h-8 flex items-center justify-center rounded bg-red-600 hover:bg-red-700">
                          <Trash2 className="w-4 h-4 text-white" />
                        </Button>
                      </div>
                    ),
                  ].map((cell, i) => (
                    <div key={i} style={{ width: columnWidths[i] }} className="p-2 border-r truncate whitespace-nowrap overflow-hidden">
                      {cell}
                    </div>
                  ))}
                  <div
                    onMouseDown={e => startRowResize(e, rowIndex)}
                    style={{
                      position: "absolute",
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: "5px",
                      cursor: "row-resize",
                      background: "transparent",
                      zIndex: 10,
                    }}
                  />
                </div>
              ))}
              </div>
            </>
          )}
        </div>

        {showNewRow && (
          <NewSaleRow 
            onCancel={() => setShowNewRow(false)} 
            columnWidths={columnWidths} 
            setColumnWidths={setColumnWidths}
            selectedDate={selectedDate}
          />
        )}

      </div>
    </div>
  );
};

export default SalesGrid;