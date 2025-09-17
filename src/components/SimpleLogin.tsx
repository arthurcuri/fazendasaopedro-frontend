import React, { useState } from 'react';
import { Egg, Mail, Lock, User, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/SimpleAuthContext';
import { toast } from 'react-toastify';

type AuthMode = 'login' | 'register' | 'forgot-password';

const SimpleLogin: React.FC = () => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [nome, setNome] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarNovaSenha, setConfirmarNovaSenha] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  
  const { login, register, resetPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    
    try {
      if (mode === 'login') {
        await login(email, senha);
      } else if (mode === 'register') {
        if (senha !== confirmarSenha) {
          throw new Error('As senhas não coincidem');
        }
        if (senha.length < 6) {
          throw new Error('A senha deve ter pelo menos 6 caracteres');
        }
        await register(nome, email, senha);
        toast.success('Usuário cadastrado com sucesso!');
      } else if (mode === 'forgot-password') {
        // Redefinir senha diretamente
        if (novaSenha !== confirmarNovaSenha) {
          throw new Error('As senhas não coincidem');
        }
        if (novaSenha.length < 6) {
          throw new Error('A nova senha deve ter pelo menos 6 caracteres');
        }
        await resetPassword(email, novaSenha);
        setSuccess('Senha redefinida com sucesso! Você já pode fazer login.');
      }
    } catch (error: any) {
      setError(error.message || 'Erro na operação');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setSenha('');
    setConfirmarSenha('');
    setNome('');
    setNovaSenha('');
    setConfirmarNovaSenha('');
    setError('');
    setSuccess('');
  };

  const changeMode = (newMode: AuthMode) => {
    resetForm();
    setMode(newMode);
  };

  const getTitle = () => {
    switch (mode) {
      case 'login':
        return 'Fazer Login';
      case 'register':
        return 'Criar Conta';
      case 'forgot-password':
        return 'Recuperar Senha';
      default:
        return 'Fazer Login';
    }
  };

  const getSubtitle = () => {
    switch (mode) {
      case 'login':
        return 'Acesse sua conta para continuar';
      case 'register':
        return 'Crie sua conta para começar';
      case 'forgot-password':
        return 'Digite seu email e nova senha para redefinir';
      default:
        return 'Acesse sua conta para continuar';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-amber-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
   
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-amber-500 text-white rounded-full flex items-center justify-center mx-auto mb-4">
            <Egg size={32} />
          </div>
          <h1 className="text-3xl font-bold text-green-800">Fazenda São Pedro</h1>
          <p className="text-amber-600 mt-2">Ovos caipiras de galinhas felizes</p>
        </div>

        {/* Formulário */}
        <div className="bg-white rounded-xl shadow-lg p-8">
   
          {mode !== 'login' && (
            <button
              onClick={() => changeMode('login')}
              className="flex items-center text-gray-600 hover:text-gray-800 mb-4 transition-colors"
            >
              <ArrowLeft size={20} className="mr-2" />
              Voltar ao login
            </button>
          )}

          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">{getTitle()}</h2>
            <p className="text-gray-600 mt-2">{getSubtitle()}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
        
            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome Completo
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Digite seu nome completo"
                  />
                </div>
              </div>
            )}

      
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Digite seu email"
                />
              </div>
            </div>

           
            {mode === 'forgot-password' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nova Senha
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={novaSenha}
                    onChange={(e) => setNovaSenha(e.target.value)}
                    required
                    className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Digite sua nova senha"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            )}

           
            {mode === 'forgot-password' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirmar Nova Senha
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type={showConfirmNewPassword ? 'text' : 'password'}
                    value={confirmarNovaSenha}
                    onChange={(e) => setConfirmarNovaSenha(e.target.value)}
                    required
                    className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Confirme sua nova senha"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            )}

            {mode !== 'forgot-password' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Senha
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    required
                    className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Digite sua senha"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            )}

            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirmar Senha
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmarSenha}
                    onChange={(e) => setConfirmarSenha(e.target.value)}
                    required
                    className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Confirme sua senha"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            )}

        
            {error && (
              <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-lg">
                {error}
              </div>
            )}

     
            {success && (
              <div className="text-green-600 text-sm text-center bg-green-50 p-3 rounded-lg">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  <span>
                    {mode === 'login' ? 'Entrando...' :                   mode === 'register' ? 'Criando conta...' : 
                   'Redefinindo senha...'}
                  </span>
                </>
              ) : (
                <span>
                  {mode === 'login' ? 'Entrar' : 
                   mode === 'register' ? 'Criar Conta' : 
                   'Redefinir Senha'}
                </span>
              )}
            </button>
          </form>

          <div className="mt-6 text-center space-y-2">
            {mode === 'login' && (
              <>
                <p className="text-sm text-gray-600">
                  Não tem uma conta?{' '}
                  <button
                    onClick={() => changeMode('register')}
                    className="text-green-600 hover:text-green-800 font-medium"
                  >
                    Criar conta
                  </button>
                </p>
                <p className="text-sm text-gray-600">
                  <button
                    onClick={() => changeMode('forgot-password')}
                    className="text-green-600 hover:text-green-800 font-medium"
                  >
                    Esqueceu sua senha?
                  </button>
                </p>
              </>
            )}
            
            {mode === 'register' && (
              <p className="text-sm text-gray-600">
                Já tem uma conta?{' '}
                <button
                  onClick={() => changeMode('login')}
                  className="text-green-600 hover:text-green-800 font-medium"
                >
                  Fazer login
                </button>
              </p>
            )}
            
            {mode === 'forgot-password' && (
              <p className="text-sm text-gray-600">
                Lembrou sua senha?{' '}
                <button
                  onClick={() => changeMode('login')}
                  className="text-green-600 hover:text-green-800 font-medium"
                >
                  Fazer login
                </button>
              </p>
            )}
          </div>

      
        </div>

        
        <div className="text-center mt-8 text-gray-500 text-sm">
          <p>© 2025 Fazenda São Pedro. Todos os direitos reservados.</p>
        </div>
      </div>
    </div>
  );
};

export default SimpleLogin;
