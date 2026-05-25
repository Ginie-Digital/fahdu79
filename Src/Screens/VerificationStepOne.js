import {StyleSheet, Text, View, TextInput, TouchableOpacity, Pressable, FlatList, ActivityIndicator, Platform} from 'react-native';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {responsiveFontSize, responsiveHeight, responsiveWidth} from 'react-native-responsive-dimensions';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';
import {LoginPageErrors, chatRoomSuccess} from '../Components/ErrorSnacks';
import {useCoverUpdateProfileMutation, useLazyCheckUserNameAvailabilityQuery, useLazyGetNoOnceQuery, useLazyGetUserDocQuery, useLazyInstaVerifyQuery, useLazyUserProfileQuery} from '../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
import {useDispatch, useSelector} from 'react-redux';
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

const options = ['Health & Wellness', 'Lifestyle', 'Education & Career', 'Culinary', 'Personal Development', 'Travel', 'Entertainment', 'Astrology', 'Dating Expert'];

const VerificationStepOne = ({route}) => {
  const {isKeyboardVisible, keyboardHeight} = useKeyboardHook();

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
      currentDate.getFullYear() - 13, // Subtract 13 years
      currentDate.getMonth(),
      currentDate.getDate(),
    );

    setDate(maxDate);
  }, []);

  const toggleSelection = item => {
    let updatedSelection = [...selectedItems];

    if (updatedSelection.includes(item)) {
      updatedSelection = updatedSelection.filter(selected => selected !== item);
    } else {
      if (updatedSelection.length < 3) {
        updatedSelection.push(item);
      }
    }

    setSelectedItems(updatedSelection);
  };

  const handleDropdownPress = () => {
    dispatch(toggleNicheSelectorModal({show: true}));
  };

  // Separate Component for Bubble View
  const BubbleView = ({selectedItems, setSelectedItems}) => {
    return (
      <View style={styles.bubbleContainer}>
        {selectedItems.map(item => (
          <View key={item} style={styles.bubble}>
            <Text style={styles.bubbleText}>{item}</Text>
            <Pressable onPress={() => {
                const updated = selectedItems.filter(i => i !== item);
                setSelectedItems(updated);
                dispatch(setConfirmedNiches(updated));
            }}>
              <Text style={styles.close}>×</Text>
            </Pressable>
          </View>
        ))}
      </View>
    );
  };

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
    if (age < 13) {
      return LoginPageErrors('You must be at least 13 years old');
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

  if (loading) {
    return <Loader />;
  }

  return (
    <GestureHandlerRootView style={{flex: 1}}>
      <KeyboardAwareScrollView style={styles.chatRoomContainer} contentContainerStyle={{flexGrow: 1}} nestedScrollEnabled={true}>
        <MyProfilePicture isEditable={true} />

        <View style={{width: responsiveWidth(91), alignSelf: 'center'}}>
          <View style={{marginTop: responsiveWidth(8)}}>
            <Text style={styles.titles}>Personal Information</Text>
          </View>
          <View>
            <View style={styles.textInputContainer}>
              <TextInput
                onFocus={() => setFocusedInput('fullName')}
                maxLength={30}
                selectionColor={'#1e1e1e'}
                cursorColor={'#1e1e1e'}
                placeholderTextColor="#B2B2B2"
                placeholder="Full Name"
                spellCheck={false}
                autoCorrect={false}
                autoCapitalize={'sentences'}
                style={styles.textInputs}
                value={fullName}
                onChangeText={t => setFullName(t)}
              />
            </View>
            {focusedInput === 'fullName' && (
              <InputOverlay
                isVisible={isKeyboardVisible}
                style={{
                  marginLeft: responsiveWidth(1.06),
                  marginTop: nTwins(4.8, 4.8),
                }}
              />
            )}
          </View>

          <View>
            <View style={styles.textInputContainer}>
              <TextInput
                maxLength={30}
                selectionColor={'#1e1e1e'}
                cursorColor={'#1e1e1e'}
                placeholderTextColor="#B2B2B2"
                placeholder="Set Fahdu Username"
                onFocus={() => setFocusedInput('fahduUserName')}
                spellCheck={false}
                autoCorrect={false}
                autoCapitalize={'none'}
                style={styles.textInputs}
                onChangeText={t => setFahduUserName(t)}
              />
            </View>
            {focusedInput === 'fahduUserName' && (
              <InputOverlay
                isVisible={isKeyboardVisible}
                style={{
                  marginLeft: responsiveWidth(1.06),
                  marginTop: nTwins(4.8, 4.8),
                }}
              />
            )}
          </View>

          {availability === 'TAKEN' && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>*{'Username not available'}</Text>
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
          <View style={styles.textInputContainer}>
            <TextInput
              pointerEvents="none"
              editable={false}
              selectionColor={'#1e1e1e'}
              cursorColor={'#1e1e1e'}
              placeholderTextColor="#B2B2B2"
              placeholder="Enter Date of Birth"
              spellCheck={false}
              autoCorrect={false}
              autoCapitalize={'sentences'}
              style={[styles.textInputs]}
              value={dob}
            />

            <TouchableOpacity style={styles.calenderContainer} onPress={() => dispatch(toggleDateTimePicker({show: 1, type: 'dob', date: date ? date.toISOString() : new Date().toISOString()}))}>
              <Image source={require('../../Assets/Images/calenderdob.png')} contentFit="contain" style={{flex: 1}} />
            </TouchableOpacity>
          </View>
        </Pressable>

        <View style={{width: responsiveWidth(91), alignSelf: 'center'}}>
          <Text style={styles.titles}>Select Creator's Niche</Text>
        </View>

        <Pressable
          style={{
            borderColor: '#282828',
            borderRadius: responsiveWidth(3),
            width: responsiveWidth(91),
            alignSelf: 'center',
          }}
          onPress={() => handleDropdownPress()}>
          <View style={styles.textInputContainer}>
            <TextInput
              pointerEvents="none"
              editable={false}
              selectionColor={'#1e1e1e'}
              cursorColor={'#1e1e1e'}
              placeholderTextColor="#474747"
              placeholder="--Select Your Niche--"
              spellCheck={false}
              autoCorrect={false}
              autoCapitalize={'sentences'}
              style={[styles.textInputs, {fontSize: responsiveFontSize(2)}]}
            />
            <TouchableOpacity style={styles.calenderContainer} onPress={() => handleDropdownPress()}>
              {!dropdownVisible ? <Image source={require('../../Assets/Images/VerificationDown.png')} contentFit="contain" style={{flex: 1}} /> : <Image source={require('../../Assets/Images/verificationUp.png')} contentFit="contain" style={{flex: 1}} />}
            </TouchableOpacity>
          </View>
        </Pressable>

        <View style={selectedItems.length > 0 ? styles.nicheContainer : { marginBottom: responsiveWidth(4) }}>
          <BubbleView selectedItems={selectedItems} setSelectedItems={setSelectedItems} />
        </View>

        <View style={{width: responsiveWidth(91), alignSelf: 'center'}}>
          <AnimatedButton title={'Next'} onPress={() => updateProfileHandler()} />
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
    paddingTop: 24,
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: responsiveWidth(4),
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
  nicheContainer: {
    borderColor: '#282828',
    marginTop: 4,
    borderRadius: responsiveWidth(4),
    backgroundColor: '#fff',
    width: responsiveWidth(91),
    alignSelf: 'center',
    overflow: 'hidden',
  },
  bubbleContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
    paddingLeft: 0,
  },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFA86B',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 30,
    marginRight: 8,
    marginVertical: 4,
    borderWidth: 1.5,
    borderColor: '#1e1e1e',
  },
  bubbleText: {
    color: 'black',
    fontSize: 14,
    marginRight: 6,
    fontFamily: 'Rubik-Medium',
  },
  close: {
    color: '#1e1e1e',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
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
