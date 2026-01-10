const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkUsers() {
  console.log('🔍 Hledám uživatele v databázi...\n');

  const { data, error } = await supabase
    .from('pestitele')
    .select('*')
    .limit(5);

  if (error) {
    console.error('❌ Chyba:', error.message);
    return;
  }

  if (!data || data.length === 0) {
    console.log('⚠️  Žádní uživatelé v databázi');
    return;
  }

  console.log(`✅ Nalezeno ${data.length} uživatelů:\n`);

  data.forEach((user, index) => {
    console.log(`${index + 1}. ${user.jmeno || 'Bez jména'} (${user.nazev_farmy || 'Bez názvu'})`);
    console.log(`   Email: ${user.email || 'není nastavený'}`);
    console.log(`   Telefon: ${user.telefon || 'není nastavený'}`);
    console.log(`   ID: ${user.id}`);
    console.log('');
  });
}

checkUsers();
