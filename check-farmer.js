require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkFarmer() {
  console.log('🔍 Hledám farmáře s telefonem +420604935628...\n');
  
  const { data, error } = await supabase
    .from('pestitele')
    .select('*')
    .eq('telefon', '+420604935628')
    .maybeSingle();

  if (error) {
    console.error('❌ Chyba:', error.message);
    return;
  }

  if (data) {
    console.log('✅ Farmář nalezen:');
    console.log('   ID:', data.id);
    console.log('   Jméno:', data.jmeno);
    console.log('   Farma:', data.nazev_farmy);
    console.log('   Telefon:', data.telefon);
    console.log('   Email:', data.email || '(není)');
  } else {
    console.log('❌ Farmář s tímto telefonem NEEXISTUJE v databázi');
    console.log('\n💡 Nejdřív se musíte zaregistrovat nebo přidat farmáře do databáze.');
  }
}

checkFarmer();
