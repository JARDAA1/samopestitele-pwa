// Global color constants - Single source of truth
// Background: Purple | Text: White | Buttons: Orange

export const Colors = {
  // Primary colors
  primary: '#6A1B9A',        // Purple - main background
  accent: '#FF9800',         // Orange - buttons, highlights

  // Text colors
  textPrimary: '#ffffff',    // White - primary text
  textSecondary: 'rgba(255,255,255,0.7)',  // White 70% - secondary text
  textMuted: 'rgba(255,255,255,0.5)',      // White 50% - muted text

  // Background variations
  cardBackground: 'rgba(255,255,255,0.15)',  // Transparent white for cards
  cardBorder: 'rgba(255,255,255,0.2)',       // Card borders
  divider: 'rgba(255,255,255,0.1)',          // Dividers/separators

  // Button states
  buttonPrimary: '#FF9800',           // Orange button
  buttonPrimaryText: '#ffffff',       // White button text
  buttonDisabled: 'rgba(255,152,0,0.5)', // Disabled button

  // Status colors (kept subtle, used sparingly)
  success: 'rgba(76, 175, 80, 0.8)',
  successText: '#a5d6a7',
  warning: 'rgba(255, 152, 0, 0.3)',
  warningText: '#ffcc80',
  error: 'rgba(244, 67, 54, 0.3)',
  errorText: '#ef9a9a',

  // Input fields on purple background
  inputBackground: 'rgba(255,255,255,0.15)',
  inputBorder: 'rgba(255,255,255,0.3)',
  inputText: '#ffffff',
  inputPlaceholder: 'rgba(255,255,255,0.5)',
};

export default Colors;
