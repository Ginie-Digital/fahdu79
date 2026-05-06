import { AppRegistry, View, Text } from 'react-native';

const SimpleApp = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Test Boot Successful</Text>
  </View>
);

AppRegistry.registerComponent('Fahdu', () => SimpleApp);
