import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    StatusBar,
    ActivityIndicator,
    Platform,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Image } from 'expo-image';
import { CustomHeader } from './CustomHeader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AnimatedButton from '../Components/AnimatedButton';
import { useNavigation, useRoute } from '@react-navigation/native';
import { launchImageLibrary } from 'react-native-image-picker';
import { Ionicons } from '@expo/vector-icons';
import CircularProgress from '../Components/CircularProgress';
import { useSelector } from 'react-redux';
import { useLazyGetFeeSetupDetailsQuery } from '../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
import { LoginPageErrors } from '../Components/ErrorSnacks';
import { autoLogout } from '../../AutoLogout';
import Loader from '../Components/Loader';

const AutoMessagesScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const insets = useSafeAreaInsets();
    const token = useSelector(state => state.auth.user.token);

    const [getFeeSetupDetails] = useLazyGetFeeSetupDetailsQuery();
    const [pageLoading, setPageLoading] = useState(true);

    // Get subscription data from previous screen
    const subscriptionData = route.params?.subscriptionData || null;

    // Follower State
    const [followerMessage, setFollowerMessage] = useState('Thanks for following, subscribe to get more benefits.');
    const [followerImage, setFollowerImage] = useState(null);
    const [followerImageData, setFollowerImageData] = useState(null); // Store full image data for upload
    const [followerLoading, setFollowerLoading] = useState(false);

    // Subscriber State
    const [subscriberMessage, setSubscriberMessage] = useState('Thanks for following, subscribe to get more benefits.');
    const [subscriberImage, setSubscriberImage] = useState(null);
    const [subscriberImageData, setSubscriberImageData] = useState(null); // Store full image data for upload
    const [subscriberLoading, setSubscriberLoading] = useState(false);

    // Track which card is active/being edited
    const [activeCard, setActiveCard] = useState('follower');

    // Image loading from URL states
    const [followerImageUrlLoading, setFollowerImageUrlLoading] = useState(false);
    const [subscriberImageUrlLoading, setSubscriberImageUrlLoading] = useState(false);

    // Fetch existing auto-message data from server
    useEffect(() => {
        const fetchAutoMessageData = async () => {
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
                    // Set follower auto-message data
                    if (data.data.chatFee?.followers?.message) {
                        setFollowerMessage(data.data.chatFee.followers.message);
                    }
                    if (data.data.chatFee?.followers?.image?.url) {
                        setFollowerImage(data.data.chatFee.followers.image.url);
                    }

                    // Set subscriber auto-message data
                    if (data.data.chatFee?.subscribers?.message) {
                        setSubscriberMessage(data.data.chatFee.subscribers.message);
                    }
                    if (data.data.chatFee?.subscribers?.image?.url) {
                        setSubscriberImage(data.data.chatFee.subscribers.image.url);
                    }

                    console.log('Loaded auto-message data from server:', data.data.chatFee);
                }
            } catch (err) {
                console.log('Error fetching auto-message data:', err);
            } finally {
                setPageLoading(false);
            }
        };

        fetchAutoMessageData();
    }, [token]);

    const handleFollowerMessageChange = (text) => {
        if (text.length <= 120) {
            setFollowerMessage(text);
        }
    };

    const handleSubscriberMessageChange = (text) => {
        if (text.length <= 120) {
            setSubscriberMessage(text);
        }
    };

    const openFollowerImageGallery = async () => {
        try {
            setFollowerLoading(true);
            const mediaInfo = await launchImageLibrary({
                mediaType: 'photo',
                selectionLimit: 1
            });

            if (mediaInfo?.assets && mediaInfo.assets.length > 0) {
                setFollowerImage(mediaInfo.assets[0].uri);
                // Store complete image data for upload
                setFollowerImageData({
                    uri: mediaInfo.assets[0].uri,
                    type: mediaInfo.assets[0].type,
                    name: mediaInfo.assets[0].fileName,
                });
            }
            setFollowerLoading(false);
        } catch (error) {
            console.log('Error opening follower image gallery:', error);
            setFollowerLoading(false);
        }
    };

    const openSubscriberImageGallery = async () => {
        try {
            setSubscriberLoading(true);
            const mediaInfo = await launchImageLibrary({
                mediaType: 'photo',
                selectionLimit: 1
            });

            if (mediaInfo?.assets && mediaInfo.assets.length > 0) {
                setSubscriberImage(mediaInfo.assets[0].uri);
                // Store complete image data for upload
                setSubscriberImageData({
                    uri: mediaInfo.assets[0].uri,
                    type: mediaInfo.assets[0].type,
                    name: mediaInfo.assets[0].fileName,
                });
            }
            setSubscriberLoading(false);
        } catch (error) {
            console.log('Error opening subscriber image gallery:', error);
            setSubscriberLoading(false);
        }
    };

    const handleContinue = () => {
        // Validate that images are selected (either from server or newly selected)
        if (!followerImage) {
            LoginPageErrors('Please select an image for New Follower auto-message');
            setActiveCard('follower');
            return;
        }
        if (!subscriberImage) {
            LoginPageErrors('Please select an image for New Subscriber auto-message');
            setActiveCard('subscriber');
            return;
        }

        // Prepare auto-message data
        // If user hasn't selected a new image (imageData is null), pass the existing URL
        const autoMessageData = {
            follower: {
                message: followerMessage,
                image: followerImage,
                imageData: followerImageData, // Full image data for upload (null if using existing URL)
                existingImageUrl: !followerImageData && followerImage ? followerImage : null, // Original URL from server
            },
            subscriber: {
                message: subscriberMessage,
                image: subscriberImage,
                imageData: subscriberImageData, // Full image data for upload (null if using existing URL)
                existingImageUrl: !subscriberImageData && subscriberImage ? subscriberImage : null, // Original URL from server
            },
        };

        // Pass both subscription and auto-message data forward
        navigation.navigate('FeeSetupScreen', {
            subscriptionData,
            autoMessageData
        });
    };

    if (pageLoading) {
        return <Loader />;
    }


    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
            <View style={{ backgroundColor: '#FFF', paddingTop: insets.top + 20 }}>
                <CustomHeader currentStep={3} totalSteps={5} />
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
                <Text style={styles.title}>Auto Messages</Text>
                <Text style={styles.subtitle}>
                    Greet your new followers & members
                </Text>

                {/* New Follower Card */}
                <View style={[styles.card, activeCard === 'follower' && styles.cardActive]}>
                    <Text style={styles.cardTitle}>New Follower</Text>
                    <Text style={styles.cardSubtitle}>Auto-sent when someone follows</Text>

                    <View style={styles.messageContainer}>
                        <View style={styles.textInputWrapper}>
                            <TextInput
                                style={styles.messageInput}
                                value={followerMessage}
                                onChangeText={handleFollowerMessageChange}
                                placeholder="Write your message..."
                                placeholderTextColor="#999"
                                multiline
                                maxLength={120}
                                onFocus={() => setActiveCard('follower')}
                                autoCorrect={false}
                                spellCheck={false}
                            />
                            <View style={styles.circularProgressContainer}>
                                <CircularProgress current={followerMessage.length} max={120} />
                            </View>
                        </View>

                        <TouchableOpacity
                            style={styles.imageUploadContainer}
                            onPress={() => {
                                setActiveCard('follower');
                                openFollowerImageGallery();
                            }}
                        >
                            {(followerLoading || followerImageUrlLoading) && (
                                <View style={styles.uploadingOverlay}>
                                    <ActivityIndicator size="small" color="#FF8C42" />
                                </View>
                            )}
                            <Image
                                source={
                                    followerImage
                                        ? { uri: followerImage }
                                        : require('../../Assets/Images/OnboardingIcon/welcome/selectImage.png')
                                }
                                style={followerImage ? styles.uploadImageFull : styles.uploadImage}
                                contentFit="cover"
                                onLoadStart={() => {
                                    if (followerImage && followerImage.startsWith('http')) {
                                        setFollowerImageUrlLoading(true);
                                    }
                                }}
                                onLoadEnd={() => setFollowerImageUrlLoading(false)}
                            />
                            {followerImage && (
                                <View style={styles.editIconContainer}>
                                    <Ionicons name="pencil" size={16} color="#FFF" />
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>

                {/* New Subscriber Card */}
                <View style={[styles.card, activeCard === 'subscriber' && styles.cardActive]}>
                    <Text style={styles.cardTitle}>New Subscriber</Text>
                    <Text style={styles.cardSubtitle}>Auto-sent when someone follows</Text>

                    <View style={styles.messageContainer}>
                        <View style={styles.textInputWrapper}>
                            <TextInput
                                style={styles.messageInput}
                                value={subscriberMessage}
                                onChangeText={handleSubscriberMessageChange}
                                placeholder="Write your message..."
                                placeholderTextColor="#999"
                                multiline
                                maxLength={120}
                                onFocus={() => setActiveCard('subscriber')}
                                autoCorrect={false}
                                spellCheck={false}
                            />
                            <View style={styles.circularProgressContainer}>
                                <CircularProgress current={subscriberMessage.length} max={120} />
                            </View>
                        </View>

                        <TouchableOpacity
                            style={styles.imageUploadContainer}
                            onPress={() => {
                                setActiveCard('subscriber');
                                openSubscriberImageGallery();
                            }}
                        >
                            {(subscriberLoading || subscriberImageUrlLoading) && (
                                <View style={styles.uploadingOverlay}>
                                    <ActivityIndicator size="small" color="#FF8C42" />
                                </View>
                            )}
                            <Image
                                source={
                                    subscriberImage
                                        ? { uri: subscriberImage }
                                        : require('../../Assets/Images/OnboardingIcon/welcome/selectImage.png')
                                }
                                style={subscriberImage ? styles.uploadImageFull : styles.uploadImage}
                                contentFit="cover"
                                onLoadStart={() => {
                                    if (subscriberImage && subscriberImage.startsWith('http')) {
                                        setSubscriberImageUrlLoading(true);
                                    }
                                }}
                                onLoadEnd={() => setSubscriberImageUrlLoading(false)}
                            />
                            {subscriberImage && (
                                <View style={styles.editIconContainer}>
                                    <Ionicons name="pencil" size={16} color="#FFF" />
                                </View>
                            )}
                        </TouchableOpacity>
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
                            title="Continue >"
                            onPress={handleContinue}
                            showOverlay={false}
                            buttonMargin={0}
                        />
                    </View>
                </View>
            </KeyboardAwareScrollView>
        </View>
    );
};

export default AutoMessagesScreen;

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
        marginBottom: 8,
        marginTop: 30,
    },
    subtitle: {
        fontSize: 13,
        fontFamily: 'Rubik-Medium',
        color: '#1E1E1E',
        marginBottom: 24,
    },
    card: {
        borderWidth: 2,
        borderColor: '#1E1E1E',
        borderRadius: 20,
        padding: 16,
        marginBottom: 24,
        backgroundColor: '#FFF',
    },
    cardActive: {
        borderColor: '#FFA86B',
        borderStyle: 'dashed',
    },
    cardTitle: {
        fontSize: 16,
        fontFamily: 'Rubik-SemiBold',
        color: '#1E1E1E',
        marginBottom: 4,
    },
    cardSubtitle: {
        fontSize: 12,
        fontFamily: 'Rubik-Medium',
        color: '#666',
        marginBottom: 16,
    },
    messageContainer: {
        flexDirection: 'row',
        gap: 12,
        alignItems: 'stretch',
    },
    textInputWrapper: {
        flex: 1,
        height: 120,
        borderWidth: 1.5,
        borderColor: '#1e1e1e',
        borderRadius: 16,
        padding: 12,
        backgroundColor: '#FFF',
        position: 'relative',
    },
    circularProgressContainer: {
        position: 'absolute',
        bottom: 8,
        left: 8,
    },
    messageInput: {
        flex: 1,
        fontSize: 13,
        color: '#1E1E1E',
        fontFamily: 'Rubik-Medium',
        textAlignVertical: 'top',
        paddingBottom: 30,
    },
    characterCount: {
        fontSize: 11,
        color: '#999',
        textAlign: 'right',
        fontFamily: 'Rubik-Medium',
        marginTop: 4,
    },
    characterTotal: {
        color: '#1E1E1E',
        fontFamily: 'Rubik-SemiBold',
    },
    imageUploadContainer: {
        width: 100,
        height: 120,
        borderWidth: 1.5,
        borderColor: '#FFE0CC',
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: '#FFF9F5',
        justifyContent: 'center',
        alignItems: 'center',
    },
    uploadImage: {
        width: 35,
        height: 35,
    },
    uploadImageFull: {
        width: '100%',
        height: '100%',
    },
    uploadingOverlay: {
        ...StyleSheet.absoluteFill,
        backgroundColor: 'rgba(255,255,255,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    editIconContainer: {
        position: 'absolute',
        top: 6,
        right: 6,
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 5,
        borderWidth: 1,
        borderColor: '#FFF',
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