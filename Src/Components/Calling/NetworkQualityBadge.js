import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const SignalBars = ({ level, color }) => {
  // level: 0=none, 1=1bar, 2=2bars, 3=3bars
  return (
    <View style={signalStyles.container}>
      <View style={[signalStyles.bar, signalStyles.bar1, level >= 1 ? { backgroundColor: color } : { backgroundColor: '#D1D5DB' }]} />
      <View style={[signalStyles.bar, signalStyles.bar2, level >= 2 ? { backgroundColor: color } : { backgroundColor: '#D1D5DB' }]} />
      <View style={[signalStyles.bar, signalStyles.bar3, level >= 3 ? { backgroundColor: color } : { backgroundColor: '#D1D5DB' }]} />
    </View>
  );
};

const signalStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 1.5,
    height: 12,
  },
  bar: {
    width: 2.5,
    borderRadius: 1,
  },
  bar1: { height: 4 },
  bar2: { height: 8 },
  bar3: { height: 12 },
});

const NetworkQualityBadge = ({ quality }) => {

  const getQualityInfo = (q) => {
    switch (q) {
      case 1:
        return { text: 'Excellent', color: '#10B981', bars: 3 };
      case 2:
        return { text: 'Good', color: '#10B981', bars: 3 };
      case 3:
        return { text: 'Medium', color: '#F59E0B', bars: 2 };
      case 4:
        return { text: 'Poor', color: '#F97316', bars: 1 };
      case 5:
        return { text: 'Bad', color: '#EF4444', bars: 0 };
      default:
        return { text: 'Connecting', color: '#999999', bars: 0 };
    }
  };

  const info = getQualityInfo(quality);

  return (
    <View style={styles.container}>
      <SignalBars level={info.bars} color={info.color} />
      <Text style={styles.text}>
        {info.text}
      </Text>
    </View>
  );
};

export default NetworkQualityBadge;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingHorizontal: 4,
    paddingVertical: 2,
    gap: 4,
  },
  text: {
    fontSize: 13,
    fontFamily: 'Rubik-Medium',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
