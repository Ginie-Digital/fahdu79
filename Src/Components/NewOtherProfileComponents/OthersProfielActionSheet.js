/* eslint-disable react-native/no-inline-styles */
import React, {useCallback, useEffect, useState, useRef, useMemo} from 'react';
import {View, Text, StyleSheet, Pressable, ActivityIndicator, Platform} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {BottomSheetBackdrop, BottomSheetModal} from '@gorhom/bottom-sheet';
import DIcon from '../../../DesiginData/DIcons';
import {useDispatch, useSelector} from 'react-redux';
import {chatRoomSuccess, LoginPageErrors} from '../ErrorSnacks';
import {navigate} from '../../../Navigation/RootNavigation';
import {unFollowProfileCache, unSubscribeProfileCache} from '../../../Redux/Slices/NormalSlices/Posts/ProfileFeedCacheSlice';
import {useBlockUserMutation, useUnFollowUserMutation, useUnSubscribeMutation} from '../../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
import {toggleOtherProfileActionModal, toggleRefreshOtherProfile} from '../../../Redux/Slices/NormalSlices/HideShowSlice';
import {triggerImpactLight} from '../../Utils/Haptics';
import {useAppTheme} from '../../Hook/useAppTheme';

const OthersProfileActionSheet = ({toCallApiInfo, onUnsubscribePress, isFetchingSubscription}) => {
  const dispatcher = useDispatch();
  const bottomSheetModalRef = useRef(null);
  const {bottom: bottomInset} = useSafeAreaInsets();
  const {isDark} = useAppTheme();

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
        provider: 'MaterialCommunityIcons',
        iconName: 'tag-remove-outline',
      });
    } else if (haveFollowed) {
      list.push({
        id: 1,
        title: 'Unfollow',
        provider: 'Feather',
        iconName: 'user-minus',
      });
    }

    list.push({
      id: 3,
      title: 'Block',
      provider: 'MaterialIcons',
      iconName: 'block',
    });

    setProfileActionList(list);
  }, [haveFollowed, haveSubscribed]);

  const snapPoints = useMemo(() => {
    const itemCount = profileActionList.length;
    const height = itemCount * 59 + 51 + bottomInset;
    return [height];
  }, [profileActionList, bottomInset]);

  const isDismissedByGesture = useRef(false);

  useEffect(() => {
    if (visible) {
      isDismissedByGesture.current = false;
      requestAnimationFrame(() => {
        bottomSheetModalRef.current?.present();
      });
      triggerImpactLight();
    } else {
      if (!isDismissedByGesture.current) {
        bottomSheetModalRef.current?.dismiss();
      } else {
        isDismissedByGesture.current = false;
      }
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
        if (error) {
          LoginPageErrors(error?.data?.message);
        }
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
          if (error) {
            LoginPageErrors(error?.data?.message);
          }
        }
      }

      if (id === 3) {
        let {data} = await blockUser({token, data: {id: toCallApiInfo?.userId}});
        if (data) {
          handleClose();
          chatRoomSuccess('We have blocked the user for you!');
          navigate('home');
        }
      }
    },
    [toCallApiInfo, token, handleClose, dispatcher, unFollowUser, unSubscribe, blockUser, onUnsubscribePress],
  );

  const renderBackdrop = useCallback(
    props => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />,
    [],
  );

  const themeBg = isDark ? '#121212' : '#FFFFFF';
  const themeBorder = isDark ? '#2A2A2A' : '#E0E0E0';
  const themeText = isDark ? '#FFFFFF' : '#1E1E1E';
  const themeIcon = isDark ? '#E5E7EB' : '#4A4A4A';
  const themePressed = isDark ? '#1E1E1E' : '#F2F2F2';

  return (
    <BottomSheetModal
      ref={bottomSheetModalRef}
      index={visible ? 0 : -1}
      snapPoints={snapPoints}
      backdropComponent={renderBackdrop}
      onDismiss={() => {
        isDismissedByGesture.current = true;
        handleClose();
      }}
      enableDynamicSizing={false}
      handleComponent={null}
      backgroundStyle={[styles.modalBackground, {backgroundColor: themeBg}]}
    >
      <View style={[styles.contentContainer, {backgroundColor: themeBg}]}>
        {profileActionList.map((item, index) => {
          const isFirst = index === 0;
          return (
            <Pressable
              key={item.id}
              onPress={() => handleEachOptions(item.id)}
              style={({pressed}) => [
                styles.itemContainer,
                {
                  backgroundColor: themeBg,
                  borderBottomColor: themeBorder,
                },
                isFirst && styles.firstItem,
                pressed && {backgroundColor: themePressed},
              ]}
            >
              <View style={styles.itemRow}>
                {item.id === 4 && isFetchingSubscription ? (
                  <ActivityIndicator size="small" color={themeText} />
                ) : (
                  <DIcon
                    provider={item.provider}
                    name={item.iconName}
                    size={18}
                    color={item.id === 3 ? '#FF2020' : themeIcon}
                  />
                )}
                <Text
                  style={[
                    styles.itemText,
                    {color: item.id === 3 ? '#E53935' : themeText},
                  ]}
                >
                  {item.title}
                </Text>
              </View>
            </Pressable>
          );
        })}
        <Pressable
          onPress={handleClose}
          style={({pressed}) => [
            styles.cancelContainer,
            {
              backgroundColor: themeBg,
              paddingBottom: 14 + bottomInset,
            },
            pressed && {backgroundColor: themePressed},
          ]}
        >
          <Text style={[styles.cancelText, {color: themeText}]}>Cancel</Text>
        </Pressable>
      </View>
    </BottomSheetModal>
  );
};

const styles = StyleSheet.create({
  modalBackground: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  contentContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    width: '100%',
  },
  itemContainer: {
    width: '100%',
    height: 59,
    borderBottomWidth: 2,
    justifyContent: 'center',
    paddingLeft: 32,
  },
  firstItem: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemText: {
    fontFamily: 'Rubik-Medium',
    fontSize: 16,
    lineHeight: 19,
    marginLeft: 12,
  },
  cancelContainer: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 18,
  },
  cancelText: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: 16,
    lineHeight: 19,
  },
});

export default OthersProfileActionSheet;
