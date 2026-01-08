const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function setTestPin() {
  console.log('🔧 Nastavuji testovací PIN pro uživatele...\n');

  // Email pro testování
  const testEmail = 'jaroslav.antos@seznam.cz';
  const testPhone = '+420604935628';
  const testPin = '1234';

  // Najdeme uživatele podle emailu
  const { data: farmers, error: findError } = await supabase
    .from('pestitele')
    .select('*')
    .eq('email', testEmail);

  if (findError || !farmers || farmers.length === 0) {
    console.error('❌ Chyba při hledání uživatele:', findError?.message || 'Uživatel nenalezen');
    return;
  }

  console.log(`✅ Nalezen uživatel:`);
  console.log(`   ID: ${farmers[0].id}`);
  console.log(`   Jméno: ${farmers[0].jmeno}`);
  console.log(`   Farma: ${farmers[0].nazev_farmy}`);
  console.log(`   Email: ${farmers[0].email}`);
  console.log(`   Telefon: ${farmers[0].telefon}`);
  console.log('');

  // Nastavíme PIN (zatím v plain textu, v produkci by to měl být hash)
  const { error: updateError } = await supabase
    .from('pestitele')
    .update({ heslo_hash: testPin })
    .eq('id', farmers[0].id);

  if (updateError) {
    console.error('❌ Chyba při nastavování PINu:', updateError.message);
    return;
  }

  console.log('✅ PIN úspěšně nastaven!');
  console.log('');
  console.log('📝 Testovací údaje:');
  console.log(`   Email: ${testEmail}`);
  console.log(`   Telefon: ${testPhone}`);
  console.log(`   PIN: ${testPin}`);
  console.log('');
  console.log('💡 Nyní můžete otestovat:');
  console.log('   1. Přihlášení přes Email Magic Link (Profil)');
  console.log('   2. Přihlášení přes Telefon + PIN (Prodejna)');
}

setTestPin();
