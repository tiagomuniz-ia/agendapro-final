import React, { useState } from 'react';
import styled from 'styled-components';
import { login } from '../services/api';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

// Os componentes estilizados existentes permanecem iguais
const LoginContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 20px;
  background-color: #f5f7fa;
`;

const LoginCard = styled.div`
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  padding: 30px;
  width: 100%;
  max-width: 400px;
  text-align: center;
`;

const Logo = styled.img`
  width: 180px;
  margin-bottom: 30px;
`;

const Title = styled.h1`
  color: #1976d2;
  font-size: 24px;
  margin-bottom: 20px;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-bottom: 20px;
`;

const Input = styled.input`
  padding: 12px 15px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
  transition: border-color 0.3s;
  
  &:focus {
    outline: none;
    border-color: #1976d2;
  }
`;

const Button = styled.button`
  background-color: #1976d2;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 12px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.3s;
  
  &:hover {
    background-color: #1565c0;
  }
  
  &:disabled {
    background-color: #b0bec5;
    cursor: not-allowed;
  }
`;

const ForgotPassword = styled.a`
  color: #1976d2;
  text-decoration: none;
  margin-top: 15px;
  display: block;
  
  &:hover {
    text-decoration: underline;
  }
`;

const ErrorMessage = styled.p`
  color: #d32f2f;
  font-size: 14px;
  margin-top: -5px;
  text-align: left;
  padding-left: 5px;
`;

// Novo componente para mensagens de status
const StatusMessage = styled.div`
  margin-top: 15px;
  padding: 10px;
  border-radius: 4px;
  text-align: center;
  background-color: ${props => props.error ? '#ffebee' : '#e8f5e9'};
  color: ${props => props.error ? '#c62828' : '#2e7d32'};
  display: ${props => props.visible ? 'block' : 'none'};
`;

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState(''); // Usando 'senha' em vez de 'password'
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ text: '', isError: false, visible: false });

  const validateForm = () => {
    const newErrors = {};
    
    // Validação de email
    if (!email) {
      newErrors.email = 'Email é obrigatório';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email inválido';
    }
    
    // Validação de senha
    if (!senha) {
      newErrors.senha = 'Senha é obrigatória';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      setIsLoading(true);
      setStatusMessage({ text: '', isError: false, visible: false });
      
      console.log('Enviando dados de login:', { email, senha: '********' });
      
      try {
        // Teste adicional para verificar os dados enviados
        try {
          const testResponse = await axios.post('http://localhost:3001/api/test-login-variables', 
            { email, senha }
          );
          console.log('Teste de variáveis:', testResponse.data);
        } catch (testError) {
          console.error('Erro no teste de variáveis:', testError);
        }
        
        const response = await login(email, senha);
        console.log('Resposta do login:', response);
        
        if (response.success) {
          setStatusMessage({
            text: 'Login realizado com sucesso! Redirecionando...',
            isError: false,
            visible: true
          });
          
          // Redirecionar para home após login bem-sucedido
          setTimeout(() => {
            navigate('/home');
          }, 1500);
        } else {
          setStatusMessage({
            text: response.message || 'Erro ao fazer login',
            isError: true,
            visible: true
          });
        }
      } catch (error) {
        console.error('Erro completo:', error);
        
        setStatusMessage({
          text: 'Erro ao conectar ao servidor. Tente novamente mais tarde.',
          isError: true,
          visible: true
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <LoginContainer>
      <LoginCard>
        <Logo src="https://res.cloudinary.com/duantsyvy/image/upload/image-removebg-preview_11_jfsb9k.png" alt="AgendaPro Logo" />
        <Title>Bem-vindo ao AgendaPro</Title>
        
        <Form onSubmit={handleSubmit}>
          <Input 
            type="email" 
            placeholder="Email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
          />
          {errors.email && <ErrorMessage>{errors.email}</ErrorMessage>}
          
          <Input 
            type="password" 
            placeholder="Senha" 
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            disabled={isLoading}
          />
          {errors.senha && <ErrorMessage>{errors.senha}</ErrorMessage>}
          
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Entrando...' : 'Entrar'}
          </Button>
          
          <StatusMessage 
            visible={statusMessage.visible} 
            error={statusMessage.isError}
          >
            {statusMessage.text}
          </StatusMessage>
        </Form>
        
        <ForgotPassword href="#">Esqueceu a senha?</ForgotPassword>
      </LoginCard>
    </LoginContainer>
  );
};

export default Login;
