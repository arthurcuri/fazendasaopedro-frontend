
// src/components/Customer.tsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Edit, Trash2, Save, X, Plus, Search } from 'lucide-react';
import { apiRequest } from '../utils/queryClient';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
type UpdateClientInput = {id: number} & Partial<ClientFormData>;

export type ClientType = 'semanal' | 'quinzenal' | 'potencial' | 'esporadico' | 'chamar' | 'viajando';

export interface Client {
  id: number;
  nome: string;
  endereco: string;
  bairro: string;
  dia_semana: string;
  status: ClientType;
  observacoes: string;
  createdAt: string;
  updatedAt: string;
}

export const CLIENT_TYPES = [
  { value: 'semanal' as ClientType,   label: 'Semanal' },
  { value: 'quinzenal' as ClientType, label: 'Quinzenal' },
  { value: 'potencial' as ClientType, label: 'Potencial' },
  { value: 'esporadico' as ClientType,label: 'Esporádico' },
  { value: 'chamar' as ClientType,    label: 'Chamar' },
  { value: 'viajando' as ClientType,  label: 'Viajando' },
];

export const DIAS_SEMANA = [
  { value: 'variavel', label: 'Variável' },
  { value: 'segunda', label: 'Segunda' },
  { value: 'terça', label: 'Terça' },
  { value: 'quarta', label: 'Quarta' },
  { value: 'quinta', label: 'Quinta' },
  { value: 'sexta', label: 'Sexta' },
  { value: 'sábado', label: 'Sábado' },
  { value: 'domingo', label: 'Domingo' },
];

export interface ClientFormData {
  nome: string;
  endereco: string;
  bairro: string;
  dia_semana: string;
  status: ClientType;
  observacoes: string;
}
const COL_HEADERS = ["Nome","Endereço","Bairro","Dia","Tipo","Observações","Ações"] as const;
const DEFAULT_COLUMN_WIDTHS = [160, 110, 110, 110, 110, 200, 685];




function Customer() {
  
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showDeleteManyModal, setShowDeleteManyModal] = useState(false);
  const qc = useQueryClient();
  
  const deleteManyMutation = useMutation<void, Error, number[]>({
    mutationFn: async (ids) => {
      await Promise.all(ids.map(id => apiRequest('DELETE', `/cliente/${id}`)));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clientes'] });
      toast.success('Clientes excluídos com sucesso!');
      setSelectedIds([]);
    },
    onError: () => {
      toast.error('Erro ao excluir clientes!');
    }
  });
  

  const handleSelectAll = (checked: boolean) => {
    if (checked) setSelectedIds(filtered.map(c => c.id));
    else setSelectedIds([]);
  };
  const handleSelectOne = (id: number, checked: boolean) => {
    setSelectedIds(prev => checked ? [...prev, id] : prev.filter(i => i !== id));
  };
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<ClientFormData>>({});
  const [showNewRow, setShowNewRow] = useState(false);
  const [newForm, setNewForm] = useState<ClientFormData>({
    nome: '',
    endereco: '',
    bairro: '',
    dia_semana: '',
    status: 'semanal',
    observacoes: ''
  });
  const [globalSearch, setGlobalSearch] = useState('');
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [selectedType, setSelectedType] = useState<ClientType | 'all'>('all');
  const [filtros, setFiltros] = useState<string[][]>(Array(COL_HEADERS.length).fill([]));
  const [openFiltroIndex, setOpenFiltroIndex] = useState<number | null>(null);
  const [searchTexts, setSearchTexts] = useState<string[]>(Array(COL_HEADERS.length).fill(""));
  const [columnWidths, setColumnWidths] = useState<number[]>([...DEFAULT_COLUMN_WIDTHS]);

   function handleOpenFiltro(idx: number) {
    setOpenFiltroIndex(prev => (prev === idx ? null : idx));
  }

  function handleSearchTextChange(idx: number, txt: string) {
    setSearchTexts(st => {
      const copy = [...st];
      copy[idx] = txt;
      return copy;
    });
  }

  function handleFiltroCheckboxChange(idx: number, valor: string) {
    setFiltros(f => {
      const col = f[idx] || [];
      const next = col.includes(valor)
        ? col.filter(v => v !== valor)
        : [...col, valor];
      const copy = [...f];
      copy[idx] = next;
      return copy;
    });
  }

  function handleClearFiltro(idx: number) {
    setFiltros(f => {
      const copy = [...f];
      copy[idx] = [];
      return copy;
    });
    setOpenFiltroIndex(null);
  }
  
  




  const { data: clients = [], isLoading } = useQuery<Client[], Error>({
    queryKey: ['clientes'],
    queryFn: () =>
      apiRequest('GET', '/cliente').then(res => {
        if (!res.ok) throw new Error('Erro ao buscar clientes');
        return res.json();
      }),
  });

  const addMut = useMutation<Client, Error, ClientFormData>({
    mutationFn: data => apiRequest('POST', '/cliente', data).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clientes'] });
      toast.success('Cliente adicionado com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao adicionar cliente!');
    }
  });
const updMut = useMutation<void, Error, UpdateClientInput>({
  mutationFn: async ({ id, ...rest }) => {
    console.log('[mutationFn] Enviando PATCH para /cliente/' + id, rest);

    const res = await apiRequest('PATCH', `/cliente/${id}`, rest);
    if (!res.ok) {
      const text = await res.text();
      console.error(' [mutationFn] Erro no body:', text);
      throw new Error('Falha ao atualizar: ' + text);
    }
  },
  onSuccess: () => {
    console.log(' [onSuccess] Atualização bem-sucedida, invalidando cache');
    setEditingId(null);
    qc.invalidateQueries({ queryKey: ['clientes'] });
    toast.success('Cliente atualizado com sucesso!');
  },
  onError: () => {
    toast.error('Erro ao atualizar cliente!');
  }
});
  const delMut = useMutation<void, Error, number>({
    mutationFn: async id => {
      const res = await apiRequest('DELETE', `/cliente/${id}`);
      if (!res.ok) throw new Error('Erro ao deletar cliente');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clientes'] });
      toast.success('Cliente excluído com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao excluir cliente!');
    }
  });

 
  const handleEdit = (c: Client) => {
    setEditingId(c.id);
    setEditForm({
      nome: c.nome,
      endereco: c.endereco,
      bairro: c.bairro,
      dia_semana: c.dia_semana,
      status: c.status,
      observacoes: c.observacoes
    });
  };
  const handleSave = () => {
  if (editingId == null) return;
  
  const original = clients.find(c => c.id === editingId);
  if (!original) return;

  const payload = {
    id: original.id,
    nome: editForm.nome ?? original.nome,
    endereco: editForm.endereco ?? original.endereco,
    bairro: editForm.bairro ?? original.bairro,
    dia_semana: editForm.dia_semana ?? original.dia_semana,
    status: editForm.status ?? original.status,
    observacoes: editForm.observacoes ?? original.observacoes,
  };
   console.log(' handleSave payload:', payload);
  updMut.mutate(payload);
};

  const handleAddNew = () => {
    addMut.mutate(newForm);
    setShowNewRow(false);
    setNewForm({ nome:'', endereco:'', bairro:'', dia_semana:'', status:'semanal', observacoes:'' });
  };
  
  const handleDelete = (id: number) => setDeleteId(id);

  const confirmDelete = () => {
    if (deleteId) {
      delMut.mutate(deleteId);
      setDeleteId(null);
    }
  };


  const filtered = clients
    .filter(c =>
      (c.nome + c.endereco + c.bairro + c.dia_semana + c.status + c.observacoes)
        .toLowerCase()
        .includes(globalSearch.toLowerCase())
    )
    .filter(c => selectedType === 'all' || c.status === selectedType)
    .filter(c => {
      const campos = [c.nome, c.endereco, c.bairro, c.dia_semana, c.status, c.observacoes];
      return filtros.every((fcol, i) =>
        !fcol.length ||
        fcol.some(v => campos[i].toLowerCase().includes(v.toLowerCase()))
      );
    });

  if (isLoading) return <div>Carregando clientes...</div>;

  function getValorColuna(c: Client, i: number): string {
    const campos = [
      c.nome,
      c.endereco,
      c.bairro,
      c.dia_semana,
      c.status,
      c.observacoes || "",
      "" 
    ];
    return campos[i] ?? "";
  }

  function startResize(e: React.MouseEvent<HTMLDivElement, MouseEvent>, i: number): void {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = columnWidths[i];

    function onMouseMove(ev: MouseEvent) {
      const delta = ev.clientX - startX;
      setColumnWidths((prev) => {
        const next = [...prev];
        next[i] = Math.max(50, startWidth + delta);
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

  return (
    <div className="min-h-screen bg-gray-50 py-4 px-0">
      <div className="max-w-full mx-auto bg-white rounded-lg shadow-lg overflow-hidden">

       
        <div className="bg-gradient-to-r from-green-600 to-green-700 text-white py-3 px-6 flex items-center justify-between">
          <button onClick={() => {
            setShowNewRow(true);
            setTimeout(() => {
              window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
            }, 100);
          }}
            className="bg-green-800 hover:bg-green-900 px-6 py-3 rounded-lg flex items-center gap-2">
            <Plus className="w-5 h-5" /> Novo Cliente
          </button>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-200 w-5 h-5" />
              <input
                type="text"
                value={globalSearch}
                onChange={e => setGlobalSearch(e.target.value)}
                placeholder="Buscar em todos os campos..."
                className="pl-10 pr-4 py-2 rounded-lg bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-400"
              />
            </div>
            <select
              value={selectedType}
              onChange={e => setSelectedType(e.target.value as ClientType | 'all')}
              className="px-4 py-2 rounded-lg bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-400"
            >
              <option value="all">Todos os tipos</option>
              {CLIENT_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>

       
        <div className="bg-gray-50 border-b border-gray-200 p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
            <div className="bg-white rounded-xl p-2 shadow-sm border">
              <div className="text-2xl font-bold mb-1">{clients.length}</div>
              <div className="text-xs text-gray-600">Total de Clientes</div>
            </div>
            {CLIENT_TYPES.map(t => (
              <div key={t.value} className="bg-white rounded-xl p-2 shadow-sm border">
                <div className="text-2xl font-bold text-green-600 mb-1">
                  {clients.filter(c => c.status === t.value).length}
                </div>
                <div className="text-xs text-gray-600">{t.label}</div>
              </div>
            ))}
          </div>
        </div>

       
        <div className="bg-white overflow-x-auto whitespace-nowrap">
            

       
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

          <div className="inline-flex bg-gradient-to-r from-green-700 to-green-800 text-white text-sm font-medium">
           
            <div style={{ width: 40 }} className="p-4 font-semibold border-r border-green-600/30 flex items-center justify-center">
              <input
                type="checkbox"
                checked={filtered.length > 0 && selectedIds.length === filtered.length}
                onChange={e => handleSelectAll(e.target.checked)}
                aria-label="Selecionar todos"
              />
            </div>
            {["Cliente","Endereço","Bairro","Dia","Tipo","Observações","Ações"].map((h,i) => (
              <div key={h}
                   style={{ width: columnWidths[i] }}
                   className="relative p-4 border-r border-green-600/30 select-none">
                <div className="font-semibold mb-2">{h}</div>
                {i < columnWidths.length - 1 && (
                  <>
                    <button
                      id={`filtro-btn-${i}`}
                      onClick={() => handleOpenFiltro(i)}
                      className="text-xs bg-green-600 px-2 py-1 rounded"
                    >
                      Filtro
                    </button>
                    {openFiltroIndex === i && (
                      <div className="absolute bg-white border p-4 shadow-lg rounded-lg z-50 w-64 text-black"
                        style={{
                          top: '100%',
                          left: '0',
                          marginTop: '5px'
                        }}>
                        <input
                          type="text"
                          value={searchTexts[i]}
                          onChange={e => handleSearchTextChange(i, e.target.value)}
                          placeholder="Buscar..."
                          className="w-full mb-2 p-2 border rounded"
                        />
                        <div className="max-h-40 overflow-y-auto">
                          {Array.from(new Set(clients.map(c => getValorColuna(c,i))))
                            .filter(v => v.toLowerCase().includes(searchTexts[i].toLowerCase()))
                            .map(v => (
                              <label key={v} className="flex items-center mb-1">
                                <input
                                  type="checkbox"
                                  checked={filtros[i]?.includes(v)}
                                  onChange={() => handleFiltroCheckboxChange(i, v)}
                                  className="mr-2"
                                />
                                {v||"(vazio)"}
                              </label>
                            ))
                          }
                        </div>
                        <button onClick={() => handleClearFiltro(i)} className="mt-2 text-green-600 underline">Limpar</button>
                      </div>
                    )}
                    <div
                      onMouseDown={e => startResize(e, i)}
                      className="absolute top-0 right-0 w-2 h-full cursor-col-resize bg-green-600/20"
                      style={{ userSelect: 'none' }}
                    />
                  </>
                )}
              </div>
            ))}
          </div>

    
          <div>
            {filtered.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <Search className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-xl">Nenhum cliente encontrado</p>
                <p className="text-gray-400">Ajuste filtros ou adicione um novo cliente</p>
              </div>
            ) : (
              <div onDoubleClick={() => {
                setShowNewRow(true);
                setTimeout(() => {
                  window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                }, 100);
              }}>
                {filtered.map((c, idx) => (
                  <div key={c.id} className={`flex border-b text-sm ${idx%2===0?'bg-white':'bg-gray-50'} hover:bg-green-50`}>
            
                    <div style={{ width: 40, paddingTop: 8, paddingBottom: 8 }} className="flex items-center justify-center border-r">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(c.id)}
                        onChange={e => handleSelectOne(c.id, e.target.checked)}
                        aria-label="Selecionar cliente"
                        style={{ width: 14, height: 14 }}
                      />
                    </div>
                  
                    <div style={{ width: columnWidths[0] }} className="p-4 border-r">
                      {editingId === c.id
                        ? <input className="w-full p-2 border rounded" value={editForm.nome||''} onChange={e=>setEditForm(f=>({...f,nome:e.target.value}))} />
                        : <div className="truncate" title={c.nome}>{c.nome}</div>}
                    </div>
                    <div style={{ width: columnWidths[1] }} className="p-4 border-r">
                      {editingId === c.id
                        ? <input className="w-full p-2 border rounded" value={editForm.endereco||''} onChange={e=>setEditForm(f=>({...f,endereco:e.target.value}))} />
                        : <div className="truncate" title={c.endereco}>{c.endereco}</div>}
                    </div>
                    <div style={{ width: columnWidths[2] }} className="p-4 border-r">
                      {editingId === c.id
                        ? <input className="w-full p-2 border rounded" value={editForm.bairro||''} onChange={e=>setEditForm(f=>({...f,bairro:e.target.value}))} />
                        : <div className="truncate" title={c.bairro}>{c.bairro}</div>}
                    </div>
                    <div style={{ width: columnWidths[3] }} className="p-4 border-r">
                      {editingId === c.id
                        ? <select className="w-full p-2 border rounded bg-white" value={editForm.dia_semana||''} onChange={e=>setEditForm(f=>({...f,dia_semana:e.target.value}))} >
                            <option value="">Selecione o dia</option>
                            {DIAS_SEMANA.map(dia=>(<option key={dia.value} value={dia.value}>{dia.label}</option>))}
                          </select>
                        : <div>{DIAS_SEMANA.find(d=>d.value===c.dia_semana)?.label || c.dia_semana}</div>}
                    </div>
                    <div style={{ width: columnWidths[4] }} className="p-4 border-r">
                      {editingId === c.id
                        ? <select className="w-full p-2 border rounded bg-white" value={editForm.status||''} onChange={e=>setEditForm(f=>({...f,status:e.target.value as ClientType}))} >
                            {CLIENT_TYPES.map(t=>(<option key={t.value} value={t.value}>{t.label}</option>))}
                          </select>
                        : <span className="inline-block px-2 py-1 rounded bg-green-100 text-green-800 text-xs">{CLIENT_TYPES.find(t=>t.value===c.status)?.label}</span>}
                    </div>
                    <div style={{ width: columnWidths[5] }} className="p-4 border-r">
                      {editingId === c.id
                        ? <input className="w-full p-2 border rounded" value={editForm.observacoes||''} onChange={e=>setEditForm(f=>({...f,observacoes:e.target.value}))} />
                        : <div className="truncate" title={c.observacoes}>{c.observacoes}</div>}
                    </div>
                    <div style={{ width: columnWidths[6] }} className="p-4 border-r">
                      {editingId === c.id
                        ? (
                            <div className="flex justify-center gap-2">
                              <button onClick={handleSave} className="p-2 bg-green-600 rounded"><Save className="w-4 h-4 text-white"/></button>
                              <button onClick={()=>setEditingId(null)} className="p-2 bg-gray-600 rounded"><X className="w-4 h-4 text-white"/></button>
                            </div>
                          )
                        : (
                            <div className="flex justify-center gap-2">
                              <button onClick={()=>handleEdit(c)} className="p-2 bg-green-600 rounded"><Edit className="w-4 h-4 text-white"/></button>
                              <button onClick={()=>handleDelete(c.id)} className="p-2 bg-red-600 rounded"><Trash2 className="w-4 h-4 text-white"/></button>
                            </div>
                          )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {showNewRow && (
            <div className="flex border-b text-sm bg-yellow-50">
              {[ 
               
                <div key="nome" style={{ width: columnWidths[0] }} className="p-4 border-r">
                  <input
                    type="text"
                    placeholder="Nome"
                    className="w-full p-2 border rounded"
                    value={newForm.nome}
                    onChange={e=>setNewForm(f=>({...f,nome:e.target.value}))}
                  />
                </div>,
                
                <div key="endereco" style={{ width: columnWidths[1] }} className="p-4 border-r">
                  <input
                    type="text"
                    placeholder="Endereço"
                    className="w-full p-2 border rounded"
                    value={newForm.endereco}
                    onChange={e=>setNewForm(f=>({...f,endereco:e.target.value}))}
                  />
                </div>,
                
                <div key="bairro" style={{ width: columnWidths[2] }} className="p-4 border-r">
                  <input
                    type="text"
                    placeholder="Bairro"
                    className="w-full p-2 border rounded"
                    value={newForm.bairro}
                    onChange={e=>setNewForm(f=>({...f,bairro:e.target.value}))}
                  />
                </div>,
                
                <div key="dia" style={{ width: columnWidths[3] }} className="p-4 border-r">
                  <select
                    className="w-full p-2 border rounded bg-white"
                    value={newForm.dia_semana}
                    onChange={e=>setNewForm(f=>({...f,dia_semana:e.target.value}))}
                  >
                    <option value="">Selecione o dia</option>
                    {DIAS_SEMANA.map(dia=>(
                      <option key={dia.value} value={dia.value}>{dia.label}</option>
                    ))}
                  </select>
                </div>,
              
                <div key="tipo" style={{ width: columnWidths[4] }} className="p-4 border-r">
                  <select
                    className="w-full p-2 border rounded bg-white"
                    value={newForm.status}
                    onChange={e=>setNewForm(f=>({...f,status:e.target.value as ClientType}))}
                  >
                    {CLIENT_TYPES.map(t=>(
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>,
                
                <div key="obs" style={{ width: columnWidths[5] }} className="p-4 border-r">
                  <input
                    type="text"
                    placeholder="Observações"
                    title="Digite aqui quaisquer observações sobre o cliente"
                    className="w-full p-2 border rounded"
                    value={newForm.observacoes}
                    onChange={e=>setNewForm(f=>({...f,observacoes:e.target.value}))}
                  />
                </div>,
                
                <div key="ações" style={{ width: columnWidths[6] }} className="p-4 flex justify-center gap-2">
                  <button onClick={handleAddNew} className="p-2 bg-green-600 rounded"><Save className="w-4 h-4 text-white"/></button>
                  <button onClick={()=>setShowNewRow(false)} className="p-2 bg-red-600 rounded"><X className="w-4 h-4 text-white"/></button>
                </div>
              ]}  
            </div>
          )}
        </div>
      </div>

      {deleteId !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded shadow max-w-sm w-full">
            <p>Tem certeza que deseja excluir este cliente?</p>
            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={confirmDelete}
                className="bg-red-600 text-white px-3 py-1 rounded"
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
            <p>Tem certeza que deseja excluir {selectedIds.length} cliente(s) selecionado(s)?</p>
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
    </div>
  );
}


export default Customer;