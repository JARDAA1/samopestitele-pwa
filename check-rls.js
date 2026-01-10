const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkRLS() {
  console.log('🔐 Kontroluji RLS políčka pro tabulku pestitele...\n');

  // Zkusíme UPDATE s ANON klíčem (jako v aplikaci)
  const farmerId = '7';

  console.log('1️⃣ Test UPDATE s ANON klíčem (jako v aplikaci):');
  const { data: updateData, error: updateError } = await supabase
    .from('pestitele')
    .update({ nazev_farmy: 'Test RLS Update - ' + new Date().toISOString() })
    .eq('id', farmerId)
    .select();

  if (updateError) {
    console.error('❌ UPDATE SELHAL:', updateError.message);
    console.error('   Code:', updateError.code);
    console.error('   Details:', updateError.details);
    console.error('   Hint:', updateError.hint);
  } else if (!updateData || updateData.length === 0) {
    console.error('❌ UPDATE vrátil prázdná data - pravděpodobně RLS blokuje přístup');
  } else {
    console.log('✅ UPDATE úspěšný:', updateData[0].nazev_farmy);
  }

  console.log('\n2️⃣ Test SELECT s ANON klíčem:');
  const { data: selectData, error: selectError } = await supabase
    .from('pestitele')
    .select('*')
    .eq('id', farmerId)
    .single();

  if (selectError) {
    console.error('❌ SELECT SELHAL:', selectError.message);
  } else if (!selectData) {
    console.error('❌ SELECT vrátil prázdná data');
  } else {
    console.log('✅ SELECT úspěšný - Farmer:', selectData.jmeno, '-', selectData.nazev_farmy);
  }

  console.log('\n3️⃣ Doporučení:');
  if (updateError || (updateData && updateData.length === 0)) {
    console.log('⚠️  RLS políčka pravděpodobně BLOKUJÍ UPDATE operace!');
    console.log('');
    console.log('Řešení v Supabase:');
    console.log('1. Otevřete Supabase Dashboard');
    console.log('2. Jděte na: Authentication > Policies');
    console.log('3. Najděte tabulku "pestitele"');
    console.log('4. Zkontrolujte/vytvořte políčko pro UPDATE:');
    console.log('   - Policy name: "Enable update for all users"');
    console.log('   - Policy command: UPDATE');
    console.log('   - Target roles: anon, authenticated');
    console.log('   - USING expression: true');
    console.log('   - WITH CHECK expression: true');
    console.log('');
    console.log('Nebo spusťte SQL:');
    console.log(`
    CREATE POLICY "Enable update for all users" ON public.pestitele
    FOR UPDATE
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);
    `);
  } else {
    console.log('✅ RLS políčka vypadají v pořádku - problém je jinde');
  }
}

checkRLS();
