const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Pro vytvoření storage bucketu potřebujete SERVICE ROLE KEY, ne ANON KEY
// Tento skript je jen jako reference - bucket musíte vytvořit v Supabase Dashboard

console.log(`
⚠️  UPOZORNĚNÍ: Storage bucket nelze vytvořit přes ANON KEY!

Musíte ho vytvořit v Supabase Dashboard:

1. Přihlaste se na https://supabase.com
2. Otevřete váš projekt
3. V levém menu klikněte na "Storage"
4. Klikněte na "Create bucket"
5. Vyplňte:
   - Name: stanky-photos
   - Public bucket: ✅ ANO (zaškrtnout!)
   - Allowed MIME types: image/*
   - Max file size: 5MB (nebo více dle potřeby)
6. Klikněte "Create bucket"

📸 Bucket "stanky-photos" musí být PUBLIC, aby fotky byly viditelné!

Po vytvoření bucketu restartujte aplikaci a zkuste nahrát fotku.
`);

// Zkontrolujeme aktuální stav
const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function checkBuckets() {
  const { data: buckets, error } = await supabase.storage.listBuckets();

  if (error) {
    console.error('❌ Chyba při kontrole buckets:', error);
    return;
  }

  console.log('\n📦 Aktuální storage buckets:');
  if (buckets.length === 0) {
    console.log('   (žádné)');
  } else {
    buckets.forEach(bucket => {
      const status = bucket.name === 'stanky-photos' ? '✅' : '  ';
      console.log(`   ${status} ${bucket.name} (${bucket.public ? 'public' : 'private'})`);
    });
  }

  const hasStankyPhotos = buckets.some(b => b.name === 'stanky-photos');
  if (hasStankyPhotos) {
    console.log('\n✅ Bucket "stanky-photos" už existuje!');
  } else {
    console.log('\n❌ Bucket "stanky-photos" ještě neexistuje - vytvořte ho podle instrukcí výše.');
  }
}

checkBuckets();
