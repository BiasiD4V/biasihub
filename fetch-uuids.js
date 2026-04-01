#!/usr/bin/env node

/**
 * Script para listar UUIDs dos usuários no Supabase Auth
 * 
 * Execute: node fetch-uuids.js
 * 
 * Você precisa usar a Service Role Key (não a Anon Key)
 * Pegue em: Supabase Dashboard → Settings → API → service_role key
 */

const https = require('https');

// ⚠️ CONFIGURE AQUI:
const SUPABASE_URL = 'https://vzaabtzcilyoknksvhrc.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6YWFidHpjaWx5b2tua3N2aHJjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDUyNDI0NiwiZXhwIjoyMDkwMTAwMjQ2fQ.b0QCcqqIJMrx8li0g_uRXoJ9z114YWyiHvu5QPjsMG7o';

// Emails que você criou
const EMAILS_ESPERADOS = [
  'guilherme@biasiengenharia.com',
  'pauloconfar@biasiengenharia.com',
  'ryan.stradioto@biasiengenharia.com'
];

async function fetchUUIDs() {
  console.log('🔍 Buscando UUIDs dos usuários no Supabase...\n');

  if (SERVICE_ROLE_KEY === 'COLA_A_SERVICE_ROLE_KEY_AQUI') {
    console.error('❌ ERRO: Você precisa colar a Service Role Key!');
    console.log('\n📋 Como pegar:');
    console.log('1. Abra: https://supabase.com/dashboard');
    console.log('2. Vá para: Settings → API');
    console.log('3. Copie: service_role key (ou service_key)');
    console.log('4. Cole no arquivo fetch-uuids.js linha 12');
    process.exit(1);
  }

  try {
    const response = await fetch(
      `${SUPABASE_URL}/auth/v1/admin/users`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const usuarios = data.users || [];

    if (usuarios.length === 0) {
      console.error('❌ Nenhum usuário encontrado!');
      process.exit(1);
    }

    console.log(`✅ ${usuarios.length} usuários encontrados:\n`);

    // Filtrar apenas os emails esperados
    const usuariosFiltrados = usuarios.filter(u => 
      EMAILS_ESPERADOS.includes(u.email)
    );

    if (usuariosFiltrados.length === 0) {
      console.warn('⚠️  Nenhum usuário corresponde aos emails esperados!\n');
      console.log('Usuários no sistema:');
      usuarios.forEach(u => {
        console.log(`  • ${u.email} → ${u.id}`);
      });
      process.exit(1);
    }

    // Mapear os UUIDs
    const uuids = {
      'guilherme@biasiengenharia.com': null,
      'pauloconfar@biasiengenharia.com': null,
      'ryan.stradioto@biasiengenharia.com': null
    };

    usuariosFiltrados.forEach(u => {
      if (uuids.hasOwnProperty(u.email)) {
        uuids[u.email] = u.id;
      }
    });

    // Exibir resultados
    console.log('📋 UUIDs encontrados:\n');
    Object.entries(uuids).forEach(([email, uuid]) => {
      if (uuid) {
        console.log(`✅ ${email}`);
        console.log(`   UUID: ${uuid}\n`);
      } else {
        console.log(`❌ ${email} - NÃO ENCONTRADO\n`);
      }
    });

    // Gerar SQL pronto para copiar/colar
    console.log('\n' + '='.repeat(60));
    console.log('📝 SQL PRONTO PARA EXECUTAR NO SUPABASE:\n');
    console.log('='.repeat(60) + '\n');

    const sqlPronto = `-- Inserir usuários com UUIDs reais
INSERT INTO public.usuarios (id, nome, email, papel, ativo) VALUES
  ('${uuids['guilherme@biasiengenharia.com']}', 'Guilherme', 'guilherme@biasiengenharia.com', 'admin', true),
  ('${uuids['pauloconfar@biasiengenharia.com']}', 'Paulo Confar', 'pauloconfar@biasiengenharia.com', 'admin', true),
  ('${uuids['ryan.stradioto@biasiengenharia.com']}', 'Ryan Stradioto', 'ryan.stradioto@biasiengenharia.com', 'admin', true)
ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome,
  email = EXCLUDED.email,
  papel = EXCLUDED.papel,
  ativo = EXCLUDED.ativo,
  atualizado_em = now();`;

    console.log(sqlPronto);
    console.log('\n' + '='.repeat(60));
    console.log('\n📌 PRÓXIMOS PASSOS:');
    console.log('1. Copie todo o SQL acima');
    console.log('2. Abra Supabase → SQL Editor');
    console.log('3. Cole e execute');
    console.log('4. Pronto! Seu sistema funcionará corretamente.\n');

  } catch (error) {
    console.error('❌ Erro ao buscar UUIDs:', error.message);
    console.log('\n💡 Dicas:');
    console.log('• Verifique se a Service Role Key está correta');
    console.log('• Não use a Anon Key, use a service_role key');
    console.log('• Certifique-se de que os usuários foram criados no Auth');
    process.exit(1);
  }
}

fetchUUIDs();
