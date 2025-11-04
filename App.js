import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Platform,
  View,
} from 'react-native';
import React, {useCallback, useEffect, useState} from 'react';

import './service/CallKeepService';
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';
import DeviceInfo from 'react-native-device-info';
// import {MMKV} from 'react-native-mmkv';

const persistor = persistStore(store);

// const storage = new MMKV();

const App = () => {
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
        console.log(x, '::::');

        storage.clearAll();
        // Alert.alert(String(x));
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

  useEffect(() => {
    getData();
    // clearRNCacheOnUpdate();
  }, []);

  return (
    <Provider store={store}>
      <PersistGate persistor={persistor}>
        <GestureHandlerRootView style={{flex: 1}}>
          <BottomSheetModalProvider>
            <SafeAreaProvider>
              <NavigationContainer
                ref={navigationRef}
                fallback={<LoadingComponent />}>
                <Main />
              </NavigationContainer>
            </SafeAreaProvider>
          </BottomSheetModalProvider>
        </GestureHandlerRootView>
      </PersistGate>
    </Provider>
  );
};

export default App;

const styles = StyleSheet.create({});
