const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function updateTestPin() {
  console.log('🔧 Updating test PIN to 383736...');

  // Aktualizuj PIN pro všechny pesititele na testovací PIN
  const { data, error } = await supabase
    .from('pestitele')
    .update({ heslo_hash: '383736' })
    .select();

  if (error) {
    console.error('❌ Error:', error);
  } else {
    console.log(`✅ Success! Updated ${data?.length || 0} farmers with PIN: 383736`);
    console.log('');
    console.log('Testovací přihlášení:');
    console.log('PIN: 383736');
  }
}

updateTestPin();
