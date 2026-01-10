const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function updatePin() {
  console.log('🔧 Updating PIN to 383736 for farmer ID 7...');

  const { data, error } = await supabase
    .from('pestitele')
    .update({ heslo_hash: '383736' })
    .eq('id', 7)
    .select();

  if (error) {
    console.error('❌ Error:', error);
  } else {
    console.log('✅ Success! PIN updated to: 383736');
    console.log('Data:', data);
    console.log('\nNyní se můžete přihlásit s PINem: 383736');
  }
}

updatePin();
