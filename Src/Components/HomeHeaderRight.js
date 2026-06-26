import {StyleSheet, View, TextInput, Touchable, TouchableOpacity, Pressable} from 'react-native';
import React, {useCallback, useEffect, useState} from 'react';
import {responsiveWidth} from 'react-native-responsive-dimensions';
import {Image} from 'expo-image';

import {useDispatch, useSelector} from 'react-redux';
import {setPostsCardType, toggleCreatePostBottomSheet, toggleHomeBottomSheet} from '../../Redux/Slices/NormalSlices/HideShowSlice';
import {navigate} from '../../Navigation/RootNavigation';
import AddSvg from '../../AddSvg';
import Ham from '../../Assets/svg/ham.svg';

const HomeHeaderRight = () => {
  const dispatch = useDispatch();

  const loggedUserInfo = useSelector(state => state.auth.user);

  const postCardType = useSelector(state => state.hideShow.visibility.postCardType);

  const handleHomeBottomSheetOpener = type => {
    console.log('[BS_DEBUG][HeaderRight] handleHomeBottomSheetOpener called, type =', type);
    if (type === '3Bars') {
      console.log('[BS_DEBUG][HeaderRight] Dispatching createPostSheet=-1, homeBottomSheet=1');
      dispatch(toggleCreatePostBottomSheet({show: -1}));
      dispatch(toggleHomeBottomSheet({show: 1}));
    }
  };

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity onPress={() => navigate('notifications')}>
        <View style={styles.iconContainer}>
          <Image source={require('../../Assets/Images/notification.png')} contentFit="contain" style={{flex: 1, tintColor: '#FFFFFF'}} />
        </View>
      </TouchableOpacity>

      {postCardType === 'normal' ? (
        <TouchableOpacity onPress={() => handleHomeBottomSheetOpener('3Bars')}>
          <View style={styles.iconContainer}>
            <Image source={require('../../Assets/Images/hamBurger.png')} contentFit="contain" style={{flex: 1, tintColor: '#FFFFFF'}} />
          </View>
        </TouchableOpacity>
      ) : (
        <Pressable onPress={() => dispatch(setPostsCardType({postCardType: 'normal'}))}>
          {/* <Image source={require("../../Assets/Images/BrandButton.png")} style={{ height: responsiveWidth(8), width: responsiveWidth(8), resizeMode: "contain", alignSelf: "center" }} /> */}
        </Pressable>
      )}
    </View>
  );
};

export default HomeHeaderRight;

const styles = StyleSheet.create({
  wrapper: {
    width: '50%',
    height: responsiveWidth(12),
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    overflow: 'hidden',
    marginRight: 20,
    gap: responsiveWidth(5),
    // backgroundColor : 'red'
  },

  textStyle: {
    fontSize: responsiveWidth(4),
    fontFamily: 'MabryPro-Regular',
  },
  iconContainer: {
    height: 22,
    width: 23,
    // backgroundColor :"green"
  },
});
