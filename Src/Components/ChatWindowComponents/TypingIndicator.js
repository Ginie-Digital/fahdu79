import React, {useEffect, useRef} from 'react';
import {View, Text, StyleSheet, Animated, Platform} from 'react-native';
import {responsiveFontSize, responsiveHeight, responsiveWidth} from 'react-native-responsive-dimensions';

const TypingIndicator = ({visible}) => {
  const dot1Opacity = useRef(new Animated.Value(0.3)).current;
  const dot2Opacity = useRef(new Animated.Value(0.3)).current;
  const dot3Opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    if (visible) {
      const animateDot = (dotOpacity, delay) => {
        return Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(dotOpacity, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(dotOpacity, {
              toValue: 0.3,
              duration: 400,
              useNativeDriver: true,
            }),
          ]),
        );
      };

      const animation1 = animateDot(dot1Opacity, 0);
      const animation2 = animateDot(dot2Opacity, 200);
      const animation3 = animateDot(dot3Opacity, 400);

      animation1.start();
      animation2.start();
      animation3.start();

      return () => {
        animation1.stop();
        animation2.stop();
        animation3.stop();
      };
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={styles.container}>
      <View style={styles.bubble}>
        <Text style={styles.typingText}>typing</Text>
        <View style={styles.dotsContainer}>
          <Animated.View style={[styles.dot, {backgroundColor: '#FF8C3D', opacity: dot1Opacity}]} />
          <Animated.View style={[styles.dot, {backgroundColor: '#FFA86B', opacity: dot2Opacity}]} />
          <Animated.View style={[styles.dot, {backgroundColor: '#FFD4B3', opacity: dot3Opacity}]} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: responsiveWidth(4),
    paddingVertical: responsiveHeight(1),
    marginBottom: responsiveHeight(0.5),
    borderColor: '#1e1e1e',
  },
  bubble: {
    backgroundColor: '#FFEBD9',
    borderRadius: 18,
    paddingHorizontal: responsiveWidth(3.5),
    paddingVertical: responsiveHeight(1.2),
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#FFA86B',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  typingText: {
    fontSize: responsiveFontSize(1.6), // Ideal size
    color: '#FF8C3D',
    fontStyle: 'italic',
    fontFamily: 'Rubik-Regular', // Use Regular
    marginRight: responsiveWidth(1.5),
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Platform.OS === 'android' ? responsiveWidth(1) : responsiveWidth(1),
  },
  dot: {
    width: responsiveWidth(1.5),
    height: responsiveWidth(1.5),
    borderRadius: responsiveWidth(0.75),
    marginHorizontal: responsiveWidth(0.5),
  },
});

export default TypingIndicator;
