import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import md5 from 'md5';
import bcrypt from 'bcryptjs';

interface Farmar {
  id: string;
  telefon: string;
  nazev_farmy: string;
  jmeno: string;
  email?: string;
  farm_number?: string; // Číslo farmy (např. K7M9) - náhodný 4-místný identifikátor pro autentizaci
  heslo_hash?: string; // PIN hash pro zobrazení v UI (jestli má PIN nebo ne)
}

interface FarmarAuthContextType {
  farmar: Farmar | null;
  isAuthenticated: boolean;
  authLevel: 'none' | 'pin' | 'sms' | 'magic_link'; // Úroveň autentizace
  loginWithPin: (farmNumber: string, pin: string) => Promise<{ success: boolean; error?: string; remainingAttempts?: number }>;
  loginWithSMS: (telefon: string, kod: string) => Promise<boolean>;
  sendMagicLink: (email: string) => Promise<{ success: boolean; error?: string }>;
  checkMagicLinkSession: () => Promise<boolean>;
  createPin: (pin: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  register: (data: {
    telefon: string;
    nazev_farmy: string;
    jmeno: string;
    email?: string;
    pin: string;
  }) => Promise<{ success: boolean; error?: string }>;
  verifyPhone: (telefon: string, kod: string) => Promise<boolean>;
  sendSMSCode: (telefon: string) => Promise<boolean>;
  checkPinSession: () => Promise<boolean>;
  checkAndUpdateActivity: () => Promise<boolean>;
}

const FarmarAuthContext = createContext<FarmarAuthContextType | undefined>(undefined);

// ============================================================
// BEZPEČNOSTNÍ KONSTANTY
// ============================================================
const MAX_LOGIN_ATTEMPTS = 5; // Max počet neúspěšných pokusů
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minut v ms
// SESSION_TIMEOUT odstraněn - uživatelé zůstávají přihlášeni do manuálního odhlášení
const BCRYPT_SALT_ROUNDS = 10; // Náročnost hashování

// ============================================================
// BEZPEČNOSTNÍ HELPER FUNKCE
// ============================================================

/**
 * Zahashuje PIN pomocí bcrypt
 */
async function hashPin(pin: string): Promise<string> {
  try {
    const salt = await bcrypt.genSalt(BCRYPT_SALT_ROUNDS);
    const hash = await bcrypt.hash(pin, salt);
    return hash;
  } catch (error) {
    console.error('Chyba při hashování PINu:', error);
    throw error;
  }
}

/**
 * Porovná PIN s hashem
 */
async function comparePin(pin: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(pin, hash);
  } catch (error) {
    console.error('Chyba při porovnání PINu:', error);
    return false;
  }
}

/**
 * Kontrola rate limiting - vrátí true pokud je účet uzamčen
 */
async function checkRateLimiting(identifier: string = 'default'): Promise<{ isLocked: boolean; remainingTime?: number }> {
  try {
    const attemptsKey = `login_attempts_${identifier}`;
    const lockoutKey = `lockout_until_${identifier}`;

    // Zkontrolovat lockout
    const lockoutUntil = await AsyncStorage.getItem(lockoutKey);
    if (lockoutUntil) {
      const lockTime = parseInt(lockoutUntil, 10);
      const now = Date.now();

      if (now < lockTime) {
        // Účet je stále uzamčen
        return {
          isLocked: true,
          remainingTime: Math.ceil((lockTime - now) / 1000 / 60), // minuty
        };
      } else {
        // Lockout vypršel, resetovat pokusy
        await AsyncStorage.removeItem(lockoutKey);
        await AsyncStorage.removeItem(attemptsKey);
      }
    }

    return { isLocked: false };
  } catch (error) {
    console.error('Chyba při kontrole rate limiting:', error);
    return { isLocked: false };
  }
}

/**
 * Zaznamenat neúspěšný pokus o přihlášení
 */
async function recordFailedAttempt(identifier: string = 'default'): Promise<{ remainingAttempts: number; isLocked: boolean }> {
  try {
    const attemptsKey = `login_attempts_${identifier}`;
    const lockoutKey = `lockout_until_${identifier}`;

    const attemptsStr = await AsyncStorage.getItem(attemptsKey);
    const attempts = attemptsStr ? parseInt(attemptsStr, 10) : 0;
    const newAttempts = attempts + 1;

    if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
      // Uzamknout účet
      const lockUntil = Date.now() + LOCKOUT_DURATION;
      await AsyncStorage.setItem(lockoutKey, lockUntil.toString());
      await AsyncStorage.removeItem(attemptsKey);

      return {
        remainingAttempts: 0,
        isLocked: true,
      };
    } else {
      // Uložit počet pokusů
      await AsyncStorage.setItem(attemptsKey, newAttempts.toString());

      return {
        remainingAttempts: MAX_LOGIN_ATTEMPTS - newAttempts,
        isLocked: false,
      };
    }
  } catch (error) {
    console.error('Chyba při záznamu neúspěšného pokusu:', error);
    return { remainingAttempts: MAX_LOGIN_ATTEMPTS, isLocked: false };
  }
}

/**
 * Resetovat neúspěšné pokusy po úspěšném přihlášení
 */
async function resetFailedAttempts(identifier: string = 'default'): Promise<void> {
  try {
    const attemptsKey = `login_attempts_${identifier}`;
    const lockoutKey = `lockout_until_${identifier}`;

    await AsyncStorage.removeItem(attemptsKey);
    await AsyncStorage.removeItem(lockoutKey);
  } catch (error) {
    console.error('Chyba při resetování pokusů:', error);
  }
}

/**
 * DEAKTIVOVÁNO - Kontrola session timeout
 * Uživatelé nyní zůstávají přihlášeni do manuálního odhlášení
 */
async function checkSessionTimeout(): Promise<boolean> {
  return false; // Session nikdy nevyprší
}

/**
 * DEAKTIVOVÁNO - Aktualizovat čas poslední aktivity
 * Již není potřeba sledovat aktivitu
 */
async function updateLastActivity(): Promise<void> {
  // Neděláme nic - tracking aktivity odstraněn
}

export function FarmarAuthProvider({ children }: { children: React.ReactNode }) {
  const [farmar, setFarmar] = useState<Farmar | null>(null);
  const [authLevel, setAuthLevel] = useState<'none' | 'pin' | 'sms' | 'magic_link'>('none');
  const [isSessionChecked, setIsSessionChecked] = useState(false);

  useEffect(() => {
    checkExistingSession();
  }, []);

  const checkExistingSession = async () => {
    try {
      console.log('🔍 Checking existing session...');
      const storedFarmar = await AsyncStorage.getItem('farmar_session');
      const storedAuthLevel = await AsyncStorage.getItem('auth_level');

      console.log('📦 Stored farmar:', storedFarmar ? 'Found' : 'Not found');
      console.log('📦 Stored auth level:', storedAuthLevel);

      if (storedFarmar && storedAuthLevel) {
        // Session timeout odstraněn - uživatelé zůstávají přihlášeni
        const parsedFarmar = JSON.parse(storedFarmar);
        console.log('✅ Restoring session for:', parsedFarmar.nazev_farmy);
        setFarmar(parsedFarmar);
        setAuthLevel((storedAuthLevel as any) || 'pin');
      } else {
        console.log('❌ No valid session found');
      }
    } catch (error) {
      console.error('❌ Error checking session:', error);
    } finally {
      setIsSessionChecked(true);
      console.log('✅ Session check complete');
    }
  };

  const register = async (data: {
    telefon: string;
    nazev_farmy: string;
    jmeno: string;
    email?: string;
    pin: string;
  }): Promise<{ success: boolean; error?: string }> => {
    try {
      // Pro WEB - mock registrace
      if (Platform.OS === 'web') {
        console.log('WEB: Mock registrace farmáře', data);

        // Simulace zpoždění
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Vytvoříme mock farmáře
        const newFarmar: Farmar = {
          id: `farmar-${Date.now()}`,
          telefon: data.telefon,
          nazev_farmy: data.nazev_farmy,
          jmeno: data.jmeno,
          email: data.email,
        };

        // Uložíme PIN a farmáře do AsyncStorage
        await AsyncStorage.setItem('farmar_pin', data.pin);
        await AsyncStorage.setItem('farmar_data', JSON.stringify(newFarmar));

        // NEBUDEME automaticky přihlašovat - uživatel se musí přihlásit přes PIN
        // await AsyncStorage.setItem('farmar_session', JSON.stringify(newFarmar));
        // await AsyncStorage.setItem('auth_level', 'pin');
        // setFarmar(newFarmar);
        // setAuthLevel('pin');

        return { success: true };
      }

      // Pro NATIVE - reálná registrace přes Supabase
      const { supabase } = require('../../lib/supabase');

      // 1. Zkontrolovat, jestli telefon už existuje
      const { data: existing, error: checkError } = await supabase
        .from('pestitele')
        .select('id')
        .eq('telefon', data.telefon)
        .maybeSingle();

      if (existing) {
        return { success: false, error: 'Tento telefon je již registrován' };
      }

      // 2. Zahashovat PIN
      const pinHash = await hashPin(data.pin);

      // 3. Vytvořit nového farmáře
      const { data: newFarmar, error: insertError } = await supabase
        .from('pestitele')
        .insert({
          telefon: data.telefon,
          nazev_farmy: data.nazev_farmy,
          jmeno: data.jmeno,
          email: data.email,
          pin_hash: pinHash, // Zahashovaný PIN
          phone_verified: false,
        })
        .select()
        .single();

      if (insertError) {
        return { success: false, error: insertError.message };
      }

      // 4. Uložit data lokálně (PIN NEukládáme, pouze hash v databázi)
      await AsyncStorage.setItem('farmar_data', JSON.stringify(newFarmar));

      return { success: true };
    } catch (error: any) {
      console.error('Registration error:', error);
      return { success: false, error: error.message };
    }
  };

  const loginWithPin = async (farmNumber: string, pin: string): Promise<{ success: boolean; error?: string; remainingAttempts?: number }> => {
    try {
      console.log('🔐 loginWithPin called with farm_number:', farmNumber);

      // 1. Validace farm_number
      if (!farmNumber || farmNumber.trim() === '') {
        return {
          success: false,
          error: 'Číslo farmy je povinné',
        };
      }

      // 2. RATE LIMITING - Zkontrolovat, jestli není účet uzamčen
      // Použijeme farm_number jako identifier pro rate limiting
      const rateLimitCheck = await checkRateLimiting(`pin_login_${farmNumber}`);
      if (rateLimitCheck.isLocked) {
        console.log('🔒 Účet je uzamčen kvůli příliš mnoha pokusům');
        return {
          success: false,
          error: `Příliš mnoho pokusů. Zkuste to znovu za ${rateLimitCheck.remainingTime} minut.`,
        };
      }

      // 3. Pro WEB i NATIVE - kontrola proti Supabase databázi
      const { supabase } = require('../../lib/supabase');

      console.log('🔑 Vyhledávám farmáře podle farm_number...');

      // BEZPEČNOSTNÍ VYLEPŠENÍ: Načteme POUZE farmáře s konkrétním farm_number
      // Tím se eliminuje problém s kolizí PINů!
      const { data: farmers, error } = await supabase
        .from('pestitele')
        .select('*')
        .eq('farm_number', farmNumber)
        .not('heslo_hash', 'is', null);

      console.log('📊 Nalezeno farmářů:', farmers?.length || 0);

      if (error || !farmers || farmers.length === 0) {
        console.log('❌ Farmář s tímto číslem farmy nenalezen');
        // Zaznamenat neúspěšný pokus
        const result = await recordFailedAttempt(`pin_login_${farmNumber}`);
        return {
          success: false,
          error: 'Nesprávné číslo farmy nebo PIN',
          remainingAttempts: result.remainingAttempts,
        };
      }

      // 4. HASHOVÁNÍ - Porovnat PIN s hashem
      const farmer = farmers[0]; // Měl by být jen jeden (farm_number je UNIQUE)
      const pinHash = farmer.heslo_hash;

      let isMatch = false;

      // Pokud je to starý plain text PIN (pro zpětnou kompatibilitu)
      if (pinHash === pin) {
        console.log('⚠️ Nalezen plain text PIN - měl by být zahashován!');
        isMatch = true;
      }
      // Pokud je to hash, porovnáme s bcrypt
      else if (pinHash.startsWith('$2a$') || pinHash.startsWith('$2b$')) {
        isMatch = await comparePin(pin, pinHash);
      }

      if (!isMatch) {
        console.log('❌ PIN nesouhlasí');
        // Zaznamenat neúspěšný pokus
        const result = await recordFailedAttempt(`pin_login_${farmNumber}`);

        if (result.isLocked) {
          return {
            success: false,
            error: `Příliš mnoho pokusů. Účet je uzamčen na 15 minut.`,
          };
        }

        return {
          success: false,
          error: 'Nesprávné číslo farmy nebo PIN',
          remainingAttempts: result.remainingAttempts,
        };
      }

      // 5. Úspěšné přihlášení
      console.log('✅ PIN match! Logging in farmer:', farmer.nazev_farmy);

      // Resetovat neúspěšné pokusy
      await resetFailedAttempts(`pin_login_${farmNumber}`);

      // Nastavit session
      console.log('💾 Saving session for farmer:', farmer.nazev_farmy, 'ID:', farmer.id);
      setFarmar(farmer);
      setAuthLevel('pin');

      await AsyncStorage.setItem('farmar_session', JSON.stringify(farmer));
      await AsyncStorage.setItem('auth_level', 'pin');
      await AsyncStorage.setItem('farmar_data', JSON.stringify(farmer));

      console.log('✅ Session saved to AsyncStorage');
      console.log('✅ Login successful!');
      return { success: true };
    } catch (error) {
      console.error('❌ PIN login error:', error);
      return {
        success: false,
        error: 'Chyba při přihlašování',
      };
    }
  };

  const loginWithSMS = async (telefon: string, kod: string): Promise<boolean> => {
    try {
      // Ověření přes Supabase (pro WEB i NATIVE)
      const { supabase } = require('../../lib/supabase');

      const { data, error } = await supabase
        .from('sms_codes')
        .select('*')
        .eq('phone', telefon)
        .eq('code', kod)
        .eq('used', false)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (data) {
        // Označit kód jako použitý
        await supabase
          .from('sms_codes')
          .update({ used: true })
          .eq('id', data.id);

        // Načíst farmáře
        const { data: farmarData } = await supabase
          .from('pestitele')
          .select('*')
          .eq('id', data.pestitel_id)
          .single();

        if (farmarData) {
          setFarmar(farmarData);
          setAuthLevel('sms');

          await AsyncStorage.setItem('farmar_session', JSON.stringify(farmarData));
          await AsyncStorage.setItem('auth_level', 'sms');

          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('SMS login error:', error);
      return false;
    }
  };

  const verifyPhone = async (telefon: string, kod: string): Promise<boolean> => {
    // Stejná logika jako loginWithSMS pro verifikaci telefonu
    return loginWithSMS(telefon, kod);
  };

  const sendSMSCode = async (telefon: string): Promise<boolean> => {
    try {
      // Vygenerovat kód
      const kod = Math.floor(100000 + Math.random() * 900000).toString();
      console.log('SMS KÓD (pro testování):', kod);

      // Uložení kódu do Supabase (pro WEB i NATIVE)
      const { supabase } = require('../../lib/supabase');

      // Najdeme farmáře podle telefonu (vezme prvního pokud je víc)
      const { data: farmers, error: farmarError } = await supabase
        .from('pestitele')
        .select('id')
        .eq('telefon', telefon);

      if (farmarError || !farmers || farmers.length === 0) {
        console.error('Farmář s tímto telefonem neexistuje', farmarError);
        return false;
      }

      const farmar = farmers[0]; // Použije prvního farmáře

      // Uložit kód do databáze
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minut

      const { error } = await supabase
        .from('sms_codes')
        .insert({
          phone: telefon,
          code: kod,
          expires_at: expiresAt.toISOString(),
          pestitel_id: farmar.id,
          used: false,
        });

      if (error) {
        console.error('Error saving SMS code:', error);
        return false;
      }

      console.log('SMS kód uložen do Supabase:', kod, 'pro telefon:', telefon);

      // Odeslat SMS přes SMSBrána.cz (pro WEB i NATIVE)
      try {
        const smsText = `Samopestitele.cz - Vas overovaci kod: ${kod}. Platnost: 5 minut.`;

        const SMSBRANA_LOGIN = process.env.EXPO_PUBLIC_SMSBRANA_LOGIN || '';
        const SMSBRANA_PASSWORD = process.env.EXPO_PUBLIC_SMSBRANA_PASSWORD || '';

        if (!SMSBRANA_LOGIN || !SMSBRANA_PASSWORD) {
          console.warn('SMSBrána credentials not configured, using test mode');
          return true; // V dev módu pokračujeme bez odeslání
        }

        // SMSBrána API - Pokročilé přihlášení se zabezpečením
        // Podle oficiální dokumentace: auth = MD5(password + time + sul)
        // time formát: YYYYMMDDTHHMMSS (např. 20091001T222720)

        // Generovat náhodný salt (max 50 znaků, alfanumerické)
        const generateSalt = (length: number = 10) => {
          const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
          let salt = '';
          for (let i = 0; i < length; i++) {
            salt += chars.charAt(Math.floor(Math.random() * chars.length));
          }
          return salt;
        };

        // Formát time: YYYYMMDDTHHMMSS
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        const time = `${year}${month}${day}T${hours}${minutes}${seconds}`;

        const sul = generateSalt(10);
        const auth = md5(SMSBRANA_PASSWORD + time + sul);

        const params = new URLSearchParams({
          action: 'send_sms',
          login: SMSBRANA_LOGIN,
          time: time,
          sul: sul,
          auth: auth,
          number: telefon,
          message: smsText,
          delivery_report: '1',
        });

        const response = await fetch(`https://api.smsbrana.cz/smsconnect/http.php?${params.toString()}`, {
          method: 'GET',
        });

        const result = await response.text();
        console.log('SMSBrána response:', result);

        // SMSBrána vrací XML s <err>kod</err>
        // Error code 0 = úspěch!
        if (result.includes('<err>')) {
          const errorMatch = result.match(/<err>(\d+)<\/err>/);
          if (errorMatch) {
            const errorCode = errorMatch[1];

            if (errorCode === '0') {
              // Úspěch!
              console.log('SMS successfully sent');
              return true;
            } else {
              // Chyba
              console.error('SMSBrána error code:', errorCode);
              const errorMessages: { [key: string]: string } = {
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
              console.error('Error:', errorMessages[errorCode] || 'Neznámý kód');
              return false;
            }
          }
        } else if (result.includes('OK')) {
          return true;
        }

        console.error('SMSBrána unexpected response:', result);
        return false;
      } catch (smsError) {
        console.error('Error sending SMS:', smsError);
        return false;
      }
    } catch (error) {
      console.error('Send SMS error:', error);
      return false;
    }
  };

  const checkPinSession = async (): Promise<boolean> => {
    const session = await AsyncStorage.getItem('farmar_session');
    const level = await AsyncStorage.getItem('auth_level');
    return session !== null && level === 'pin';
  };

  /**
   * Odeslat magic link na email
   */
  const sendMagicLink = async (email: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { supabase } = require('../../lib/supabase');

      // Najdeme farmáře podle emailu
      const { data: farmers, error: farmarError } = await supabase
        .from('pestitele')
        .select('id, email, nazev_farmy')
        .eq('email', email);

      if (farmarError || !farmers || farmers.length === 0) {
        console.error('Farmář s tímto emailem neexistuje', farmarError);
        return { success: false, error: 'Email není registrován' };
      }

      // Odeslat magic link přes Supabase Auth
      const redirectUrl = Platform.OS === 'web'
        ? `${window.location.origin}/auth/callback`
        : 'samopestitele://auth/callback';

      // Povolíme vytvoření uživatele pokud ještě neexistuje v Auth
      const { error } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
          emailRedirectTo: redirectUrl,
          shouldCreateUser: true, // Povolíme vytvoření Auth uživatele pokud neexistuje
        }
      });

      if (error) {
        console.error('Error sending magic link:', error);
        return { success: false, error: error.message };
      }

      console.log('Magic link sent to:', email);
      return { success: true };
    } catch (error: any) {
      console.error('Send magic link error:', error);
      return { success: false, error: error.message };
    }
  };

  /**
   * Vytvořit/změnit PIN pro aktuálního farmáře
   */
  const createPin = async (pin: string): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!farmar || !farmar.id) {
        return { success: false, error: 'Musíte být přihlášeni' };
      }

      // Validace PINu
      if (pin.length < 4 || pin.length > 6) {
        return { success: false, error: 'PIN musí mít 4-6 číslic' };
      }

      if (!/^\d+$/.test(pin)) {
        return { success: false, error: 'PIN může obsahovat pouze číslice' };
      }

      const { supabase } = require('../../lib/supabase');

      // Zahashovat PIN pomocí bcrypt
      const pinHash = await hashPin(pin);

      // Uložíme zahashovaný PIN do sloupce heslo_hash
      const { error } = await supabase
        .from('pestitele')
        .update({ heslo_hash: pinHash })
        .eq('id', farmar.id);

      if (error) {
        console.error('Error creating PIN:', error);
        return { success: false, error: error.message };
      }

      console.log('PIN successfully created for user:', farmar.id);
      return { success: true };
    } catch (error: any) {
      console.error('Create PIN error:', error);
      return { success: false, error: error.message };
    }
  };

  /**
   * Zkontrolovat, jestli je aktivní Supabase Auth session
   */
  const checkMagicLinkSession = async (): Promise<boolean> => {
    try {
      const { supabase } = require('../../lib/supabase');

      const { data: { session }, error } = await supabase.auth.getSession();

      if (error || !session) {
        return false;
      }

      // Máme aktivní session, načteme farmáře podle emailu
      const userEmail = session.user.email;

      if (!userEmail) {
        return false;
      }

      const { data: farmers, error: farmarError } = await supabase
        .from('pestitele')
        .select('*')
        .eq('email', userEmail);

      if (farmarError || !farmers || farmers.length === 0) {
        return false;
      }

      const farmarData = farmers[0];

      // Nastavíme farmáře jako přihlášeného
      setFarmar(farmarData);
      setAuthLevel('magic_link');

      await AsyncStorage.setItem('farmar_session', JSON.stringify(farmarData));
      await AsyncStorage.setItem('auth_level', 'magic_link');

      return true;
    } catch (error) {
      console.error('Check magic link session error:', error);
      return false;
    }
  };

  /**
   * DEAKTIVOVÁNO - Kontrola aktivity session
   * Funkce zachována pro kompatibilitu, ale již nekontroluje timeout
   */
  const checkAndUpdateActivity = async (): Promise<boolean> => {
    // Session timeout odstraněn - funkce vždy vrací true
    return true;
  };

  const logout = async () => {
    try {
      console.log('🚪 ========== LOGOUT STARTED ==========');
      console.log('Current farmar:', farmar);
      console.log('Current authLevel:', authLevel);
      console.log('Current isAuthenticated:', farmar !== null && authLevel !== 'none');

      // Uložíme si authLevel před resetem
      const currentAuthLevel = authLevel;

      // Pokud je uživatel přihlášen přes magic link, odhlásíme ho i z Supabase Auth
      if (currentAuthLevel === 'magic_link') {
        try {
          console.log('🔐 Signing out from Supabase Auth...');
          const { supabase } = require('../../lib/supabase');
          const { error } = await supabase.auth.signOut();
          if (error) {
            console.error('❌ Supabase signOut error:', error);
          } else {
            console.log('✅ Supabase Auth signed out');
          }
        } catch (error) {
          console.error('❌ Exception in Supabase signOut:', error);
        }
      } else {
        console.log('ℹ️ Not magic_link auth, skipping Supabase signOut');
      }

      // Smažeme všechny klíče spojené s přihlášením
      console.log('🗑️ Removing AsyncStorage keys...');
      await AsyncStorage.removeItem('farmar_session');
      console.log('  ✓ Removed farmar_session');
      await AsyncStorage.removeItem('auth_level');
      console.log('  ✓ Removed auth_level');
      await AsyncStorage.removeItem('farmar_pin');
      console.log('  ✓ Removed farmar_pin');
      await AsyncStorage.removeItem('farmar_data');
      console.log('  ✓ Removed farmar_data');
      await AsyncStorage.removeItem('last_activity');
      console.log('  ✓ Removed last_activity');
      console.log('✅ AsyncStorage keys removed');

      // Resetujeme state
      console.log('🔄 Resetting state...');
      setFarmar(null);
      console.log('  ✓ setFarmar(null) called');
      setAuthLevel('none');
      console.log('  ✓ setAuthLevel("none") called');

      console.log('✅ ========== LOGOUT COMPLETE ==========');
    } catch (error) {
      console.error('❌ ========== LOGOUT FAILED ==========');
      console.error('Error:', error);
    }
  };

  const value: FarmarAuthContextType = {
    farmar,
    isAuthenticated: farmar !== null && authLevel !== 'none',
    authLevel,
    loginWithPin,
    loginWithSMS,
    sendMagicLink,
    checkMagicLinkSession,
    createPin,
    logout,
    register,
    verifyPhone,
    sendSMSCode,
    checkPinSession,
    checkAndUpdateActivity,
  };

  return (
    <FarmarAuthContext.Provider value={value}>
      {children}
    </FarmarAuthContext.Provider>
  );
}

export function useFarmarAuth() {
  const context = useContext(FarmarAuthContext);
  if (context === undefined) {
    throw new Error('useFarmarAuth must be used within FarmarAuthProvider');
  }
  return context;
}
