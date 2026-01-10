-- Vytvoření tabulky pro předdefinované produkty
CREATE TABLE IF NOT EXISTS predefinovane_produkty (
  id SERIAL PRIMARY KEY,
  nazev TEXT NOT NULL,
  emoji TEXT NOT NULL,
  kategorie TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vložení produktů - Zelenina
INSERT INTO predefinovane_produkty (nazev, emoji, kategorie) VALUES
('Rajčata', '🍅', 'Zelenina'),
('Mrkev', '🥕', 'Zelenina'),
('Okurky', '🥒', 'Zelenina'),
('Papriky', '🫑', 'Zelenina'),
('Chilli papričky', '🌶️', 'Zelenina'),
('Brambory', '🥔', 'Zelenina'),
('Cibule', '🧅', 'Zelenina'),
('Česnek', '🧄', 'Zelenina'),
('Salát', '🥬', 'Zelenina'),
('Brokolice', '🥦', 'Zelenina'),
('Houby', '🍄', 'Zelenina'),
('Kukuřice', '🌽', 'Zelenina');

-- Ovoce
INSERT INTO predefinovane_produkty (nazev, emoji, kategorie) VALUES
('Hrozny', '🍇', 'Ovoce'),
('Meloun', '🍉', 'Ovoce'),
('Pomeranče', '🍊', 'Ovoce'),
('Citrony', '🍋', 'Ovoce'),
('Banány', '🍌', 'Ovoce'),
('Ananas', '🍍', 'Ovoce'),
('Mango', '🥭', 'Ovoce'),
('Jablka', '🍎', 'Ovoce'),
('Hrušky', '🍐', 'Ovoce'),
('Broskve', '🍑', 'Ovoce'),
('Třešně', '🍒', 'Ovoce'),
('Jahody', '🍓', 'Ovoce'),
('Borůvky', '🫐', 'Ovoce'),
('Kiwi', '🥝', 'Ovoce'),
('Kokos', '🥥', 'Ovoce');

-- Vejce a mléčné
INSERT INTO predefinovane_produkty (nazev, emoji, kategorie) VALUES
('Vejce', '🥚', 'Vejce'),
('Mléko', '🥛', 'Mléčné výrobky'),
('Sýr', '🧀', 'Mléčné výrobky'),
('Máslo', '🧈', 'Mléčné výrobky');

-- Ostatní
INSERT INTO predefinovane_produkty (nazev, emoji, kategorie) VALUES
('Hovězí maso', '🥩', 'Ostatní'),
('Kuřecí maso', '🍗', 'Ostatní'),
('Slanina', '🥓', 'Ostatní'),
('Ryby', '🐟', 'Ostatní'),
('Med', '🍯', 'Med'),
('Chléb', '🍞', 'Ostatní'),
('Bageta', '🥖', 'Ostatní'),
('Rohlíky', '🥐', 'Ostatní'),
('Obilí', '🌾', 'Ostatní');
