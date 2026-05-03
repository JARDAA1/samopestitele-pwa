import { Platform, Alert } from 'react-native';

export const FORBIDDEN_PINS = [
  '1234', '4321', '0000', '1111', '2222', '3333',
  '4444', '5555', '6666', '7777', '8888', '9999',
  '12345678', '87654321',
];

export function validatePin(pin: string): string | null {
  if (pin.length < 4) return 'PIN musí mít minimálně 4 číslice';
  if (!/^\d+$/.test(pin)) return 'PIN může obsahovat pouze číslice';
  if (FORBIDDEN_PINS.includes(pin)) return 'Tento PIN je příliš jednoduchý. Zvolte si jiný PIN.';
  if (/^(.)\1+$/.test(pin)) return 'PIN nesmí obsahovat pouze stejné číslice.';
  return null;
}

export function showAlert(title: string, message: string): void {
  if (Platform.OS === 'web') {
    alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
}
