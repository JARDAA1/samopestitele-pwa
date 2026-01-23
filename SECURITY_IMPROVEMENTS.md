# Bezpečnostní vylepšení PIN autentizace

## 📋 Přehled změn

Byly implementovány tři klíčové bezpečnostní vylepšení pro systém PIN autentizace:

1. **🔐 Hashování PINu pomocí bcrypt**
2. **⏱️ Rate limiting - omezení pokusů o přihlášení**
3. **⏰ Session timeout - automatické odhlášení po neaktivitě**

---

## 1. 🔐 Hashování PINu (bcrypt)

### Co bylo změněno:
- PINy jsou nyní hashovány pomocí **bcrypt** před uložením do databáze
- Nikdy se neukládá plain text PIN
- Při přihlášení se PIN porovnává pomocí `bcrypt.compare()`

### Technické detaily:
- **Salt rounds**: 10 (optimální kompromis mezi bezpečností a výkonem)
- **Hash formát**: `$2a$10$...` nebo `$2b$10$...`
- **Kompatibilita**: Kód podporuje i staré plain text PINy pro zpětnou kompatibilitu

### Soubory změněny:
- `app/utils/farmarAuthContext.tsx:4` - Import bcrypt
- `app/utils/farmarAuthContext.tsx:42-60` - Helper funkce `hashPin()` a `comparePin()`
- `app/utils/farmarAuthContext.tsx:264-266` - Hashování při registraci
- `app/utils/farmarAuthContext.tsx:291-348` - Porovnání hashe při přihlášení
- `app/utils/farmarAuthContext.tsx:574-580` - Hashování při vytvoření nového PINu

### Jak to funguje:

```typescript
// Při registraci nebo změně PINu:
const pinHash = await hashPin('123456');
// Výsledek: $2a$10$rZ8QvH... (60 znaků)

// Při přihlášení:
const isValid = await comparePin('123456', hash);
// Výsledek: true/false
```

---

## 2. ⏱️ Rate Limiting (Omezení pokusů)

### Co bylo změněno:
- **Maximum 5 neúspěšných pokusů** o přihlášení
- Po 5. neúspěšném pokusu je účet **uzamčen na 15 minut**
- Pokusy jsou uloženy v AsyncStorage
- Po úspěšném přihlášení se pokusy resetují

### Technické detaily:
- **Max pokusy**: 5
- **Lockout duration**: 15 minut (900 000 ms)
- **Storage keys**:
  - `login_attempts_pin_login` - počet pokusů
  - `lockout_until_pin_login` - timestamp konce lockoutu

### Soubory změněny:
- `app/utils/farmarAuthContext.tsx:40` - Konstanta `MAX_LOGIN_ATTEMPTS = 5`
- `app/utils/farmarAuthContext.tsx:41` - Konstanta `LOCKOUT_DURATION = 15 * 60 * 1000`
- `app/utils/farmarAuthContext.tsx:63-92` - Funkce `checkRateLimiting()`
- `app/utils/farmarAuthContext.tsx:97-131` - Funkce `recordFailedAttempt()`
- `app/utils/farmarAuthContext.tsx:136-147` - Funkce `resetFailedAttempts()`
- `app/utils/farmarAuthContext.tsx:291-296` - Kontrola rate limiting před přihlášením
- `app/prihlaseni/prodejna.tsx:11` - State pro zbývající pokusy
- `app/prihlaseni/prodejna.tsx:45-62` - Zobrazení zbývajících pokusů
- `app/prihlaseni/prodejna.tsx:92-103` - Warning box UI

### Jak to funguje:

```
Pokus 1: ❌ Nesprávný PIN - Zbývá 4 pokusů
Pokus 2: ❌ Nesprávný PIN - Zbývá 3 pokusy
Pokus 3: ❌ Nesprávný PIN - Zbývá 2 pokusy
Pokus 4: ❌ Nesprávný PIN - Zbývá 1 pokus
Pokus 5: ❌ Nesprávný PIN - Zbývá 0 pokusů
        ⏱️ Účet uzamčen na 15 minut!

Po 15 minutách:
        ✅ Lockout vypršel, pokusy resetovány
```

### UI změny:
- Při neúspěšném pokusu se zobrazí **warning box** se zbývajícím počtem pokusů
- Po uzamčení se zobrazí zpráva "Příliš mnoho pokusů. Zkuste to znovu za X minut."

---

## 3. ⏰ Session Timeout (Automatické odhlášení)

### Co bylo změněno:
- Session vyprší po **30 minutách neaktivity**
- Čas poslední aktivity se ukládá do AsyncStorage
- Při každém načtení aplikace se kontroluje, zda session nevypršela
- Uživatel je automaticky odhlášen po timeoutu

### Technické detaily:
- **Timeout**: 30 minut (1 800 000 ms)
- **Storage key**: `last_activity` - timestamp poslední aktivity
- **Kontrola**: Při startu aplikace + volitelně při každé akci

### Soubory změněny:
- `app/utils/farmarAuthContext.tsx:42` - Konstanta `SESSION_TIMEOUT = 30 * 60 * 1000`
- `app/utils/farmarAuthContext.tsx:152-169` - Funkce `checkSessionTimeout()`
- `app/utils/farmarAuthContext.tsx:174-181` - Funkce `updateLastActivity()`
- `app/utils/farmarAuthContext.tsx:202-221` - Kontrola timeoutu při startu aplikace
- `app/utils/farmarAuthContext.tsx:351` - Uložení času aktivity po přihlášení
- `app/utils/farmarAuthContext.tsx:661-683` - Nová funkce `checkAndUpdateActivity()`
- `app/utils/farmarAuthContext.tsx:715` - Smazání `last_activity` při odhlášení

### Jak to funguje:

```
10:00 - Přihlášení uživatele
        ✅ last_activity = 10:00

10:15 - Uživatel pracuje v aplikaci
        ✅ Session platná (15 min < 30 min)

10:35 - Uživatel znovu otevře aplikaci
        ⏰ Session vypršela (35 min > 30 min)
        🚪 Automatické odhlášení
```

### Rozšíření:
Pokud chcete aktualizovat čas aktivity při každé akci uživatele, zavolejte:

```typescript
const { checkAndUpdateActivity } = useFarmarAuth();

// V komponentě při důležité akci:
useEffect(() => {
  checkAndUpdateActivity();
}, []);
```

---

## 🚀 Nasazení

### 1. Instalace závislostí

```bash
npm install bcryptjs
```

### 2. Migrace existujících PINů

Pokud máte v databázi existující plain text PINy, spusťte migrační skript:

```bash
node scripts/migrate-pins-to-hash.js
```

⚠️ **DŮLEŽITÉ**: Zálohujte databázi před spuštěním migrace!

### 3. Testování

Po nasazení otestujte:

1. **Registraci** - nový PIN by měl být zahashován
2. **Přihlášení** - správný PIN by měl fungovat
3. **Rate limiting** - 5 špatných pokusů → lockout
4. **Session timeout** - po 30 minutách neaktivity → odhlášení

---

## 📊 Bezpečnostní zlepšení

| Před | Po |
|------|-----|
| PIN v plain textu | PIN zahashován pomocí bcrypt |
| Neomezené pokusy | Max 5 pokusů, pak 15min lockout |
| Session bez timeoutu | Auto-odhlášení po 30 min neaktivity |
| 1 000 000 kombinací | Brute-force prakticky nemožný |
| Žádná ochrana proti útokům | Comprehensive security |

---

## 🔒 Doporučení pro budoucnost (Level 2 & 3)

### Level 2 - Střední bezpečnost:
- [ ] SMS/Email 2FA ověření
- [ ] IP tracking a geolokace
- [ ] Push notifikace při přihlášení
- [ ] Delší PIN (8 číslic)

### Level 3 - Vysoká bezpečnost:
- [ ] Plná Supabase Auth integrace
- [ ] JWT tokeny
- [ ] Biometrická autentizace (Face ID / Touch ID)
- [ ] Hardware security module (HSM)

---

## 🐛 Známé problémy a řešení

### Problém: Staré PINy nefungují po migraci
**Řešení**: Kód podporuje zpětnou kompatibilitu. Pokud detekuje plain text PIN, automaticky ho akceptuje a měl by ho při příštím přihlášení převést na hash.

### Problém: Lockout nelze resetovat
**Řešení**: Manuálně smažte klíče z AsyncStorage:
```typescript
await AsyncStorage.removeItem('login_attempts_pin_login');
await AsyncStorage.removeItem('lockout_until_pin_login');
```

### Problém: Session timeout nefunguje
**Řešení**: Ujistěte se, že voláte `checkAndUpdateActivity()` při důležitých akcích uživatele.

---

## 📝 Changelog

### 2026-01-23
- ✅ Implementováno bcrypt hashování
- ✅ Přidán rate limiting (5 pokusů / 15 min)
- ✅ Implementován session timeout (30 min)
- ✅ Vytvořen migrační skript
- ✅ Aktualizována login UI s warning box
- ✅ Zpětná kompatibilita se starými PINy

---

## 👨‍💻 Autor

Implementováno Claude Code Assistant pro projekt Samopěstitelé.cz
