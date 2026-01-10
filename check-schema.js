const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkSchema() {
  console.log('🔍 Kontroluji schéma tabulky pestitele...\n');

  const { data, error } = await supabase
    .from('pestitele')
    .select('*')
    .limit(1);

  if (error) {
    console.error('❌ Chyba:', error.message);
    return;
  }

  if (data && data.length > 0) {
    console.log('✅ Sloupce v tabulce:');
    console.log(Object.keys(data[0]).join(', '));
    console.log('\n📄 Ukázkový záznam:');
    console.log(JSON.stringify(data[0], null, 2));
  }
}

checkSchema();
