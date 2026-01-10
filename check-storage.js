const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkStorage() {
  console.log('🔍 Kontroluji Supabase Storage...\n');

  try {
    // 1. Zkusit vylistovat buckety
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();

    if (bucketsError) {
      console.error('❌ Chyba při listování buckets:', bucketsError.message);
    } else {
      console.log('✅ Dostupné buckety:');
      buckets.forEach(bucket => {
        console.log(`  - ${bucket.name} (public: ${bucket.public})`);
      });
    }

    // 2. Zkusit test upload
    console.log('\n📤 Zkouším test upload...');
    const testData = new Uint8Array([1, 2, 3, 4, 5]);
    const testFileName = `test/test-${Date.now()}.txt`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('pestitele-fotky')
      .upload(testFileName, testData, {
        contentType: 'text/plain',
      });

    if (uploadError) {
      console.error('❌ Test upload selhal:', uploadError.message);
      console.error('   Code:', uploadError.statusCode);
      console.error('   Detail:', JSON.stringify(uploadError, null, 2));
    } else {
      console.log('✅ Test upload úspěšný:', uploadData.path);

      // Smazat testovací soubor
      await supabase.storage.from('pestitele-fotky').remove([testFileName]);
      console.log('🗑️  Test soubor smazán');
    }

  } catch (error) {
    console.error('❌ Neočekávaná chyba:', error);
  }
}

checkStorage();
