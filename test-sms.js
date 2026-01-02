/**
 * Testovací skript pro SMSBrána.cz API
 * Spusťte: node test-sms.js +420XXXXXXXXX
 */

require('dotenv').config();

const SMSBRANA_LOGIN = process.env.EXPO_PUBLIC_SMSBRANA_LOGIN;
const SMSBRANA_PASSWORD = process.env.EXPO_PUBLIC_SMSBRANA_PASSWORD;

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
    const params = new URLSearchParams({
      action: 'send_sms',
      login: SMSBRANA_LOGIN,
      password: SMSBRANA_PASSWORD,
      number: phoneNumber,
      message: smsText,
      delivery_report: '1',
    });

    const response = await fetch('https://api.smsbrana.cz/smsconnect/http.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const result = await response.text();

    console.log('📡 Response:', result);

    if (result.startsWith('OK')) {
      console.log('\n✅ ÚSPĚCH! SMS byla odeslána');
      console.log('📱 SMS by měla přijít na číslo:', phoneNumber);
      console.log('🔑 Kód:', testCode);
    } else {
      console.log('\n❌ CHYBA při odesílání SMS');
      console.log('Chybová zpráva:', result);

      if (result.includes('ERR:')) {
        const errorMsg = result.split('ERR:')[1];
        console.log('\nMožné příčiny:');
        if (errorMsg.includes('credit')) {
          console.log('- Nedostatečný kredit na účtu');
        } else if (errorMsg.includes('auth') || errorMsg.includes('login')) {
          console.log('- Špatné přihlašovací údaje');
        } else if (errorMsg.includes('number')) {
          console.log('- Neplatné telefonní číslo');
        }
      }
    }
  } catch (error) {
    console.log('\n❌ CHYBA při komunikaci s API');
    console.error('Error:', error.message);
  }
}

// Spustit test
const phoneNumber = process.argv[2];
testSMS(phoneNumber);
