import React from 'react';
import { View, Text, StyleSheet, Pressable, Modal, Platform, Share } from 'react-native';
import { Image } from 'expo-image';
import { responsiveFontSize, responsiveWidth } from 'react-native-responsive-dimensions';
import { BlurView } from 'expo-blur';
import { navigate } from '../../Navigation/RootNavigation';
import { useDispatch, useSelector } from 'react-redux';
import { toggleSetupCompleteModal, toggleShowOnboarding } from '../../Redux/Slices/NormalSlices/HideShowSlice';
import { chatRoomSuccess } from '../Components/ErrorSnacks';
import Ionicons from 'react-native-vector-icons/Ionicons';

const SetupCompleteModal = () => {
    const visible = useSelector(state => state.hideShow.visibility.setupCompleteModal);
    const userId = useSelector(state => state.auth.user.currentUserId);
    const displayName = useSelector(state => state.auth.user.currentUserDisplayName);

    const dispatch = useDispatch();

    // Display link shown in UI
    const displayLink = `@${displayName || userId}`;
    // Full URL for sharing
    const shareLink = `https://web.fahdu.com/${displayName || userId}`;

    const handleShareLink = async () => {
        try {
            await Share.share({
                message: shareLink,
            });
        } catch (error) {
            console.log('Error sharing:', error);
        }
    };



    const handleGoToHomepage = () => {
        dispatch(toggleShowOnboarding({ show: false }));
        dispatch(toggleSetupCompleteModal({ show: false }));
        navigate('chatRoomTab');
    };

    if (!visible) return null;

    return (
        <View style={styles.overlay}>
            {Platform.OS === 'ios' ? (
                <BlurView intensity={15} style={styles.blurBackground} />
            ) : (
                <View style={styles.darkBackground} />
            )}
            <View style={styles.dialog}>
                <View style={styles.content}>
                    <Image
                        source={require('../../Assets/Images/OnboardingIcon/welcome/allSet.png')}
                        style={styles.iconImage}
                        contentFit="contain"
                    />

                    <Text style={styles.title}>Setup Complete!</Text>

                    <Text style={styles.subtitle}>
                        Copy your profile link and share on your social media
                    </Text>

                    <View style={styles.linkContainer}>
                        <Image
                            source={require('../../Assets/Images/OnboardingIcon/welcome/fahduicon.png')}
                            style={styles.fahduIcon}
                            contentFit="contain"
                        />
                        <Text style={styles.linkText} numberOfLines={1}>
                            {displayLink}
                        </Text>
                    </View>

                    <View style={styles.buttonContainer}>
                        <Pressable
                            onPress={handleShareLink}
                            style={({ pressed }) => [
                                styles.button,
                                styles.copyButton,
                                pressed && { backgroundColor: '#FFC399' }
                            ]}
                        >
                            <Ionicons name="share-social-outline" size={20} color="#1e1e1e" />
                            <Text style={styles.buttonText}>Share Profile Link</Text>
                        </Pressable>

                        <Pressable
                            onPress={handleGoToHomepage}
                            style={({ pressed }) => [
                                styles.button,
                                styles.homepageButton,
                                pressed && { backgroundColor: '#F5F5F5' }
                            ]}
                        >
                            <Text style={styles.buttonTextDark}>Go to Homepage</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    blurBackground: {
        ...StyleSheet.absoluteFillObject,
    },
    darkBackground: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    dialog: {
        borderRadius: responsiveWidth(5.33),
        borderWidth: 2,
        borderStyle: 'dashed',
        padding: 24,
        backgroundColor: '#fff',
        width: responsiveWidth(88),
        borderColor: '#1e1e1e',
    },
    content: {
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
    },
    iconImage: {
        width: 45,
        height: 45,
        marginBottom: 16,
    },
    title: {
        fontFamily: 'Rubik-SemiBold',
        fontSize: 20,
        color: '#1e1e1e',
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontFamily: 'Rubik-Regular',
        fontSize: 14,
        color: '#1e1e1e',
        textAlign: 'center',
        marginBottom: 20,
        lineHeight: 20,
    },
    linkContainer: {
        width: '100%',
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: '#1e1e1e',
        borderStyle: 'dashed',
        paddingVertical: 16,
        paddingHorizontal: 16,
        marginBottom: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    fahduIcon: {
        width: 20,
        height: 20,
    },
    linkText: {
        fontFamily: 'Rubik-Medium',
        fontSize: responsiveFontSize(1.6),
        color: '#1e1e1e',
        textAlign: 'center',
    },
    buttonContainer: {
        width: '100%',
        gap: 12,
    },
    button: {
        width: '100%',
        height: 52,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: '#1E1E1E',
        flexDirection: 'row',
        gap: 8,
    },
    copyButton: {
        backgroundColor: '#FFA86B',
    },
    homepageButton: {
        backgroundColor: '#fff',
    },
    copyIcon: {
        fontSize: 18,
    },
    buttonText: {
        fontFamily: 'Rubik-SemiBold',
        fontSize: responsiveFontSize(1.8),
        color: '#1e1e1e',
    },
    buttonTextDark: {
        fontFamily: 'Rubik-SemiBold',
        fontSize: responsiveFontSize(1.8),
        color: '#1e1e1e',
    },
});

export default SetupCompleteModal;