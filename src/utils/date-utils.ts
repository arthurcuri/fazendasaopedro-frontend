import { format, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DeliveryDay } from '../types';

export const formatDate = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, 'yyyy-MM-dd');
};

export const formatDisplayDate = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, 'dd/MM/yyyy');
};

export const getDayOfWeek = (date: Date | string): DeliveryDay => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const day = format(dateObj, 'EEEE', { locale: ptBR });
  return capitalizeFirstLetter(day) as DeliveryDay;
};

export const capitalizeFirstLetter = (string: string): string => {
  return string.charAt(0).toUpperCase() + string.slice(1);
};

export const TODAY = formatDate(new Date());