# 🔐 Bezpečnost PIN Autentizace

## ✅ Implementované vylepšení

### 1. Hashování PINu pomocí bcrypt
- PINy jsou **zahashované** před uložením do databáze
- Používá bcrypt s 10 salt rounds
- **Před**: `123456` → **Po**: `$2a$10$rZ8QvH...` (60 znaků)

### 2. Rate Limiting (Max 5 pokusů)
- Maximum **5 neúspěšných pokusů** o přihlášení
- Po 5. pokusu: **Lockout na 15 minut**
- Po úspěšném přihlášení se počítadlo resetuje

### 3. Session Timeout (30 minut)
- Automatické odhlášení po **30 minutách neaktivity**
- Kontrola při každém spuštění aplikace

---

## 🚀 Jak použít

### Pro nové uživatele:
- Vše funguje automaticky ✅
- PIN se zahashuje při registraci

### Pro existující databázi:
1. Zálohujte databázi
2. Spusťte migrační skript:
   ```bash
   node scripts/migrate-pins-to-hash.js
   ```

---

## 📊 Srovnání bezpečnosti

| Aspekt | Před | Po |
|--------|------|-----|
| **PIN storage** | Plain text | Bcrypt hash |
| **Brute-force ochrana** | ❌ Žádná | ✅ Max 5 pokusů |
| **Session management** | ❌ Neomezeně | ✅ 30 min timeout |
| **Bezpečnost** | ⚠️ Nízká | ✅ Střední-Vysoká |

---

## 🎯 Co to přináší

1. **Ochrana hesel**: I při úniku databáze nelze zjistit PINy
2. **Ochrana proti brute-force**: Útočník má max 5 pokusů
3. **Bezpečné session**: Automatické odhlášení chrání před zneužitím

---

## 📖 Podrobná dokumentace

Viz [SECURITY_IMPROVEMENTS.md](./SECURITY_IMPROVEMENTS.md) pro kompletní technickou dokumentaci.

---

## ⚡ Quick Reference

### Změněné soubory:
- `app/utils/farmarAuthContext.tsx` - Hlavní logika
- `app/prihlaseni/prodejna.tsx` - Login UI
- `scripts/migrate-pins-to-hash.js` - Migrační skript

### Nové npm balíčky:
- `bcryptjs` - Pro hashování

### Bezpečnostní konstanty:
```typescript
MAX_LOGIN_ATTEMPTS = 5           // Max pokusy
LOCKOUT_DURATION = 15 * 60 * 1000 // 15 minut
SESSION_TIMEOUT = 30 * 60 * 1000  // 30 minut
BCRYPT_SALT_ROUNDS = 10          // Náročnost hashe
```

---

**Datum implementace**: 2026-01-23
**Vytvořil**: Claude Code Assistant
