import React from 'react';
import { View, Text, Image, StyleSheet, Pressable, Platform } from 'react-native';

const LiveBanner = ({ username, avatarUrl, onJoin, userDetails }) => {
    return (
        <Pressable
            onPress={onJoin}
            style={({ pressed }) => [styles.container, { transform: [{ scale: pressed ? 0.98 : 1 }] }]}
        >
            <View style={styles.leftSection}>
                <Image
                    source={{ uri: avatarUrl || 'https://via.placeholder.com/48' }}
                    style={styles.avatar}
                />
                <View>
                    <Text style={styles.username}>{username}</Text>
                    <Text style={styles.subtitle}>is Live Now</Text>
                </View>
            </View>

            <Pressable
                onPress={onJoin}
                style={({ pressed }) => [styles.joinButton, pressed && { opacity: 0.8 }]}
            >
                <Text style={styles.joinText}>Join Now</Text>
            </Pressable>
        </Pressable>
    );
};

const styles = StyleSheet.create({
    container: {
        marginHorizontal: 16,
        marginBottom: 16,
        marginTop: 8,
        paddingVertical: 10,
        paddingHorizontal: 9,
        borderRadius: 16,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        borderColor: '#FFA86B',
        backgroundColor: '#1C1C1C',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 60,
    },
    leftSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#212121',
    },
    username: {
        fontSize: 16,
        color: '#FFFFFF',
        fontFamily: 'Rubik-Bold',
        lineHeight: 16,
    },
    subtitle: {
        fontSize: 12,
        color: '#FFFFFF',
        fontFamily: 'Rubik-Medium',
        lineHeight: 12,
        marginTop: 6,
    },
    joinButton: {
        width: 80,
        height: 34,
        backgroundColor: '#FFA86B',
        borderColor: '#FF7819',
        borderWidth: 1.5,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    joinText: {
        fontFamily: 'Rubik-Bold',
        fontSize: 12,
        color: '#000000',
        includeFontPadding: false,
        textAlignVertical: 'center',
        paddingBottom: Platform.OS === 'android' ? 2 : 1.5,
    },
});

export default LiveBanner;