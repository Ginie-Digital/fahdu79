import React, { useEffect, useRef } from 'react';
import { View, Text, Image, Pressable, StyleSheet, Animated, Easing } from 'react-native';
import { useAppTheme } from '../Hook/useAppTheme';

const LiveUserAvatar = ({ username, avatarUrl, onPress }) => {
    const rotateAnim = useRef(new Animated.Value(0)).current;
    const { colors, isDark } = useAppTheme();

    useEffect(() => {
        const rotation = Animated.loop(
            Animated.timing(rotateAnim, {
                toValue: 1,
                duration: 6000,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        );

        rotation.start();

        return () => rotation.stop();
    }, [rotateAnim]);

    const rotate = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    return (
        <Pressable
            style={({ pressed }) => [styles.container, { transform: [{ scale: pressed ? 0.95 : 1 }] }]}
            onPress={onPress}
        >
            <View style={styles.avatarContainer}>
                {/* Rotating dashed border */}
                <Animated.View style={[styles.rotatingBorder, { transform: [{ rotate }] }]} />

                {/* Fixed avatar image */}
                <View style={[styles.avatarWrapper, { backgroundColor: colors.card }]}>
                    <Image
                        source={{ uri: avatarUrl || 'https://via.placeholder.com/64' }}
                        style={styles.avatar}
                    />
                </View>

                <View style={[styles.liveBadge, { backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF' }]}>
                    <Text style={[styles.liveBadgeText, { color: isDark ? '#FFFFFF' : '#FF7819' }]}>Live</Text>
                </View>
            </View>
            <Text style={[styles.username, { color: colors.text }]} numberOfLines={1}>
                {username}
            </Text>
        </Pressable>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        marginRight: 16,
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: 6,
        width: 77,
        height: 77,
        justifyContent: 'center',
        alignItems: 'center',
    },
    rotatingBorder: {
        position: 'absolute',
        width: 77,
        height: 77,
        borderRadius: 80,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        borderColor: '#FFA86B',
    },
    avatarWrapper: {
        width: 65,
        height: 65,
        borderRadius: 80,
        overflow: 'hidden',
    },
    avatar: {
        width: '100%',
        height: '100%',
        borderRadius: 80,
    },
    liveBadge: {
        position: 'absolute',
        bottom: -4,
        left: '50%',
        transform: [{ translateX: -26 }],
        width: 52,
        height: 20,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#FFA86B',
    },
    liveBadgeText: {
        fontSize: 10,
        fontFamily: 'Rubik-Medium',
    },
    username: {
        fontSize: 12,
        fontFamily: 'Rubik-Medium',
        maxWidth: 70,
        textAlign: 'center',
        marginTop: 4
    },
});

export default LiveUserAvatar;
