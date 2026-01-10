const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function cleanupDatabase() {
  console.log('🧹 Čištění databáze...\n');

  // IDs to delete (duplicates)
  const idsToDelete = [6, 9, 18, 19];

  // ID to keep and update
  const keepId = 7;

  console.log('❌ Mažu duplicitní záznamy:', idsToDelete.join(', '));

  // Delete duplicates
  const { error: deleteError } = await supabase
    .from('pestitele')
    .delete()
    .in('id', idsToDelete);

  if (deleteError) {
    console.error('❌ Chyba při mazání:', deleteError.message);
    return;
  }

  console.log('✅ Duplicitní záznamy smazány\n');

  // Update the kept record with correct data
  console.log(`📝 Aktualizuji záznam ID ${keepId}...`);

  const { data: updatedData, error: updateError } = await supabase
    .from('pestitele')
    .update({
      nazev_farmy: 'Testovací Farma',
      jmeno: 'Jaroslav Antoš',
      email: 'jaroslav.antos@seznam.cz',
      telefon: '+420604935628',
      mesto: 'Praha',
      adresa: 'Ronna 15, Korozluky',
      popis: 'Testovací profil farmáře',
      heslo_hash: '1234', // Keep the existing PIN
    })
    .eq('id', keepId)
    .select();

  if (updateError) {
    console.error('❌ Chyba při aktualizaci:', updateError.message);
    return;
  }

  console.log('✅ Záznam aktualizován\n');

  // Show final state
  console.log('📊 Finální stav databáze:\n');

  const { data: allFarmers, error: fetchError } = await supabase
    .from('pestitele')
    .select('*')
    .order('id');

  if (fetchError) {
    console.error('❌ Chyba při načítání:', fetchError.message);
    return;
  }

  console.log(`Počet farmářů: ${allFarmers.length}\n`);

  allFarmers.forEach((farmer, index) => {
    console.log(`${index + 1}. ${farmer.jmeno} - ${farmer.nazev_farmy} (ID: ${farmer.id})`);
    console.log(`   📧 Email: ${farmer.email}`);
    console.log(`   📱 Telefon: ${farmer.telefon}`);
    console.log(`   🔐 PIN: ${farmer.heslo_hash ? '✓ ' + farmer.heslo_hash : '✗ není'}`);
    console.log(`   📍 GPS: ${farmer.gps_lat}, ${farmer.gps_lng}`);
    console.log('');
  });

  console.log('✅ Databáze vyčištěna!');
}

cleanupDatabase();
