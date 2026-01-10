const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkFarmer() {
  const email = 'jaroslav.antos@seznam.cz';
  const telefon = '+420604935628';

  console.log('🔍 Hledám farmáře s emailem:', email);
  console.log('🔍 Hledám farmáře s telefonem:', telefon);
  console.log('');

  const { data, error } = await supabase
    .from('pestitele')
    .select('*')
    .or(`email.eq.${email},telefon.eq.${telefon}`)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Chyba:', error.message);
    return;
  }

  if (!data || data.length === 0) {
    console.log('⚠️  Žádní farmáři nenalezeni');
    return;
  }

  console.log(`✅ Nalezeno ${data.length} farmářů:\n`);

  data.forEach((farmer, index) => {
    console.log(`${index + 1}. ${farmer.jmeno} - ${farmer.nazev_farmy} (ID: ${farmer.id})`);
    console.log(`   📧 Email: ${farmer.email || 'není'}`);
    console.log(`   📱 Telefon: ${farmer.telefon || 'není'}`);
    console.log(`   🔐 PIN (heslo_hash): ${farmer.heslo_hash ? '✓ nastaven (' + farmer.heslo_hash + ')' : '✗ není nastaven'}`);
    console.log(`   📍 GPS: ${farmer.gps_lat}, ${farmer.gps_lng}`);
    console.log(`   📅 Vytvořeno: ${farmer.created_at}`);
    console.log('');
  });
}

checkFarmer();
