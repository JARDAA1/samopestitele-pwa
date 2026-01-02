# Konfigurace SMSBrána.cz

Tento dokument popisuje, jak nastavit SMS autentizaci pomocí SMSBrána.cz API.

## 1. Získání přihlašovacích údajů

1. Přihlaste se na https://portal.smsbrana.cz/
2. V menu vyberte **API** → **Nastavení API**
3. Zkopírujte své přihlašovací údaje (login a heslo pro API)

## 2. Nastavení environment variables

1. Zkopírujte soubor `.env.example` na `.env`:
   ```bash
   cp .env.example .env
   ```

2. Vyplňte vaše přihlašovací údaje do `.env`:
   ```env
   EXPO_PUBLIC_SMSBRANA_LOGIN=your_login_here
   EXPO_PUBLIC_SMSBRANA_PASSWORD=your_password_here
   ```

3. **DŮLEŽITÉ**: Soubor `.env` je v `.gitignore` a nebude verzován

## 3. API Endpoint

Aplikace používá HTTP API endpoint:
```
https://api.smsbrana.cz/smsconnect/http.php
```

### Parametry odesílání SMS:

| Parametr | Hodnota | Popis |
|----------|---------|-------|
| action | send_sms | Akce pro odeslání SMS |
| login | Z .env | Váš API login |
| password | Z .env | Váš API heslo |
| number | +420XXXXXXXXX | Telefonní číslo příjemce |
| message | Text SMS | Ověřovací kód |
| delivery_report | 1 | Požadujeme doručenku |

### Formát odpovědi:

- **Úspěch**: `OK` nebo `OK: message_id`
- **Chyba**: `ERR:popis_chyby`

## 4. Testování

### Web (development):
- V console.log se zobrazí vygenerovaný kód
- SMS se ve skutečnosti neposílá
- Zadejte kód z console.log

### Native (production):
- SMS se odešle skutečně přes SMSBrána.cz API
- Kód je 6 číslic
- Platnost: 5 minut
- Použitelnost: jednorázový (po použití se smaže)

## 5. Bezpečnost

✅ **Implementované bezpečnostní prvky:**

- SMS kód vyprší za 5 minut
- Kód lze použít pouze jednou (used flag)
- Kontrola existence farmáře před odesláním
- Kontrola telefonu + kódu při přihlášení
- API credentials v environment variables (ne v kódu)

⚠️ **Doporučení pro produkci:**

1. Používejte silná hesla pro SMSBrána API
2. Rotujte API credentials pravidelně
3. Sledujte doručenky a selhání v SMSBrána portálu
4. Nastavte rate limiting (max. 3 SMS za hodinu na číslo)

## 6. Ceny a kredity

- Aktuální kredit vidíte v portálu: **200,00 Kč**
- Cena za 1 SMS: cca 0,60 - 1,20 Kč (záleží na tarifu)
- Doporučené minimum: 100 Kč kreditu

## 7. Monitoring

V SMSBrána portálu můžete sledovat:

- **Přehledy**: Statistiky odeslaných SMS
- **Odeslaná zpráva**: Historie všech SMS
- **Doručenky**: Stav doručení jednotlivých SMS
- **Kredit**: Aktuální zůstatek

## 8. Webhook pro doručenky (volitelné)

Můžete nastavit webhook URL pro příjem doručenek:

1. V portálu: **API** → **Nastavení API**
2. **Skript pro doručenky a odpovědi**: `https://vas-server.cz/sms-webhook`
3. Implementujte endpoint, který přijme POST request s informacemi o doručení

## 9. Troubleshooting

### SMS nejsou odesílány:

1. Zkontrolujte kredity na účtu
2. Ověřte správnost API credentials v `.env`
3. Zkontrolujte formát telefonu: `+420XXXXXXXXX`
4. Podívejte se do console.log na chybové hlášky

### SMS přicházejí s zpožděním:

- Normální zpoždění: 5-30 sekund
- Při velkém vytížení: až 2 minuty
- Zkontrolujte stav sítě na https://smsbrana.cz/status

### Kód nefunguje:

1. Zkontrolujte expiraci (5 minut)
2. Ujistěte se, že nebyl již použit
3. Vyzkoušejte nový kód (znovu odeslat)

## 10. Kontakt na podporu

- **Email podpory**: jaroslav.antos@seznam.cz
- **SMSBrána podpora**: podpora@smsbrana.cz
- **Dokumentace API**: https://www.smsbrana.cz/api-http-dokumentace
