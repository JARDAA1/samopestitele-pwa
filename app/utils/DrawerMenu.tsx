import { View, Text, StyleSheet, TouchableOpacity, Modal, Animated, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { useState, useRef, useEffect } from 'react';
import { useFarmarAuth } from './farmarAuthContext';
import { Feather } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const DRAWER_WIDTH = Math.min(280, width * 0.8);

interface DrawerMenuProps {
  visible: boolean;
  onClose: () => void;
}

export function DrawerMenu({ visible, onClose }: DrawerMenuProps) {
  const { isAuthenticated, farmar, logout } = useFarmarAuth();
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Otevření menu
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Zavření menu
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -DRAWER_WIDTH,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleNavigate = (path: string) => {
    onClose();
    setTimeout(() => {
      router.push(path as any);
    }, 250);
  };

  const handleLogout = async () => {
    onClose();
    setTimeout(async () => {
      await logout();
      router.push('/prihlaseni');
    }, 250);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      {/* Overlay */}
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <Animated.View style={[styles.overlayBg, { opacity: fadeAnim }]} />
      </TouchableOpacity>

      {/* Drawer */}
      <Animated.View
        style={[
          styles.drawer,
          {
            transform: [{ translateX: slideAnim }],
          },
        ]}
      >
        {/* Header */}
        <View style={styles.drawerHeader}>
          <Text style={styles.drawerHeaderEmoji}>🌾</Text>
          <Text style={styles.drawerHeaderTitle}>
            {isAuthenticated ? farmar?.nazev_farmy || 'Menu' : 'Samopěstitelé'}
          </Text>
          {isAuthenticated && farmar?.telefon && (
            <Text style={styles.drawerHeaderSubtitle}>{farmar.telefon}</Text>
          )}
        </View>

        {/* Menu Items */}
        <View style={styles.menuItems}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => handleNavigate('/(tabs)')}
          >
            <Feather name="home" size={24} color="#333" style={styles.menuItemIcon} />
            <Text style={styles.menuItemText}>Domů</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => handleNavigate('/mapa')}
          >
            <Feather name="map" size={24} color="#333" style={styles.menuItemIcon} />
            <Text style={styles.menuItemText}>Mapa</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => handleNavigate('/(tabs)/nakupni-seznam')}
          >
            <Feather name="list" size={24} color="#333" style={styles.menuItemIcon} />
            <Text style={styles.menuItemText}>Můj seznam</Text>
          </TouchableOpacity>

          {/* Divider */}
          {isAuthenticated && <View style={styles.divider} />}

          {/* Farmářské sekce - pouze pro přihlášené */}
          {isAuthenticated && (
            <>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => handleNavigate('/muj-profil')}
              >
                <Feather name="user" size={24} color="#333" style={styles.menuItemIcon} />
                <Text style={styles.menuItemText}>Můj profil</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => handleNavigate('/(tabs)/moje-farma')}
              >
                <Feather name="shopping-bag" size={24} color="#333" style={styles.menuItemIcon} />
                <Text style={styles.menuItemText}>Moje prodejna</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => handleNavigate('/(tabs)/moje-stanky')}
              >
                <Feather name="package" size={24} color="#333" style={styles.menuItemIcon} />
                <Text style={styles.menuItemText}>Moje stánky</Text>
              </TouchableOpacity>
            </>
          )}

          {/* Přihlášení/Odhlášení */}
          <View style={styles.divider} />

          {!isAuthenticated ? (
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleNavigate('/(tabs)/jsem-farmar')}
            >
              <Feather name="log-in" size={24} color="#333" style={styles.menuItemIcon} />
              <Text style={styles.menuItemText}>Jsem farmář</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.menuItem, styles.logoutItem]}
              onPress={handleLogout}
            >
              <Feather name="log-out" size={24} color="#F44336" style={styles.menuItemIcon} />
              <Text style={[styles.menuItemText, styles.logoutText]}>Odhlásit se</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Footer */}
        <View style={styles.drawerFooter}>
          <Text style={styles.footerText}>Verze 1.0</Text>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  overlayBg: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 16,
  },
  drawerHeader: {
    backgroundColor: '#4CAF50',
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },
  drawerHeaderEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  drawerHeaderTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  drawerHeaderSubtitle: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  menuItems: {
    flex: 1,
    paddingVertical: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  menuItemIcon: {
    width: 36,
    marginRight: 0,
  },
  menuItemText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    flex: 1,
  },
  logoutItem: {
    marginTop: 4,
  },
  logoutText: {
    color: '#F44336',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 8,
    marginHorizontal: 20,
  },
  drawerFooter: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
  },
});
