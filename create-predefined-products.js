const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function createPredefinedProducts() {
  console.log('🔧 Creating predefined products table and inserting data...');

  // Nejprve zkusíme vytvořit tabulku pomocí SQL
  // Poznámka: Toto může selhat kvůli oprávněním, v tom případě to udělejte v Supabase Dashboard

  // Vložíme produkty přímo
  const products = [
    // Zelenina
    { nazev: 'Rajčata', emoji: '🍅', kategorie: 'Zelenina' },
    { nazev: 'Mrkev', emoji: '🥕', kategorie: 'Zelenina' },
    { nazev: 'Okurky', emoji: '🥒', kategorie: 'Zelenina' },
    { nazev: 'Papriky', emoji: '🫑', kategorie: 'Zelenina' },
    { nazev: 'Chilli papričky', emoji: '🌶️', kategorie: 'Zelenina' },
    { nazev: 'Brambory', emoji: '🥔', kategorie: 'Zelenina' },
    { nazev: 'Cibule', emoji: '🧅', kategorie: 'Zelenina' },
    { nazev: 'Česnek', emoji: '🧄', kategorie: 'Zelenina' },
    { nazev: 'Salát', emoji: '🥬', kategorie: 'Zelenina' },
    { nazev: 'Brokolice', emoji: '🥦', kategorie: 'Zelenina' },
    { nazev: 'Houby', emoji: '🍄', kategorie: 'Zelenina' },
    { nazev: 'Kukuřice', emoji: '🌽', kategorie: 'Zelenina' },

    // Ovoce
    { nazev: 'Hrozny', emoji: '🍇', kategorie: 'Ovoce' },
    { nazev: 'Meloun', emoji: '🍉', kategorie: 'Ovoce' },
    { nazev: 'Pomeranče', emoji: '🍊', kategorie: 'Ovoce' },
    { nazev: 'Citrony', emoji: '🍋', kategorie: 'Ovoce' },
    { nazev: 'Banány', emoji: '🍌', kategorie: 'Ovoce' },
    { nazev: 'Ananas', emoji: '🍍', kategorie: 'Ovoce' },
    { nazev: 'Mango', emoji: '🥭', kategorie: 'Ovoce' },
    { nazev: 'Jablka', emoji: '🍎', kategorie: 'Ovoce' },
    { nazev: 'Hrušky', emoji: '🍐', kategorie: 'Ovoce' },
    { nazev: 'Broskve', emoji: '🍑', kategorie: 'Ovoce' },
    { nazev: 'Třešně', emoji: '🍒', kategorie: 'Ovoce' },
    { nazev: 'Jahody', emoji: '🍓', kategorie: 'Ovoce' },
    { nazev: 'Borůvky', emoji: '🫐', kategorie: 'Ovoce' },
    { nazev: 'Kiwi', emoji: '🥝', kategorie: 'Ovoce' },
    { nazev: 'Kokos', emoji: '🥥', kategorie: 'Ovoce' },

    // Vejce a mléčné
    { nazev: 'Vejce', emoji: '🥚', kategorie: 'Vejce' },
    { nazev: 'Mléko', emoji: '🥛', kategorie: 'Mléčné výrobky' },
    { nazev: 'Sýr', emoji: '🧀', kategorie: 'Mléčné výrobky' },
    { nazev: 'Máslo', emoji: '🧈', kategorie: 'Mléčné výrobky' },

    // Ostatní
    { nazev: 'Hovězí maso', emoji: '🥩', kategorie: 'Ostatní' },
    { nazev: 'Kuřecí maso', emoji: '🍗', kategorie: 'Ostatní' },
    { nazev: 'Slanina', emoji: '🥓', kategorie: 'Ostatní' },
    { nazev: 'Ryby', emoji: '🐟', kategorie: 'Ostatní' },
    { nazev: 'Med', emoji: '🍯', kategorie: 'Med' },
    { nazev: 'Chléb', emoji: '🍞', kategorie: 'Ostatní' },
    { nazev: 'Bageta', emoji: '🥖', kategorie: 'Ostatní' },
    { nazev: 'Rohlíky', emoji: '🥐', kategorie: 'Ostatní' },
    { nazev: 'Obilí', emoji: '🌾', kategorie: 'Ostatní' },
  ];

  console.log(`📦 Inserting ${products.length} products...`);

  const { data, error } = await supabase
    .from('predefinovane_produkty')
    .insert(products)
    .select();

  if (error) {
    console.error('❌ Error:', error);
    console.log('\n⚠️  Pokud tabulka neexistuje, vytvořte ji v Supabase SQL Editoru:');
    console.log('\nCREATE TABLE IF NOT EXISTS predefinovane_produkty (');
    console.log('  id SERIAL PRIMARY KEY,');
    console.log('  nazev TEXT NOT NULL,');
    console.log('  emoji TEXT NOT NULL,');
    console.log('  kategorie TEXT NOT NULL,');
    console.log('  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()');
    console.log(');');
    console.log('\nPak spusťte tento skript znovu.');
  } else {
    console.log('✅ Success! Inserted products:', data?.length || 0);
  }
}

createPredefinedProducts();
