import React from 'react';
import { View, StyleSheet } from 'react-native';
import NetworkLogger from 'react-native-network-logger';

export default function NetworkLoggerScreen() {
  return (
    <View style={styles.container}>
      <NetworkLogger theme="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
