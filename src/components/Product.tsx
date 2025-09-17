import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Edit, Trash2, Save, X, Plus, Search, Package } from 'lucide-react';
import { apiRequest } from '../utils/queryClient';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';


export type TipoProduto = 'ovos' | 'mel' | 'outro';

export interface Product {
  id: number;
  nomeProduto: string;
  tipoProduto: TipoProduto;
  preco: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductFormData {
  nomeProduto: string;
  tipoProduto: TipoProduto;
  preco: number;
}

function Product() {

  const selectAllRef = useRef<HTMLInputElement>(null);

  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showDeleteManyModal, setShowDeleteManyModal] = useState(false);
  const deleteManyMutation = useMutation<void, Error, number[]>({
    mutationFn: async (ids) => {
      await Promise.all(ids.map(id => apiRequest('DELETE', `/produto/${id}`)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['produtos'] });
      toast.success('Produtos excluídos com sucesso!');
      setSelectedIds([]);
    },
    onError: () => {
      toast.error('Erro ao excluir produtos!');
    }
  });
  const handleSelectAll = (checked: boolean) => {
    if (checked) setSelectedIds(filtered.map(p => p.id));
    else setSelectedIds([]);
  };
  const handleSelectOne = (id: number, checked: boolean) => {
    setSelectedIds(prev => checked ? [...prev, id] : prev.filter(i => i !== id));
  };
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<ProductFormData>>({});
  const [showNewRow, setShowNewRow] = useState(false);
  const [newProductForm, setNewProductForm] = useState<ProductFormData>({ nomeProduto: '', tipoProduto: 'outro', preco: 0 });
  const [globalSearch, setGlobalSearch] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  

  const [filteredNomes, setFilteredNomes] = useState<string[]>([]);
  const [filteredTipos, setFilteredTipos] = useState<string[]>([]);
  const [filteredPrecos, setFilteredPrecos] = useState<string[]>([]);
  const [showNomeFilter, setShowNomeFilter] = useState(false);
  const [showTipoFilter, setShowTipoFilter] = useState(false);
  const [showPrecoFilter, setShowPrecoFilter] = useState(false);

  const [columnWidths, setColumnWidths] = useState<number[]>(() => {
 
    return [820, 150, 150, 200]; 
  });


  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!(event.target as Element).closest('.filter-dropdown')) {
        setShowNomeFilter(false);
        setShowTipoFilter(false);
        setShowPrecoFilter(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);


  function startResize(e: React.MouseEvent<HTMLDivElement>, index: number): void {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = columnWidths[index];
    
    function onMouseMove(ev: MouseEvent) {
      const delta = ev.clientX - startX;
      setColumnWidths(prev => {
        const newWidths = [...prev];
        newWidths[index] = Math.max(100, startWidth + delta); 
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


 const { data: products = [] } = useQuery<Product[], Error>({
  queryKey: ['produtos'],
  queryFn: () =>
    apiRequest('GET', '/produto')
      .then(res => {
        if (!res.ok) throw new Error('Erro ao buscar produtos');
        return res.json();
      }),
  select: (raw: any[]) => raw.map(p => ({
    ...p,
    preco: parseFloat(p.preco),       
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  })),
});




  const addProductMutation = useMutation<Product, Error, ProductFormData>({
    mutationFn: (payload: ProductFormData) => apiRequest('POST', '/produto', payload).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['produtos'] });
      toast.success('Produto cadastrado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao cadastrar produto!');
      console.error('Erro ao cadastrar produto:', error);
    }
  });

  const updateProductMutation = useMutation<Product, Error, Product & Partial<ProductFormData>>({
    mutationFn: (payload: Product & Partial<ProductFormData>) => {
      const { id, ...rest } = payload;
      return apiRequest('PATCH', `/produto/${id}`, rest).then(res => res.json());
    },
    onSuccess: () => {
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ['produtos'] });
      toast.success('Produto atualizado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar produto!');
      console.error('Erro ao atualizar produto:', error);
    }
  });

  const deleteProductMutation = useMutation<unknown, Error, number>({
    mutationFn: (id: number) => apiRequest('DELETE', `/produto/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['produtos'] });
      toast.success('Produto excluído com sucesso!');
      setShowDeleteConfirm(false);
      setProductToDelete(null);
    },
    onError: (error) => {
      toast.error('Erro ao excluir produto!');
      console.error('Erro ao excluir produto:', error);
    }
  });

  const handleEdit = (product: Product) => {
    setEditingId(product.id);
    setEditForm({ nomeProduto: product.nomeProduto, tipoProduto: product.tipoProduto, preco: product.preco });
  };

  const handleSave = () => {
    if (!editingId) return;
    console.log("▶️ Atualizando produto:", { id: editingId, ...editForm });
    updateProductMutation.mutate({ id: editingId, ...editForm } as Product);
  };

  const handleDeleteClick = (product: Product) => {
    console.log('handleDeleteClick chamado com produto:', product);
    setProductToDelete(product);
    setShowDeleteConfirm(true);
    console.log('showDeleteConfirm definido como true');
  };

  const handleConfirmDelete = () => {
    if (productToDelete) {
      deleteProductMutation.mutate(productToDelete.id);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
    setProductToDelete(null);
  };

  const handleNewProduct = () => {
    setShowNewRow(true);
    
    setTimeout(() => {
      window.scrollTo({
        top: document.body.scrollHeight,
        behavior: 'smooth'
      });
    }, 100);
  };

  const handleAddNew = () => {
    addProductMutation.mutate(newProductForm);
    setShowNewRow(false);
    setNewProductForm({ nomeProduto: '', tipoProduto: 'outro', preco: 0 });
  };


  const getUniqueNomes = () => [...new Set(products.map(p => p.nomeProduto))].sort();
  const getUniqueTipos = () => [...new Set(products.map(p => p.tipoProduto))].sort();
  const getUniquePrecos = () => [...new Set(products.map(p => p.preco.toString()))].sort((a, b) => parseFloat(a) - parseFloat(b));

  const toggleNomeFilter = (nome: string) => {
    setFilteredNomes(prev => 
      prev.includes(nome) ? prev.filter(n => n !== nome) : [...prev, nome]
    );
  };

  const toggleTipoFilter = (tipo: string) => {
    setFilteredTipos(prev => 
      prev.includes(tipo) ? prev.filter(t => t !== tipo) : [...prev, tipo]
    );
  };

  const togglePrecoFilter = (preco: string) => {
    setFilteredPrecos(prev => 
      prev.includes(preco) ? prev.filter(p => p !== preco) : [...prev, preco]
    );
  };

  const clearFilter = (filterType: 'nome' | 'tipo' | 'preco') => {
    switch(filterType) {
      case 'nome':
        setFilteredNomes([]);
        break;
      case 'tipo':
        setFilteredTipos([]);
        break;
      case 'preco':
        setFilteredPrecos([]);
        break;
    }
  };

 
  const filtered = products.filter(p => {
    const matchesGlobalSearch = 
      p.nomeProduto.toLowerCase().includes(globalSearch.toLowerCase()) ||
      p.preco.toString().includes(globalSearch);
    
    const matchesNome = filteredNomes.length === 0 || filteredNomes.includes(p.nomeProduto);
    const matchesTipo = filteredTipos.length === 0 || filteredTipos.includes(p.tipoProduto);
    const matchesPreco = filteredPrecos.length === 0 || filteredPrecos.includes(p.preco.toString());
    
    return matchesGlobalSearch && matchesNome && matchesTipo && matchesPreco;
  });


  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = selectedIds.length > 0 && selectedIds.length < filtered.length;
    }
  }, [selectedIds, filtered.length]);

  return (
    <div className="max-w-full mx-auto">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">

      
        <div className="bg-gradient-to-r from-green-600 to-green-700 text-white py-3 px-6 flex items-center justify-between">
          <button onClick={handleNewProduct} className="bg-green-800 hover:bg-green-900 text-white px-6 py-3 rounded-lg flex items-center gap-2">
            <Plus className="w-5 h-5" /> Novo Produto
          </button>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-200 w-5 h-5" />
            <input
              type="text"
              value={globalSearch}
              onChange={e => setGlobalSearch(e.target.value)}
              placeholder="Buscar produtos..."
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-white text-gray-900 border border-gray-300 focus:ring-2 focus:ring-green-400"
              style={{ color: '#222', background: '#fff' }}
            />
          </div>
        </div>

        <div className="overflow-x-auto">

          <div className="flex bg-gradient-to-r from-green-700 to-green-800 text-white text-sm font-medium">
            
            <div style={{ width: 40 }} className="flex items-center justify-center border-r py-2">
              <input
                ref={selectAllRef}
                type="checkbox"
                checked={filtered.length > 0 && selectedIds.length === filtered.length}
                onChange={e => handleSelectAll(e.target.checked)}
                aria-label="Selecionar todos produtos"
                style={{ width: 16, height: 16 }}
              />
            </div>
            
            <div className="p-4 border-r border-green-600/30 relative filter-dropdown" style={{ width: columnWidths[0] }}>
              <div>Nome</div>
              <button
                onClick={() => setShowNomeFilter(!showNomeFilter)}
                className="mt-1 text-[10px] bg-green-700 text-white px-1 py-0.5 rounded"
              >
                Filtro {filteredNomes.length > 0 && `(${filteredNomes.length})`}
              </button>
              {showNomeFilter && (
                <div className="absolute top-full left-0 w-64 bg-white border shadow-lg z-50 max-h-64 overflow-y-auto">
                  <div className="p-2">
                    <input
                      type="text"
                      placeholder="Buscar..."
                      className="w-full p-1 text-xs border rounded text-gray-800"
                    />
                    <button
                      onClick={() => clearFilter('nome')}
                      className="text-blue-600 text-xs mt-1 hover:underline"
                    >
                      Limpar
                    </button>
                  </div>
                  {getUniqueNomes().map(nome => (
                    <div key={nome} className="flex items-center p-1 hover:bg-gray-100">
                      <input
                        type="checkbox"
                        checked={filteredNomes.includes(nome)}
                        onChange={() => toggleNomeFilter(nome)}
                        className="mr-2"
                      />
                      <span className="text-gray-800 text-xs">{nome}</span>
                    </div>
                  ))}
                </div>
              )}
             
              <div onMouseDown={e => startResize(e, 0)} className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-white/20 hover:bg-white/40" />
            </div>
            
            
            <div className="p-4 border-r border-green-600/30 relative filter-dropdown" style={{ width: columnWidths[1] }}>
              <div>Tipo</div>
              <button
                onClick={() => setShowTipoFilter(!showTipoFilter)}
                className="mt-1 text-[10px] bg-green-700 text-white px-1 py-0.5 rounded"
              >
                Filtro {filteredTipos.length > 0 && `(${filteredTipos.length})`}
              </button>
                {showTipoFilter && (
                  <div className="absolute top-full left-0 w-48 bg-white border shadow-lg z-50">
                    <div className="p-2">
                      <button
                        onClick={() => clearFilter('tipo')}
                        className="text-blue-600 text-xs hover:underline"
                      >
                        Limpar
                      </button>
                    </div>
                    {getUniqueTipos().map(tipo => (
                      <div key={tipo} className="flex items-center p-1 hover:bg-gray-100">
                        <input
                          type="checkbox"
                          checked={filteredTipos.includes(tipo)}
                          onChange={() => toggleTipoFilter(tipo)}
                          className="mr-2"
                        />
                        <span className="text-gray-800 text-xs">{tipo}</span>
                      </div>
                    ))}
                  </div>
                )}
             
                <div onMouseDown={e => startResize(e, 1)} className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-white/20 hover:bg-white/40" />
            </div>
            
         
            <div className="p-4 border-r border-green-600/30 relative filter-dropdown" style={{ width: columnWidths[2] }}>
              <div>Preço</div>
              <button
                onClick={() => setShowPrecoFilter(!showPrecoFilter)}
                className="mt-1 text-[10px] bg-green-700 text-white px-1 py-0.5 rounded"
              >
                Filtro {filteredPrecos.length > 0 && `(${filteredPrecos.length})`}
              </button>
                {showPrecoFilter && (
                  <div className="absolute top-full left-0 w-48 bg-white border shadow-lg z-50 max-h-64 overflow-y-auto">
                    <div className="p-2">
                      <button
                        onClick={() => clearFilter('preco')}
                        className="text-blue-600 text-xs hover:underline"
                      >
                        Limpar
                      </button>
                    </div>
                    {getUniquePrecos().map(preco => (
                      <div key={preco} className="flex items-center p-1 hover:bg-gray-100">
                        <input
                          type="checkbox"
                          checked={filteredPrecos.includes(preco)}
                          onChange={() => togglePrecoFilter(preco)}
                          className="mr-2"
                        />
                        <span className="text-gray-800 text-xs">R$ {preco}</span>
                      </div>
                    ))}
                  </div>
                )}
                
                <div onMouseDown={e => startResize(e, 2)} className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-white/20 hover:bg-white/40" />
            </div>
            
           
            <div className="p-4" style={{ width: columnWidths[3] }}>
              <div>Ações</div>
            </div>
          </div>


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
          <div>
            {filtered.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-xl">Nenhum produto encontrado</p>
              </div>
            ) : (
              <div onDoubleClick={handleNewProduct}>
                {filtered.map(product => (
                  <div key={product.id} className="flex border-b text-sm hover:bg-green-50">
                
                    <div style={{ width: 40, paddingTop: 8, paddingBottom: 8 }} className="flex items-center justify-center border-r">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(product.id)}
                        onChange={e => handleSelectOne(product.id, e.target.checked)}
                        aria-label="Selecionar produto"
                        style={{ width: 14, height: 14 }}
                      />
                    </div>
                 
                    <div className="p-4 flex-1">
                      {editingId === product.id ? (
                        <input type="text" value={editForm.nomeProduto} onChange={e => setEditForm({ ...editForm, nomeProduto: e.target.value })} className="w-full p-2 border rounded-lg" />
                      ) : (
                        <span 
                          title={`Produto: ${product.nomeProduto}`}
                          className="cursor-help"
                        >
                          {product.nomeProduto}
                        </span>
                      )}
                    </div>
             
                    <div className="p-4 w-36">
                      {editingId === product.id ? (
                        <select value={editForm.tipoProduto} onChange={e => setEditForm({ ...editForm, tipoProduto: e.target.value as TipoProduto })} className="w-full p-2 border rounded-lg">
                          <option value="ovos">Ovos</option>
                          <option value="mel">Mel</option>
                          <option value="duzia">Duzia</option>
                          <option value="pente">Pente</option>
                          <option value="outro">Outros</option>
                        </select>
                      ) : (
                        <span>{product.tipoProduto}</span>
                      )}
                    </div>
                
                    <div className="p-4 w-36">
                      {editingId === product.id ? (
                        <input type="number" value={editForm.preco} onChange={e => setEditForm({ ...editForm, preco: parseFloat(e.target.value) })} step="0.01" className="w-full p-2 border rounded-lg" />
                      ) : (
                        <span>R$ {product.preco.toFixed(2)}</span>
                      )}
                    </div>
               
                    <div className="p-4 w-48 flex justify-center gap-2">
                      {editingId === product.id ? (
                        <>
                          <button onClick={handleSave} className="p-2 bg-green-600 rounded-lg"><Save className="w-4 h-4 text-white" /></button>
                          <button onClick={() => setEditingId(null)} className="p-2 bg-gray-600 rounded-lg"><X className="w-4 h-4 text-white" /></button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => handleEdit(product)} className="p-2 bg-green-600 rounded-lg"><Edit className="w-4 h-4 text-white" /></button>
                          <button onClick={() => handleDeleteClick(product)} className="p-2 bg-red-600 rounded-lg"><Trash2 className="w-4 h-4 text-white" /></button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

      
            {showNewRow && (
              <div className="flex border-b text-sm bg-yellow-50">
                <div className="p-4 flex-1">
                  <input type="text" value={newProductForm.nomeProduto} onChange={e => setNewProductForm({ ...newProductForm, nomeProduto: e.target.value })} placeholder="Nome do produto" className="w-full p-2 border rounded-lg" />
                </div>
                <div className="p-4 w-36">
                  <select value={newProductForm.tipoProduto} onChange={e => setNewProductForm({ ...newProductForm, tipoProduto: e.target.value as TipoProduto })} className="w-full p-2 border rounded-lg">
                    <option value="ovos">Ovos</option>
                    <option value="mel">Mel</option>
                    <option value="duzia">Duzia</option>
                    <option value="pente">Pente</option>
                    <option value="outro">Outros</option>
                  </select>
                </div>
                <div className="p-4 w-36">
                  <input type="number" value={newProductForm.preco} onChange={e => setNewProductForm({ ...newProductForm, preco: parseFloat(e.target.value) })} step="0.01" placeholder="0.00" className="w-full p-2 border rounded-lg" />
                </div>
                <div className="p-4 w-48 flex justify-center gap-2">
                  <button onClick={handleAddNew} className="p-2 bg-green-600 rounded-lg"><Save className="w-4 h-4 text-white" /></button>
                  <button onClick={() => setShowNewRow(false)} className="p-2 bg-red-600 rounded-lg"><X className="w-4 h-4 text-white" /></button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

  
      {showDeleteConfirm && productToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded shadow max-w-sm w-full">
            <p>Tem certeza que deseja excluir o produto "{productToDelete.nomeProduto}"?</p>
            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={handleConfirmDelete}
                className="bg-red-600 text-white px-3 py-1 rounded"
                disabled={deleteProductMutation.isPending}
              >
                {deleteProductMutation.isPending ? 'Excluindo...' : 'Excluir'}
              </button>
              <button onClick={handleCancelDelete} className="bg-gray-300 px-3 py-1 rounded">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteManyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded shadow max-w-sm w-full" style={{ marginTop: '80px' }}>
            <p>Tem certeza que deseja excluir {selectedIds.length} produto(s) selecionado(s)?</p>
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

export default Product;
