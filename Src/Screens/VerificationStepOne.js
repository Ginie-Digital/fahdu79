import {StyleSheet, Text, View, TextInput, TouchableOpacity, Pressable, FlatList, ActivityIndicator, Platform} from 'react-native';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {responsiveFontSize, responsiveHeight, responsiveWidth} from 'react-native-responsive-dimensions';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';
import {LoginPageErrors, chatRoomSuccess} from '../Components/ErrorSnacks';
import {useCoverUpdateProfileMutation, useLazyCheckVerificationImageStatusQuery, useLazyCheckUserNameAvailabilityQuery, useLazyGetNoOnceQuery, useLazyGetUserDocQuery, useLazyInstaVerifyQuery, useLazyUserProfileQuery} from '../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
import {useDispatch, useSelector} from 'react-redux';
import {updateCoverProfilePicture} from '../../Redux/Slices/NormalSlices/AuthSlice';
import {autoLogout} from '../../AutoLogout';
import {toggleDateTimePicker, toggleInstagramVerification, toggleIsThisYou, toggleVerificatinInformation, toggleNicheSelectorModal, setConfirmedNiches} from '../../Redux/Slices/NormalSlices/HideShowSlice';
import {GestureHandlerRootView, ScrollView} from 'react-native-gesture-handler';
import dayjs from 'dayjs';
import Loader from '../Components/Loader';
import MyProfilePicture from '../Components/MyProfile/MyProfilePicture';
import {formatNiche, nTwins, padios} from '../../DesiginData/Utility';
import useKeyboardHook from '../CustomHooks/useKeyboardHook';
import InputOverlay from '../Components/InputOverlay';
import {Image} from 'expo-image';
import AnimatedButton from '../Components/AnimatedButton';
import GetVerifiedInstagram from './LoginSignup/GetVerifiedInstagram';
import VerifiedModal from '../Components/Verification/VerifiedModal';
import VerificationInformation from '../Components/Verification/VerificationInformation';
import {useAppTheme} from '../Hook/useAppTheme';

const options = ['Health & Wellness', 'Lifestyle', 'Education & Career', 'Culinary', 'Personal Development', 'Travel', 'Entertainment', 'Astrology', 'Dating Expert'];

const VerificationStepOne = ({route}) => {
  const {isKeyboardVisible, keyboardHeight} = useKeyboardHook();
  const {colors, isDark} = useAppTheme();

  const [fullName, setFullName] = useState('');

  const [fahduUserName, setFahduUserName] = useState('');

  const [checkUserNameAvailability] = useLazyCheckUserNameAvailabilityQuery();

  const [availability, setAvailable] = useState(null);
  const [dob, setDob] = useState('');
  const [instagram, setInstagram] = useState('');
  const [youtube, setYoutube] = useState('');
  const [snapchat, setSnapChat] = useState('');
  const [twitter, setTwitter] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState([]);
  const [agreeModal, setAgreeModal] = useState(false);

  const [selectedItems, setSelectedItems] = useState([]);

  const [date, setDate] = useState(null);

  useEffect(() => {
    const currentDate = new Date();
    const maxDate = new Date(
      currentDate.getFullYear() - 16, // Subtract 16 years
      currentDate.getMonth(),
      currentDate.getDate(),
    );

    setDate(maxDate);
  }, []);

  const toggleSelection = useCallback(item => {
    let updatedSelection = [...selectedItems];

    if (updatedSelection.includes(item)) {
      updatedSelection = updatedSelection.filter(selected => selected !== item);
    } else {
      if (updatedSelection.length < 3) {
        updatedSelection.push(item);
      }
    }

    setSelectedItems(updatedSelection);
    dispatch(setConfirmedNiches(updatedSelection));
  }, [selectedItems, dispatch]);

  const handleDropdownPress = () => {
    dispatch(toggleNicheSelectorModal({show: true}));
  };

  // BubbleView component removed in favor of inline niche chips

  const [virified, setVerified] = useState(false);

  const [rejectionReason, setRejectionReason] = useState([]);

  const [dropdownVisible, setDropdownVisible] = useState(false);

  const [mounted, setMounted] = useState(false);

  const [userProfile] = useLazyUserProfileQuery({refetchOnFocus: true});

  const [coverUpdateProfile] = useCoverUpdateProfileMutation();

  const [getUserDoc] = useLazyGetUserDocQuery();

  const [instaVerify] = useLazyInstaVerifyQuery();

  const [profileStatus, setProfileStatus] = useState(null);

  const [focusedInput, setFocusedInput] = useState(null);

  const token = useSelector(state => state.auth.user.token);

  const [transferObject, setTransferObject] = useState({});

  const dispatch = useDispatch();

  const {currentUserProfilePicture, currentUserCoverPicture} = useSelector(state => state.auth.user);
  const {status: dateTimePickerStatus, date: globalDateString} = useSelector(state => state.hideShow.visibility.dateTimePickerData);
  const confirmedNiches = useSelector(state => state.hideShow.visibility.confirmedNiches);

  const [showVerifiedModal, setShowVerifiedModal] = useState(false);

  useEffect(() => {
    if (confirmedNiches) {
        setSelectedItems(confirmedNiches);
    }
  }, [confirmedNiches]);

  React.useEffect(() => {
    async function getSettingProfile() {
      let userDetail = await userProfile({token}, false);

      console.log(userDetail?.data?.data, ':::::::::{{}{}{}{}{}{}{}');

      const data = userDetail?.data?.data;

      const social = userDetail?.data?.data?.socialHandles;

      setDob(data?.DOB);

      const formattedNiches = userDetail?.data?.data?.niche?.map(n => formatNiche(n)) || [];
      setSelected(formattedNiches);
      // setSelectedItems(formattedNiches);
      // dispatch(setConfirmedNiches(formattedNiches));

      setFullName(data?.fullName); //Editable

      if (social?.instagram?.handle?.length > 0) {
        setVerified(true);
      }
      setInstagram(social?.instagram?.handle ? social?.instagram?.handle : '');
    }

    getSettingProfile();

    dispatch(toggleVerificatinInformation());
  }, [token]);

  // Check if profile/cover images have been deleted from server
  const [checkVerificationImageStatus] = useLazyCheckVerificationImageStatusQuery();

  useEffect(() => {
    const defaultCoverUrl = 'https://fahdu-bucket.s3.us-east-1.amazonaws.com/assets/Untitleddesign.jpg';
    const defaultProfileUrl = 'https://fahdu-bucket.s3.us-east-1.amazonaws.com/assets/default-avatar-profile-icon-1.jpg';

    async function checkImageDeletion() {
      try {
        const {data, error} = await checkVerificationImageStatus({token, time: Date.now()});

        if (error) {
          console.log('⚠️ Failed to check verification image status:', error);
          return;
        }

        // data.data === false means images are deleted from server
        if (data?.data === false) {
          console.log('🔄 Images deleted on server (false), clearing local cache...');
          
          // Clear expo-image cache to remove stale images
          if (
            (currentUserProfilePicture && currentUserProfilePicture !== defaultProfileUrl) ||
            (currentUserCoverPicture && currentUserCoverPicture !== defaultCoverUrl)
          ) {
            try {
              await Image.clearDiskCache();
              await Image.clearMemoryCache();
              console.log('✅ Expo-image cache cleared for deleted images');
            } catch (cacheError) {
              console.log('⚠️ Failed to clear image cache:', cacheError);
            }
          }

          // Update Redux store to defaults
          dispatch(
            updateCoverProfilePicture({
              coverUrl: defaultCoverUrl,
              profileUrl: defaultProfileUrl,
            }),
          );
        } else {
          console.log('✅ Images exist on server (true), no cache clearing needed');
        }
      } catch (err) {
        console.log('⚠️ Error checking verification image status:', err);
      }
    }

    checkImageDeletion();
  }, [token]);

  useEffect(() => {
    setLoading(true);
    async function getUserDocHandler() {
      const {data, error} = await getUserDoc({token});

      console.log(data, '{}{}{}{}');

      if (data) {
        setRejectionReason(data?.data?.rejectionReason);
        setProfileStatus(data?.data?.status);
        setLoading(false);
      }

      if (error) {
        if (error?.status === 'FETCH_ERROR') {
          LoginPageErrors('Please check your network');
          return;
        }

        if (error?.data?.statusCode !== 400) {
          LoginPageErrors(error?.data?.message);
        } else {
          console.log('Temp Error from backedn');
        }

        setLoading(false);
      }

      if (error?.status === 2044) {
        autoLogout();
      }
    }

    getUserDocHandler();
  }, [token]);

  useEffect(() => {
    if (dateTimePickerStatus === 'confirmed') {
      const confirmedDate = new Date(globalDateString);
      setDate(confirmedDate);
      setDob(dayjs(confirmedDate).format('DD-MM-YYYY'));
    }
  }, [dateTimePickerStatus, globalDateString]);

  useEffect(() => {
    if (profileStatus === 'SENT' && rejectionReason.length === 0) {
      setShowVerifiedModal(true);
    }
  }, [profileStatus, rejectionReason]);

  useEffect(() => {
    if (showVerifiedModal) {
      setAgreeModal(false);
    } else {
      setAgreeModal(true);
    }
  }, [showVerifiedModal]);

  const updateProfileHandler = useCallback(async () => {
    if (!fullName.trim()) {
      return LoginPageErrors('Please enter full name');
    }

    if (!fahduUserName.trim()) {
      return LoginPageErrors('Please enter username');
    }

    if (!dob || !dob.trim()) {
      return LoginPageErrors('Please enter DOB');
    }

    const birthDate = dayjs(dob, 'DD-MM-YYYY');
    const age = dayjs().diff(birthDate, 'year');
    if (age < 16) {
      return LoginPageErrors('You must be at least 16 years old');
    }

    if (selectedItems.length === 0) {
      return LoginPageErrors('Please select at least one niche');
    }

    const defaultCover = 'https://fahdu-bucket.s3.us-east-1.amazonaws.com/assets/Untitleddesign.jpg';
    const defaultProfile = 'https://fahdu-bucket.s3.us-east-1.amazonaws.com/assets/default-avatar-profile-icon-1.jpg';

    if (currentUserCoverPicture === defaultCover || currentUserProfilePicture === defaultProfile) {
      return LoginPageErrors('Please change your profile and cover pictures');
    }

    try {
      const {data: userNameData, error: userNameError} = await checkUserNameAvailability({token, displayName: fahduUserName});

      if (userNameError) {
        return LoginPageErrors('Error checking username availability');
      }

      if (userNameData?.statusCode === 200) {
        if (!userNameData?.data) {
          setAvailable('TAKEN');
        } else {
          setTransferObject({
            fullName,
            fahduUserName,
            dob,
            selectedItems,
          });
          setAvailable(null);
          dispatch(toggleInstagramVerification({show: true}));
        }
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      LoginPageErrors('Something went wrong, please try again later');
    }
  }, [fullName, fahduUserName, dob, selectedItems, currentUserCoverPicture, currentUserProfilePicture, token, dispatch, checkUserNameAvailability]);

  const isAgeValid = (() => {
    if (!dob || typeof dob !== 'string' || !dob.trim()) return false;
    const birthDate = dayjs(dob, 'DD-MM-YYYY');
    const age = dayjs().diff(birthDate, 'year');
    return age >= 16;
  })();

  if (loading) {
    return <Loader />;
  }

  return (
    <GestureHandlerRootView style={{flex: 1}}>
      <KeyboardAwareScrollView
        style={[styles.chatRoomContainer, isDark && {backgroundColor: colors.background}]}
        contentContainerStyle={{flexGrow: 1, paddingBottom: 20}}
        nestedScrollEnabled={true}
        showsVerticalScrollIndicator={false}
        alwaysBounceVertical={true}
      >
        <MyProfilePicture isEditable={true} isDark={isDark} isVerification={true} />

        <View style={{width: responsiveWidth(91), alignSelf: 'center'}}>
          <View style={{marginTop: responsiveWidth(8)}}>
            <Text style={[styles.titles, isDark && {color: colors.text}]}>Personal Information</Text>
          </View>
          <View style={{position: 'relative', marginTop: responsiveWidth(2.67), overflow: 'visible'}} collapsable={false}>
            {focusedInput === 'fullName' && (
              <InputOverlay isVisible={isKeyboardVisible} style={{backgroundColor: colors.overlayBg, borderRadius: responsiveWidth(3.73)}} />
            )}
            <View style={[styles.textInputContainer, {marginTop: 0}, isDark && {backgroundColor: colors.inputBg, borderColor: colors.inputBorder}]}>
              <TextInput
                onFocus={() => setFocusedInput('fullName')}
                maxLength={30}
                selectionColor={isDark ? colors.accent : '#1e1e1e'}
                cursorColor={isDark ? colors.accent : '#1e1e1e'}
                placeholderTextColor={isDark ? colors.placeholder : '#B2B2B2'}
                placeholder="Full Name"
                spellCheck={false}
                autoCorrect={false}
                autoCapitalize={'sentences'}
                style={[styles.textInputs, isDark && {color: colors.text}]}
                value={fullName}
                onChangeText={t => setFullName(t)}
              />
            </View>
          </View>

          <View style={{position: 'relative', marginTop: responsiveWidth(2.67), overflow: 'visible'}} collapsable={false}>
            {focusedInput === 'fahduUserName' && (
              <InputOverlay isVisible={isKeyboardVisible} style={{backgroundColor: colors.overlayBg, borderRadius: responsiveWidth(3.73)}} />
            )}
            <View style={[styles.textInputContainer, {marginTop: 0}, isDark && {backgroundColor: colors.inputBg, borderColor: colors.inputBorder}]}>
              <TextInput
                maxLength={30}
                selectionColor={isDark ? colors.accent : '#1e1e1e'}
                cursorColor={isDark ? colors.accent : '#1e1e1e'}
                placeholderTextColor={isDark ? colors.placeholder : '#B2B2B2'}
                placeholder="Set Fahdu Username"
                onFocus={() => setFocusedInput('fahduUserName')}
                spellCheck={false}
                autoCorrect={false}
                autoCapitalize={'none'}
                style={[styles.textInputs, isDark && {color: colors.text}]}
                onChangeText={t => setFahduUserName(t)}
              />
            </View>
          </View>

          {availability === 'TAKEN' && (
            <View style={styles.errorContainer}>
              <Text style={[styles.errorText, isDark && {color: colors.error}]}>*{'Username not available'}</Text>
            </View>
          )}
        </View>

        <Pressable
          style={{
            borderColor: '#282828',
            borderRadius: responsiveWidth(3),
            width: responsiveWidth(91),
            alignSelf: 'center',
            marginTop: 6,
          }}
          onPress={() => dispatch(toggleDateTimePicker({show: 1, type: 'dob', date: date ? date.toISOString() : new Date().toISOString()}))}>
          <View style={[styles.textInputContainer, isDark && {backgroundColor: colors.inputBg, borderColor: colors.inputBorder}]}>
            <TextInput
              pointerEvents="none"
              editable={false}
              selectionColor={isDark ? colors.accent : '#1e1e1e'}
              cursorColor={isDark ? colors.accent : '#1e1e1e'}
              placeholderTextColor={isDark ? colors.placeholder : '#B2B2B2'}
              placeholder="Enter Date of Birth"
              spellCheck={false}
              autoCorrect={false}
              autoCapitalize={'sentences'}
              style={[styles.textInputs, isDark && {color: colors.text}]}
              value={dob}
            />

            <TouchableOpacity style={styles.calenderContainer} onPress={() => dispatch(toggleDateTimePicker({show: 1, type: 'dob', date: date ? date.toISOString() : new Date().toISOString()}))}>
              <Image source={require('../../Assets/Images/calenderdob.png')} contentFit="contain" style={[{flex: 1}, isDark && {tintColor: colors.text}]} />
            </TouchableOpacity>
          </View>
        </Pressable>

        {/* SELECT YOUR NICHE */}
        <View style={{width: responsiveWidth(91), alignSelf: 'center', marginTop: 24, marginBottom: 16}}>
          {/* Header Row */}
          <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16}}>
            <Text style={{
              fontFamily: 'Rubik-SemiBold', 
              fontSize: 16, 
              color: isDark ? colors.text : '#1E1E1E'
            }}>Select Your Niche</Text>
            <View style={{
              paddingVertical: 4,
              paddingHorizontal: 8,
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: isDark ? 'rgba(255, 168, 107, 0.149)' : '#FFF3EB',
              borderWidth: 1,
              borderColor: isDark ? '#FF7819' : '#FFE0CC',
              borderRadius: 100,
            }}>
              <Text style={{
                fontFamily: 'Rubik-Regular',
                fontSize: 12,
                lineHeight: 14,
                color: isDark ? '#FFA86B' : '#1E1E1E',
                textAlign: 'center',
                includeFontPadding: false,
              }}>
                {selectedItems.length}/3 Selected
              </Text>
            </View>
          </View>

          {/* Chips Grid */}
          <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: responsiveWidth(2)}}>
            {options.map(option => {
              const isSelected = selectedItems.includes(option);
              return (
                <TouchableOpacity
                  key={option}
                  activeOpacity={0.7}
                  onPress={() => toggleSelection(option)}
                  style={[
                    {
                      height: 36,
                      paddingHorizontal: responsiveWidth(5.33),
                      borderRadius: 99,
                      borderWidth: 1,
                      justifyContent: 'center',
                      alignItems: 'center',
                    },
                    isSelected
                      ? {
                          backgroundColor: '#FFA86B',
                          borderColor: isDark ? '#FFA86B' : '#1E1E1E',
                        }
                      : {
                          backgroundColor: isDark ? colors.card : '#FFFFFF',
                          borderColor: isDark ? colors.border : '#1E1E1E',
                        }
                  ]}
                >
                  <Text 
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.85}
                    style={{
                      fontFamily: 'Rubik-Medium',
                      fontSize: responsiveFontSize(1.65),
                      lineHeight: responsiveFontSize(1.85),
                      includeFontPadding: false,
                      color: isSelected 
                        ? '#1E1E1E' 
                        : (isDark ? colors.text : '#1E1E1E'),
                    }}
                  >
                    {option}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={{width: responsiveWidth(91), alignSelf: 'center'}}>
          <AnimatedButton title={'Next'} onPress={() => updateProfileHandler()} disabled={!isAgeValid} isDark={isDark} />
        </View>

        <View style={{height: responsiveWidth(16)}} />
      </KeyboardAwareScrollView>

      {!showVerifiedModal && <VerificationInformation agreeModal={agreeModal} setAgreeModal={setAgreeModal} />}
      <GetVerifiedInstagram transferObject={transferObject} setShowVerifiedModal={setShowVerifiedModal} />
      <VerifiedModal visible={showVerifiedModal} onClose={() => setShowVerifiedModal(false)} />
    </GestureHandlerRootView>
  );
};

export default VerificationStepOne;

const styles = StyleSheet.create({
  chatRoomContainer: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 8,
  },
  titles: {
    fontFamily: 'Rubik-SemiBold',
    color: '#282828',
    fontSize: responsiveFontSize(2.1),
    lineHeight: 20,
    marginTop: 24,
  },
  textInputContainer: {
    borderWidth: 1.5,
    borderColor: '#1e1e1e',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: responsiveWidth(3.73),
    paddingLeft: responsiveWidth(5.33),
    width: '100%',
    marginTop: responsiveWidth(2.67),
  },
  textInputs: {
    fontSize: responsiveFontSize(1.8),
    fontFamily: 'Rubik-Regular',
    color: '#1e1e1e',
    flex: 1,
    height: responsiveHeight(6.65),
    borderRadius: responsiveWidth(3.73),
  },
  calenderContainer: {
    marginRight: responsiveWidth(4),
    height: 19,
    width: 19,
  },
  errorContainer: {
    flexDirection: 'row',
    borderRadius: responsiveWidth(2),
    marginLeft: 90,
    alignSelf: 'flex-end',
    marginTop: 6,
    marginRight: 6,
  },
  errorText: {
    fontFamily: 'Rubik-Regular',
    fontSize: responsiveFontSize(1.48),
    color: 'red',
    flexShrink: 1,
  },
});
