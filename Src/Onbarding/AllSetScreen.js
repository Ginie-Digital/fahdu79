import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    StatusBar,
    ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { CustomHeader } from './CustomHeader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AnimatedButton from '../Components/AnimatedButton';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { toggleSetupCompleteModal } from '../../Redux/Slices/NormalSlices/HideShowSlice';
import SetupCompleteModal from './SetupCompleteModal';
import {
    useAddPackageSubscriptionMutation,
    useUpdateFeeSetupMutation,
    useUploadAttachmentMutation,
    useToggleOnboardingMutation
} from '../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
import { LoginPageErrors, chatRoomSuccess } from '../Components/ErrorSnacks';
import { autoLogout } from '../../AutoLogout';
import { reduceImageSize } from '../../FFMPeg/FFMPegModule';

const AllSetScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const insets = useSafeAreaInsets();
    const dispatch = useDispatch();
    const token = useSelector(state => state.auth.user.token);
    const userId = useSelector(state => state.auth.user.currentUserId);

    // API hooks
    const [addPackageSubscription] = useAddPackageSubscriptionMutation();
    const [updateFeeSetup] = useUpdateFeeSetupMutation();
    const [uploadAttachment] = useUploadAttachmentMutation();
    const [toggleOnboarding] = useToggleOnboardingMutation();

    const [loading, setLoading] = useState(false);

    // Get all data from previous screens
    const subscriptionData = route.params?.subscriptionData || null;
    const autoMessageData = route.params?.autoMessageData || null;
    const feeData = route.params?.feeData || {
        chat: { follower: 99, subscriber: 2 },
        video: { follower: 4, subscriber: 2 },
        audio: { follower: 4, subscriber: 2 },
        stream: { follower: 4, subscriber: 2 },
    };

    // Helper function to upload images
    const uploadImage = async (imageData, keyName) => {
        if (!imageData) return null;

        try {
            const compressedImage = await reduceImageSize(imageData.uri);
            const formData = new FormData();
            formData.append('keyName', keyName);
            formData.append('file', {
                uri: compressedImage,
                type: imageData.type,
                name: imageData.name,
            });

            const response = await uploadAttachment({ token, formData });

            if (response?.data?.statusCode === 200) {
                return response.data.data.url;
            }
            return null;
        } catch (error) {
            console.log('Image upload error:', error);
            return null;
        }
    };

    const handleConfirm = async () => {
        try {
            setLoading(true);

            console.log('=== ONBOARDING API CALLS STARTED ===');
            console.log('Subscription Data:', JSON.stringify(subscriptionData, null, 2));
            console.log('Auto Message Data:', JSON.stringify(autoMessageData, null, 2));
            console.log('Fee Data:', JSON.stringify(feeData, null, 2));

            // Step 1: Upload images if they exist
            let followerImageUrl = null;
            let subscriberImageUrl = null;

            if (autoMessageData?.follower?.imageData) {
                console.log('Uploading follower image...');
                followerImageUrl = await uploadImage(autoMessageData.follower.imageData, 'feeSetup_image_android');
                console.log('Follower image URL:', followerImageUrl);
            }

            if (autoMessageData?.subscriber?.imageData) {
                console.log('Uploading subscriber image...');
                subscriberImageUrl = await uploadImage(autoMessageData.subscriber.imageData, 'feeSetup_image_android_sub');
                console.log('Subscriber image URL:', subscriberImageUrl);
            }

            // Step 2: Call Subscription Fee API
            if (subscriptionData?.plans) {
                const subscriptionPayload = {
                    subscriptions: subscriptionData.plans.map(plan => ({
                        code: plan.code,
                        amount: plan.amount,
                        discount: plan.discount || 0,
                        active: plan.active,
                    }))
                };
                console.log('=== SUBSCRIPTION API REQUEST ===');
                console.log('Payload:', JSON.stringify(subscriptionPayload, null, 2));

                const { data: subData, error: subError } = await addPackageSubscription({
                    token,
                    data: subscriptionPayload,
                });

                console.log('=== SUBSCRIPTION API RESPONSE ===');
                console.log('Data:', JSON.stringify(subData, null, 2));
                console.log('Error:', JSON.stringify(subError, null, 2));

                if (subError) {
                    console.log('Subscription API Error:', subError);
                    LoginPageErrors(subError?.data?.message || 'Failed to save subscription plans');
                    if (subError?.data?.status_code === 2044) {
                        autoLogout();
                    }
                    setLoading(false);
                    return;
                }
                console.log('Subscription API Success!');
            }

            // Step 3: Call Fee Setup API (includes auto-messages)
            const feeSetupPayload = {
                chatFollowAmount: feeData.chat.follower,
                chatFollowMessage: autoMessageData?.follower?.message || '',
                chatFollowImage: followerImageUrl || undefined,
                chatSubMessage: autoMessageData?.subscriber?.message || '',
                chatSubImage: subscriberImageUrl || undefined,
                videoFollowAmount: feeData.video.follower,
                audioFollowAmount: feeData.audio.follower,
                streamFollowAmount: feeData.stream.follower,
            };
            console.log('=== FEE SETUP API REQUEST ===');
            console.log('Payload:', JSON.stringify(feeSetupPayload, null, 2));

            const { data: feeSetupData, error: feeSetupError } = await updateFeeSetup({
                token,
                data: feeSetupPayload,
            });

            console.log('=== FEE SETUP API RESPONSE ===');
            console.log('Data:', JSON.stringify(feeSetupData, null, 2));
            console.log('Error:', JSON.stringify(feeSetupError, null, 2));

            if (feeSetupError) {
                console.log('Fee Setup API Error:', feeSetupError);
                LoginPageErrors(feeSetupError?.data?.message || 'Failed to save fee setup');
                if (feeSetupError?.data?.status_code === 2044) {
                    autoLogout();
                }
                setLoading(false);
                return;
            }

            // Step 4: Call Toggle Onboarding API to mark onboarding as complete
            console.log('=== TOGGLE ONBOARDING API REQUEST ===');
            console.log('UserId:', userId);

            const { data: onboardingData, error: onboardingError } = await toggleOnboarding({
                token,
                userId,
            });

            console.log('=== TOGGLE ONBOARDING API RESPONSE ===');
            console.log('Data:', JSON.stringify(onboardingData, null, 2));
            console.log('Error:', JSON.stringify(onboardingError, null, 2));

            if (onboardingError) {
                console.log('Toggle Onboarding API Error:', onboardingError);
                LoginPageErrors(onboardingError?.data?.message || 'Failed to complete onboarding');
                if (onboardingError?.data?.status_code === 2044) {
                    autoLogout();
                }
                setLoading(false);
                return;
            }

            console.log('=== ALL APIs SUCCESSFUL ===');
            // Success! Show completion modal only when toggleOnboarding returns 200
            setLoading(false);
            chatRoomSuccess('Onboarding completed successfully!');
            dispatch(toggleSetupCompleteModal({ show: true }));

        } catch (error) {
            console.log('Onboarding error:', error);
            LoginPageErrors('Something went wrong. Please try again.');
            setLoading(false);
        }
    };

    return (
        <>
            <SetupCompleteModal />
            <View style={styles.container}>
                <StatusBar barStyle="dark-content" backgroundColor="#FFF" />

                <View style={{ backgroundColor: '#FFF', paddingTop: insets.top + 20 }}>
                    <CustomHeader currentStep={5} totalSteps={5} />
                </View>

                <ScrollView
                    style={styles.content}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 40, alignItems: 'center' }}
                >
                    {/* Badge Icon */}
                    <Image
                        source={require('../../Assets/Images/OnboardingIcon/welcome/allSet.png')}
                        style={styles.badgeIcon}
                        contentFit="contain"
                    />

                    <Text style={styles.title}>All Set!</Text>
                    <Text style={styles.subtitle}>Review your profile setup</Text>

                    {/* Fee Setup Card */}
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Fee Setup</Text>

                        <View style={styles.feeRow}>
                            <Text style={styles.feeLabel}>Chat</Text>
                            <View style={styles.feeValues}>
                                <Text style={styles.feePrimary}>₹{feeData.chat.follower}</Text>
                                <Text style={styles.feeSecondary}>₹{feeData.chat.subscriber}</Text>
                            </View>
                        </View>

                        <View style={styles.feeRow}>
                            <Text style={styles.feeLabel}>Video Call</Text>
                            <View style={styles.feeValues}>
                                <Text style={styles.feePrimary}>₹{feeData.video.follower}</Text>
                                <Text style={styles.feeSecondary}>₹{feeData.video.subscriber}</Text>
                            </View>
                        </View>

                        <View style={styles.feeRow}>
                            <Text style={styles.feeLabel}>Audio Call</Text>
                            <View style={styles.feeValues}>
                                <Text style={styles.feePrimary}>₹{feeData.audio.follower}</Text>
                                <Text style={styles.feeSecondary}>₹{feeData.audio.subscriber}</Text>
                            </View>
                        </View>

                        <View style={styles.feeRow}>
                            <Text style={styles.feeLabel}>Live Stream</Text>
                            <View style={styles.feeValues}>
                                <Text style={styles.feePrimary}>₹{feeData.stream.follower}</Text>
                                <Text style={styles.feeSecondary}>₹{feeData.stream.subscriber}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Subscription Fee Card */}
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Subscription Fee</Text>

                        {subscriptionData?.plans ? (
                            subscriptionData.plans.map((plan) => (
                                <View key={plan.id} style={styles.feeRow}>
                                    <Text style={styles.feeLabel}>{plan.months} Month{plan.months > 1 ? 's' : ''}</Text>
                                    <Text style={styles.feePrimary}>₹{plan.amount}</Text>
                                </View>
                            ))
                        ) : (
                            <>
                                <View style={styles.feeRow}>
                                    <Text style={styles.feeLabel}>1 Month</Text>
                                    <Text style={styles.feePrimary}>₹999</Text>
                                </View>
                                <View style={styles.feeRow}>
                                    <Text style={styles.feeLabel}>3 Months</Text>
                                    <Text style={styles.feePrimary}>₹2499</Text>
                                </View>
                                <View style={styles.feeRow}>
                                    <Text style={styles.feeLabel}>6 Months</Text>
                                    <Text style={styles.feePrimary}>₹4499</Text>
                                </View>
                                <View style={styles.feeRow}>
                                    <Text style={styles.feeLabel}>12 Months</Text>
                                    <Text style={styles.feePrimary}>₹7999</Text>
                                </View>
                            </>
                        )}
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
                                disabled={loading}
                            />
                        </View>
                        <View style={styles.buttonWrapperLarge}>
                            <AnimatedButton
                                title={loading ? "Saving..." : "Confirm"}
                                onPress={handleConfirm}
                                showOverlay={false}
                                buttonMargin={0}
                                loading={loading}
                                disabled={loading}
                            />
                        </View>
                    </View>
                </ScrollView>

            </View>
        </>
    );
};

export default AllSetScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFF',
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
    },
    badgeIcon: {
        width: 80,
        height: 80,
        marginTop: 30,
        marginBottom: 16,
    },
    title: {
        fontSize: 28,
        fontFamily: 'Rubik-Bold',
        color: '#000',
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 14,
        fontFamily: 'Rubik-Regular',
        color: '#1E1E1E',
        marginBottom: 24,
    },
    card: {
        width: '100%',
        borderWidth: 2,
        borderColor: '#1E1E1E',
        borderRadius: 20,
        padding: 16,
        marginBottom: 24,
        backgroundColor: '#FFF9F5',
    },
    cardTitle: {
        fontSize: 16,
        fontFamily: 'Rubik-SemiBold',
        color: '#1E1E1E',
        marginBottom: 16,
    },
    feeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#FFE0CC',
        borderStyle: 'dashed',
        borderRadius: 14,
        backgroundColor: '#FFF',
    },
    feeLabel: {
        fontSize: 14,
        fontFamily: 'Rubik-Medium',
        color: '#1E1E1E',
    },
    feeValues: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 24,
    },
    feePrimary: {
        fontSize: 14,
        fontFamily: 'Rubik-SemiBold',
        color: '#1E1E1E',
        minWidth: 60,
        textAlign: 'right',
        lineHeight: 20,
    },
    feeSecondary: {
        fontSize: 14,
        fontFamily: 'Rubik-SemiBold',
        color: '#FFA86B',
        minWidth: 60,
        textAlign: 'right',
        lineHeight: 20,
    },
    navigationButtons: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
        marginTop: 10,
        marginBottom: 30,
    },
    buttonWrapper: {
        flex: 0.4,
    },
    buttonWrapperLarge: {
        flex: 0.6,
    },
});
