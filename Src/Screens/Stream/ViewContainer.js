import {Platform, StyleSheet, Text, View} from 'react-native';
import React, {memo} from 'react';
import DIcon from '../../../DesiginData/DIcons';
import {nTwins, nTwinsFont} from '../../../DesiginData/Utility';
import {responsiveWidth} from 'react-native-responsive-dimensions';
import {BlurView} from 'expo-blur';
import {Image} from 'expo-image';
import {useAppTheme} from '../../Hook/useAppTheme';

const ViewContainer = ({views}) => {
  const {isDark} = useAppTheme();

  return (
    <View
      style={{
        width: 56,
        height: 22,
        borderRadius: 5,
        borderWidth: 1.5,
        borderColor: isDark ? 'rgba(18, 18, 18, 0.8)' : 'rgba(255, 255, 255, 0.6)',
        backgroundColor: isDark ? 'rgba(18, 18, 18, 0.6)' : 'rgba(255, 255, 255, 0.5)',
        overflow: 'hidden',
      }}>
      <BlurView intensity={30} tint={isDark ? 'dark' : 'light'} style={styles.blurContainer}>
        <View style={styles.verifyContainer}>
          <Image
            cachePolicy="memory-disk"
            source={require('../../../Assets/Images/viewsEye.png')}
            contentFit="contain"
            style={{flex: 1, tintColor: isDark ? '#FFFFFF' : '#1E1E1E'}}
          />
        </View>
        <Text style={[styles.text, {color: isDark ? '#FFFFFF' : '#1E1E1E'}]}>{views}</Text>
      </BlurView>
    </View>
  );
};

export default memo(ViewContainer);

const styles = StyleSheet.create({
  box: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 5,
    overflow: 'hidden', // Ensures blur stays within rounded edges
    height: 22,
  },
  blurContainer: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderRadius: 5,
  },
  text: {
    color: '#131313',
    fontSize: nTwinsFont(1.5, 1.5),
    fontFamily: 'Rubik-Medium',
    marginLeft: 2, // Space between icon & text
  },
  verifyContainer: {
    width: 15,
    height: 14.32,
  },
});
