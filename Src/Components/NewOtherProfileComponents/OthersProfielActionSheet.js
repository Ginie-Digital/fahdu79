// import { StyleSheet, View, TouchableOpacity, Text, Image, Pressable, BackHandler } from "react-native";
// import React, { useMemo, useCallback, useRef, useState, useEffect } from "react";
// import { responsiveWidth, responsiveFontSize } from "react-native-responsive-dimensions";
// import BottomSheet, { BottomSheetBackdrop } from "@gorhom/bottom-sheet";
// import DIcon from "../../../DesiginData/DIcons";
// import { FlatList } from "react-native-gesture-handler";
// import { homeBottomSheetList, homeBottomSheetListRoleUser, profileActionList } from "../../../DesiginData/Data";
// import { LinearGradient } from 'expo-linear-gradient';
// import { useDispatch, useSelector } from "react-redux";
// import { toggleOtherProfileActionSheet } from "../../../Redux/Slices/NormalSlices/HideShowSlice";

// import { token as memoizedToken } from "../../../Redux/Slices/NormalSlices/AuthSlice";
// import { LoginPageErrors, chatRoomSuccess } from "../ErrorSnacks";

import React, {useCallback, useEffect, useState, useRef, useMemo} from 'react';
import {View, Text, StyleSheet, Linking, Alert, TouchableOpacity, Pressable, BackHandler, ActivityIndicator} from 'react-native';
import {BottomSheetBackdrop, BottomSheetModal} from '@gorhom/bottom-sheet';
import Feather from 'react-native-vector-icons/Feather';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import DIcon from '../../../DesiginData/DIcons';
import AnimatedButton from '../../Components/AnimatedButton';
import {responsiveFontSize, responsiveHeight, responsiveWidth} from 'react-native-responsive-dimensions';
import {BlurView} from 'expo-blur';
import {Image} from 'expo-image';
import {useDispatch, useSelector} from 'react-redux';
import {FONT_SIZES, nTwins, WIDTH_SIZES} from '../../../DesiginData/Utility';
import {chatRoomSuccess, LoginPageErrors} from '../ErrorSnacks';
import {navigate} from '../../../Navigation/RootNavigation';
import {unFollowProfileCache, unSubscribeProfileCache} from '../../../Redux/Slices/NormalSlices/Posts/ProfileFeedCacheSlice';
import {useBlockUserMutation, useUnFollowUserMutation, useUnSubscribeMutation} from '../../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
import {toggleOtherProfileActionModal, toggleRefreshOtherProfile} from '../../../Redux/Slices/NormalSlices/HideShowSlice';
import {FlatList, TouchableWithoutFeedback} from 'react-native-gesture-handler';
import {triggerImpactLight} from '../../Utils/Haptics';

const OthersProfileActionSheet = ({toCallApiInfo, onUnsubscribePress, isFetchingSubscription}) => {
  const dispatcher = useDispatch();
  const bottomSheetModalRef = useRef(null);
  const snapPoints = useMemo(() => ['32%'], []);

  const {haveFollowed, haveSubscribed} = useSelector(state => state.profileFeedCache.data);
  const token = useSelector(state => state.auth.user.token);
  const visible = useSelector(state => state.hideShow.visibility.otherProfileActionModal);

  const [unFollowUser] = useUnFollowUserMutation();
  const [unSubscribe] = useUnSubscribeMutation();
  const [blockUser] = useBlockUserMutation();

  const [profileActionList, setProfileActionList] = useState([]);

  useEffect(() => {
    let list = [];
    if (haveSubscribed) {
      list.push({
        id: 4,
        title: 'Unsubscribe',
        subtitle: 'You will lose your exclusive member pricing and access to private updates. Future purchases will revert to standard follower rates.',
        provider: 'MaterialCommunityIcons',
        iconName: 'tag-remove-outline',
      });
    } else if (haveFollowed) {
      list.push({
        id: 1,
        title: 'Unfollow',
        subtitle: "You will stop seeing this user's posts in your feed, but you will still keep your current pricing benefits if you are a subscriber.",
        provider: 'Feather',
        iconName: 'eye-off',
      });
    }

    list.push({
      id: 3,
      title: 'Block user',
      subtitle: 'Completely hide this profile. They will no longer be able to see your content, message you, or interact with your profile in any way.',
      provider: 'MaterialCommunityIcons',
      iconName: 'shield-alert-outline',
      titleColor: '#8B0000',
    });

    setProfileActionList(list);
  }, [haveFollowed, haveSubscribed]);

  useEffect(() => {
    if (visible) {
      bottomSheetModalRef.current?.present();
      triggerImpactLight();
    } else {
      bottomSheetModalRef.current?.dismiss();
      triggerImpactLight();
    }
  }, [visible]);

  const handleClose = useCallback(() => {
    dispatcher(toggleOtherProfileActionModal({show: false}));
  }, [dispatcher]);

  const handleEachOptions = useCallback(
    async id => {
      triggerImpactLight();
      console.log(id);

      if (id === 1) {
        let {data, error} = await unFollowUser({token, displayName: toCallApiInfo?.userName});
        if (data) {
          LoginPageErrors(`You have unfollowed ${toCallApiInfo?.userName}`);
          dispatcher(unFollowProfileCache());
          handleClose();
        }
        if (error) LoginPageErrors(error?.data?.message);
      }

      if (id === 4) {
        if (Platform.OS === 'android') {
          if (onUnsubscribePress) {
            onUnsubscribePress();
          }
        } else {
          let {data, error} = await unSubscribe({token, data: {displayName: toCallApiInfo?.userName}});
          if (data) {
            LoginPageErrors(`You have unsubscribed from ${toCallApiInfo?.userName}`);
            dispatcher(unSubscribeProfileCache());
            handleClose();
            dispatcher(toggleRefreshOtherProfile());
          }
          if (error) LoginPageErrors(error?.data?.message);
        }
      }

      if (id === 3) {
        let {data, error} = await blockUser({token, data: {id: toCallApiInfo?.userId}});
        if (data) {
          handleClose();
          chatRoomSuccess('We have blocked the user for you!');
          navigate('home');
        }
      }
    },
    [toCallApiInfo, token, handleClose, dispatcher, unFollowUser, unSubscribe, blockUser],
  );

  const renderBackdrop = useCallback(
    props => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />,
    [],
  );

  return (
    <BottomSheetModal
      ref={bottomSheetModalRef}
      index={visible ? 0 : -1}
      snapPoints={snapPoints}
      backdropComponent={renderBackdrop}
      onDismiss={handleClose}
      enableDynamicSizing={false}
      backgroundStyle={{backgroundColor: '#FFFFFF'}}
    >
      <View style={styles.contentContainer}>
        <View style={styles.optionsBox}>
          <FlatList
            data={profileActionList}
            keyExtractor={item => item.id.toString()}
            renderItem={({item}) => (
              <Pressable 
                onPress={() => handleEachOptions(item.id)} 
                style={({pressed}) => [styles.eachSortModalList, pressed && styles.highlightedOption]}
              >
                <View style={styles.itemRow}>
                  <View style={[styles.iconBox]}>
                    {item.id === 4 && isFetchingSubscription ? (
                      <ActivityIndicator size="small" color="#282828" />
                    ) : (
                      <DIcon 
                        provider={item.provider} 
                        name={item.iconName} 
                        size={item.provider === 'MaterialCommunityIcons' ? 32 : 30} 
                        color={item.id === 3 ? '#8B0000' : '#282828'} 
                      />
                    )}
                  </View>
                  <View style={styles.textStack}>
                    <Text style={[styles.titleText, item.titleColor ? {color: item.titleColor} : null]}>
                    {item.title}
                  </Text>
                  {item.id === 4 && (
                    <Text style={[styles.subtitleText]}>
                      <Text style={styles.subtitleBold}>Lose exclusive member pricing</Text> and access to private updates.
                    </Text>
                  )}
                  {item.id === 1 && (
                    <Text style={[styles.subtitleText]}>
                      Stop seeing posts in your feed. <Text style={styles.subtitleBold}>Keep your current pricing benefits</Text>.
                    </Text>
                  )}
                  {item.id === 3 && (
                    <Text style={[styles.subtitleText, {color: 'rgba(139, 0, 0, 0.7)'}]}>
                      <Text style={[styles.subtitleBold, {color: '#8B0000'}]}>Completely hide</Text> this profile. Stops all interactions and content visibility.
                    </Text>
                  )}
                </View>
                </View>
              </Pressable>
            )}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        </View>
      </View>
    </BottomSheetModal>
  );
};

const styles = StyleSheet.create({
  contentContainer: {
    paddingTop: 12,
    paddingHorizontal: responsiveWidth(4),
  },
  optionsBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
  },
  eachSortModalList: {
    paddingVertical: responsiveWidth(5),
    paddingHorizontal: responsiveWidth(5),
    justifyContent: 'center',
  },
  highlightedOption: {
    backgroundColor: '#F5F5F5',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textStack: {
    flex: 1,
  },
  titleText: {
    fontSize: FONT_SIZES[16] || 16,
    fontFamily: 'Rubik-Medium',
    color: '#1e1e1e',
    marginBottom: 2,
  },
  subtitleText: {
    fontSize: FONT_SIZES[12] || 12,
    fontFamily: 'Rubik-Regular',
    color: '#4A4A4A',
    lineHeight: 16,
  },
  subtitleBold: {
    fontFamily: 'Rubik-Bold',
    color: '#1e1e1e',
  },
  separator: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginHorizontal: responsiveWidth(5),
  },
});

export default OthersProfileActionSheet;
