import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Platform,
} from 'react-native';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';
import {Image} from 'expo-image';
import {useSelector} from 'react-redux';
import {
  useUpdateFeeSetupMutation,
  useUploadAttachmentMutation,
  useLazyGetFeeSetupDetailsQuery,
} from '../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
import {autoLogout} from '../../AutoLogout';
import {reduceImageSize} from '../../FFMPeg/FFMPegModule';
import {chatRoomSuccess, LoginPageErrors} from '../Components/ErrorSnacks';
import AnimatedButton from '../Components/AnimatedButton';
import {useNavigation} from '@react-navigation/native';
import Loader from '../Components/Loader';
import {navigate} from '../../Navigation/RootNavigation';
import {useContactInfo} from '../Hook/FeeSetupUpdate';

const ManageRevenueFeeSetupPricing = ({route}) => {
  const navigation = useNavigation();
  const token = useSelector(state => state.auth.user.token);
  const userId = useSelector(state => state.auth.user.currentUserId);
  const chatInputRef = useRef(null);

  const {fetchContactInfo} = useContactInfo(token, userId);

  // Get data from previous screen
  const autoMessageData = route?.params?.autoMessageData;
  const from = route?.params?.from;

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
        const {data, error} = await getFeeSetupDetails({token});

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

  // Calculate subscriber fee (50% off)
  const getSubscriberFee = fee => {
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

  const uploadImageIfNeeded = async imageData => {
    if (!imageData || !imageData.uri) {
      return null;
    }

    try {
      const compressedImage = await reduceImageSize(imageData.uri);
      const formData = new FormData();
      formData.append('keyName', 'feeSetup_image_android');
      formData.append('file', {
        uri: compressedImage,
        type: imageData.type,
        name: imageData.name,
      });

      const result = await uploadAttachment({token, formData});
      if (result?.data?.statusCode === 200) {
        return result.data.data.url;
      }
    } catch (e) {
      console.log('Error uploading image:', e);
    }
    return null;
  };

  const handleSave = async () => {
    setLoading(true);

    try {
      // Upload images if new ones were selected
      let followerImageUrl = autoMessageData?.follower?.existingImageUrl;
      let subscriberImageUrl = autoMessageData?.subscriber?.existingImageUrl;

      if (autoMessageData?.follower?.imageData) {
        const uploadedUrl = await uploadImageIfNeeded(
          autoMessageData.follower.imageData,
        );
        if (uploadedUrl) {
          followerImageUrl = uploadedUrl;
        }
      }

      if (autoMessageData?.subscriber?.imageData) {
        const uploadedUrl = await uploadImageIfNeeded(
          autoMessageData.subscriber.imageData,
        );
        if (uploadedUrl) {
          subscriberImageUrl = uploadedUrl;
        }
      }

      const {data, error} = await updateFeeSetup({
        token,
        data: {
          chatSubMessage: autoMessageData?.subscriber?.message,
          chatSubImage: subscriberImageUrl,
          chatFollowAmount: parseInt(chatFee) || 0,
          chatFollowMessage: autoMessageData?.follower?.message,
          chatFollowImage: followerImageUrl,
          videoFollowAmount: parseInt(videoFee) || 0,
          audioFollowAmount: parseInt(audioFee) || 0,
          streamFollowAmount: parseInt(streamFee) || 0,
        },
      });

      if (error) {
        if (error?.status === 'FETCH_ERROR') {
          LoginPageErrors('Please check your network');
        }
        if (error?.data?.status_code === 2044) {
          autoLogout();
        }
        LoginPageErrors(error?.data?.message);
        setLoading(false);
        return;
      }

      if (data) {
        if (from === 'livestream') {
          setLoading(false);
          fetchContactInfo();
          navigate('beforeStreamScreen');
        } else {
          fetchContactInfo();
          chatRoomSuccess('Fee setup updated successfully!');
          setLoading(false);
          navigation.goBack();
          navigation.goBack();
        }
      }
    } catch (e) {
      console.log('Error saving:', e);
      setLoading(false);
    }
  };

  if (pageLoading) {
    return <Loader />;
  }

  return (
    <View style={styles.container}>
      <KeyboardAwareScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{paddingBottom: 40}}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid={true}
        extraScrollHeight={Platform.OS === 'ios' ? 120 : 80}
        enableAutomaticScroll={true}>
        {/* Subscriber Benefit Info */}
        <View style={styles.infoCard}>
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Good to Know</Text>
            <View style={styles.bulletRow}>
              <View style={styles.bulletDot} />
              <Text style={styles.infoSubtitle}>
                Members get <Text style={styles.boldText}>50% off</Text> on all
                services
              </Text>
            </View>
            <View style={styles.bulletRow}>
              <View style={styles.bulletDot} />
              <Text style={styles.infoSubtitle}>
                Follower fees are auto-adjusted to{' '}
                <Text style={styles.boldText}>even numbers</Text>
              </Text>
            </View>
          </View>
        </View>

        {/* Set Chat Fee */}
        <View
          style={[
            styles.feeCard,
            focusedCard === 'chat' && styles.feeCardFocused,
          ]}>
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
                  onChangeText={text =>
                    handleFeeChangeWithDebounce(text, setChatFee, 'chat')
                  }
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
                <Text style={styles.inputDisabled}>
                  {getSubscriberFee(chatFee)}
                </Text>
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
        <View
          style={[
            styles.feeCard,
            focusedCard === 'video' && styles.feeCardFocused,
          ]}>
          <Text style={styles.feeCardTitle}>Set Video Call Fee</Text>
          <Text style={styles.feeCardSubtitle}>Call per Minute</Text>

          <View style={styles.inputRow}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Follower Fee (₹)</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={videoFee}
                  onChangeText={text =>
                    handleFeeChangeWithDebounce(text, setVideoFee, 'video')
                  }
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
                <Text style={styles.inputDisabled}>
                  {getSubscriberFee(videoFee)}
                </Text>
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
        <View
          style={[
            styles.feeCard,
            focusedCard === 'audio' && styles.feeCardFocused,
          ]}>
          <Text style={styles.feeCardTitle}>Set Audio Call Fee</Text>
          <Text style={styles.feeCardSubtitle}>Call per Minute</Text>

          <View style={styles.inputRow}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Follower Fee (₹)</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={audioFee}
                  onChangeText={text =>
                    handleFeeChangeWithDebounce(text, setAudioFee, 'audio')
                  }
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
                <Text style={styles.inputDisabled}>
                  {getSubscriberFee(audioFee)}
                </Text>
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
        <View
          style={[
            styles.feeCard,
            focusedCard === 'stream' && styles.feeCardFocused,
          ]}>
          <Text style={styles.feeCardTitle}>Set LiveStream Fee</Text>
          <Text style={styles.feeCardSubtitle}>Stream per Minute</Text>

          <View style={styles.inputRow}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Follower Fee (₹)</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={streamFee}
                  onChangeText={text =>
                    handleFeeChangeWithDebounce(text, setStreamFee, 'stream')
                  }
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
                <Text style={styles.inputDisabled}>
                  {getSubscriberFee(streamFee)}
                </Text>
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
              style={{backgroundColor: '#FFF'}}
            />
          </View>
          <View style={styles.buttonWrapper}>
            <AnimatedButton
              title={loading ? 'Saving...' : 'Save'}
              onPress={handleSave}
              showOverlay={false}
              buttonMargin={0}
              disabled={loading}
              loading={loading}
            />
          </View>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
};

export default ManageRevenueFeeSetupPricing;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF9F5',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
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
  buttonWrapper: {
    flex: 1,
  },
  navigationButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
    marginBottom: 30,
  },
});
