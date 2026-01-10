const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testUpdate() {
  const farmerId = '7';

  console.log('📝 Testing update for farmer ID:', farmerId);
  console.log('');

  // Test data to update
  const updateData = {
    nazev_farmy: 'Testovací Farma - Updated',
    jmeno: 'Jaroslav Antoš',
    email: 'jaroslav.antos@seznam.cz',
    mesto: 'Praha',
    adresa: 'Ronna 15, Korozluky',
    popis: 'Test update funkčnosti',
    gps_lat: 50.4785794,
    gps_lng: 13.7229757,
  };

  console.log('📦 Update data:', updateData);
  console.log('');

  // Try the update
  const { data, error } = await supabase
    .from('pestitele')
    .update(updateData)
    .eq('id', farmerId)
    .select();

  console.log('📥 Supabase response:');
  console.log('  Data:', data);
  console.log('  Error:', error);
  console.log('');

  if (error) {
    console.error('❌ Update failed:', error.message);
    console.error('   Details:', error);
    return;
  }

  if (!data || data.length === 0) {
    console.error('❌ No data returned from update');
    return;
  }

  console.log('✅ Update successful!');
  console.log('');
  console.log('Updated farmer:');
  console.log('  ID:', data[0].id);
  console.log('  Jméno:', data[0].jmeno);
  console.log('  Farma:', data[0].nazev_farmy);
  console.log('  Popis:', data[0].popis);
}

testUpdate();
