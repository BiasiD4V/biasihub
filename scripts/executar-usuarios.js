const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://vzaabtzcilyoknksvhrc.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6YWFidHpjaWx5b2tua3N2aHJjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDUyNDI0NiwiZXhwIjoyMDkwMTAwMjQ2fQ.b0QCcqqIJMrx8li0g_uRXoJ9z114YWyiHvu5QPjMG7o';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function adicionarUsuarios() {
  try {
    console.log('🔄 Iniciando adição de usuários...\n');

    // 1️⃣ Criar usuário: Giovanni
    console.log('➕ Criando Giovanni (giovanni.comercialbiasi@gmail.com)...');
    const { data: giovanni, error: errorGiovanni } = await supabase.auth.admin.createUser({
      email: 'giovanni.comercialbiasi@gmail.com',
      password: '1234',
      email_confirm: true,
      user_metadata: {
        nome: 'Giovanni',
        papel: 'user'
      }
    });

    if (errorGiovanni) {
      console.error('❌ Erro ao criar Giovanni:', errorGiovanni.message);
    } else {
      console.log('✅ Giovanni criado com UUID:', giovanni.user.id);
    }

    // 2️⃣ Criar usuário: Jenni
    console.log('\n➕ Criando Jenni (araujojenni2009@gmail.com)...');
    const { data: jenni, error: errorJenni } = await supabase.auth.admin.createUser({
      email: 'araujojenni2009@gmail.com',
      password: '1234',
      email_confirm: true,
      user_metadata: {
        nome: 'Jenni',
        papel: 'user'
      }
    });

    if (errorJenni) {
      console.error('❌ Erro ao criar Jenni:', errorJenni.message);
    } else {
      console.log('✅ Jenni criada com UUID:', jenni.user.id);
    }

    // 3️⃣ Inserir perfis na tabela usuarios
    if (giovanni && !errorGiovanni) {
      console.log('\n📝 Adicionando perfil de Giovanni na tabela usuarios...');
      const { error: errorGiovanniProfile } = await supabase
        .from('usuarios')
        .insert({
          id: giovanni.user.id,
          nome: 'Giovanni',
          email: 'giovanni.comercialbiasi@gmail.com',
          papel: 'user',
          ativo: true
        });

      if (errorGiovanniProfile) {
        console.error('❌ Erro ao adicionar perfil de Giovanni:', errorGiovanniProfile.message);
      } else {
        console.log('✅ Perfil de Giovanni adicionado');
      }
    }

    if (jenni && !errorJenni) {
      console.log('\n📝 Adicionando perfil de Jenni na tabela usuarios...');
      const { error: errorJenniProfile } = await supabase
        .from('usuarios')
        .insert({
          id: jenni.user.id,
          nome: 'Jenni',
          email: 'araujojenni2009@gmail.com',
          papel: 'user',
          ativo: true
        });

      if (errorJenniProfile) {
        console.error('❌ Erro ao adicionar perfil de Jenni:', errorJenniProfile.message);
      } else {
        console.log('✅ Perfil de Jenni adicionado');
      }
    }

    console.log('\n🎉 Operação concluída!');
  } catch (error) {
    console.error('💥 Erro geral:', error);
  }
}

adicionarUsuarios();
