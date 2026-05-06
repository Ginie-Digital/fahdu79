import React, { useEffect } from "react";
import { Text, ActivityIndicator, View, StyleSheet } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withRepeat, Easing } from "react-native-reanimated";

const SmoothLoader = ({ loading, title, textStyle: customTextStyle }) => {
  const opacityText = useSharedValue(loading ? 0 : 1);
  const opacityLoader = useSharedValue(loading ? 1 : 0);
  const rotateValue = useSharedValue(0);

  useEffect(() => {
    // Smooth fade transition between text and loader
    opacityText.value = withTiming(loading ? 0 : 1, { duration: 300 });
    opacityLoader.value = withTiming(loading ? 1 : 0, { duration: 300 });

    // Start fast rotation animation when loading
    if (loading) {
      rotateValue.value = withRepeat(
        withTiming(360, { duration: 500, easing: Easing.linear }), // Faster spin (500ms per full rotation)
        -1, // Infinite loop
        false
      );
    } else {
      rotateValue.value = 0; // Reset rotation when not loading
    }
  }, [loading]);

  const textStyle = useAnimatedStyle(() => ({
    opacity: opacityText.value,
  }));

  const loaderStyle = useAnimatedStyle(() => {
    return {
      opacity: opacityLoader.value,
      transform: [{ rotate: `${rotateValue.value}deg` }],
    };
  });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.absoluteCenter, textStyle]}>
        <Text style={[styles.text, customTextStyle]}>{title}</Text>
      </Animated.View>
      <Animated.View style={[styles.absoluteCenter, loaderStyle]}>
        <ActivityIndicator size="small" color="#282828" />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    height: "100%",
    position: "relative",
  },
  absoluteCenter: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
  text: {
    fontSize: 16,
    fontFamily : 'Rubik-SemiBold',
    color: "#1e1e1e",
  },
});

export default SmoothLoader;
