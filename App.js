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
import dayjs from 'dayjs';
import Clipboard from '@react-native-clipboard/clipboard';
import RNFS from 'react-native-fs';
import DeviceInfo from 'react-native-device-info';
import { createMMKV } from 'react-native-mmkv';
import BootSplash from 'react-native-bootsplash';

import { KeyboardProvider } from 'react-native-keyboard-controller';

const persistor = persistStore(store);

let capturedLogs = [];
const logListeners = new Set();

const addCapturedLog = (type, args) => {
  const msg = args.map(arg => {
    if (arg instanceof Error) {
      return arg.message + '\nStack: ' + arg.stack;
    }
    return typeof arg === 'object' ? JSON.stringify(arg) : String(arg);
  }).join(' ');
  
  capturedLogs = [
    { id: Math.random().toString(), type, message: msg, time: new Date().toLocaleTimeString() },
    ...capturedLogs
  ].slice(0, 100);

  // Defer listener execution to the next tick to completely prevent "Cannot update during render" warnings!
  setTimeout(() => {
    logListeners.forEach(listener => listener(capturedLogs));
  }, 0);
};

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





  const updateDate = Updates.createdAt
    ? dayjs(Updates.createdAt).format('DD MMM YYYY, hh:mm A')
    : null;

  const updateMessage = Updates.manifest?.extra?.eas?.message
    || Updates.manifest?.metadata?.message
    || Updates.manifest?.message
    || "Performance optimizations and styling enhancements.";

  async function checkForOTAUpdate() {
    if (__DEV__) return;
    if (!Updates.isEnabled) {
      console.log('[EAS-OTA] OTA updates are disabled or not supported in this environment.');
      return;
    }
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
                      <Text style={[styles.modalDescription, (updateDate || updateMessage) && { marginBottom: 16 }]}>
                        {modalType === 'installed'
                          ? "Fahdu has been updated successfully with the latest improvements. Enjoy the fresh new experience!"
                          : "A new version of Fahdu is available with exciting improvements. Restart the app now to apply the update immediately!"}
                      </Text>

                      {(updateDate || updateMessage) && (
                        <View style={styles.changelogCard}>
                          {updateDate && (
                            <View style={styles.changelogRow}>
                              <Text style={styles.changelogLabel}>Published</Text>
                              <Text style={styles.changelogValue}>{updateDate}</Text>
                            </View>
                          )}
                          {updateMessage && (
                            <View style={[styles.changelogRow, { flexDirection: 'column', alignItems: 'flex-start', marginTop: updateDate ? 8 : 0 }]}>
                              <Text style={styles.changelogLabel}>What's New</Text>
                              <Text style={styles.changelogMessage}>"{updateMessage}"</Text>
                            </View>
                          )}
                        </View>
                      )}

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
                          <View style={styles.horizontalButtonContainer}>
                            <TouchableOpacity
                              style={styles.textOnlyButton}
                              activeOpacity={0.7}
                              onPress={() => setShowUpdateModal(false)}
                            >
                              <Text style={styles.textOnlyButtonText}>Later</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={styles.smallUpdateButton}
                              activeOpacity={0.8}
                              onPress={async () => {
                                setShowUpdateModal(false);
                                await Updates.reloadAsync();
                              }}
                            >
                              <Text style={styles.updateButtonText}>Restart Now</Text>
                            </TouchableOpacity>
                          </View>
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
    borderRadius: 24,
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
    borderRadius: 24,
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
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: '#18181B', // Premium Black
    alignSelf: 'flex-end', // Push to the right side!
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  horizontalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    width: '100%',
    gap: 8,
  },
  textOnlyButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textOnlyButtonText: {
    fontFamily: 'MabryPro-Bold',
    fontSize: 15,
    color: '#18181B', // Pure black text as requested
    fontWeight: '700',
  },
  smallUpdateButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: '#18181B', // Premium Black
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  changelogCard: {
    backgroundColor: '#F8FAFC', // Very soft slate blue-grey
    borderRadius: 16,
    padding: 16,
    width: '100%',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 24,
  },
  changelogRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  changelogLabel: {
    fontFamily: 'MabryPro-Bold',
    fontSize: 11,
    textTransform: 'uppercase',
    color: '#64748B', // Soft slate gray
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  changelogValue: {
    fontFamily: 'MabryPro-Regular',
    fontSize: 12,
    color: '#334155', // Charcoal
    fontWeight: '500',
  },
  changelogMessage: {
    fontFamily: 'MabryPro-Regular',
    fontSize: 13,
    color: '#0F172A', // Dark slate/black
    fontStyle: 'italic',
    lineHeight: 18,
    marginTop: 4,
    width: '100%',
  },
  floatingDebugBtn: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    backgroundColor: '#18181B',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
    zIndex: 9999,
  },
  floatingDebugBtnText: {
    color: '#FFFFFF',
    fontFamily: 'MabryPro-Bold',
    fontSize: 12,
  },
  debugPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 380,
    backgroundColor: 'rgba(9, 9, 11, 0.95)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    zIndex: 9999,
    borderTopWidth: 1,
    borderColor: '#27272A',
  },
  debugHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  debugHeaderTitle: {
    color: '#FFFFFF',
    fontFamily: 'MabryPro-Bold',
    fontSize: 14,
  },
  debugHeaderBtn: {
    backgroundColor: '#27272A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  debugHeaderBtnText: {
    color: '#E4E4E7',
    fontFamily: 'MabryPro-Regular',
    fontSize: 12,
  },
  debugHeaderBtnClose: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  debugHeaderBtnCloseText: {
    color: '#FFFFFF',
    fontFamily: 'MabryPro-Bold',
    fontSize: 12,
  },
  debugMetadataBox: {
    backgroundColor: '#18181B',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  metadataText: {
    color: '#A1A1AA',
    fontFamily: 'MabryPro-Regular',
    fontSize: 11,
    lineHeight: 16,
  },
  logsList: {
    flex: 1,
    backgroundColor: '#09090B',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  logRow: {
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#18181B',
    paddingBottom: 4,
  },
  logTime: {
    color: '#71717A',
    fontFamily: 'MabryPro-Bold',
    fontSize: 10,
  },
  logMsg: {
    color: '#E4E4E7',
    fontFamily: 'MabryPro-Regular',
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  emptyLogsText: {
    color: '#71717A',
    fontFamily: 'MabryPro-Regular',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 40,
  },
});
