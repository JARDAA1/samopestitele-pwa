# 📱 Návod: SMS Registrace pro Farmáře

Implementoval jsem **jednoduchou registraci BEZ HESLA** pomocí SMS kódů (magic link princip).

## ✅ Co je hotové

### 1. **Databázové schéma** (`database_sms_auth.sql`)
- Tabulka `sms_overovaci_kody` pro ukládání dočasných SMS kódů
- Kódy vyprší za 10 minut
- Automatické politiky pro Row Level Security

### 2. **Helper funkce** (`app/utils/smsAuth.ts`)
- `odeslatOverovaciKod()` - odešle SMS kód a uloží do DB
- `overitSMSKod()` - ověří zadaný kód
- `existujeFarmar()` - zkontroluje, jestli telefon už není registrován
- `odeslat SMS()` - integrace se smsbrana.cz

### 3. **Nová registrace** (`app/registrace/index.tsx`)
**4 jednoduché kroky:**
- **Krok 1**: Zadání telefonu
- **Krok 2**: Ověření SMS kódu (4 číslice)
- **Krok 3**: Základní info (jméno, název farmy, město)
- **Krok 4**: Souhlas a dokončení

❌ **ŽÁDNÁ HESLA!** 🎉

---

## 🚀 Co musíte udělat

### 1. **Spustit SQL v Supabase**

1. Otevřete Supabase Dashboard
2. Jděte do **SQL Editor**
3. Zkopírujte obsah souboru `database_sms_auth.sql`
4. Klikněte na **Run** (spustit)

✅ Tabulka `sms_overovaci_kody` je vytvořena!

---

### 2. **Nastavit smsbrana.cz kredenciály**

Otevřete soubor `app/utils/smsAuth.ts` na **řádcích 16-17** a nahraďte:

```typescript
const SMSBRANA_LOGIN = 'VAS_LOGIN'; // ← Vaše přihlašovací jméno
const SMSBRANA_PASSWORD = 'VASE_HESLO'; // ← Vaše heslo
```

**Kde najdete kredenciály:**
- Přihlaste se na https://portal.smsbrana.cz
- V menu najděte **API přístup** nebo **HTTP rozhraní**
- Zkopírujte **login** a **heslo**

---

### 3. **Testování (DŮLEŽITÉ)**

**Pro testování** je kód momentálně nastaven tak, že:
- ❌ **NEODESÍLÁ skutečné SMS** (aby vám to nežralo kredit)
- ✅ **Zobrazuje kód v alertu** - vidíte ho přímo v aplikaci

Když budete testovat:
1. Zadáte telefon +420777123456
2. Kliknete "Odeslat SMS kód"
3. **Objeví se alert s kódem** (např. "Váš kód je 4729")
4. Zadáte tento kód
5. Dokončíte registraci

**Pro produkci (ostré spuštění):**
- Odkomentujte řádky 40-44 v `app/utils/smsAuth.ts` (odesílání SMS)
- Zakomentujte řádek 48 (konzolový výpis kódu)
- Odstraňte return kódu na řádku 50

---

## 🌟 Jak to funguje pro farmáře

### Pohled farmáře:

1. **Otevře aplikaci** → klikne "Jsem farmář"
2. **Zadá telefon** → +420777123456
3. **Dostane SMS** → "Váš kód: 4729"
4. **Zadá kód** → 4 7 2 9
5. **Vyplní info** → Jméno, Farma, Město
6. **Hotovo!** → Žádné heslo k zapamatování!

### Příští přihlášení:
- Zadá telefon
- Dostane SMS kód
- Zadá kód
- Přihlášen! 🎉

---

## 🔒 Bezpečnost

✅ **Bezpečnější než hesla:**
- Každý kód platí jen **10 minut**
- Každý kód lze použít jen **jednou**
- Kód je náhodně generovaný
- Starší farmáři nemusí pamatovat hesla

⚠️ **Pro produkci:**
- Přesuňte API klíče ze smsbrana.cz do **Supabase Edge Function**
- Nikdy nevracejte kód z API (řádek 50 v `smsAuth.ts`)
- Nastavte rate limiting (max 3 SMS za hodinu na číslo)

---

## 📱 Struktura databáze

### Tabulka: `sms_overovaci_kody`
| Sloupec | Typ | Popis |
|---------|-----|-------|
| `id` | SERIAL | Primární klíč |
| `telefon` | TEXT | Telefonní číslo |
| `kod` | TEXT | 4-místný kód |
| `vyprsi_v` | TIMESTAMP | Kdy vyprší (10 minut) |
| `pouzity` | BOOLEAN | Jestli už byl použitý |
| `typ` | TEXT | 'registrace' nebo 'prihlaseni' |
| `created_at` | TIMESTAMP | Kdy byl vytvořen |

---

## ✨ Výhody tohoto řešení

1. ✅ **Jednoduché** - farmář jen zadá telefon a kód
2. ✅ **Bezpečné** - kódy vyprší za 10 minut
3. ✅ **Známé** - každý zná SMS ověření z bankovnictví
4. ✅ **Bez hesel** - žádné zapomínání, žádné resety
5. ✅ **Mobilní-first** - perfektní pro telefony

---

## 🐛 Troubleshooting

### "Nepodařilo se odeslat SMS"
- Zkontrolujte kredenciály smsbrana.cz
- Zkontrolujte kredit na účtu smsbrana.cz
- Podívejte se do konzole (console.log výpisy)

### "Neplatný nebo vypršený kód"
- Kód platí jen 10 minut
- Každý kód lze použít jen jednou
- Zkontrolujte, jestli je tabulka `sms_overovaci_kody` vytvořená

### SMS nepřichází
- Pro testování použijte mód s alertem (je aktivní)
- Pro produkci odkomentujte odesílání SMS

---

## 📞 Potřebujete pomoc?

Pokud něco nefunguje, dejte mi vědět! 🚀
