import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Login from './pages/Login';
import { verifyToken } from './services/api';
import styled, { createGlobalStyle } from 'styled-components';

const GlobalStyle = createGlobalStyle`
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    font-family: 'Roboto', Arial, sans-serif;
  }
  
  body {
    background-color: #f5f7fa;
  }
`;

// Componente temporário para a Home
const Home = () => (
  <div style={{ padding: '20px', textAlign: 'center' }}>
    <h1>Dashboard do AgendaPro</h1>
    <p>Esta é a página inicial que será desenvolvida na próxima etapa.</p>
  </div>
);

// Componente para rotas protegidas
const ProtectedRoute = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      // Verificar se há token no localStorage
      const token = localStorage.getItem('token');
      
      if (!token) {
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }
      
      // Verificar se o token é válido
      try {
        const response = await verifyToken();
        setIsAuthenticated(response.success);
      } catch (error) {
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuth();
  }, [navigate]);

  if (isLoading) {
    // Poderia ser um componente de loading mais elaborado
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <p>Carregando...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

const App = () => {
  return (
    <>
      <GlobalStyle />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/home" element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        } />
        <Route path="/" element={<Navigate to="/home" replace />} />
      </Routes>
    </>
  );
};

export default App;
