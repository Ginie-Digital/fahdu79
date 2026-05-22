import { ActivityIndicator, Alert, StyleSheet, Platform, View, Text, ScrollView, TouchableOpacity, Share, SafeAreaView, StatusBar, Modal } from 'react-native';
import React, { useCallback, useEffect, useState } from 'react';
import NetInfo from "@react-native-community/netinfo";
import NoInternet from './Src/Components/NoInternet';


import { NavigationContainer } from '@react-navigation/native';
import { Provider } from 'react-redux';
import store from './Redux/Store';
import { PersistGate } from 'redux-persist/integration/react';
import persistStore from 'redux-persist/es/persistStore';
import Main from './Main';
import { navigationRef } from './Navigation/RootNavigation';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { withIAPContext } from 'react-native-iap';
import { checkForUpdate, UpdateFlow } from 'react-native-in-app-updates';
import * as Updates from 'expo-updates';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';
import DeviceInfo from 'react-native-device-info';
import { createMMKV } from 'react-native-mmkv';
import BootSplash from 'react-native-bootsplash';

import { KeyboardProvider } from 'react-native-keyboard-controller';

const persistor = persistStore(store);

const storage = createMMKV();

const App = () => {
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      if (state.isConnected === false) {
        setIsConnected(false);
      } else {
        setIsConnected(true);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const LoadingComponent = useCallback(() => {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size={'large'} color={'#ffa07a'} />
      </View>
    );
  }, []);

  async function getData() {
    if (Platform.OS === 'android') {
      try {
        let x = await checkForUpdate(UpdateFlow.FLEXIBLE);
      } catch (e) {
        console.log('ERROR', e);
      }
    }
  }

  async function clearRNCacheOnUpdate() {
    if (Platform.OS === 'android') {
      const current = DeviceInfo.getVersion();
      const saved = await AsyncStorage.getItem('lastVersion');
      if (saved && saved !== current) {
        try {
          await RNFS.unlink(RNFS.CachesDirectoryPath);
        } catch { }
        await AsyncStorage.clear();
      }
      await AsyncStorage.setItem('lastVersion', current);
    }
  }

  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [modalType, setModalType] = useState('pending'); // 'pending' | 'installed'

  async function checkForOTAUpdate() {
    if (__DEV__) return;
    try {
      console.log('[EAS-OTA] Checking for updates...');
      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        console.log('[EAS-OTA] New update found! Fetching...');
        await Updates.fetchUpdateAsync();
        console.log('[EAS-OTA] Update fetched successfully.');
        setModalType('pending');
        setShowUpdateModal(true);
      } else {
        console.log('[EAS-OTA] No updates available. Running latest version.');
      }
    } catch (e) {
      console.log('[EAS-OTA] OTA check failed:', e);
    }
  }

  useEffect(() => {
    getData();

    // Check for OTA update after 3 seconds to let native processes settle down
    const t = setTimeout(() => {
      checkForOTAUpdate();
    }, 3000);

    clearRNCacheOnUpdate();

    // Detect if we just booted into a new OTA update version (or first time on this modal code)
    const checkUpdateId = async () => {
      try {
        const currentUpdateId = Updates.updateId;
        const savedUpdateId = await AsyncStorage.getItem('lastRunUpdateId');
        if (currentUpdateId) {
          if (!savedUpdateId || savedUpdateId !== currentUpdateId) {
            // First time running this version (or new OTA version)! Show the "installed" success modal
            setModalType('installed');
            setShowUpdateModal(true);
          }
          await AsyncStorage.setItem('lastRunUpdateId', currentUpdateId);
        }
      } catch (e) {
        console.log('[EAS-OTA] Error checking update ID:', e);
      }
    };
    checkUpdateId();

    return () => {
      clearTimeout(t);
    };
  }, []);

  return (
    <Provider store={store}>
      <PersistGate persistor={persistor}>
        <KeyboardProvider statusBarTranslucent navigationBarTranslucent>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <BottomSheetModalProvider>
              <SafeAreaProvider>
                <NavigationContainer
                  ref={navigationRef}
                  fallback={<LoadingComponent />}
                  onReady={() => {
                    BootSplash.hide({ fade: true });
                  }}
                >
                  <Main />
                </NavigationContainer>
                {!isConnected && <NoInternet />}

                 {/* Premium Custom EAS Updates Modal */}
                <Modal
                  visible={showUpdateModal}
                  transparent={true}
                  animationType="fade"
                  statusBarTranslucent
                >
                  <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                      {/* Decorative Header Badge */}
                      <View style={styles.rocketBadgeContainer}>
                        <Text style={styles.rocketIcon}>
                          {modalType === 'installed' ? '🎉' : '🚀'}
                        </Text>
                      </View>

                      <Text style={styles.modalTitle}>
                        {modalType === 'installed' ? 'App Updated!' : 'App Update Ready!'}
                      </Text>
                      <Text style={styles.modalDescription}>
                        {modalType === 'installed'
                          ? "Fahdu has been updated successfully with the latest improvements. Enjoy the fresh new experience!"
                          : "A new version of Fahdu is available with exciting improvements. Restart the app now to apply the update immediately!"}
                      </Text>

                      <View style={styles.buttonContainer}>
                        {modalType === 'installed' ? (
                          <TouchableOpacity
                            style={styles.singleButton}
                            activeOpacity={0.8}
                            onPress={() => setShowUpdateModal(false)}
                          >
                            <Text style={styles.updateButtonText}>Awesome!</Text>
                          </TouchableOpacity>
                        ) : (
                          <>
                            <TouchableOpacity
                              style={styles.cancelButton}
                              activeOpacity={0.7}
                              onPress={() => setShowUpdateModal(false)}
                            >
                              <Text style={styles.cancelButtonText}>Later</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={styles.updateButton}
                              activeOpacity={0.8}
                              onPress={async () => {
                                setShowUpdateModal(false);
                                await Updates.reloadAsync();
                              }}
                            >
                              <Text style={styles.updateButtonText}>Restart Now</Text>
                            </TouchableOpacity>
                          </>
                        )}
                      </View>
                    </View>
                  </View>
                </Modal>
              </SafeAreaProvider>
            </BottomSheetModalProvider>
          </GestureHandlerRootView>
        </KeyboardProvider>
      </PersistGate>
    </Provider>
  );
};

export default App;

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(9, 9, 11, 0.70)', // High-end dark charcoal transparent overlay
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 12,
    width: '100%',
    maxWidth: 320,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)', // Glossy border hint
  },
  rocketBadgeContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#EEF2FF', // Very soft sky indigo
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  rocketIcon: {
    fontSize: 34,
  },
  modalTitle: {
    fontFamily: 'MabryPro-Bold',
    fontSize: 22,
    color: '#18181B', // Rich near-black
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  modalDescription: {
    fontFamily: 'MabryPro-Regular',
    fontSize: 14,
    color: '#52525B', // Warm soft grey
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    paddingHorizontal: 6,
  },
  buttonContainer: {
    flexDirection: 'column',
    width: '100%',
    gap: 12,
  },
  cancelButton: {
    width: '100%',
    paddingVertical: 15,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E4E4E7',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontFamily: 'MabryPro-Bold',
    fontSize: 15,
    color: '#71717A', // Slate grey
    fontWeight: '700',
  },
  updateButton: {
    width: '100%',
    paddingVertical: 15,
    borderRadius: 16,
    backgroundColor: '#18181B', // Premium high-contrast near black
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  updateButtonText: {
    fontFamily: 'MabryPro-Bold',
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  singleButton: {
    width: '100%',
    paddingVertical: 15,
    borderRadius: 16,
    backgroundColor: '#6366F1', // Premium Indigo
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
});
