export type DeliveryDay = 'Segunda' | 'Terça' | 'Quarta' | 'Quinta' | 'Sexta' | 'Sábado' | 'Domingo';

export type ClientType = 
  | 'Semanal' 
  | 'Potencial' 
  | 'Quinzenal' 
  | 'Chamar' 
  | 'Esporádico' 
  | 'Viajando';

export type PaymentStatus = 'Pago' | 'Não Pago' | 'Parcial';

export interface Sale {
  id: number;
  date: string;
  clientId: number;
  product: string;
  value: number;
  dozens: number;
  combs: number;
  boxes: number;
  paymentStatus: PaymentStatus;
  observations?: string;
}

export interface Client {
  id: number;
  name: string;
  address: string;
  neighborhood: string;
  clientType: ClientType;
  deliveryDay: DeliveryDay;
  defaultDozens: number;
  defaultCombs: number;
  defaultBoxes: number;
  createdAt: string;
  updatedAt: string;
}

export type SaleWithClient = Sale & {
  client: Client;
};

export interface NewSale {
  date: string;
  clientId?: number;
  product: string;
  value: number;
  dozens: number;
  combs: number;
  boxes: number;
  paymentStatus: PaymentStatus;
  observations?: string;
}

export interface NewClient {
  name: string;
  address: string;
  neighborhood: string;
  clientType: ClientType;
  deliveryDay: DeliveryDay;
  defaultDozens: number;
  defaultCombs: number;
  defaultBoxes: number;
}