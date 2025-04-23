import axios from 'axios';

// Usar a URL da API do arquivo .env
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// Configuração base do axios
const api = axios.create({
  baseURL: API_URL,
});

// Interceptor para incluir token em requisições autenticadas
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Verificar o arquivo src/services/api.js
// Garanta que a função login esteja enviando os campos corretos:

export const login = async (email, senha) => {
    try {
      console.log('Enviando requisição de login:', { email, senha: '********' });
      
      const response = await api.post('/login', { email, senha });
      console.log('Resposta do servidor:', response.data);
      
      // Armazenar token e informações do usuário no localStorage
      if (response.data.success) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
      
      return response.data;
    } catch (error) {
      console.error('Erro na requisição de login:', error);
      
      if (error.response) {
        console.error('Resposta de erro do servidor:', error.response.data);
        return error.response.data;
      }
      return { 
        success: false, 
        message: 'Erro ao conectar ao servidor. Verifique sua conexão.' 
      };
    }
  };
  

// Verificar se o token é válido
export const verifyToken = async () => {
  try {
    const response = await api.get('/verify-token');
    return response.data;
  } catch (error) {
    return { success: false };
  }
};

// Logout
export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

export default api;
