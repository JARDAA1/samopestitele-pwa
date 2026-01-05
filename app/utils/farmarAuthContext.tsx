import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import md5 from 'md5';

interface Farmar {
  id: string;
  telefon: string;
  nazev_farmy: string;
  jmeno: string;
  email?: string;
}

interface FarmarAuthContextType {
  farmar: Farmar | null;
  isAuthenticated: boolean;
  authLevel: 'none' | 'pin' | 'sms'; // Úroveň autentizace
  loginWithPin: (telefon: string, pin: string) => Promise<boolean>;
  loginWithSMS: (telefon: string, kod: string) => Promise<boolean>;
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
}

const FarmarAuthContext = createContext<FarmarAuthContextType | undefined>(undefined);

export function FarmarAuthProvider({ children }: { children: React.ReactNode }) {
  const [farmar, setFarmar] = useState<Farmar | null>(null);
  const [authLevel, setAuthLevel] = useState<'none' | 'pin' | 'sms'>('none');
  const [isSessionChecked, setIsSessionChecked] = useState(false);

  useEffect(() => {
    checkExistingSession();
  }, []);

  const checkExistingSession = async () => {
    try {
      const storedFarmar = await AsyncStorage.getItem('farmar_session');
      const storedAuthLevel = await AsyncStorage.getItem('auth_level');

      if (storedFarmar && storedAuthLevel) {
        setFarmar(JSON.parse(storedFarmar));
        setAuthLevel((storedAuthLevel as any) || 'pin');
      }
    } catch (error) {
      console.error('Error checking session:', error);
    } finally {
      setIsSessionChecked(true);
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

      // 2. Vytvořit nového farmáře
      const { data: newFarmar, error: insertError } = await supabase
        .from('pestitele')
        .insert({
          telefon: data.telefon,
          nazev_farmy: data.nazev_farmy,
          jmeno: data.jmeno,
          email: data.email,
          pin_hash: data.pin, // TODO: Zahashovat na produkci!
          phone_verified: false,
        })
        .select()
        .single();

      if (insertError) {
        return { success: false, error: insertError.message };
      }

      // 3. Uložit PIN lokálně
      await AsyncStorage.setItem('farmar_pin', data.pin);
      await AsyncStorage.setItem('farmar_data', JSON.stringify(newFarmar));

      return { success: true };
    } catch (error: any) {
      console.error('Registration error:', error);
      return { success: false, error: error.message };
    }
  };

  const loginWithPin = async (telefon: string, pin: string): Promise<boolean> => {
    try {
      // Pro WEB - kontrola PIN a telefonu z AsyncStorage
      if (Platform.OS === 'web') {
        const storedPin = await AsyncStorage.getItem('farmar_pin');
        const farmarData = await AsyncStorage.getItem('farmar_data');

        if (farmarData && storedPin === pin) {
          const parsedFarmar = JSON.parse(farmarData);

          // Ověříme, že telefon sedí
          if (parsedFarmar.telefon === telefon) {
            setFarmar(parsedFarmar);
            setAuthLevel('pin');

            await AsyncStorage.setItem('farmar_session', farmarData);
            await AsyncStorage.setItem('auth_level', 'pin');

            return true;
          }
        }

        return false;
      }

      // Pro NATIVE - kontrola proti Supabase
      const { supabase } = require('../../lib/supabase');

      const { data: farmarData, error } = await supabase
        .from('pestitele')
        .select('*')
        .eq('telefon', telefon)
        .maybeSingle();

      if (error || !farmarData) {
        return false;
      }

      // Ověříme PIN (v produkci by to měl být hash!)
      if (farmarData.pin_hash === pin) {
        setFarmar(farmarData);
        setAuthLevel('pin');

        await AsyncStorage.setItem('farmar_session', JSON.stringify(farmarData));
        await AsyncStorage.setItem('auth_level', 'pin');

        return true;
      }

      return false;
    } catch (error) {
      console.error('PIN login error:', error);
      return false;
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

  const logout = async () => {
    setFarmar(null);
    setAuthLevel('none');
    await AsyncStorage.removeItem('farmar_session');
    await AsyncStorage.removeItem('auth_level');
    // Nebudeme mazat farmar_data ani farmar_pin - uživatel se může znovu přihlásit
  };

  const value: FarmarAuthContextType = {
    farmar,
    isAuthenticated: farmar !== null && authLevel !== 'none',
    authLevel,
    loginWithPin,
    loginWithSMS,
    logout,
    register,
    verifyPhone,
    sendSMSCode,
    checkPinSession,
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
