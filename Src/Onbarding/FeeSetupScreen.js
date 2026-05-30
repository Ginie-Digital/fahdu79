import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    StatusBar,
    Platform,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Image } from 'expo-image';
import { useSelector } from 'react-redux';
import {
    useUpdateFeeSetupMutation,
    useUploadAttachmentMutation,
    useLazyGetFeeSetupDetailsQuery
} from '../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
import { autoLogout } from '../../AutoLogout';
import { reduceImageSize } from '../../FFMPeg/FFMPegModule';
import { chatRoomSuccess, LoginPageErrors } from '../Components/ErrorSnacks';
import { CustomHeader } from './CustomHeader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AnimatedButton from '../Components/AnimatedButton';
import { useNavigation, useRoute } from '@react-navigation/native';
import Loader from '../Components/Loader';

const FeeSetupScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const insets = useSafeAreaInsets();
    const token = useSelector(state => state.auth.user.token);
    const chatInputRef = useRef(null);

    // Get data from previous screens
    const subscriptionData = route.params?.subscriptionData || null;
    const autoMessageData = route.params?.autoMessageData || null;

    // Fee States
    const [chatFee, setChatFee] = useState('4');
    const [videoFee, setVideoFee] = useState('20');
    const [audioFee, setAudioFee] = useState('10');
    const [streamFee, setStreamFee] = useState('4');
    const [focusedCard, setFocusedCard] = useState('chat');

    const [loading, setLoading] = useState(false);
    const [pageLoading, setPageLoading] = useState(true);
    const [updateFeeSetup] = useUpdateFeeSetupMutation();
    const [uploadAttachment] = useUploadAttachmentMutation();
    const [getFeeSetupDetails] = useLazyGetFeeSetupDetailsQuery();

    // Fetch existing fee data from server
    useEffect(() => {
        const fetchFeeData = async () => {
            try {
                const { data, error } = await getFeeSetupDetails({ token });

                if (error) {
                    if (error?.status === 'FETCH_ERROR') {
                        LoginPageErrors('Please check your network');
                    }
                    if (error?.data?.status_code === 2044) {
                        autoLogout();
                    }
                }

                if (data?.data) {
                    // Set chat fee
                    if (data.data.chatFee?.followers?.amount) {
                        setChatFee(String(data.data.chatFee.followers.amount));
                    }

                    // Set video call fee
                    if (data.data.VideoFee?.followAmount) {
                        setVideoFee(String(data.data.VideoFee.followAmount));
                    }

                    // Set audio call fee
                    if (data.data.AudioFee?.followAmount) {
                        setAudioFee(String(data.data.AudioFee.followAmount));
                    }

                    // Set livestream fee
                    if (data.data.StreamFee?.followAmount) {
                        setStreamFee(String(data.data.StreamFee.followAmount));
                    }

                    console.log('Loaded fee data from server:', data.data);
                }
            } catch (err) {
                console.log('Error fetching fee data:', err);
            } finally {
                setPageLoading(false);
            }
        };

        fetchFeeData();
    }, [token]);

    // Auto-focus first input after page loads
    useEffect(() => {
        if (!pageLoading) {
            setTimeout(() => {
                chatInputRef.current?.focus();
            }, 500);
        }
    }, [pageLoading]);

    // Calculate subscriber fee (50% off)
    const getSubscriberFee = (fee) => {
        const num = parseInt(fee) || 0;
        return Math.floor(num / 2);
    };

    // Debounce timers for each fee type
    const debounceTimers = useRef({
        chat: null,
        video: null,
        audio: null,
        stream: null,
    });

    // Handle fee input with debounce - round to even after user stops typing
    const handleFeeChangeWithDebounce = (value, setter, feeType) => {
        const sanitized = value.replace(/[^0-9]/g, '');
        setter(sanitized);

        // Clear existing timer for this fee type
        if (debounceTimers.current[feeType]) {
            clearTimeout(debounceTimers.current[feeType]);
        }

        // Set new timer - after 500ms of no typing, round to even
        if (sanitized !== '') {
            debounceTimers.current[feeType] = setTimeout(() => {
                const num = parseInt(sanitized, 10);
                if (num % 2 !== 0) {
                    setter(String(num + 1));
                }
            }, 500);
        }
    };

    const handleReview = () => {
        // Prepare fee setup data
        const feeData = {
            chat: { follower: parseInt(chatFee), subscriber: getSubscriberFee(chatFee) },
            video: { follower: parseInt(videoFee), subscriber: getSubscriberFee(videoFee) },
            audio: { follower: parseInt(audioFee), subscriber: getSubscriberFee(audioFee) },
            stream: { follower: parseInt(streamFee), subscriber: getSubscriberFee(streamFee) },
        };

        // Pass all data to AllSetScreen for final review and API call
        navigation.navigate('AllSetScreen', {
            subscriptionData,
            autoMessageData,
            feeData,
        });
    };

    if (pageLoading) {
        return <Loader />;
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
            <View style={{ backgroundColor: '#FFF', paddingTop: insets.top + 20 }}>
                <CustomHeader currentStep={4} totalSteps={5} />
            </View>

            <KeyboardAwareScrollView
                style={styles.content}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 40 }}
                keyboardShouldPersistTaps="handled"
                enableOnAndroid={true}
                extraScrollHeight={Platform.OS === 'ios' ? 120 : 80}
                enableAutomaticScroll={true}
            >
                <Text style={styles.title}>Fee Setup</Text>
                <Text style={styles.subtitle}>Set your rates for different services</Text>

                {/* Subscriber Benefit Info */}
                <View style={styles.infoCard}>
                    {/* <View style={styles.infoIconContainer}>
                        <Image
                            source={require('../../Assets/Images/OnboardingIcon/welcome/i.png')}
                            style={styles.infoIconImage}
                            contentFit="contain"
                        />
                    </View> */}
                    <View style={styles.infoContent}>
                        <Text style={styles.infoTitle}>Good to Know</Text>
                        <View style={styles.bulletRow}>
                            <View style={styles.bulletDot} />
                            <Text style={styles.infoSubtitle}>
                                Members get <Text style={styles.boldText}>50% off</Text> on all services
                            </Text>
                        </View>
                        <View style={styles.bulletRow}>
                            <View style={styles.bulletDot} />
                            <Text style={styles.infoSubtitle}>
                                Follower fees are auto-adjusted to <Text style={styles.boldText}>even numbers</Text>
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Set Chat Fee */}
                <View style={[styles.feeCard, focusedCard === 'chat' && styles.feeCardFocused]}>
                    <Text style={styles.feeCardTitle}>Set Chat Fee</Text>
                    <Text style={styles.feeCardSubtitle}>Chat per Message</Text>

                    <View style={styles.inputRow}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Follower Fee (₹)</Text>
                            <View style={styles.inputContainer}>
                                <TextInput
                                    ref={chatInputRef}
                                    style={styles.input}
                                    value={chatFee}
                                    onChangeText={(text) => handleFeeChangeWithDebounce(text, setChatFee, 'chat')}
                                    keyboardType="numeric"
                                    maxLength={6}
                                    onFocus={() => setFocusedCard('chat')}
                                    onBlur={() => setFocusedCard(null)}
                                />
                                <Image
                                    source={require('../../Assets/Images/Coins2.png')}
                                    style={styles.coinIcon}
                                    contentFit="contain"
                                />
                            </View>
                        </View>
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Subscriber Fee (₹)</Text>
                            <View style={[styles.inputContainer, styles.inputContainerDisabled]}>
                                <Text style={styles.inputDisabled}>{getSubscriberFee(chatFee)}</Text>
                                <Image
                                    source={require('../../Assets/Images/Coins2.png')}
                                    style={styles.coinIcon}
                                    contentFit="contain"
                                />
                            </View>
                        </View>
                    </View>
                </View>

                {/* Set Video Call Fee */}
                <View style={[styles.feeCard, focusedCard === 'video' && styles.feeCardFocused]}>
                    <Text style={styles.feeCardTitle}>Set Video Call Fee</Text>
                    <Text style={styles.feeCardSubtitle}>Call per Minute</Text>

                    <View style={styles.inputRow}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Follower Fee (₹)</Text>
                            <View style={styles.inputContainer}>
                                <TextInput
                                    style={styles.input}
                                    value={videoFee}
                                    onChangeText={(text) => handleFeeChangeWithDebounce(text, setVideoFee, 'video')}
                                    keyboardType="numeric"
                                    maxLength={6}
                                    onFocus={() => setFocusedCard('video')}
                                    onBlur={() => setFocusedCard(null)}
                                />
                                <Image
                                    source={require('../../Assets/Images/Coins2.png')}
                                    style={styles.coinIcon}
                                    contentFit="contain"
                                />
                            </View>
                        </View>
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Subscriber Fee (₹)</Text>
                            <View style={[styles.inputContainer, styles.inputContainerDisabled]}>
                                <Text style={styles.inputDisabled}>{getSubscriberFee(videoFee)}</Text>
                                <Image
                                    source={require('../../Assets/Images/Coins2.png')}
                                    style={styles.coinIcon}
                                    contentFit="contain"
                                />
                            </View>
                        </View>
                    </View>
                </View>

                {/* Set Audio Call Fee */}
                <View style={[styles.feeCard, focusedCard === 'audio' && styles.feeCardFocused]}>
                    <Text style={styles.feeCardTitle}>Set Audio Call Fee</Text>
                    <Text style={styles.feeCardSubtitle}>Call per Minute</Text>

                    <View style={styles.inputRow}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Follower Fee (₹)</Text>
                            <View style={styles.inputContainer}>
                                <TextInput
                                    style={styles.input}
                                    value={audioFee}
                                    onChangeText={(text) => handleFeeChangeWithDebounce(text, setAudioFee, 'audio')}
                                    keyboardType="numeric"
                                    maxLength={6}
                                    onFocus={() => setFocusedCard('audio')}
                                    onBlur={() => setFocusedCard(null)}
                                />
                                <Image
                                    source={require('../../Assets/Images/Coins2.png')}
                                    style={styles.coinIcon}
                                    contentFit="contain"
                                />
                            </View>
                        </View>
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Subscriber Fee (₹)</Text>
                            <View style={[styles.inputContainer, styles.inputContainerDisabled]}>
                                <Text style={styles.inputDisabled}>{getSubscriberFee(audioFee)}</Text>
                                <Image
                                    source={require('../../Assets/Images/Coins2.png')}
                                    style={styles.coinIcon}
                                    contentFit="contain"
                                />
                            </View>
                        </View>
                    </View>
                </View>

                {/* Set LiveStream Fee */}
                <View style={[styles.feeCard, focusedCard === 'stream' && styles.feeCardFocused]}>
                    <Text style={styles.feeCardTitle}>Set LiveStream Fee</Text>
                    <Text style={styles.feeCardSubtitle}>Stream per Minute</Text>

                    <View style={styles.inputRow}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Follower Fee (₹)</Text>
                            <View style={styles.inputContainer}>
                                <TextInput
                                    style={styles.input}
                                    value={streamFee}
                                    onChangeText={(text) => handleFeeChangeWithDebounce(text, setStreamFee, 'stream')}
                                    keyboardType="numeric"
                                    maxLength={6}
                                    onFocus={() => setFocusedCard('stream')}
                                    onBlur={() => setFocusedCard(null)}
                                />
                                <Image
                                    source={require('../../Assets/Images/Coins2.png')}
                                    style={styles.coinIcon}
                                    contentFit="contain"
                                />
                            </View>
                        </View>
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Subscriber Fee (₹)</Text>
                            <View style={[styles.inputContainer, styles.inputContainerDisabled]}>
                                <Text style={styles.inputDisabled}>{getSubscriberFee(streamFee)}</Text>
                                <Image
                                    source={require('../../Assets/Images/Coins2.png')}
                                    style={styles.coinIcon}
                                    contentFit="contain"
                                />
                            </View>
                        </View>
                    </View>
                </View>

                {/* Navigation Buttons */}
                <View style={styles.navigationButtons}>
                    <View style={styles.buttonWrapper}>
                        <AnimatedButton
                            title="< Back"
                            onPress={() => navigation.goBack()}
                            showOverlay={false}
                            buttonMargin={0}
                            style={{ backgroundColor: '#FFF' }}
                        />
                    </View>
                    <View style={styles.buttonWrapper}>
                        <AnimatedButton
                            title={loading ? 'Saving...' : 'Review >'}
                            onPress={handleReview}
                            showOverlay={false}
                            buttonMargin={0}
                            disabled={loading}
                        />
                    </View>
                </View>
            </KeyboardAwareScrollView>
        </View>
    );
};

export default FeeSetupScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFF9F5',
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
    },
    title: {
        fontSize: 28,
        fontFamily: 'Rubik-Bold',
        color: '#1E1E1E',
        // marginBottom: 10,
        marginTop: 30,
    },
    subtitle: {
        fontSize: 14,
        fontFamily: 'Rubik-Regular',
        color: '#1E1E1E',
        marginBottom: 24,
    },
    infoCard: {
        flexDirection: 'row',
        backgroundColor: '#FFF3EB',
        borderRadius: 20,
        padding: 24,
        marginBottom: 24,
        borderWidth: 2,
        borderColor: '#FFA86B',
        alignItems: 'center',
    },
    infoIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#FFF',
        borderWidth: 1,
        borderColor: '#FFE7D6',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    infoIconImage: {
        width: 16,
        height: 16,
    },
    infoContent: {
        flex: 1,
    },
    infoTitle: {
        fontSize: 16,
        fontFamily: 'Rubik-SemiBold',
        color: '#1E1E1E',
        marginBottom: 4,
    },
    infoSubtitle: {
        fontSize: 12,
        fontFamily: 'Rubik-Regular',
        color: '#666',
        flex: 1,
    },
    bulletRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginTop: 4,
    },
    bulletDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#1E1E1E',
        marginTop: 5,
        marginRight: 8,
    },
    boldText: {
        fontFamily: 'Rubik-Bold',
        color: '#1E1E1E',
    },
    feeCard: {
        borderWidth: 2,
        borderColor: '#1E1E1E',
        borderRadius: 20,
        padding: 16,
        marginBottom: 24,
        backgroundColor: '#FFF',
    },
    feeCardFocused: {
        borderColor: '#FFA86B',
        borderStyle: 'dashed',
    },
    feeCardTitle: {
        fontSize: 16,
        fontFamily: 'Rubik-SemiBold',
        color: '#1E1E1E',
        marginBottom: 4,
    },
    feeCardSubtitle: {
        fontSize: 12,
        fontFamily: 'Rubik-Medium',
        color: '#666',
        marginBottom: 16,
    },
    inputRow: {
        flexDirection: 'row',
        gap: 12,
    },
    inputGroup: {
        flex: 1,
    },
    inputLabel: {
        fontSize: 12,
        fontFamily: 'Rubik-Medium',
        color: '#1E1E1E',
        marginBottom: 8,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#1E1E1E',
        borderRadius: 10,
        paddingHorizontal: 12,
        backgroundColor: '#FFF',
        height: 44,
    },
    inputContainerDisabled: {
        backgroundColor: '#FFF9F5',
        borderWidth: 1.5,
        borderColor: '#FFE0CC',
    },
    input: {
        flex: 1,
        fontSize: 14,
        fontFamily: 'Rubik-SemiBold',
        color: '#1E1E1E',
    },
    inputDisabled: {
        flex: 1,
        fontSize: 14,
        fontFamily: 'Rubik-SemiBold',
        color: '#1E1E1E',
    },
    coinIcon: {
        width: 20,
        height: 20,
    },
    navigationButtons: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 10,
        marginBottom: 30,
    },
    buttonWrapper: {
        flex: 1,
    },
});