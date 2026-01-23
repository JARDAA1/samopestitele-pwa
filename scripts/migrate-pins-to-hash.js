/**
 * MIGRACE PLAIN TEXT PIN NA HASHOVANÉ PINY
 * ==========================================
 *
 * Tento skript převede všechny plain text PINy v databázi na zahashované pomocí bcrypt.
 *
 * DŮLEŽITÉ:
 * - Spusťte tento skript JEDNOU po nasazení nové verze s hashováním
 * - Zálohujte databázi před spuštěním!
 * - Po migraci již nebudou staré plain text PINy fungovat
 *
 * Použití:
 * node scripts/migrate-pins-to-hash.js
 */

const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');

// Načtení Supabase credentials z .env
require('dotenv').config();

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Chybí EXPO_PUBLIC_SUPABASE_URL nebo EXPO_PUBLIC_SUPABASE_ANON_KEY v .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const BCRYPT_SALT_ROUNDS = 10;

/**
 * Detekuje, jestli je PIN plain text nebo hash
 */
function isPlainTextPin(pin) {
  if (!pin) return false;

  // Bcrypt hash začíná $2a$ nebo $2b$
  if (pin.startsWith('$2a$') || pin.startsWith('$2b$')) {
    return false; // Je to už hash
  }

  // Plain text PIN je obvykle 4-6 číslic
  if (/^\d{4,6}$/.test(pin)) {
    return true;
  }

  return false;
}

/**
 * Hashování PINu pomocí bcrypt
 */
async function hashPin(pin) {
  const salt = await bcrypt.genSalt(BCRYPT_SALT_ROUNDS);
  const hash = await bcrypt.hash(pin, salt);
  return hash;
}

/**
 * Hlavní migrace
 */
async function migratePins() {
  console.log('🚀 Spouštím migraci PINů...\n');

  try {
    // 1. Načíst všechny farmáře s PINem
    console.log('📥 Načítám farmáře z databáze...');
    const { data: farmers, error } = await supabase
      .from('pestitele')
      .select('id, jmeno, nazev_farmy, heslo_hash')
      .not('heslo_hash', 'is', null);

    if (error) {
      console.error('❌ Chyba při načítání farmářů:', error);
      process.exit(1);
    }

    console.log(`✅ Načteno ${farmers.length} farmářů s PINem\n`);

    // 2. Filtrovat pouze plain text PINy
    const plainTextFarmers = farmers.filter(f => isPlainTextPin(f.heslo_hash));
    const alreadyHashedFarmers = farmers.filter(f => !isPlainTextPin(f.heslo_hash));

    console.log(`📊 Statistika:`);
    console.log(`   - Plain text PINy: ${plainTextFarmers.length}`);
    console.log(`   - Již zahashované: ${alreadyHashedFarmers.length}\n`);

    if (plainTextFarmers.length === 0) {
      console.log('✅ Všechny PINy jsou již zahashované. Migrace není potřeba.');
      return;
    }

    // 3. Zeptat se na potvrzení
    console.log('⚠️  POZOR: Chystáte se převést plain text PINy na hashe.');
    console.log('⚠️  Po této operaci již staré PINy nebudou fungovat!');
    console.log('⚠️  Ujistěte se, že máte zálohu databáze!\n');

    // Pro automatické spuštění zakomentujte následující řádek
    // const readline = require('readline').createInterface({
    //   input: process.stdin,
    //   output: process.stdout
    // });
    //
    // const answer = await new Promise(resolve => {
    //   readline.question('Pokračovat? (ano/ne): ', resolve);
    // });
    // readline.close();
    //
    // if (answer.toLowerCase() !== 'ano') {
    //   console.log('❌ Migrace zrušena');
    //   process.exit(0);
    // }

    console.log('🔐 Spouštím hashování PINů...\n');

    // 4. Hasování a aktualizace
    let successCount = 0;
    let errorCount = 0;

    for (const farmer of plainTextFarmers) {
      try {
        const plainPin = farmer.heslo_hash;
        console.log(`   Zpracovávám: ${farmer.jmeno} (${farmer.nazev_farmy})`);
        console.log(`   Plain PIN: ${plainPin}`);

        // Zahashovat PIN
        const hashedPin = await hashPin(plainPin);
        console.log(`   Hash: ${hashedPin.substring(0, 20)}...`);

        // Aktualizovat v databázi
        const { error: updateError } = await supabase
          .from('pestitele')
          .update({ heslo_hash: hashedPin })
          .eq('id', farmer.id);

        if (updateError) {
          console.error(`   ❌ Chyba při aktualizaci:`, updateError);
          errorCount++;
        } else {
          console.log(`   ✅ Úspěšně zahashováno\n`);
          successCount++;
        }
      } catch (err) {
        console.error(`   ❌ Výjimka:`, err);
        errorCount++;
      }
    }

    // 5. Výsledná statistika
    console.log('\n' + '='.repeat(50));
    console.log('📊 VÝSLEDKY MIGRACE');
    console.log('='.repeat(50));
    console.log(`✅ Úspěšně převedeno: ${successCount}`);
    console.log(`❌ Chyby: ${errorCount}`);
    console.log(`📊 Celkem zpracováno: ${plainTextFarmers.length}`);
    console.log('='.repeat(50));

    if (errorCount === 0) {
      console.log('\n🎉 Migrace byla úspěšně dokončena!');
      console.log('✅ Všechny PINy jsou nyní bezpečně zahashované.');
    } else {
      console.log('\n⚠️  Migrace dokončena s chybami. Zkontrolujte logy výše.');
    }

  } catch (error) {
    console.error('❌ Neočekávaná chyba:', error);
    process.exit(1);
  }
}

// Spustit migraci
migratePins();
