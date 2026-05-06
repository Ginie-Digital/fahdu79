import React, {useState} from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import Animated, {useSharedValue, withSpring, useAnimatedStyle, withTiming} from 'react-native-reanimated';
import {responsiveWidth} from 'react-native-responsive-dimensions';
import SmoothLoader from './SmootheLoader';
import {hTwins} from '../../DesiginData/Utility';

const AnimatedButton = ({
  overlayStyle,
  title,
  onPress,
  style,
  loading,
  showOverlay = true,
  buttonMargin = 7,
  disabled = false,
  highlightOnPress = false, // true/false to enable overlay
  highlightColor = 'rgba(255,165,0,0.2)', // overlay color
  testID, // Added for automation testing
  disabledStyle,
  textStyle,
  disableAnimation = false,
}) => {
  const translateY = useSharedValue(2);
  const translateX = useSharedValue(0);
  const overlayOpacity = useSharedValue(0);

  const [showWhite, setShowWhite] = useState(false);

  const animatedTransform = useAnimatedStyle(() => ({
    transform: [{translateY: translateY.value}, {translateX: translateX.value}],
  }));

  const animatedOverlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const handlePressIn = () => {
    if (!loading && !disabled) {
      if (!disableAnimation) {
        translateY.value = withSpring(7);
        translateX.value = withSpring(3.5);
      }
      setShowWhite(true);

      if (highlightOnPress) overlayOpacity.value = withTiming(1, {duration: 150});
    }
  };

  const handlePressOut = () => {
    if (!loading && !disabled) {
      if (!disableAnimation) {
        translateY.value = withSpring(2);
        translateX.value = withSpring(0);
      }
      onPress && onPress();
      setShowWhite(false);

      if (highlightOnPress) overlayOpacity.value = withTiming(0, {duration: 150});
    }
  };

  return (
    <Pressable testID={testID} style={{marginTop: responsiveWidth(buttonMargin)}} onPressIn={handlePressIn} onPressOut={handlePressOut} disabled={loading || disabled}>
      {showOverlay && !disabled && <View style={[styles.overlayButton, overlayStyle]} />}

      <Animated.View style={[styles.buttonContainer, animatedTransform]}>
        <View style={[styles.button, style, disabled && (disabledStyle || {backgroundColor: '#CBCBCB'}), !showOverlay && showWhite && {backgroundColor: '#fff'}]}>
          {/* Highlight overlay */}
          {highlightOnPress && <Animated.View style={[styles.highlightOverlay, {backgroundColor: highlightColor}, animatedOverlayStyle]} />}

          <SmoothLoader loading={loading} title={title} textStyle={textStyle} />
        </View>
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  overlayButton: {
    width: '100%',
    height: hTwins(7, 6.65),
    borderRadius: responsiveWidth(3.73),
    backgroundColor: '#1e1e1e',
    position: 'absolute',
    marginLeft: responsiveWidth(1.06),
    marginTop: responsiveWidth(1.6),
  },
  buttonContainer: {
    width: '100%',
    height: hTwins(7, 6.65),
    borderRadius: responsiveWidth(3.73),
    borderColor: '#1e1e1e',
    alignSelf: 'center',
  },
  button: {
    width: '100%',
    height: '100%',
    borderRadius: responsiveWidth(3.73),
    backgroundColor: 'rgba(255, 168, 107, 1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  highlightOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: responsiveWidth(3.73),
  },
});

export default AnimatedButton;
