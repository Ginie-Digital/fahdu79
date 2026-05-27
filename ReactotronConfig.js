import Reactotron from 'reactotron-react-native';

if (__DEV__) {
  Reactotron
    .configure({ name: 'Fahdu App' })
    .useReactNative({
      asyncStorage: false,
      networking: {
        ignoreUrls: /symbolicate/
      }
    })
    .connect();

  // Clear Reactotron console on start
  Reactotron.clear();

  // Also hook console.log to Reactotron for convenience
  console.tron = Reactotron;
}
