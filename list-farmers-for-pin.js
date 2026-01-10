const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function listFarmers() {
  console.log('📋 Listing all farmers...\n');

  const { data, error } = await supabase
    .from('pestitele')
    .select('id, jmeno, nazev_farmy, telefon, heslo_hash')
    .limit(10);

  if (error) {
    console.error('❌ Error:', error);
  } else {
    console.log(`Found ${data?.length || 0} farmers:\n`);
    data?.forEach((farmer, index) => {
      console.log(`${index + 1}. ID: ${farmer.id}`);
      console.log(`   Jméno: ${farmer.jmeno}`);
      console.log(`   Farma: ${farmer.nazev_farmy}`);
      console.log(`   Telefon: ${farmer.telefon}`);
      console.log(`   PIN: ${farmer.heslo_hash}`);
      console.log('');
    });

    if (data && data.length > 0) {
      console.log('\nPro aktualizaci PINu na 383736, spusťte:');
      console.log(`node -e "const {createClient}=require('@supabase/supabase-js');require('dotenv').config();const s=createClient(process.env.EXPO_PUBLIC_SUPABASE_URL,process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);s.from('pestitele').update({heslo_hash:'383736'}).eq('id',${data[0].id}).then(r=>console.log(r))"`);
    }
  }
}

listFarmers();
