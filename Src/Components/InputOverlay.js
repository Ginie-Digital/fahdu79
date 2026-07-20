import React from 'react';
import {StyleSheet, View} from 'react-native';
import {responsiveHeight, responsiveWidth} from 'react-native-responsive-dimensions';
import {nTwins} from '../../DesiginData/Utility';
import { useAppTheme } from '../Hook/useAppTheme';

const InputOverlay = ({isVisible, style}) => {
  const { colors, isDark } = useAppTheme();
  if (!isVisible) return null; // Render nothing if overlay is not visible

  return <View style={[styles.overlay, { backgroundColor: colors.overlayBg }, style]}></View>;
};

export default InputOverlay;

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: responsiveWidth(1.06),
    left: responsiveWidth(1.06),
    right: -responsiveWidth(1.06),
    bottom: -responsiveWidth(1.06),
    backgroundColor: '#1e1e1e',
    borderRadius: responsiveWidth(3.73),
    zIndex: -1,
  },
});
