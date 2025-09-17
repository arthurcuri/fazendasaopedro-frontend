import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface ReportFilterState {
  selectedPeriod: 'weekly' | 'monthly';
  setSelectedPeriod: (period: 'weekly' | 'monthly') => void;
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  selectedYear: string;
  setSelectedYear: (year: string) => void;
}

const ReportFilterContext = createContext<ReportFilterState | undefined>(undefined);

export const ReportFilterProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [selectedPeriod, setSelectedPeriod] = useState<'weekly' | 'monthly'>(() => {
    return (localStorage.getItem('report_selectedPeriod') as 'weekly' | 'monthly') || 'weekly';
  });
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    return localStorage.getItem('report_selectedMonth') || '';
  });
  const [selectedYear, setSelectedYear] = useState<string>(() => {
    return localStorage.getItem('report_selectedYear') || '';
  });

  useEffect(() => {
    localStorage.setItem('report_selectedPeriod', selectedPeriod);
  }, [selectedPeriod]);

  useEffect(() => {
    localStorage.setItem('report_selectedMonth', selectedMonth);
  }, [selectedMonth]);

  useEffect(() => {
    localStorage.setItem('report_selectedYear', selectedYear);
  }, [selectedYear]);

  return (
    <ReportFilterContext.Provider value={{ selectedPeriod, setSelectedPeriod, selectedMonth, setSelectedMonth, selectedYear, setSelectedYear }}>
      {children}
    </ReportFilterContext.Provider>
  );
};

export function useReportFilter() {
  const context = useContext(ReportFilterContext);
  if (!context) throw new Error('useReportFilter must be used within a ReportFilterProvider');
  return context;
}
