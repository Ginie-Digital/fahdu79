import React, { useEffect } from "react";
import { Text, StyleSheet, Dimensions } from "react-native";
import MaskedView from "@react-native-masked-view/masked-view";
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

const { width } = Dimensions.get("window");

export default function ShimmerText({ children, style }) {
  const translateX = useSharedValue(-width);

  useEffect(() => {
    translateX.value = withRepeat(
      withTiming(width, { duration: 1500 }),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <MaskedView
      maskElement={<Text style={[styles.text, style]}>{children}</Text>}
    >
      <Text style={[styles.text, style, { opacity: 0.3 }]}>{children}</Text>
      <Animated.View style={[StyleSheet.absoluteFill, animatedStyle]}>
        <LinearGradient
          colors={["transparent", "white", "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </MaskedView>
  );
}

const styles = StyleSheet.create({
  text: {
    fontSize: 16,
    color: "#1e1e1e",
    fontFamily : 'Rubik-SemiBold'
  },
});
