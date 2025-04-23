require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
// Adicione estas linhas no início do arquivo, após os imports
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 3001;

// Crie a pasta de logs se não existir
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}


// Crie um stream de escrita para os logs
const accessLogStream = fs.createWriteStream(
    path.join(logsDir, 'access.log'), 
    { flags: 'a' }
  );


// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev')); // Log no console
app.use(morgan(':remote-addr :method :url :status :response-time ms - :res[content-length]', { stream: accessLogStream })); // Log em arquivo

// Função auxiliar para log detalhado
const logRequest = (req, msg) => {
  console.log(`\n[${new Date().toISOString()}] ${msg}`);
  console.log(`URL: ${req.method} ${req.originalUrl}`);
  console.log('Body:', req.body);
  console.log('Headers:', req.headers);
};

const logError = (error, source) => {
    console.error(`\n[${new Date().toISOString()}] ERRO em ${source}:`);
    console.error(error);
    if (error.stack) console.error(error.stack);
  };

// Configuração do PostgreSQL
const pool = new Pool({
  host: process.env.PGHOST,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  port: process.env.PGPORT,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Testar conexão com o banco
app.get('/api/test-connection', async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    
    res.json({ 
      success: true, 
      message: 'Conexão com PostgreSQL estabelecida com sucesso!',
      timestamp: result.rows[0].now
    });
  } catch (error) {
    console.error('Erro ao conectar ao PostgreSQL:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao conectar ao PostgreSQL', 
      error: error.message 
    });
  }
});

// Rota de login
app.post('/api/login', async (req, res) => {
  const { email, senha } = req.body;

  try {
    // Verificar se o usuário existe
    const userResult = await pool.query(
      'SELECT * FROM usuarios WHERE email = $1 AND ativo = true',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ 
        success: false, 
        message: 'Email ou senha incorretos' 
      });
    }

    const user = userResult.rows[0];

    // Verificar a senha (assumindo armazenamento como texto simples)
    // Em produção, recomendamos usar bcrypt
    if (user.senha !== senha) {
      return res.status(401).json({ 
        success: false, 
        message: 'Email ou senha incorretos' 
      });
    }

    // Gerar token JWT
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email,
        nome: user.nome,
        cargo: user.cargo
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Atualizar o último acesso
    await pool.query(
      'UPDATE usuarios SET ultimo_acesso = NOW() WHERE id = $1',
      [user.id]
    );

    // Responder com token e dados básicos do usuário
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        cargo: user.cargo,
        foto_url: user.foto_url,
        tema: user.tema
      }
    });
  } catch (error) {
    console.error('Erro ao fazer login:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro no servidor',
      error: error.message 
    });
  }
});

// Verificar token JWT
app.get('/api/verify-token', (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ success: false, message: 'Token não fornecido' });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.json({ success: true, user: decoded });
  } catch (error) {
    res.status(401).json({ success: false, message: 'Token inválido' });
  }
});

// Rota para verificar usuários (apenas para desenvolvimento)
app.get('/api/check-users', async (req, res) => {
    try {
      const result = await pool.query('SELECT id, nome, email, cargo, ativo FROM usuarios LIMIT 10');
      
      res.json({ 
        success: true, 
        message: `Encontrados ${result.rows.length} usuários`,
        users: result.rows 
      });
    } catch (error) {
      console.error('Erro ao verificar usuários:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erro ao verificar usuários', 
        error: error.message 
      });
    }
  });
  
// Substituir a rota de login existente por esta versão
app.post('/api/login', async (req, res) => {
  logRequest(req, "Tentativa de login");
  
  const { email, senha } = req.body;
  console.log(`Tentativa de login para email: ${email}`);

  if (!email || !senha) {
    console.log('Login falhou: Email ou senha não fornecidos');
    return res.status(400).json({ 
      success: false, 
      message: 'Email e senha são obrigatórios' 
    });
  }

  try {
    // Log da consulta que será executada
    console.log(`Executando consulta: SELECT * FROM usuarios WHERE email = '${email}' AND ativo = true`);
    
    // Verificar se o usuário existe
    const userResult = await pool.query(
      'SELECT * FROM usuarios WHERE email = $1 AND ativo = true',
      [email]
    );

    console.log(`Resultado da consulta: ${userResult.rowCount} registros encontrados`);
    
    if (userResult.rows.length === 0) {
      console.log(`Login falhou: Usuário com email ${email} não encontrado ou inativo`);
      return res.status(401).json({ 
        success: false, 
        message: 'Email ou senha incorretos' 
      });
    }

    const user = userResult.rows[0];
    console.log(`Usuário encontrado: ID=${user.id}, Nome=${user.nome}`);
    
    // Mostrar os campos disponíveis do usuário para debug
    console.log('Campos do usuário:', Object.keys(user));
    
    // Verificar a senha (texto simples para este exemplo)
    console.log(`Comparando senha informada com senha armazenada`);
    console.log(`Senha informada: ${senha.substring(0, 1)}${'*'.repeat(senha.length - 1)}`);
    console.log(`Senha armazenada: ${user.senha ? user.senha.substring(0, 1) + '*'.repeat(user.senha.length - 1) : 'indefinida'}`);
    
    if (user.senha !== senha) {
      console.log(`Login falhou: Senha incorreta para usuário ${email}`);
      return res.status(401).json({ 
        success: false, 
        message: 'Email ou senha incorretos' 
      });
    }

    // Gerar token JWT
    const tokenPayload = { 
      id: user.id, 
      email: user.email,
      nome: user.nome,
      cargo: user.cargo
    };
    
    console.log('Gerando token JWT com payload:', tokenPayload);
    
    const token = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log(`Token JWT gerado com sucesso`);

    // Atualizar o último acesso
    try {
      await pool.query(
        'UPDATE usuarios SET ultimo_acesso = NOW() WHERE id = $1',
        [user.id]
      );
      console.log(`Último acesso atualizado para usuário ${user.id}`);
    } catch (updateError) {
      // Não falhar o login se a atualização falhar
      console.error('Erro ao atualizar último acesso:', updateError);
    }

    // Responder com token e dados básicos do usuário
    const responseData = {
      success: true,
      token,
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        cargo: user.cargo,
        foto_url: user.foto_url,
        tema: user.tema
      }
    };
    
    console.log('Login bem-sucedido. Enviando resposta:', {
      ...responseData,
      token: token.substring(0, 10) + '...'
    });
    
    res.json(responseData);
  } catch (error) {
    logError(error, 'Rota de login');
    res.status(500).json({ 
      success: false, 
      message: 'Erro no servidor',
      error: error.message 
    });
  }
});



// Adicionar esta rota ao arquivo index.js
app.get('/api/check-table-structure', async (req, res) => {
    try {
      // Verifica se a tabela existe
      const tableCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'usuarios'
        );
      `);
      
      const tableExists = tableCheck.rows[0].exists;
      
      if (!tableExists) {
        return res.json({
          success: false,
          message: 'A tabela usuarios não existe'
        });
      }
      
      // Verifica a estrutura da tabela
      const columnsResult = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'usuarios'
        ORDER BY ordinal_position;
      `);
      
      res.json({
        success: true,
        message: 'Estrutura da tabela usuarios',
        tableExists,
        columns: columnsResult.rows
      });
    } catch (error) {
      logError(error, 'Verificação de estrutura da tabela');
      res.status(500).json({
        success: false,
        message: 'Erro ao verificar estrutura da tabela',
        error: error.message
      });
    }
  });

  // Adicionar estas rotas ao arquivo index.js
app.get('/api/test-query/:email', async (req, res) => {
    try {
      const email = req.params.email;
      console.log(`Testando consulta para email: ${email}`);
      
      const result = await pool.query(
        'SELECT * FROM usuarios WHERE email = $1',
        [email]
      );
      
      if (result.rows.length === 0) {
        return res.json({
          success: false,
          message: `Nenhum usuário encontrado com o email ${email}`
        });
      }
      
      // Remover senha da resposta por segurança
      const user = { ...result.rows[0] };
      if (user.senha) {
        user.senha = '********';
      }
      
      res.json({
        success: true,
        message: `Usuário encontrado com o email ${email}`,
        user
      });
    } catch (error) {
      logError(error, 'Teste de consulta');
      res.status(500).json({
        success: false,
        message: 'Erro ao testar consulta',
        error: error.message
      });
    }
  });
  
  app.post('/api/test-login-variables', (req, res) => {
    const { email, senha } = req.body;
    
    res.json({
      success: true,
      received: {
        email,
        senha: senha ? `${senha.substring(0, 1)}${'*'.repeat(senha.length - 1)}` : null,
        emailType: typeof email,
        senhaType: typeof senha,
        emailLength: email ? email.length : 0,
        senhaLength: senha ? senha.length : 0
      }
    });
  });
  
// Adicionar esta rota ao arquivo index.js
app.get('/api/fix-table-structure', async (req, res) => {
    try {
      // Verifica se a tabela existe
      const tableCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'usuarios'
        );
      `);
      
      if (!tableCheck.rows[0].exists) {
        // Cria a tabela se não existir
        await pool.query(`
          CREATE TABLE usuarios (
            id SERIAL PRIMARY KEY,
            nome VARCHAR(100) NOT NULL,
            email VARCHAR(100) UNIQUE NOT NULL,
            senha VARCHAR(255) NOT NULL,
            telefone VARCHAR(20),
            cargo VARCHAR(50),
            foto_url TEXT,
            tema VARCHAR(20) DEFAULT 'light',
            idioma VARCHAR(10) DEFAULT 'pt-BR',
            receber_notificacoes BOOLEAN DEFAULT TRUE,
            data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            ultimo_acesso TIMESTAMP,
            ativo BOOLEAN DEFAULT TRUE
          );
        `);
        
        return res.json({
          success: true,
          message: 'Tabela usuarios criada com sucesso'
        });
      }
      
      // Verifica e adiciona colunas ausentes
      const columns = [
        'nome VARCHAR(100) NOT NULL',
        'email VARCHAR(100) UNIQUE NOT NULL',
        'senha VARCHAR(255) NOT NULL',
        'telefone VARCHAR(20)',
        'cargo VARCHAR(50)',
        'foto_url TEXT',
        'tema VARCHAR(20) DEFAULT \'light\'',
        'idioma VARCHAR(10) DEFAULT \'pt-BR\'',
        'receber_notificacoes BOOLEAN DEFAULT TRUE',
        'data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
        'ultimo_acesso TIMESTAMP',
        'ativo BOOLEAN DEFAULT TRUE'
      ];
      
      let modifiedColumns = [];
      
      for (const column of columns) {
        const columnName = column.split(' ')[0];
        
        const columnCheck = await pool.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'usuarios'
            AND column_name = $1
          );
        `, [columnName]);
        
        if (!columnCheck.rows[0].exists) {
          await pool.query(`ALTER TABLE usuarios ADD COLUMN ${column};`);
          modifiedColumns.push(columnName);
        }
      }
      
      res.json({
        success: true,
        message: modifiedColumns.length > 0 
          ? `Colunas adicionadas: ${modifiedColumns.join(', ')}` 
          : 'Estrutura da tabela está correta'
      });
    } catch (error) {
      logError(error, 'Correção de estrutura da tabela');
      res.status(500).json({
        success: false,
        message: 'Erro ao corrigir estrutura da tabela',
        error: error.message
      });
    }
  });
  

// Iniciar o servidor
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
  console.log(`Conectando ao PostgreSQL em ${process.env.PGHOST}:${process.env.PGPORT}`);
});
