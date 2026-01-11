const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function testCreateStanek() {
  console.log('🧪 Testing stanky table insert...\n');

  const testStanek = {
    pestitel_id: 7, // Test farmer ID
    nazev: 'Test stánek',
    popis: 'Testovací popis',
    mesto: 'Praha',
    ulice: 'Václavské náměstí 1',
    foto_url: null,
    datum_od: '2025-01-15',
    datum_do: '2025-01-20',
    cas_od: '08:00',
    cas_do: '18:00',
    aktivni: true
  };

  console.log('📝 Attempting to insert:', JSON.stringify(testStanek, null, 2));

  const { data, error } = await supabase
    .from('stanky')
    .insert(testStanek)
    .select();

  if (error) {
    console.error('\n❌ ERROR:', error);
    console.error('\nError details:');
    console.error('  Code:', error.code);
    console.error('  Message:', error.message);
    console.error('  Details:', error.details);
    console.error('  Hint:', error.hint);
  } else {
    console.log('\n✅ SUCCESS! Created stanek:');
    console.log(JSON.stringify(data, null, 2));
  }
}

testCreateStanek();
