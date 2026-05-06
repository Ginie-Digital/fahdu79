import React, {useCallback, useEffect, useState} from 'react';
import {Platform, Pressable, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {responsiveFontSize, responsiveWidth} from 'react-native-responsive-dimensions';
import {useDispatch, useSelector} from 'react-redux';
import DIcon from '../../../DesiginData/DIcons';
import {useNavigation} from '@react-navigation/native';
import {FONT_SIZES, nTwins, WIDTH_SIZES} from '../../../DesiginData/Utility';
import {toggleChatWindowFeeSetup, toggleChatWindowInformationModal, toggleLabelModal} from '../../../Redux/Slices/NormalSlices/HideShowSlice';
import AddSvg from '../../../AddSvg';
import Veri from '../../../Assets/svg/vvv.svg'; // Assuming this is the verification badge
import {Image} from 'expo-image';

import Back from '../../../Assets/svg/back.svg';
import {SafeAreaView} from 'react-native-safe-area-context';
import axios from 'axios';
import {useLazyOnlineStatusQuery} from '../../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';

const HeaderLeft = () => {
  const navigation = useNavigation();
  const senderBioDetail = useSelector(state => state.senderDetail.bio);

  const currentUserRole = useSelector(state => state.auth.user.role);

  const dispatcher = useDispatch();

  const isOnline = useSelector(state => state.hideShow.visibility.onlineStatus);

  const handleGoToOthersProfile = useCallback(() => {
    navigation.navigate('othersProfile', {
      userName: senderBioDetail?.name,
      userId: senderBioDetail?.id,
      role: senderBioDetail?.role,
    });
  }, [senderBioDetail]);

  return (
    <SafeAreaView edges={['top']}>
      <View style={[styles.headerWrapper]}>
        {/* Back Button */}
        {/* <DIcon provider={'Ionicons'} name={'chevron-back'} color={'#000'} size={responsiveWidth(6)} style={styles.backIcon}  /> */}

        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Back />
        </TouchableOpacity>

        <Pressable onPress={handleGoToOthersProfile}>
          {({pressed}) => (
            <>
              <View style={styles.profileImage}>
                <Image
                  style={[{flex: 1}, pressed && {opacity: 0.6}]} // apply pressed to image
                  placeholderContentFit="cover"
                  contentFit="cover"
                  placeholder={require('../../../Assets/Images/DefaultProfile.jpg')}
                  source={{uri: senderBioDetail?.profileImageUrl}}
                />
              </View>

              {senderBioDetail?.role === 'creator' && (
                <View style={styles.verifyContainer}>
                  <Image cachePolicy="memory-disk" source={require('../../../Assets/Images/verify.png')} contentFit="contain" style={{flex: 1}} />
                </View>
              )}
            </>
          )}
        </Pressable>

        <View style={styles.profileInfo}>
          <Pressable style={{flexDirection: 'row', alignItems: 'center', gap: responsiveWidth(0.8)}} onPress={handleGoToOthersProfile}>
            {({pressed}) => (
              <Text
                style={[
                  styles.profileName,
                  {maxWidth: responsiveWidth(36)},
                  pressed && {color: '#999999'}, // change to desired color on press
                ]}
                numberOfLines={1}
                ellipsizeMode="tail">
                {senderBioDetail?.name}
              </Text>
            )}
          </Pressable>

          <View style={styles.onlineStatusContainer}>
            <View
              style={{
                width: 11,
                height: 11,
                borderRadius: responsiveWidth(20),
                backgroundColor: isOnline === true ? '#00E532' : '#FF4539',
                borderColor: '#1e1e1e',
                borderWidth: WIDTH_SIZES['1.5'],
                marginRight: 6,
              }}
            />

            <Text style={styles.profileCategory}>{isOnline ? 'online' : 'offline'}</Text>
          </View>
        </View>

        {/* Header Right Icons */}

        {currentUserRole === 'creator' && senderBioDetail?.role !== 'admin' && (
          <View style={styles.newIconContainer}>
            <TouchableOpacity onPress={() => dispatcher(toggleChatWindowFeeSetup({show: true}))}>
              <Image source={require('../../../Assets/Images/coinSetting.png')} style={styles.iconImage} />
            </TouchableOpacity>

            <TouchableOpacity onPress={() => dispatcher(toggleLabelModal({show: true}))}>
              <Image source={require('../../../Assets/Images/threeDotsNew.png')} style={styles.iconImage} />
            </TouchableOpacity>
          </View>
        )}

        {currentUserRole === 'user' && senderBioDetail?.role === 'creator' && (
          <View style={styles.newIconContainer}>
            <TouchableOpacity onPress={() => dispatcher(toggleChatWindowInformationModal())}>
              <Image source={require('../../../Assets/Images/upSideI.png')} style={styles.iconImage} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

export default HeaderLeft;

const styles = StyleSheet.create({
  headerWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
    paddingHorizontal: WIDTH_SIZES[24],
    backgroundColor: '#fff',
    width: '100%',
  },
  backIcon: {
    alignSelf: 'center',

    // marginRight : -10
  },
  profileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: responsiveWidth(2),
    flex: 1,
    marginLeft: responsiveWidth(2),
  },
  profileWrapper: {
    position: 'relative',
  },

  verificationBadge: {
    position: 'absolute',
    top: -6,
    right: -responsiveWidth(3),
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 2,
  },
  userName: {
    fontFamily: 'Rubik-Bold',
    fontSize: responsiveFontSize(2),
    color: '#000',
    maxWidth: responsiveWidth(30),
  },
  newIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: responsiveWidth(2),
    backgroundColor: '#fff',
  },

  //dsff

  profileImage: {
    width: WIDTH_SIZES[36],
    height: WIDTH_SIZES[36],
    borderRadius: responsiveWidth(30),
    marginRight: WIDTH_SIZES[14],
    borderWidth: responsiveWidth(0.4),
    overflow: 'hidden',
    borderWidth: responsiveWidth(0.53),
    position: 'relative',
  },
  profileInfo: {
    flex: 1,
    backgroundColor: '#fff',
    flexDirection: 'column',
    justifyContent: 'center',
  },
  profileName: {
    fontSize: FONT_SIZES[16],
    color: '#1e1e1e',
    fontFamily: 'Rubik-Bold',
    includeFontPadding: false,
  },
  profileCategory: {
    color: '#1e1e1e',
    fontFamily: 'Rubik-Regular',
    fontSize: FONT_SIZES['12'],
  },
  iconContainer: {
    marginRight: responsiveWidth(4),
    height: 19,
    width: 19,
  },
  verifyContainer: {
    position: 'absolute',
    top: -2,
    right: WIDTH_SIZES[14],
    width: WIDTH_SIZES[18],
    height: WIDTH_SIZES[18],
  },
  backButton: {
    height: responsiveWidth(10),
    width: responsiveWidth(10),
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  iconImage: {
    width: 25,
    height: 25,
    resizeMode: 'contain',
  },
  onlineStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  onlineIcon: {
    width: WIDTH_SIZES[8], // Adjust size as needed
    height: WIDTH_SIZES[8],
    marginRight: 5, // Space between icon and text
  },
});
