import React from 'react';
import { View, Text, Image, StyleSheet, Pressable } from 'react-native';
import { responsiveWidth, responsiveFontSize } from 'react-native-responsive-dimensions';
import AnimatedButton from '../Components/AnimatedButton';

const LiveBanner = ({ username, avatarUrl, onJoin, userDetails }) => {

    console.log('🎬 LiveBanner Props:', { username, avatarUrl });


    console.log('🎬 LiveBanner Props:', { userDetails });

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

            <View style={styles.joinButtonContainer}>
                <AnimatedButton
                    title={'Join Now'}
                    onPress={onJoin}
                    showOverlay={false}
                    buttonMargin={0}
                    style={styles.animatedButtonStyle}
                    disableAnimation={true}
                />
            </View>

        </Pressable>
    );
};

const styles = StyleSheet.create({
    container: {
        marginHorizontal: 16,
        marginBottom: 16,
        marginTop: 8,
        padding: 12,
        borderRadius: 16,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        borderColor: '#1e1e1e',
        backgroundColor: '#FFFFFF',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12
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
        borderColor: '#1e1e1e',
    },
    username: {
        fontSize: 16,
        color: "#1e1e1e",
        fontFamily: 'Rubik-Bold'
    },
    subtitle: {
        fontSize: 12,
        color: '#1e1e1e',
        fontFamily: 'Rubik-Medium',
        lineHeight: 14
    },
    joinButtonContainer: {
        width: responsiveWidth(25),
        height: 45,
        justifyContent: 'center',
    },
    animatedButtonStyle: {
        height: 40,
        borderColor: '#1e1e1e',
        marginTop: 11,
        borderWidth: 1.5
    },

});

export default LiveBanner;