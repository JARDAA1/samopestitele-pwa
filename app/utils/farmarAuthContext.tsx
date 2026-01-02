import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

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
  loginWithPin: (pin: string) => Promise<boolean>;
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

  useEffect(() => {
    checkExistingSession();
  }, []);

  const checkExistingSession = async () => {
    try {
      const storedFarmar = await AsyncStorage.getItem('farmar_session');
      const storedAuthLevel = await AsyncStorage.getItem('auth_level');

      if (storedFarmar) {
        setFarmar(JSON.parse(storedFarmar));
        setAuthLevel((storedAuthLevel as any) || 'pin');
      }
    } catch (error) {
      console.error('Error checking session:', error);
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

        // Uložíme PIN do AsyncStorage (zahashovaný by měl být na produkci)
        await AsyncStorage.setItem('farmar_pin', data.pin);

        // Vytvoříme mock farmáře
        const newFarmar: Farmar = {
          id: `farmar-${Date.now()}`,
          telefon: data.telefon,
          nazev_farmy: data.nazev_farmy,
          jmeno: data.jmeno,
          email: data.email,
        };

        // Uložíme farmáře
        await AsyncStorage.setItem('farmar_data', JSON.stringify(newFarmar));

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

  const loginWithPin = async (pin: string): Promise<boolean> => {
    try {
      const storedPin = await AsyncStorage.getItem('farmar_pin');

      if (storedPin === pin) {
        const farmarData = await AsyncStorage.getItem('farmar_data');

        if (farmarData) {
          const parsedFarmar = JSON.parse(farmarData);
          setFarmar(parsedFarmar);
          setAuthLevel('pin');

          await AsyncStorage.setItem('farmar_session', farmarData);
          await AsyncStorage.setItem('auth_level', 'pin');

          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('PIN login error:', error);
      return false;
    }
  };

  const loginWithSMS = async (telefon: string, kod: string): Promise<boolean> => {
    try {
      // Pro WEB - mock ověření
      if (Platform.OS === 'web') {
        // Mock: Přijmeme jakýkoliv 6-místný kód pro demo
        if (kod.length === 6) {
          const farmarData = await AsyncStorage.getItem('farmar_data');

          if (farmarData) {
            const parsedFarmar = JSON.parse(farmarData);
            setFarmar(parsedFarmar);
            setAuthLevel('sms');

            await AsyncStorage.setItem('farmar_session', farmarData);
            await AsyncStorage.setItem('auth_level', 'sms');

            return true;
          }
        }
        return false;
      }

      // Pro NATIVE - ověření přes Supabase
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
      // Pro WEB - mock odeslání
      if (Platform.OS === 'web') {
        console.log('WEB: Mock SMS kód odeslán na', telefon);
        console.log('Pro demo použijte libovolný 6-místný kód');
        return true;
      }

      // Pro NATIVE - reálné odeslání
      // TODO: Implementovat SMS bránu (Twilio, MessageBird, apod.)
      // Prozatím můžeme použít Email jako fallback

      const kod = Math.floor(100000 + Math.random() * 900000).toString();
      console.log('SMS KÓD (pro testování):', kod);

      const { supabase } = require('../../lib/supabase');

      // Uložit kód do databáze
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minut

      const { error } = await supabase
        .from('sms_codes')
        .insert({
          phone: telefon,
          code: kod,
          expires_at: expiresAt.toISOString(),
        });

      if (error) {
        console.error('Error saving SMS code:', error);
        return false;
      }

      // TODO: Odeslat skutečnou SMS
      // await twilioClient.messages.create({ to: telefon, body: `Váš kód: ${kod}` });

      return true;
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
  };

  const value: FarmarAuthContextType = {
    farmar,
    isAuthenticated: farmar !== null,
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
