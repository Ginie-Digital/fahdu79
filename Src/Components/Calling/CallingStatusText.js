import React, { useState, useEffect, useRef } from 'react';
import { Text, Animated, StyleSheet, View, Dimensions, Platform } from 'react-native';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const responsiveHeight = (h) => SCREEN_H * (h / 100);
const responsiveFontSize = (f) => SCREEN_W * (f / 100);

const CallingStatusText = ({ username = 'User' }) => {
  const [messageIndex, setMessageIndex] = useState(0);
  const [activeDotCount, setActiveDotCount] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const messages = [
    `Calling ${username}...`,
    `Notifying ${username} now...`,
    `Waiting for ${username} to join...`,
    `Giving ${username} a moment...`,
    `Still reaching out to ${username}...`,
    `Last attempt for ${username}...`,
  ];

  // Message rotation logic
  useEffect(() => {
    const intervalId = setInterval(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        setMessageIndex(prevIndex => (prevIndex + 1) % messages.length);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start();
      });
    }, 5000);

    return () => clearInterval(intervalId);
  }, [fadeAnim, messages.length]);

  // Dots animation logic (0 -> 1 -> 2 -> 3 -> 0) every 2 seconds
  useEffect(() => {
    let count = 0;
    const dotsInterval = setInterval(() => {
      count = (count + 1) % 4; // 0, 1, 2, 3
      setActiveDotCount(count);
    }, 500); // 4 steps in 2 seconds = 500ms per step

    return () => clearInterval(dotsInterval);
  }, []);

  const renderDots = () => {
    return (
      <View style={styles.dotsContainer}>
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor: i < activeDotCount ? '#ffc399' : 'transparent',
              },
            ]}
          />
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Animated Dots above message */}
      {renderDots()}
      
      <Animated.Text style={[styles.ringingText, { opacity: fadeAnim }]}>
        {messages[messageIndex]}
      </Animated.Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: responsiveHeight(1),
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 8,
    height: responsiveFontSize(3), // Match previous height for stability
    alignItems: 'center',
    marginBottom: 4,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#1e1e1e',
  },
  ringingText: {
    marginTop: 4,
    fontSize: Platform.OS === 'ios' ? responsiveFontSize(4.6) : responsiveFontSize(3.2),
    color: '#A0A0A0',
    fontFamily: 'Rubik-Regular',
    textAlign: 'center',
  },
});

export default CallingStatusText;
