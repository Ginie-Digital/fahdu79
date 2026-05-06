import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';

const PulseDot = ({ size = 8, color = '#FF3B30' }) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const opacityAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        const pulse = Animated.loop(
            Animated.parallel([
                Animated.sequence([
                    Animated.timing(scaleAnim, {
                        toValue: 1.5,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                    Animated.timing(scaleAnim, {
                        toValue: 1,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                ]),
                Animated.sequence([
                    Animated.timing(opacityAnim, {
                        toValue: 0.5,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                    Animated.timing(opacityAnim, {
                        toValue: 1,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                ]),
            ])
        );

        pulse.start();

        return () => pulse.stop();
    }, [scaleAnim, opacityAnim]);

    return (
        <View style={styles.container}>
            {/* Pulse ring */}
            <Animated.View
                style={[
                    styles.pulseRing,
                    {
                        width: size * 2,
                        height: size * 2,
                        borderRadius: size,
                        backgroundColor: color,
                        transform: [{ scale: scaleAnim }],
                        opacity: opacityAnim,
                    },
                ]}
            />
            {/* Solid dot */}
            <View
                style={[
                    styles.dot,
                    {
                        width: size,
                        height: size,
                        borderRadius: size / 2,
                        backgroundColor: color,
                    },
                ]}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    pulseRing: {
        position: 'absolute',
    },
    dot: {
        zIndex: 1,
    },
});

export default PulseDot;
