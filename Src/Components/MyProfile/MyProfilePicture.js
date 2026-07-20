import {StyleSheet, Text, View, TouchableOpacity, Alert, Pressable} from 'react-native';
import React, {useCallback, useState} from 'react';
import {responsiveWidth} from 'react-native-responsive-dimensions';
import {useSelector} from 'react-redux';
import DIcon from '../../../DesiginData/DIcons';
import {launchImageLibrary} from 'react-native-image-picker';
import {useNavigation} from '@react-navigation/native';
import {useFocusEffect} from '@react-navigation/native';
import Verified from '../../../Assets/svg/verification.svg';
import {useLazyCreatorProfileQuery} from '../../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
import {Image, ImageBackground} from 'expo-image';
import {navigate} from '../../../Navigation/RootNavigation';
import {LoginPageErrors} from '../ErrorSnacks';

const MyProfilePicture = ({isEditable, isDark = false, isVerification = false}) => {
  const navigation = useNavigation();
  const userInformation = useSelector(state => state.auth.user);
  const [getUserProfileDetailsApi] = useLazyCreatorProfileQuery({refetchOnFocus: true});
  const userInfo = useSelector(state => state.auth.user);

  const [click, setClick] = useState(false);

  const [clickTwo, setClickTwo] = useState(false);

  const handlePictureChange = useCallback(async type => {
    const mediaInfo = await launchImageLibrary({mediaType: 'photo', selectionLimit: 1});

    if (!mediaInfo.didCancel) {
      const image = mediaInfo?.assets[0];

      if (image?.fileSize > 6 * 1024 * 1024) {
        LoginPageErrors('Selected image exceeds 6MB limit. Please choose a smaller image.');
        return;
      }

      navigation.navigate('cropViewScreen', {uri: image?.uri, type: type});
    } else {
      console.log('User Canceled the selection');
    }
  }, []);

  if (isVerification) {
    return (
      <View style={styles.vWrapper}>
        {/* Cover Photo Container */}
        <View style={[
          styles.vCoverContainer, 
          isDark 
            ? {backgroundColor: '#1C1C1C', borderColor: '#212121'} 
            : {backgroundColor: '#FFFFFF', borderColor: '#1E1E1E'}
        ]}>
          <ImageBackground
            placeholder={require('../../../Assets/Images/CoverDefault.jpeg')}
            source={userInfo?.currentUserCoverPicture ? {uri: userInfo?.currentUserCoverPicture} : require('../../../Assets/Images/light_gray.jpg')}
            style={styles.vCoverImage}
            contentFit="cover"
          >
            {/* Rectangle 38 semi-transparent overlay */}
            <View style={styles.vCoverOverlay} />
          </ImageBackground>

          {/* Cover Edit Button */}
          {isEditable && (
            <Pressable
              style={{
                position: 'absolute',
                right: 12,
                bottom: 12,
                width: 32,
                height: 32,
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 3,
              }}
              onPress={() => handlePictureChange('Cover')}
            >
              <Image 
                source={isDark ? require('../../../Assets/Images/ChangeProfileDark.png') : require('../../../Assets/Images/ChangeProfile.png')} 
                style={{width: '100%', height: '100%', resizeMode: 'contain'}} 
              />
            </Pressable>
          )}
        </View>

        {/* Profile Pic Shadow Offset Layer (Ellipse 13) */}
        <View style={[
          styles.vProfileShadow,
          isDark 
            ? {backgroundColor: '#1C1C1C', borderColor: '#212121'} 
            : {backgroundColor: '#1E1E1E', borderColor: '#1E1E1E'}
        ]} />

        {/* Profile Pic Front Container (Ellipse 12) */}
        <View style={[
          styles.vProfileContainer,
          isDark 
            ? {backgroundColor: '#121212', borderColor: '#212121'} 
            : {backgroundColor: '#FFFFFF', borderColor: '#1E1E1E'}
        ]}>
          <Image
            placeholder={require('../../../Assets/Images/DefaultProfile.jpg')}
            source={userInfo?.currentUserProfilePicture ? {uri: userInfo?.currentUserProfilePicture} : require('../../../Assets/Images/DefaultProfile.jpg')}
            style={styles.vProfileImage}
            resizeMethod="resize"
            contentFit="cover"
          />
        </View>

        {/* Profile Edit Button */}
        {isEditable && (
          <Pressable
            style={{
              position: 'absolute',
              left: 70,
              top: 189,
              width: 32,
              height: 32,
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 3,
            }}
            onPress={() => handlePictureChange('Profile')}
          >
            <Image 
              source={isDark ? require('../../../Assets/Images/ChangeProfileDark.png') : require('../../../Assets/Images/ChangeProfile.png')} 
              style={{width: '100%', height: '100%', resizeMode: 'contain'}} 
            />
          </Pressable>
        )}
      </View>
    );
  }

  return (
    <>
      <View style={{width: '100%', justifyContent: 'center', alignItems: 'center'}}>
        <ImageBackground placeholder={require('../../../Assets/Images/CoverDefault.jpeg')} source={userInfo?.currentUserCoverPicture ? {uri: userInfo?.currentUserCoverPicture} : require('../../../Assets/Images/light_gray.jpg')} style={[styles.coverStyle, isDark && {backgroundColor: '#1A1A1A'}]}></ImageBackground>
      </View>

      <View style={[styles.overlayButton, isDark && {backgroundColor: '#000000'}]} />
      <View style={styles.profilePictureContainer}>
        <Image
          placeholder={require('../../../Assets/Images/DefaultProfile.jpg')}
          source={userInfo?.currentUserProfilePicture ? {uri: userInfo?.currentUserProfilePicture} : require('../../../Assets/Images/DefaultProfile.jpg')}
          style={styles.profilePicture}
          resizeMethod="resize"
          contentFit="contain"
        />
      </View>

      {isEditable ? (
        <Pressable
          onPressIn={() => setClickTwo(true)}
          onPressOut={() => setClickTwo(false)}
          style={[{borderRadius: responsiveWidth(10), backgroundColor: isDark ? '#1A1A1A' : '#fff', position: 'absolute', zIndex: 4, transform: [{translateX: responsiveWidth(22)}, {translateY: responsiveWidth(50)}]}, clickTwo && {backgroundColor: isDark ? '#FF7819' : '#FFE1CC'}]}
          onPress={() => handlePictureChange('Profile')}>
          <Image source={isDark ? require('../../../Assets/Images/ChangeProfileDark.png') : require('../../../Assets/Images/ChangeProfile.png')} style={{height: responsiveWidth(8), width: responsiveWidth(8), resizeMode: 'contain', zIndex: 8, alignSelf: 'center'}} />
        </Pressable>
      ) : null}

      <Pressable
        onPressIn={() => setClick(true)}
        onPressOut={() => setClick(false)}
        style={[{position: 'absolute', backgroundColor: isDark ? '#1A1A1A' : '#fff', borderRadius: responsiveWidth(10), transform: [{translateX: responsiveWidth(88)}, {translateY: responsiveWidth(38)}]}, click && {backgroundColor: isDark ? '#FF7819' : '#FFE1CC'}]}
        onPress={isEditable ? () => handlePictureChange('Cover') : () => navigate('editProfile')}>
        <Image source={isDark ? require('../../../Assets/Images/ChangeProfileDark.png') : require('../../../Assets/Images/ChangeProfile.png')} style={{height: responsiveWidth(8), width: responsiveWidth(8), resizeMode: 'contain', zIndex: 8, alignSelf: 'center'}} />
      </Pressable>
    </>
  );
};

export default React.memo(MyProfilePicture);

const styles = StyleSheet.create({
  coverStyle: {
    height: responsiveWidth(50),
    width: '100%',
    overflow: 'hidden',
    backgroundColor: 'white',
  },

  profilePictureContainer: {
    borderWidth: responsiveWidth(0.5),
    height: responsiveWidth(25),
    width: responsiveWidth(25),
    borderRadius: responsiveWidth(20),
    resizeMode: 'contain',
    overflow: 'hidden',
    position: 'absolute',
    left: responsiveWidth(5.6),
    top: responsiveWidth(32),
    backgroundColor: 'white',
    // padding: responsiveWidth(0.8),
  },

  profilePicture: {
    height: '100%',
    width: '100%',
    borderRadius: responsiveWidth(13),
  },

  overlayButton: {
    height: responsiveWidth(25),
    width: responsiveWidth(25),
    borderRadius: responsiveWidth(20),
    backgroundColor: '#1e1e1e',
    position: 'absolute',
    marginLeft: responsiveWidth(6.6),
    marginTop: responsiveWidth(32.8),
  },

  vWrapper: {
    width: responsiveWidth(91),
    height: 224,
    alignSelf: 'center',
    marginTop: 0,
    position: 'relative',
    marginBottom: 16,
  },
  vCoverContainer: {
    width: '100%',
    height: 174,
    borderRadius: 16,
    borderWidth: 1.5,
    overflow: 'hidden',
    position: 'relative',
  },
  vCoverImage: {
    width: '100%',
    height: '100%',
  },
  vCoverOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(30, 30, 30, 0.3)',
  },
  vProfileContainer: {
    width: 97,
    height: 97,
    borderRadius: 48.5,
    borderWidth: 1.5,
    position: 'absolute',
    left: 0,
    top: 120,
    overflow: 'hidden',
    zIndex: 2,
  },
  vProfileShadow: {
    width: 97,
    height: 97,
    borderRadius: 48.5,
    borderWidth: 1.5,
    position: 'absolute',
    left: 3,
    top: 123,
    zIndex: 1,
  },
  vProfileImage: {
    width: '100%',
    height: '100%',
  },
});
