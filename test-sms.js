/**
 * Testovací skript pro SMSBrána.cz API
 * Spusťte: node test-sms.js +420XXXXXXXXX
 */

require('dotenv').config();
const crypto = require('crypto');

const SMSBRANA_LOGIN = process.env.EXPO_PUBLIC_SMSBRANA_LOGIN;
const SMSBRANA_PASSWORD = process.env.EXPO_PUBLIC_SMSBRANA_PASSWORD;

// Funkce pro generování náhodného salt
function generateSalt(length = 10) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let salt = '';
  for (let i = 0; i < length; i++) {
    salt += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return salt;
}

async function testSMS(phoneNumber) {
  if (!SMSBRANA_LOGIN || !SMSBRANA_PASSWORD) {
    console.error('❌ Chyba: SMSBrána credentials nejsou nastaveny v .env');
    console.log('Nastavte EXPO_PUBLIC_SMSBRANA_LOGIN a EXPO_PUBLIC_SMSBRANA_PASSWORD');
    process.exit(1);
  }

  if (!phoneNumber) {
    console.error('❌ Chyba: Zadejte telefonní číslo jako parametr');
    console.log('Použití: node test-sms.js +420123456789');
    process.exit(1);
  }

  console.log('📱 Testování SMSBrána.cz API...');
  console.log('Login:', SMSBRANA_LOGIN);
  console.log('Telefon:', phoneNumber);

  const testCode = Math.floor(100000 + Math.random() * 900000).toString();
  const smsText = `Samopestitele.cz - Vas overovaci kod: ${testCode}. Platnost: 5 minut.`;

  console.log('\n🔑 Testovací kód:', testCode);
  console.log('📝 Text SMS:', smsText);
  console.log('\n🚀 Odesílám SMS...\n');

  try {
    // Pokročilé přihlášení se zabezpečením (doporučené)
    // Formát time: YYYYMMDDTHHMMSS (např. 20091001T222720)
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const time = `${year}${month}${day}T${hours}${minutes}${seconds}`;

    // Náhodný salt (max 50 znaků)
    const sul = generateSalt(10);

    // auth = MD5(password + time + sul)
    const auth = crypto.createHash('md5').update(SMSBRANA_PASSWORD + time + sul).digest('hex');

    console.log('🔐 Autentizace:');
    console.log('  Režim: Pokročilé (hash-based)');
    console.log('  Login:', SMSBRANA_LOGIN);
    console.log('  Time:', time);
    console.log('  Sul:', sul);
    console.log('  Auth:', auth);
    console.log('');

    const params = new URLSearchParams({
      action: 'send_sms',
      login: SMSBRANA_LOGIN,
      time: time,
      sul: sul,
      auth: auth,
      number: phoneNumber,
      message: smsText,
      delivery_report: '1',
    });

    const url = `https://api.smsbrana.cz/smsconnect/http.php?${params.toString()}`;
    console.log('📡 Request URL:', url.substring(0, 120) + '...');

    const response = await fetch(url, {
      method: 'GET',
    });

    const result = await response.text();

    console.log('📡 Response:', result);

    if (result.includes('<err>')) {
      const errorMatch = result.match(/<err>(\d+)<\/err>/);
      if (errorMatch) {
        const errorCode = errorMatch[1];

        // Error code 0 = úspěch!
        if (errorCode === '0') {
          const smsIdMatch = result.match(/<sms_id>(\d+)<\/sms_id>/);
          const creditMatch = result.match(/<credit>([\d.]+)<\/credit>/);
          const priceMatch = result.match(/<price>([\d.]+)<\/price>/);

          console.log('\n✅ ÚSPĚCH! SMS byla odeslána');
          console.log('📱 SMS by měla přijít na číslo:', phoneNumber);
          console.log('🔑 Kód:', testCode);
          if (smsIdMatch) console.log('📨 SMS ID:', smsIdMatch[1]);
          if (priceMatch) console.log('💰 Cena:', priceMatch[1], 'Kč');
          if (creditMatch) console.log('💳 Zbývající kredit:', creditMatch[1], 'Kč');
        } else {
          console.log('\n❌ CHYBA při odesílání SMS');
          console.log('Kód chyby:', errorCode);

          const errorMessages = {
            '1': 'Neznámá chyba',
            '2': 'Nesprávné přihlašovací údaje',
            '3': 'Nesprávné přihlašovací údaje',
            '4': 'Neplatný timestamp',
            '5': 'IP adresa není povolena',
            '8': 'Chyba databáze',
            '9': 'Nedostatečný kredit',
            '10': 'Neplatné telefonní číslo',
            '11': 'Prázdná zpráva',
            '12': 'Zpráva je příliš dlouhá',
          };

          console.log('Popis:', errorMessages[errorCode] || 'Neznámý kód');
        }
      }
    } else if (result.startsWith('OK') || result.includes('OK')) {
      console.log('\n✅ ÚSPĚCH! SMS byla odeslána');
      console.log('📱 SMS by měla přijít na číslo:', phoneNumber);
      console.log('🔑 Kód:', testCode);
    } else {
      console.log('\n⚠️  Neočekávaná odpověď:', result);
    }
  } catch (error) {
    console.log('\n❌ CHYBA při komunikaci s API');
    console.error('Error:', error.message);
  }
}

// Spustit test
const phoneNumber = process.argv[2];
testSMS(phoneNumber);
