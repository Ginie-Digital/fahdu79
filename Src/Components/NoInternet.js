import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated, Easing, TouchableOpacity } from 'react-native';
import LottieView from 'lottie-react-native';

const { width } = Dimensions.get('window');

const NoInternet = () => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Fade in gracefully
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const handleRetry = () => {
    // Interactive bouncy feedback for the button
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.92,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <LottieView
        source={require('../../Assets/Animation/no_internet.json')}
        autoPlay
        loop
        style={styles.lottie}
      />
      
      <Text style={styles.title}>You are offline</Text>
      <Text style={styles.subtitle}>
        It seems there is a problem with your connection. Please check your network status.
      </Text>

      <TouchableOpacity activeOpacity={0.9} onPress={handleRetry}>
        <Animated.View style={[styles.button, { transform: [{ scale: scaleAnim }] }]}>
          <Text style={styles.buttonText}>Try Again</Text>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FCFCFC',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 99999, // Ensure it's the uppermost overlay
    padding: 24,
  },
  lottie: {
    width: width * 0.8,
    height: width * 0.8,
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontFamily: 'Rubik-Bold',
    color: '#1A1A1A',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Rubik-Medium',
    color: '#707070',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 44,
    paddingHorizontal: 20,
  },
  button: {
    backgroundColor: '#1A1A1A',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 30,
  },
  buttonText: {
    color: '#FFFFFF',
    fontFamily: 'Rubik-Medium',
    fontSize: 16,
    letterSpacing: 0.5,
  },
});

export default NoInternet;
