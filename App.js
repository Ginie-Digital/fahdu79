import {ActivityIndicator, Alert, StyleSheet, Platform, View} from 'react-native';
import React, {useCallback, useEffect, useState} from 'react';
import NetInfo from "@react-native-community/netinfo";
import NoInternet from './Src/Components/NoInternet';


import {NavigationContainer} from '@react-navigation/native';
import {Provider} from 'react-redux';
import store from './Redux/Store';
import {PersistGate} from 'redux-persist/integration/react';
import persistStore from 'redux-persist/es/persistStore';
import Main from './Main';
import {navigationRef} from './Navigation/RootNavigation';
import {BottomSheetModalProvider} from '@gorhom/bottom-sheet';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {withIAPContext} from 'react-native-iap';
import {checkForUpdate, UpdateFlow} from 'react-native-in-app-updates';
import * as Updates from 'expo-updates';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';
import DeviceInfo from 'react-native-device-info';
import {createMMKV} from 'react-native-mmkv';
import BootSplash from 'react-native-bootsplash';

import {KeyboardProvider} from 'react-native-keyboard-controller';

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
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
        <ActivityIndicator size={'large'} color={'#ffa07a'} />
      </View>
    );
  }, []);

  async function getData() {
    if (Platform.OS === 'android') {
      try {
        let x = await checkForUpdate(UpdateFlow.FLEXIBLE);
      } catch (e) {
        // Handle error
        console.log('ERROR', e);
      }
    }
  }

  async function clearRNCacheOnUpdate() {
    if (Platform.OS === 'android') {
      const current = DeviceInfo.getVersion();
      console.log('fujkc', current);
      console.log(current);
      const saved = await AsyncStorage.getItem('lastVersion');
      if (saved && saved !== current) {
        try {
          // Alert.alert('clearing');
          await RNFS.unlink(RNFS.CachesDirectoryPath);
        } catch {}
        await AsyncStorage.clear();
      }
      await AsyncStorage.setItem('lastVersion', current);
    }
  }

  async function checkForOTAUpdate() {
    if (__DEV__) return;
    try {
      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        await Updates.fetchUpdateAsync();
        Alert.alert(
          'Update Available',
          'A new update has been downloaded. Restart the app to apply?',
          [
            { text: 'Later', style: 'cancel' },
            { text: 'Restart', onPress: () => Updates.reloadAsync() },
          ]
        );
      }
    } catch (e) {
      console.log('OTA update check failed:', e);
    }
  }

  useEffect(() => {
    getData();
    checkForOTAUpdate();
    clearRNCacheOnUpdate();
  }, []);

  return (
    <Provider store={store}>
      <PersistGate persistor={persistor}>
        <KeyboardProvider statusBarTranslucent navigationBarTranslucent>
          <GestureHandlerRootView style={{flex: 1}}>
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
              </SafeAreaProvider>
            </BottomSheetModalProvider>
          </GestureHandlerRootView>
        </KeyboardProvider>
      </PersistGate>
    </Provider>
  );
};

export default App;

const styles = StyleSheet.create({});
