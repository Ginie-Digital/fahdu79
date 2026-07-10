import {Platform, StyleSheet, Text, View} from 'react-native';
import React, {memo, useEffect, useState} from 'react';
import DIcon from '../../../DesiginData/DIcons';
import {nTwins, nTwinsFont} from '../../../DesiginData/Utility';
import {responsiveWidth} from 'react-native-responsive-dimensions';
import {BlurView} from 'expo-blur';
import {Image} from 'expo-image';
import {useAppTheme} from '../../Hook/useAppTheme';

const Timer = () => {
  const {isDark} = useAppTheme();
  const [countup, setCountup] = useState('00');

  useEffect(() => {
    const startTime = new Date().getTime();

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const elapsedTime = now - startTime;

      const hours = Math.floor(elapsedTime / (1000 * 60 * 60));
      const minutes = Math.floor((elapsedTime % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((elapsedTime % (1000 * 60)) / 1000);

      // Format the timer based on elapsed time
      let countupStr = '';
      if (hours > 0) {
        countupStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      } else if (minutes > 0) {
        countupStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      } else {
        countupStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      }

      setCountup(countupStr);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <View
      style={[
        styles.box,
        {
          borderColor: isDark ? 'rgba(18, 18, 18, 0.8)' : 'rgba(255, 255, 255, 0.6)',
          backgroundColor: isDark ? 'rgba(18, 18, 18, 0.6)' : 'rgba(255, 255, 255, 0.5)',
        },
      ]}>
      <BlurView intensity={30} tint={isDark ? 'dark' : 'light'} style={styles.blurContainer}>
        <View style={styles.verifyContainer}>
          <Image
            cachePolicy="memory-disk"
            source={require('../../../Assets/Images/timer.png')}
            contentFit="contain"
            style={{flex: 1, tintColor: isDark ? '#FFFFFF' : '#1E1E1E'}}
          />
        </View>
        <Text style={[styles.text, {color: isDark ? '#FFFFFF' : '#1E1E1E'}]}>{countup}</Text>
      </BlurView>
    </View>
  );
};

export default memo(Timer);

const styles = StyleSheet.create({
  box: {
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    borderRadius: 5,
    width: 73,
    borderWidth: 1.5,
    borderColor: '#ffffff60',
    height: 22,
    overflow: 'hidden', // Ensures blur stays within rounded edges
  },
  blurContainer: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 10, // **Added 10 horizontal padding**
  },
  text: {
    color: '#282828',
    fontSize: nTwinsFont(1.5, 1.5),
    fontFamily: 'Rubik-Medium',
  },
  verifyContainer: {
    width: 15,
    height: 14.32,
  },
});