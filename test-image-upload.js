const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testImageUpload() {
  console.log('🔍 Test upload obrázku do Supabase Storage...\n');

  try {
    // Vytvoříme malý testovací obrázek (1x1 pixel PNG)
    const testPNG = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
      0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
      0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41,
      0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
      0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00,
      0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
      0x42, 0x60, 0x82
    ]);

    const fileName = `farmy/test-${Date.now()}.png`;

    console.log('📤 Nahrávám test PNG do pestitele-fotky bucket...');
    console.log('   Soubor:', fileName);
    console.log('   Velikost:', testPNG.length, 'bytes');

    const { data, error } = await supabase.storage
      .from('pestitele-fotky')
      .upload(fileName, testPNG, {
        contentType: 'image/png',
        upsert: false,
      });

    if (error) {
      console.error('\n❌ Upload selhal:', error.message);
      console.error('   Status:', error.statusCode);
      console.error('   Detail:', JSON.stringify(error, null, 2));

      if (error.message.includes('not found') || error.statusCode === '404') {
        console.log('\n💡 Bucket "pestitele-fotky" pravděpodobně neexistuje.');
        console.log('   Vytvořte bucket v Supabase Dashboard:');
        console.log('   1. Jděte na https://supabase.com/dashboard/project/ozxzowfzhdulofkxniji/storage/buckets');
        console.log('   2. Klikněte na "New bucket"');
        console.log('   3. Název: pestitele-fotky');
        console.log('   4. Public bucket: ANO');
        console.log('   5. File size limit: 5 MB');
        console.log('   6. Allowed MIME types: image/jpeg, image/png, image/webp');
      }
    } else {
      console.log('\n✅ Upload úspěšný!');
      console.log('   Path:', data.path);

      // Získat public URL
      const { data: urlData } = supabase.storage
        .from('pestitele-fotky')
        .getPublicUrl(data.path);

      console.log('   Public URL:', urlData.publicUrl);

      // Smazat test soubor
      await supabase.storage.from('pestitele-fotky').remove([fileName]);
      console.log('\n🗑️  Test soubor smazán');
    }

  } catch (error) {
    console.error('❌ Neočekávaná chyba:', error);
  }
}

testImageUpload();
