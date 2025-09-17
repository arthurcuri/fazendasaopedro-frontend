import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Client, Sale, SaleWithClient, NewSale, NewClient } from '../types';
import { TODAY } from '../utils/date-utils';

interface SalesContextType {
  sales: SaleWithClient[];
  clients: Client[];
  filteredSales: SaleWithClient[];
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  startDate: string;
  setStartDate: (date: string) => void;
  endDate: string;
  setEndDate: (date: string) => void;
  filterMode: 'day' | 'week';
  setFilterMode: (mode: 'day' | 'week') => void;
  addSale: (sale: NewSale) => void;
  updateSale: (id: number, sale: Partial<Sale>) => void;
  deleteSale: (id: number) => void;
  addClient: (client: NewClient) => void;
  updateClient: (id: number, client: Partial<Client>) => void;
  deleteClient: (id: number) => void;
  getTodaySales: () => SaleWithClient[];
}

const SalesContext = createContext<SalesContextType | undefined>(undefined);

const mockClients: Client[] = [
  {
    id: 1,
    name: 'João Silv',
    address: 'Rua das Flores, 123',
    neighborhood: 'Centro',
    clientType: 'Semanal',
    deliveryDay: 'Segunda',
    defaultDozens: 2,
    defaultCombs: 1,
    defaultBoxes: 0,
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z'
  },
  {
    id: 2,
    name: 'Maria Oliveira',
    address: 'Av. Principal, 456',
    neighborhood: 'Jardim',
    clientType: 'Quinzenal',
    deliveryDay: 'Quarta',
    defaultDozens: 3,
    defaultCombs: 0,
    defaultBoxes: 0,
    createdAt: '2023-01-02T00:00:00Z',
    updatedAt: '2023-01-02T00:00:00Z'
  },
  {
    id: 3,
    name: 'Carlos Pereira',
    address: 'Rua dos Pássaros, 789',
    neighborhood: 'Vila Nova',
    clientType: 'Chamar',
    deliveryDay: 'Sexta',
    defaultDozens: 1,
    defaultCombs: 2,
    defaultBoxes: 0,
    createdAt: '2023-01-03T00:00:00Z',
    updatedAt: '2023-01-03T00:00:00Z'
  }
];

const mockSales: Sale[] = [
  {
    id: 1,
    date: TODAY,
    clientId: 1,
    product: 'Ovos Caipira',
    value: 15.0,
    dozens: 2,
    combs: 1,
    boxes: 0,
    paymentStatus: 'Pago'
  },
  {
    id: 2,
    date: TODAY,
    clientId: 2,
    product: 'Ovos Brancos',
    value: 18.0,
    dozens: 3,
    combs: 0,
    boxes: 0,
    paymentStatus: 'Não Pago'
  },
  {
    id: 3,
    date: TODAY,
    clientId: 3,
    product: 'Ovos Vermelhos',
    value: 10.0,
    dozens: 1,
    combs: 2,
    boxes: 0,
    paymentStatus: 'Parcial',
    observations: 'Cliente pediu para entregar na parte da manhã'
  }
];

export const SalesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [sales, setSales] = useState<SaleWithClient[]>([]);
  const [clients, setClients] = useState<Client[]>(mockClients);
  const [selectedDate, setSelectedDate] = useState<string>(TODAY);
  const [startDate, setStartDate] = useState<string>(TODAY);
  const [endDate, setEndDate] = useState<string>(TODAY);
  const [filterMode, setFilterMode] = useState<'day' | 'week'>('day');

  useEffect(() => {
    const salesWithClient = mockSales.map(sale => {
      const client = clients.find(c => c.id === sale.clientId);
      if (!client) throw new Error(`Client with id ${sale.clientId} not found`);
      return { ...sale, client };
    });
    setSales(salesWithClient);
  }, []);

  const filteredSales = sales.filter(sale => {
    if (filterMode === 'day') {
      return sale.date === selectedDate;
    } else if (filterMode === 'week') {
      return sale.date >= startDate && sale.date <= endDate;
    }
    return false;
  });

  const addSale = (newSale: NewSale) => {
    const id = Math.max(...sales.map(s => s.id), 0) + 1;
    const client = clients.find(c => c.id === newSale.clientId);
    if (!client) throw new Error(`Client with id ${newSale.clientId} not found`);

    const sale: SaleWithClient = {
      id,
      ...newSale,
      clientId: newSale.clientId!,
      client
    };

    setSales(prev => [...prev, sale]);
  };

  const updateSale = (id: number, updatedSale: Partial<Sale>) => {
    setSales(prev =>
      prev.map(sale =>
        sale.id === id ? { ...sale, ...updatedSale } : sale
      )
    );
  };

  const deleteSale = (id: number) => {
    setSales(prev => prev.filter(sale => sale.id !== id));
  };

  const addClient = (newClient: NewClient) => {
    const id = Math.max(...clients.map(c => c.id), 0) + 1;
    const now = new Date().toISOString();

    const client: Client = {
      id,
      ...newClient,
      createdAt: now,
      updatedAt: now
    };

    setClients(prev => [...prev, client]);
  };

  const updateClient = (id: number, updatedClient: Partial<Client>) => {
    setClients(prev =>
      prev.map(client =>
        client.id === id
          ? { ...client, ...updatedClient, updatedAt: new Date().toISOString() }
          : client
      )
    );
  };

  const deleteClient = (id: number) => {
    setClients(prev => prev.filter(client => client.id !== id));
    setSales(prev => prev.filter(sale => sale.clientId !== id));
  };

  const getTodaySales = () => {
    return sales.filter(sale => sale.date === TODAY);
  };

  return (
    <SalesContext.Provider
      value={{
        sales,
        clients,
        filteredSales,
        selectedDate,
        setSelectedDate,
        startDate,
        setStartDate,
        endDate,
        setEndDate,
        filterMode,
        setFilterMode,
        addSale,
        updateSale,
        deleteSale,
        addClient,
        updateClient,
        deleteClient,
        getTodaySales
      }}
    >
      {children}
    </SalesContext.Provider>
  );
};

export const useSalesContext = () => {
  const context = useContext(SalesContext);
  if (!context) {
    throw new Error('useSalesContext must be used within a SalesProvider');
  }
  return context;
};
