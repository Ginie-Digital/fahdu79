// AnimatedNumber.js

import React, {useEffect, useRef, useState} from 'react';
import {Animated, Text, TouchableWithoutFeedback, StyleSheet} from 'react-native';

const AnimatedNumber = ({target = 100, duration = 1500, style}) => {
  // Create an animated value starting at 0
  const animatedValue = useRef(new Animated.Value(0)).current;
  const [displayValue, setDisplayValue] = useState(0);

  // Function to trigger the animation from 0 to the target value
  const animateNumber = () => {
    // Reset the animated value to 0
    animatedValue.setValue(0);
    Animated.timing(animatedValue, {
      toValue: target,
      duration: duration,
      useNativeDriver: false, // we animate a number value so native driver is not used
    }).start();
  };

  useEffect(() => {
    // Attach a listener to update the state value based on the animated value
    const listenerId = animatedValue.addListener(({value}) => {
      setDisplayValue(Math.floor(value)); // you can round, floor, or format as needed
    });

    // Start the animation when the component is rendered
    animateNumber();

    // Clean up the listener on unmount
    return () => {
      animatedValue.removeListener(listenerId);
    };
  }, [target, duration, animatedValue]);

  return (
    // Wrap in TouchableWithoutFeedback to allow tap-to-restart (simulating focus)
    <TouchableWithoutFeedback onPress={animateNumber}>
      <Text style={[styles.numberText, style]}>{Number(displayValue).toLocaleString('en-IN')}</Text>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  numberText: {
    fontFamily: 'Rubik-Bold', // Replace with your custom font if needed
    fontSize: 32,
    color: '#282828',
  },
});

export default AnimatedNumber;