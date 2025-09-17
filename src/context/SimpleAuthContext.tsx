import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { toast } from 'react-toastify';

interface User {
  id: number;
  nome: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, senha: string) => Promise<void>;
  register: (nome: string, email: string, senha: string) => Promise<void>;
  resetPassword: (email: string, novaSenha: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simula verificação de token ao iniciar
    const token = localStorage.getItem('@fazenda:token');
    const userData = localStorage.getItem('@fazenda:user');
    
    if (token && userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (error) {
        localStorage.removeItem('@fazenda:token');
        localStorage.removeItem('@fazenda:user');
      }
    }
    
    setLoading(false);
  }, []);

  const login = async (email: string, senha: string) => {
    try {
      const response = await fetch(`https://api.fazendasaopedro.appsirius.com/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, senha }),
      });

      if (!response.ok) {
        throw new Error('Email ou senha inválidos');
      }

      const data = await response.json();
      
      localStorage.setItem('@fazenda:token', data.access_token);
      localStorage.setItem('@fazenda:user', JSON.stringify(data.user));
      setUser(data.user);
      
      // Mensagem de boas-vindas personalizada
      const horaAtual = new Date().getHours();
      let saudacao = '';
      
      if (horaAtual >= 5 && horaAtual < 12) {
        saudacao = 'Bom dia';
      } else if (horaAtual >= 12 && horaAtual < 18) {
        saudacao = 'Boa tarde';
      } else {
        saudacao = 'Boa noite';
      }
      
      toast.success(`${saudacao}, ${data.user.nome}! 🥚 Bem-vindo(a) à Fazenda São Pedro!`, {
        position: "top-center",
        autoClose: 4000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true
      });
      
    } catch (error) {
      throw error;
    }
  };

  const register = async (nome: string, email: string, senha: string) => {
    try {
      const response = await fetch(`https://api.fazendasaopedro.appsirius.com/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ nome, email, senha }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao criar conta');
      }

      const data = await response.json();
      
      localStorage.setItem('@fazenda:token', data.access_token);
      localStorage.setItem('@fazenda:user', JSON.stringify(data.user));
      setUser(data.user);
    } catch (error) {
      throw error;
    }
  };

  const resetPassword = async (email: string, novaSenha: string) => {
    try {
      const response = await fetch(`https://api.fazendasaopedro.appsirius.com/api/auth/reset-password`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, novaSenha }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao redefinir senha');
      }

      toast.success('Senha redefinida com sucesso!');
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('@fazenda:token');
    localStorage.removeItem('@fazenda:user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      isAuthenticated: !!user,
      login,
      register,
      resetPassword,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return context;
};
