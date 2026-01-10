require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function listFarmers() {
  console.log('📋 Seznam všech farmářů v databázi:\n');
  
  const { data, error } = await supabase
    .from('pestitele')
    .select('*');

  if (error) {
    console.error('❌ Chyba:', error.message);
    return;
  }

  if (data && data.length > 0) {
    console.log('Celkem nalezeno: ' + data.length + ' farmářů\n');
    data.forEach((farmer, idx) => {
      console.log((idx + 1) + '. ' + (farmer.jmeno || '(bez jména)'));
      console.log('   ID: ' + farmer.id);
      console.log('   Farma: ' + (farmer.nazev_farmy || '(není)'));
      console.log('   Telefon: ' + farmer.telefon);
      console.log('   Email: ' + (farmer.email || '(není)'));
      console.log('');
    });
  } else {
    console.log('❌ Databáze je prázdná - žádní farmáři nenalezeni');
    console.log('\n💡 Zkuste se zaregistrovat přes aplikaci.');
  }
}

listFarmers();
