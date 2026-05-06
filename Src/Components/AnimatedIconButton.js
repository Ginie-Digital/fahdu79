import React, {useState} from 'react';
import {Pressable, StyleSheet, View, Text, Image, ActivityIndicator} from 'react-native';
import Animated, {useSharedValue, withSpring, useAnimatedStyle, withTiming, useDerivedValue} from 'react-native-reanimated';
import {responsiveWidth} from 'react-native-responsive-dimensions';
import {hTwins} from '../../DesiginData/Utility';

const AnimatedIconButton = ({
  overlayStyle,
  title,
  onPress,
  style,
  loading,
  showOverlay = true,
  buttonMargin = 7,
  disabled = false,
  highlightOnPress = false,
  highlightColor = 'rgba(255,165,0,0.2)',
  testID,
  disabledStyle,
  textStyle,
  icon,
  iconPosition = 'right', // 'left' or 'right'
  iconStyle,
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
      translateY.value = withSpring(7);
      translateX.value = withSpring(3.5);
      setShowWhite(true);

      if (highlightOnPress) overlayOpacity.value = withTiming(1, {duration: 150});
    }
  };

  const handlePressOut = () => {
    if (!loading && !disabled) {
      translateY.value = withSpring(2);
      translateX.value = withSpring(0);
      onPress && onPress();
      setShowWhite(false);

      if (highlightOnPress) overlayOpacity.value = withTiming(0, {duration: 150});
    }
  };

  const renderContent = () => {
    if (loading) {
      return <ActivityIndicator size="small" color="#282828" />;
    }

    return (
      <View style={[styles.contentRow, iconPosition === 'left' ? {flexDirection: 'row'} : {flexDirection: 'row'}]}>
        {icon && iconPosition === 'left' && (
          <Image source={icon} style={[styles.icon, iconStyle, {marginRight: 8}]} resizeMode="contain" />
        )}
        <Text style={[styles.text, textStyle]}>{title}</Text>
        {icon && iconPosition === 'right' && (
          <Image source={icon} style={[styles.icon, iconStyle, {marginLeft: 8}]} resizeMode="contain" />
        )}
      </View>
    );
  };

  return (
    <Pressable testID={testID} style={{marginTop: responsiveWidth(buttonMargin)}} onPressIn={handlePressIn} onPressOut={handlePressOut} disabled={loading || disabled}>
      {showOverlay && !disabled && <View style={[styles.overlayButton, overlayStyle]} />}

      <Animated.View style={[styles.buttonContainer, animatedTransform]}>
        <View style={[styles.button, style, disabled && (disabledStyle || {backgroundColor: '#CBCBCB'}), !showOverlay && showWhite && {backgroundColor: '#fff'}]}>
          {highlightOnPress && <Animated.View style={[styles.highlightOverlay, {backgroundColor: highlightColor}, animatedOverlayStyle]} />}
          {renderContent()}
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
    borderColor: '#1e1e1e',
  },
  highlightOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: responsiveWidth(3.73),
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    width: '100%',
  },
  text: {
    fontSize: 16,
    fontFamily: 'Rubik-SemiBold',
    color: '#1e1e1e',
  },
  icon: {
    width: 20,
    height: 20,
  },
});

export default AnimatedIconButton;
