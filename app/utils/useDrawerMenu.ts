import { useState } from 'react';

export function useDrawerMenu() {
  const [isMenuVisible, setIsMenuVisible] = useState(false);

  const openMenu = () => setIsMenuVisible(true);
  const closeMenu = () => setIsMenuVisible(false);
  const toggleMenu = () => setIsMenuVisible(prev => !prev);

  return {
    isMenuVisible,
    openMenu,
    closeMenu,
    toggleMenu,
  };
}
