#!/usr/bin/env node

/**
 * CRIAR USUÁRIOS AUTOMATICAMENTE NO SUPABASE AUTH
 * Execute: node scripts/criar-usuarios.js
 * 
 * Este script:
 * 1. Cria os 3 usuários no Supabase Auth
 * 2. Cria as entradas na tabela usuarios
 * 3. Pronto para fazer login!
 */

const https = require('https');

const SUPABASE_URL = 'https://vzaabtzcilyoknksvhrc.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6YWFidHpjaWx5b2tua3N2aHJjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDUyNDI0NiwiZXhwIjoyMDkwMTAwMjQ2fQ.b0QCcqqIJMrx8li0g_uRXoJ9z114YWyiHvu5QPjsMG7o';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6YWFidHpjaWx5b2tua3N2aHJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1MjQyNDYsImV4cCI6MjA5MDEwMDI0Nn0.L0nCAztRmHFTaJAoT22P_Y5eHUNG9-HStY3it1nSq1U';

const usuarios = [
  {
    email: 'guilherme@biasiengenharia.com',
    password: '1234',
    nome: 'Guilherme',
    papel: 'admin'
  },
  {
    email: 'pauloconfar@biasiengenharia.com',
    password: '1234',
    nome: 'Paulo Confar',
    papel: 'admin'
  },
  {
    email: 'ryan.stradioto@biasiengenharia.com',
    password: '1234',
    nome: 'Ryan Stradioto',
    papel: 'admin'
  }
];

function makeRequest(method, path, body, useServiceRole = false) {
  return new Promise((resolve, reject) => {
    const url = new URL(SUPABASE_URL + path);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${useServiceRole ? SERVICE_ROLE_KEY : ANON_KEY}`,
        'apikey': ANON_KEY
      }
    };

    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: data ? JSON.parse(data) : null,
            headers: res.headers
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: data,
            headers: res.headers
          });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function criarUsuarios() {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║  Criando Usuários no Supabase Auth...                      ║
╚════════════════════════════════════════════════════════════╝
`);

  const usuariosCriados = [];

  for (const user of usuarios) {
    try {
      console.log(`\n📝 Criando: ${user.email}`);

      const response = await makeRequest(
        'POST',
        '/auth/v1/admin/users',
        {
          email: user.email,
          password: user.password,
          email_confirm: true,
          user_metadata: {
            nome: user.nome,
            papel: user.papel
          }
        },
        true // Use service role
      );

      if (response.status === 201 || response.status === 200) {
        console.log(`✅ Usuário criado!`);
        console.log(`   UUID: ${response.data.id}`);
        usuariosCriados.push({
          ...user,
          id: response.data.id
        });
      } else {
        console.log(`⚠️  Status: ${response.status}`);
        console.log(`   Resposta:`, response.data);
      }
    } catch (error) {
      console.error(`❌ Erro:`, error.message);
    }
  }

  if (usuariosCriados.length === 0) {
    console.error(`\n❌ Nenhum usuário foi criado!`);
    console.error(`Possível causa: Service Role Key inválida ou usuários já existem.`);
    process.exit(1);
  }

  console.log(`\n${usuariosCriados.length} usuários criados com sucesso! ✅\n`);

  // Agora inserir na tabela usuarios
  console.log(`\nInserindo dados na tabela 'usuarios'...`);

  for (const user of usuariosCriados) {
    try {
      console.log(`\n📝 Inserindo perfil: ${user.email}`);

      // Usar Anon Key para inserir na tabela (porque tem RLS)
      const response = await makeRequest(
        'POST',
        '/rest/v1/usuarios',
        {
          id: user.id,
          nome: user.nome,
          email: user.email,
          papel: user.papel,
          ativo: true
        },
        false // Use anon key
      );

      if (response.status === 201 || response.status === 200) {
        console.log(`✅ Perfil inserido!`);
      } else {
        console.log(`⚠️  Status: ${response.status}`);
        if (response.data?.error) {
          console.log(`   Erro: ${response.data.error}`);
        }
      }
    } catch (error) {
      console.error(`❌ Erro:`, error.message);
    }
  }

  // Gerar resumo
  console.log(`\n${`=`.repeat(60)}`);
  console.log(`✅ SETUP COMPLETO!\n`);
  console.log(`Usuários prontos para login:\n`);
  
  usuariosCriados.forEach((user, idx) => {
    console.log(`${idx + 1}. ${user.email}`);
    console.log(`   Senha: ${user.password}`);
    console.log(`   Papel: ${user.papel}`);
    console.log();
  });

  console.log(`${`=`.repeat(60)}\n`);
  console.log(`🚀 Próximos passos:\n`);
  console.log(`1. Execute: npm run dev`);
  console.log(`2. Abra: http://localhost:5173`);
  console.log(`3. Você será redirecionado para login`);
  console.log(`4. Faça login com um dos emails acima + senha 1234\n`);
}

criarUsuarios().catch(err => {
  console.error('Erro fatal:', err);
  process.exit(1);
});