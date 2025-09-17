import React, { useState, useEffect } from "react";
import { apiRequest } from "../utils/queryClient";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import moment from "moment-timezone";
import { ptBR } from "date-fns/locale/pt-BR";
registerLocale("pt-BR", ptBR);
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";


interface Cliente {
  id_cliente: number;
  nome: string;
  endereco: string;
  bairro: string;
  dia_semana: string;
  status: string;
  dezenas_padrao: number;
  pentes_padrao: number;
}

interface Produto {
  id: number;
  nomeProduto: string;
  preco?: number;
}

interface NewSaleRowProps {
  onCancel: () => void;
  columnWidths: number[];
  setColumnWidths: (widths: number[]) => void;
  selectedDate?: string;
}

function formatarDataBR(dataISO: string | undefined): string {
  if (!dataISO) return "";
  return moment.tz(dataISO, "America/Sao_Paulo").format("DD/MM/YYYY");
}


const diasSemana = ["variavel", "segunda", "terça", "quarta", "quinta", "sexta", "sábado", "domingo"];
const statusCliente = ["semanal", "potencial", "quinzenal", "chamar", "esporadico", "viajando", "defina status do cliente"];
const statusPagamentos = ["pago", "pendente"];

const NewSaleRow: React.FC<NewSaleRowProps> = ({ onCancel, columnWidths, selectedDate }) => {

const [mostrarSugestoesProdutoModal, setMostrarSugestoesProdutoModal] = React.useState<{ [idx: number]: boolean }>({});
const queryClient = useQueryClient();



  let ClicouNaSugestao = false;
  let ClicouNaSugestaoProduto=false;

const [mostrarSugestoesCliente, setMostrarSugestoesCliente] = useState(false);
const [mostrarSugestoesProduto, setMostrarSugestoesProduto] = useState(false);

  type ProdutoVenda = {
    id_produto?: number;
    produto: string;
    valor_unitario: string;
    quantidade: number;
  unidade: 'unidade' | 'Dúzia' | 'Pente';
  };
  const [form, setForm] = useState<{
    id_cliente?: number;
    nome: string;
    endereco: string;
    bairro: string;
    dia_semana: string;
    status: string;
    produtos: ProdutoVenda[];
    status_pagamento: string;
    data_entrega: string;
    data_pagamento: string;
    observacoes: string;
  }>({
    id_cliente: undefined,
    nome: "",
    endereco: "",
    bairro: "",
    dia_semana: "",
    status: "",
    produtos: [
      { id_produto: undefined, produto: "", valor_unitario: '', quantidade: 1, unidade: 'unidade' }
    ],
    status_pagamento: "pendente",
    data_entrega: selectedDate
      ? selectedDate.includes("/")
        ? selectedDate
        : moment(selectedDate, "YYYY-MM-DD").format("DD/MM/YYYY")
      : formatarDataBR(moment().tz("America/Sao_Paulo").toISOString()),
    data_pagamento: "",
    observacoes: "",
  });
  const [showProductsModal, setShowProductsModal] = useState(false);

  const [showClienteModal, setShowClienteModal] = useState(false);
  const [showProdutoModal, setShowProdutoModal] = useState(false);
  const [novoCliente, setNovoCliente] = useState<{ nome: string; endereco: string; bairro: string; dia_semana: string; status: string }>({
    nome: "",
    endereco: "",
    bairro: "",
    dia_semana: "",
    status: "",
  });
  const [novoProduto, setNovoProduto] = useState<{ nomeProduto: string; tipoProduto: string; preco: number }>({
    nomeProduto: "",
    tipoProduto: "",
    preco: 0,
  });
  const { data: clientes = [], refetch: refetchClientes } = useQuery<Cliente[]>({
    queryKey: ["clientes"],
    queryFn: async () => (await apiRequest("GET", "/cliente")).json(),
  });

  const { data: produtos = [], refetch: refetchProdutos } = useQuery<Produto[]>({
    queryKey: ["produtos"],
    queryFn: async () => (await apiRequest("GET", "/produto")).json(),
  });

 
  useEffect(() => {
    if (produtos.length > 0 && form.produtos[0].produto === "") {
      const ovos = produtos.find(p => p.nomeProduto.toLowerCase() === "ovos");
      if (ovos) {
        setForm(prev => {
          const produtosArr = [...prev.produtos];
          produtosArr[0] = {
            ...produtosArr[0],
            produto: ovos.nomeProduto,
            id_produto: ovos.id,
            valor_unitario: ovos.preco ? ovos.preco.toString() : '',
          };
          return { ...prev, produtos: produtosArr };
        });
      }
    }
  }, [produtos]);

  
  const clientesFiltrados = form.nome
    ? clientes.filter(c => c.nome.toLowerCase().includes(form.nome.toLowerCase()))
    : clientes;
  
  const produtosFiltrados = (produtoBusca: string) =>
    produtoBusca
      ? produtos.filter((p: Produto) => p.nomeProduto.toLowerCase().includes(produtoBusca.toLowerCase()))
      : produtos;

  const handleClienteSelect = (cliente: any) => {
    console.log("Cliente selecionado:", cliente);
  setForm(prev => ({
    ...prev,
    nome: cliente.nome,
    id_cliente: cliente.id,
    endereco: cliente.endereco,
    bairro: cliente.bairro,
    dia_semana: cliente.dia_semana,
    status: cliente.status,
    dezenas_padrao: cliente.dezenas_padrao?.toString() ?? "",
    pentes_padrao: cliente.pentes_padrao?.toString() ?? "",
  }));
};
  const handleProdutoModalSelect = (idx: number, produto: any) => {
    setForm(prev => {
      const produtos = [...prev.produtos];
      produtos[idx].produto = produto.nomeProduto;
      produtos[idx].id_produto = produto.id_produto;
  
      if (produto.preco !== undefined && produto.preco !== null) {
        produtos[idx].valor_unitario = produto.preco.toString();
      }
      return { ...prev, produtos };
    });
  };



  const handleClienteBlur = () => {
  setTimeout(() => {
    if (ClicouNaSugestao) {
      ClicouNaSugestao = false;
      return;
    }

    const cliente = clientes.find(c => c.nome.trim().toLowerCase() === form.nome.trim().toLowerCase());

    if (cliente) {
      handleClienteSelect(cliente);
    } else if (form.nome.trim() !== "") {
      setMostrarSugestoesCliente(false);  
      setShowClienteModal(true);
      setNovoCliente({ nome: form.nome, endereco: "", bairro: "", dia_semana: "", status: "" });
    }
  }, 0);
};


 
const handleProdutoBlur = () => {
  setTimeout(() => {
    if (ClicouNaSugestaoProduto) {
      ClicouNaSugestaoProduto = false;
      return;
    }

   
    const produtoNome = form.produtos[0]?.produto || "";
    const produto = produtos.find(p =>
      p.nomeProduto.trim().toLowerCase() === produtoNome.trim().toLowerCase()
    );

    if (produto) {
     
    } else if (produtoNome.trim() !== "") {
      setMostrarSugestoesProduto(false);  
      setShowProdutoModal(true);
      setNovoProduto({ nomeProduto: produtoNome, tipoProduto: "", preco: 0 });
    }
  }, 0);
};




  const handleNovoClienteSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  console.log("Payload que estou enviando:", novoCliente);

  try {
    await apiRequest("POST", "/cliente", novoCliente);
    await refetchClientes();
    setShowClienteModal(false);
    toast.success("Cliente cadastrado com sucesso!");

    const clienteCadastrado = (await apiRequest("GET", "/cliente")).json();
    const novo = (await clienteCadastrado).find((c: any) => c.nome.toLowerCase() === novoCliente.nome.toLowerCase());
    if (novo) handleClienteSelect(novo);
  } catch {
    toast.error("Erro ao cadastrar cliente!");
  }
};

const handleNovoProdutoSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  try {
    await apiRequest("POST", "/produto", novoProduto);
    await refetchProdutos();
    setShowProdutoModal(false);
    toast.success("Produto cadastrado com sucesso!");

    const produtosAtualizados = (await apiRequest("GET", "/produto")).json();
    const novo = (await produtosAtualizados).find((p: any) => p.nomeProduto.toLowerCase() === novoProduto.nomeProduto.toLowerCase());
    if (novo) handleProdutoModalSelect(0, novo);
  } catch {
    toast.error("Erro ao cadastrar produto!");
  }
};


  const handleChange = (field: keyof typeof form, value: string | number) => {
    setForm(prev => {
      const newState = { ...prev, [field]: value };
      if (field === "nome" && value !== prev.nome) {
        newState.id_cliente = undefined;
      }
      return newState;
    });
  };
  
  const handleProdutoFieldChange = (idx: number, field: keyof ProdutoVenda, value: string) => {
    setForm(prev => {
      const produtos = [...prev.produtos];
      produtos[idx] = { ...produtos[idx], [field]: value };
      return { ...prev, produtos };
    });
  };
  const handleAddProduto = () => {
    setForm(prev => ({
      ...prev,
      produtos: [
        ...prev.produtos,
        { id_produto: undefined, produto: "", valor_unitario: '', quantidade: 1, unidade: 'unidade' }
      ]
    }));
  };
  const handleRemoveProduto = (idx: number) => {
    setForm(prev => {
      const produtos = prev.produtos.length > 1 ? prev.produtos.filter((_, i) => i !== idx) : prev.produtos;
      return { ...prev, produtos };
    });
  };


 
const handleSubmit = async () => {
  console.log("[handleSubmit] form:", form);
  if (!form.id_cliente) {
    console.log("[handleSubmit] Falta id_cliente");
    toast.error("Selecione um cliente!");
    return;
  }

  
  const produtosCorrigidos = form.produtos.map((p, idx) => {
    if (!p.id_produto && p.produto) {
      const prod = produtos.find(produto => produto.nomeProduto.trim().toLowerCase() === p.produto.trim().toLowerCase());
      if (prod) {
        console.log(`[handleSubmit] Produto preenchido automaticamente para o item ${idx}:`, prod);
    
        return { ...p, id_produto: prod.id };
      } else {
        console.log(`[handleSubmit] Produto NÃO encontrado para o item ${idx}:`, p.produto);
      }
    }
    return p;
  });

  console.log("[handleSubmit] produtosCorrigidos:", produtosCorrigidos);

  if (produtosCorrigidos.some(p => !p.id_produto || !p.valor_unitario || !p.quantidade)) {
    console.log("[handleSubmit] Falta campo obrigatório em produtos:", produtosCorrigidos);
    toast.error("Preencha todos os campos obrigatórios dos produtos!");
    return;
  }

  const [dia, mes, ano] = form.data_entrega.split("/");
  const dataVendaFormatada = `${ano}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;
  let dataPagamentoFormatada: string | undefined;
  if (form.data_pagamento) {
    const [diaPag, mesPag, anoPag] = form.data_pagamento.split("/");
    dataPagamentoFormatada = `${anoPag}-${mesPag.padStart(2, "0")}-${diaPag.padStart(2, "0")}`;
  }
  const valorTotal = produtosCorrigidos.reduce((acc, p) => acc + Number(p.valor_unitario || 0) * Number(p.quantidade || 0), 0);
  const novaVenda = {
    id_cliente: Number(form.id_cliente),
    dataVenda: dataVendaFormatada,
    dataPagamento: dataPagamentoFormatada,
    valorTotal,
    statusPagamento: form.status_pagamento,
    observacoes: form.observacoes,
    itens: produtosCorrigidos.map(p => ({
      id_produto: Number(p.id_produto),
      quantidade: Number(p.quantidade),
      preco_unitario: Number(p.valor_unitario),
      unidade: p.unidade,
    })),
  };
  console.log("[handleSubmit] novaVenda:", novaVenda);
  try {
    const resp = await apiRequest("POST", "/vendas", novaVenda);
    console.log("[handleSubmit] Resposta do backend:", resp);
    queryClient.invalidateQueries({ queryKey: ["vendas"] });
    toast.success("Venda cadastrada com sucesso!");
    onCancel();
  } catch (error) {
    console.log("[handleSubmit] Erro ao salvar venda:", error);
    toast.error("Erro ao salvar venda!");
  }
};

  const renderInput = (content: React.ReactNode, width: number, index: number) => (
    <div key={index} style={{ width }} className="p-2 border-r">
      {content}
    </div>
  );



  return (
    <>
  
     {showClienteModal && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <form className="bg-white p-6 rounded shadow space-y-3" onSubmit={handleNovoClienteSubmit}>
      <h2 className="text-lg font-bold mb-2">Novo Cliente</h2>

      <input
        className="w-full border p-1 rounded"
        placeholder="Nome"
        value={novoCliente.nome}
        onChange={e => setNovoCliente(n => ({ ...n, nome: e.target.value }))}
        required
      />

      <input
        className="w-full border p-1 rounded"
        placeholder="Endereço"
        value={novoCliente.endereco}
        onChange={e => setNovoCliente(n => ({ ...n, endereco: e.target.value }))}
        required
      />

      <input
        className="w-full border p-1 rounded"
        placeholder="Bairro"
        value={novoCliente.bairro}
        onChange={e => setNovoCliente(n => ({ ...n, bairro: e.target.value }))}
        required
      />

      <select
        className="w-full border p-1 rounded"
        value={novoCliente.dia_semana}
        onChange={e => setNovoCliente(n => ({ ...n, dia_semana: e.target.value }))}
        required
      >
        <option value="">Selecione o Dia da Semana</option>
        {diasSemana.map((dia) => (
          <option key={dia} value={dia}>{dia}</option>
        ))}
      </select>

      <select
        className="w-full border p-1 rounded"
        value={novoCliente.status}
        onChange={e => setNovoCliente(n => ({ ...n, status: e.target.value }))}
        required
      >
        <option value="">Selecione o Tipo de Cliente</option>
        {statusCliente.map((status) => (
          <option key={status} value={status}>{status}</option>
        ))}
      </select>

      <div className="flex justify-end space-x-2">
        <button type="submit" className="bg-green-600 text-white px-3 py-1 rounded">Salvar</button>
        <button type="button" onClick={() => setShowClienteModal(false)} className="bg-gray-400 text-white px-3 py-1 rounded">Cancelar</button>
      </div>
    </form>
  </div>
)}


     {showProdutoModal && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <form
      className="bg-white p-6 rounded shadow space-y-3"
      onSubmit={handleNovoProdutoSubmit}
    >
      <h2 className="text-lg font-bold mb-2">Novo Produto</h2>

      <input
        className="w-full border p-1 rounded"
        placeholder="Nome do Produto"
        value={novoProduto.nomeProduto}
        onChange={e =>
          setNovoProduto(n => ({ ...n, nomeProduto: e.target.value }))
        }
        required
      />

       <select
        className="w-full border p-1 rounded"
        value={novoProduto.tipoProduto}
        onChange={e =>
          setNovoProduto(n => ({ ...n, tipoProduto: e.target.value }))
        }
        required
      >
        <option value="">Selecione o Tipo de Produto</option>
        <option value="ovos">Ovos</option>
        <option value="mel">Mel</option>
        <option value="outro">Outro</option>
      </select>

      <input
        type="number"
        step="0.01"
        className="w-full border p-1 rounded"
        placeholder="Preço"
        value={novoProduto.preco}
        onChange={e =>
          setNovoProduto(n => ({ ...n, preco: Number(e.target.value) }))
        }
        required
      /> 

      <div className="flex justify-end space-x-2">
        <button
          type="submit"
          className="bg-green-600 text-white px-3 py-1 rounded"
        >
          Salvar
        </button>
        <button
          type="button"
          onClick={() => setShowProdutoModal(false)}
          className="bg-gray-400 text-white px-3 py-1 rounded"
        >
          Cancelar
        </button>
      </div>
    </form>
  </div>
)}


      <div className="flex border-b text-sm bg-yellow-50">
        {renderInput(
          <DatePicker
            selected={(() => {
              const [dia, mes, ano] = form.data_entrega.split("/");
              return new Date(Number(ano), Number(mes) - 1, Number(dia));
            })()}
            onChange={date =>
              date &&
              handleChange(
                "data_entrega",
                formatarDataBR(moment(date).tz("America/Sao_Paulo").toISOString())
              )
            }
            locale="pt-BR"
            dateFormat="dd/MM/yyyy"
            className="w-24 px-2 py-1 border rounded text-xs"
            calendarClassName="text-xs scale-[0.8] w-[240px] origin-top-left"
            popperPlacement="bottom-start"
            
          />,
          columnWidths[0],
          0
        )}

       {renderInput(
  <div style={{ position: "relative" }}>
    <input
      type="text"
      value={form.nome}
      onChange={e => {
        handleChange("nome", e.target.value);
        setMostrarSugestoesCliente(true);
      }}
      onBlur={handleClienteBlur}
      placeholder="Cliente"
      className="w-full p-1 border rounded text-sm"
      autoComplete="off"
    />
    {form.nome && clientesFiltrados.length > 0 && mostrarSugestoesCliente && (
      <div
        style={{
          position: "absolute",
          bottom: "100%",
          left: 0,
          minWidth: "300px",
          background: "white",
          border: "1px solid #ccc",
          boxShadow: "0 4px 10px rgba(0,0,0,0.2)",
          zIndex: 9999,
          overflowY: "auto",
          maxHeight: "300px",
        }}
      >
        {clientesFiltrados.map((c) => (
          <div
            key={c.id_cliente}
            style={{
              padding: "8px",
              cursor: "pointer",
              borderBottom: "1px solid #eee",
              whiteSpace: "nowrap",
            }}
            onMouseDown={() => {
              ClicouNaSugestao = true;
              handleClienteSelect(c);
              setMostrarSugestoesCliente(false);
            }}
          >
            {c.nome}
          </div>
        ))}
      </div>
    )}
  </div>,
  columnWidths[1],
  1
)}
        {renderInput(
          <input type="text" value={form.endereco} onChange={e => handleChange("endereco", e.target.value)} className="w-full p-1 border rounded text-sm" placeholder="Endereço" />,
          columnWidths[2],
          2
        )}

        {renderInput(
          <input type="text" value={form.bairro} onChange={e => handleChange("bairro", e.target.value)} className="w-full p-1 border rounded text-sm" placeholder="Bairro" />,
          columnWidths[3],
          3
        )}

        {renderInput(
          <select value={form.dia_semana} onChange={e => handleChange("dia_semana", e.target.value)} className="w-full p-1 border rounded text-sm">
            <option value="">Dia da Semana</option>
            {diasSemana.map(dia => (
              <option key={dia} value={dia}>{dia}</option>
            ))}
          </select>,
          columnWidths[4],
          4
        )}

        {renderInput(
          <select value={form.status} onChange={e => handleChange("status", e.target.value)} className="w-full p-1 border rounded text-sm">
            <option value="">Tipo Cliente</option>
            {statusCliente.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>,
          columnWidths[5],
          5
        )}

        <div style={{ width: columnWidths[6], position: "relative", display: "flex", flexDirection: "column", justifyContent: "flex-start" }} className="p-2 border-r">
          <div style={{ display: "flex", alignItems: "center", width: "100%", position: "relative" }}>
            <input
              type="text"
              value={form.produtos[0]?.produto || ""}
              onChange={e => {
                handleProdutoFieldChange(0, "produto", e.target.value);
                setMostrarSugestoesProduto(true);
              }}
              onBlur={handleProdutoBlur}
              placeholder="Produto"
              className="w-full p-1 border rounded text-sm"
              autoComplete="off"
            />
          
            {form.produtos[0]?.produto && produtosFiltrados(form.produtos[0]?.produto).length > 0 && mostrarSugestoesProduto && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  minWidth: "220px",
                  background: "white",
                  border: "1px solid #ccc",
                  boxShadow: "0 4px 10px rgba(0,0,0,0.2)",
                  zIndex: 9999,
                  overflowY: "auto",
                  maxHeight: "200px",
                }}
              >
                {produtosFiltrados(form.produtos[0]?.produto).map((p: Produto) => (
                  <div
                    key={p.id}
                    style={{
                      padding: "8px",
                      cursor: "pointer",
                      borderBottom: "1px solid #eee",
                      whiteSpace: "nowrap",
                    }}
                    onMouseDown={() => {
                      ClicouNaSugestaoProduto = true;
                      handleProdutoFieldChange(0, "produto", p.nomeProduto);
                      handleProdutoFieldChange(0, "id_produto", p.id.toString());
                      if (p.preco !== undefined && p.preco !== null) {
                        handleProdutoFieldChange(0, "valor_unitario", p.preco.toString());
                      }
                      setMostrarSugestoesProduto(false);
                    }}
                  >
                    {p.nomeProduto}
                  </div>
                ))}
              </div>
            )}
            <input
              type="number"
              value={form.produtos[0]?.valor_unitario || ''}
              onChange={e => handleProdutoFieldChange(0, "valor_unitario", e.target.value)}
              className="w-16 border rounded text-sm px-1 ml-1"
              placeholder="Valor"
            />
          </div>
          
          <div className="w-full mt-2 flex justify-end">
            <button
              type="button"
              onClick={() => setShowProductsModal(true)}
              className="bg-blue-600 text-white px-3 py-1 rounded"
            >
              Adicionar Produto
            </button>
          </div>
        </div>
  
  {showProductsModal && (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-2xl border border-gray-200">
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Produtos da Venda</h2>
        <div className="grid grid-cols-12 gap-2 px-1 pb-2 border-b border-gray-200 mb-2 text-gray-600 font-semibold text-sm">
          <div className="col-span-4">Produto</div>
          <div className="col-span-2">Valor Unitário</div>
          <div className="col-span-2">Quantidade</div>
          <div className="col-span-2">Grandeza</div>
          <div className="col-span-2 text-center">Valor</div>
        </div>
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {form.produtos.map((item, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-gray-50 rounded-lg p-2 border border-gray-100">
              <div className="col-span-4 relative">
                
                {idx === 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input
                      type="text"
                      value={item.produto}
                      className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-200 text-sm bg-gray-100"
                      placeholder="Produto"
                      autoComplete="off"
                      readOnly
                    />
                  
                    <button
                      type="button"
                      style={{ marginLeft: 4, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                      title="Editar produto"
                      onClick={() => {
                        const produtoObj = produtos.find(p => p.nomeProduto === item.produto);
                        if (produtoObj) {
                          setNovoProduto({
                            nomeProduto: produtoObj.nomeProduto,
                            tipoProduto: '',
                            preco: produtoObj.preco || 0,
                          });
                        } else {
                          setNovoProduto({ nomeProduto: item.produto, tipoProduto: '', preco: 0 });
                        }
                        setShowProdutoModal(true);
                      }}
                    >
                      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M14.7 2.29a1 1 0 0 1 1.42 0l1.59 1.59a1 1 0 0 1 0 1.42l-9.3 9.3-2.83.71.71-2.83 9.3-9.3zM3 17h14v2H3v-2z" fill="#555"/>
                      </svg>
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input
                      type="text"
                      value={item.produto}
                      onChange={e => {
                        handleProdutoFieldChange(idx, "produto", e.target.value);
                        setMostrarSugestoesProdutoModal(s => ({ ...s, [idx]: true }));
                      }}
                      onBlur={() => setTimeout(() => setMostrarSugestoesProdutoModal(s => ({ ...s, [idx]: false })), 150)}
                      className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-200 text-sm"
                      placeholder="Produto"
                      autoComplete="off"
                    />
                    
                    <button
                      type="button"
                      style={{ marginLeft: 4, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                      title="Editar produto"
                      onClick={() => {
                        const produtoObj = produtos.find(p => p.nomeProduto === item.produto);
                        if (produtoObj) {
                          setNovoProduto({
                            nomeProduto: produtoObj.nomeProduto,
                            tipoProduto: '',
                            preco: produtoObj.preco || 0,
                          });
                        } else {
                          setNovoProduto({ nomeProduto: item.produto, tipoProduto: '', preco: 0 });
                        }
                        setShowProdutoModal(true);
                      }}
                    >
                      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M14.7 2.29a1 1 0 0 1 1.42 0l1.59 1.59a1 1 0 0 1 0 1.42l-9.3 9.3-2.83.71.71-2.83 9.3-9.3zM3 17h14v2H3v-2z" fill="#555"/>
                      </svg>
                    </button>
                    
                    {item.produto && produtosFiltrados(item.produto).length > 0 && mostrarSugestoesProdutoModal?.[idx] && (
                      <div
                        style={{
                          position: "absolute",
                          top: "100%",
                          left: 0,
                          minWidth: "180px",
                          background: "white",
                          border: "1px solid #ccc",
                          boxShadow: "0 4px 10px rgba(0,0,0,0.2)",
                          zIndex: 9999,
                          overflowY: "auto",
                          maxHeight: "200px",
                        }}
                      >
                        {produtosFiltrados(item.produto).map((p: Produto) => (
                          <div
                            key={p.id}
                            style={{
                              padding: "8px",
                              cursor: "pointer",
                              borderBottom: "1px solid #eee",
                              whiteSpace: "nowrap",
                            }}
                            onMouseDown={() => {
                              handleProdutoModalSelect(idx, p);
                              setMostrarSugestoesProdutoModal(s => ({ ...s, [idx]: false }));
                            }}
                          >
                            {p.nomeProduto}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>



              <input
                type="number"
                value={item.valor_unitario || ''}
                onChange={e => handleProdutoFieldChange(idx, "valor_unitario", e.target.value)}
                className="col-span-2 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-200 text-sm"
                placeholder="Valor Unitário"
              />
              <input
                type="number"
                value={item.quantidade || 1}
                min={1}
                onChange={e => handleProdutoFieldChange(idx, "quantidade", e.target.value)}
                className="col-span-2 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-200 text-sm"
                placeholder="Quantidade"
              />
              <select
                value={item.unidade || 'unidade'}
                onChange={e => handleProdutoFieldChange(idx, 'unidade', e.target.value)}
                className="col-span-2 p-2 border border-gray-300 rounded text-sm"
              >
                <option value="unidade">Unidade</option>
                <option value="Dúzia">Dúzia</option>
                <option value="Pente">Pente</option>
              </select>
              <input
                type="number"
                value={(Number(item.valor_unitario) * Number(item.quantidade)).toFixed(2)}
                className="col-span-2 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-200 text-sm bg-gray-100 font-bold text-green-700"
                placeholder="Valor Total"
                readOnly
              />
              <div className="col-span-2 flex justify-center">
                <button
                  type="button"
                  className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
                  onClick={() => handleRemoveProduto(idx)}
                  disabled={form.produtos.length === 1}
                >
                  Remover
                </button>
              </div>
            </div>
          ))}
        </div>
        
        <div className="flex justify-end mt-4">
          <span className="text-green-700 font-bold text-lg">Total: R$ {form.produtos.reduce((acc, p) => acc + Number(p.valor_unitario || 0) * Number(p.quantidade || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="flex justify-end gap-3 mt-8">
          <button type="button" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold shadow transition" onClick={handleAddProduto}>Adicionar Produto</button>
          <button type="button" className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-semibold shadow transition" onClick={() => setShowProductsModal(false)}>Salvar Produtos</button>
          <button type="button" className="bg-gray-400 hover:bg-gray-500 text-white px-6 py-2 rounded-lg font-semibold shadow transition" onClick={() => setShowProductsModal(false)}>Cancelar</button>
        </div>
      </div>
    </div>
  )}


        {renderInput(
          <input
            type="number"
            value={form.produtos[0]?.quantidade || 1}
            min={1}
            onChange={e => {
              const value = e.target.value;
              setForm(prev => {
                const produtos = [...prev.produtos];
                if (produtos.length > 0) {
                  produtos[0].quantidade = Number(value);
                }
                return { ...prev, produtos };
              });
            }}
            className="w-full p-1 border rounded text-sm"
            placeholder="Quantidade"
          />, 
          columnWidths[7],
          7
        )}

        {renderInput(
          <select
            value={form.produtos[0]?.unidade || 'unidade'}
            onChange={e => {
              const value = e.target.value as 'unidade' | 'Dúzia' | 'Pente';
              setForm(prev => {
                const produtos = [...prev.produtos];
                if (produtos.length > 0) {
                  produtos[0].unidade = value;
                }
                return { ...prev, produtos };
              });
            }}
            className="w-full p-1 border rounded text-sm"
          >
            <option value="unidade">Unidade</option>
            <option value="Dúzia">Dúzia</option>
            <option value="Pente">Pente</option>
          </select>,
          columnWidths[8],
          8
        )}

        {renderInput(
          <input
            type="number"
            value={form.produtos.reduce((acc, p) => acc + Number(p.valor_unitario || 0) * Number(p.quantidade || 0), 0).toFixed(2)}
            className="w-full p-1 border rounded text-sm bg-gray-100 font-bold text-green-700"
            placeholder="Valor Total da Venda"
            readOnly
          />, 
          columnWidths[10],
          10
        )}


        {renderInput(
          <select value={form.status_pagamento} onChange={e => handleChange("status_pagamento", e.target.value)} className="w-full p-1 border rounded text-sm">
            {statusPagamentos.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>,
          columnWidths[11],
          11
        )}


        {renderInput(
          <DatePicker
            selected={form.data_pagamento ? (() => {
              const [dia, mes, ano] = form.data_pagamento.split("/");
              return new Date(Number(ano), Number(mes) - 1, Number(dia));
            })() : null}
            onChange={date => {
              if (date) {
                handleChange(
                  "data_pagamento",
                  formatarDataBR(moment(date).tz("America/Sao_Paulo").toISOString())
                );
              } else {
                handleChange("data_pagamento", "");
              }
            }}
            locale="pt-BR"
            dateFormat="dd/MM/yyyy"
            className="w-24 px-2 py-1 border rounded text-xs"
            calendarClassName="text-xs scale-[0.8] w-[240px] origin-top-left"
            popperPlacement="bottom-start"
            placeholderText="Data Pagamento"
            isClearable
          />, 
          columnWidths[12],
          12
        )}

        {renderInput(
          <input type="text" value={form.observacoes} onChange={e => handleChange("observacoes", e.target.value)} className="w-full p-1 border rounded text-sm" placeholder="Observações" />,
          columnWidths[13],
          13
        )}

        <div style={{ width: columnWidths[13] }} className="p-2 flex space-x-1 border-r">
          <button onClick={handleSubmit} className="px-2 py-1 bg-green-600 text-white rounded text-sm">Salvar</button>
          <button onClick={onCancel} className="px-2 py-1 bg-gray-300 text-gray-700 rounded text-sm">Cancelar</button>
        </div>
      </div>
    </>
  );
};

export default NewSaleRow;

