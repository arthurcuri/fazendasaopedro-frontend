import React, { useState } from 'react';
import {  Egg, LogOut } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { SalesProvider } from './context/SalesContext';
import { ReportFilterProvider } from './context/ReportFilterContext';
import { AuthProvider, useAuth } from './context/SimpleAuthContext';
import SalesGrid from './components/SalesGrid';
import Report from './components/Report';
import Customer from './components/customer';
import Product from './components/Product';
import SimpleLogin from './components/SimpleLogin';

const Header: React.FC = () => {
  const { user, logout } = useAuth();
  
  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="container mx-auto px-4 py-4 flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-amber-500 text-white rounded-full flex items-center justify-center">
            <Egg size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-green-800">Fazenda São Pedro</h1>
            <p className="text-sm text-amber-600">Ovos caipiras de galinhas felizes</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-4 sm:space-y-0">
          <div className="text-sm text-gray-600">
            Olá, {user?.nome}!
          </div>
          <span className="text-sm text-gray-600">
            {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
          </span>
          <button
            onClick={logout}
            className="flex items-center px-3 py-2 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut size={16} className="mr-2" />
            Sair
          </button>
        </div>
      </div>
    </header>
  );
};

const MainApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'Vendas' | 'produtos' |'clientes'|'relatórios'|'rotas'>('Vendas');

  return (
    <SalesProvider>
      <div className="min-h-screen flex flex-col bg-gray-100">
        <Header />

        <main className="flex-1 container mx-auto p-4">
          {activeTab === 'Vendas' && <SalesGrid />}
          {activeTab === 'produtos' && <Product/>}
          {activeTab === 'clientes' && <Customer/>}
          {activeTab === 'relatórios' && <Report/>}
        
        </main>

        <footer className="bg-white border-t border-gray-300 sticky bottom-0 z-10">
          <div className="flex justify-center gap-4 py-3">
            <button
              onClick={() => setActiveTab('Vendas')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'Vendas' ? 'bg-green-700 text-white' : 'text-gray-700 hover:bg-gray-200'
              }`}
            >
              Vendas
            </button>

             <button
              onClick={() => setActiveTab('clientes')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'clientes' ? 'bg-green-700 text-white' : 'text-gray-700 hover:bg-gray-200'
              }`}
            >
              Clientes
            </button>

            <button
              onClick={() => setActiveTab('produtos')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'produtos' ? 'bg-green-700 text-white' : 'text-gray-700 hover:bg-gray-200'
              }`}
            >
              Produtos
            </button>

            <button
              onClick={() => setActiveTab('relatórios')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'relatórios' ? 'bg-green-700 text-white' : 'text-gray-700 hover:bg-gray-200'
              }`}
            >
              Relatórios
            </button>

          </div>
        </footer>
      </div>
    </SalesProvider>
  );
};

function App() {
  return (
    <AuthProvider>
      <ReportFilterProvider>
        <AuthWrapper />
       
        <ToastContainer
          position="top-right"
          autoClose={4000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
        />
      </ReportFilterProvider>
    </AuthProvider>
  );
}

const AuthWrapper: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-amber-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-amber-500 text-white rounded-full flex items-center justify-center mx-auto mb-4">
            <Egg size={32} />
          </div>
          <p className="text-green-800 font-semibold">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <SimpleLogin />;
  }

  return <MainApp />;
};

export default App;


