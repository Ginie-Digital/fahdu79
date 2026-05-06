import {StyleSheet, View, TextInput, Touchable, TouchableOpacity, Text, Pressable, Platform, Alert, Keyboard, Image} from 'react-native';
import {responsiveFontSize, responsiveHeight, responsiveWidth} from 'react-native-responsive-dimensions';
import {clearSearchString, insertSearchString, setIsSearchMode} from '../../../Redux/Slices/NormalSlices/MessageSlices/ChatRoomSearchValueSlice';
import React, {useCallback, useEffect, useState} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {FONT_SIZES, nTwins, nTwinsFont, selectionTwin, WIDTH_SIZES} from '../../../DesiginData/Utility';
import DIcon from '../../../DesiginData/DIcons';
import ChatRoomAudienceSort from '../ChatRoomAudienceSort';
import {toggleChatRoomModal} from '../../../Redux/Slices/NormalSlices/HideShowSlice';
import Filter from '../../../Assets/svg/filter.svg';
import ReactNativeHapticFeedback from "react-native-haptic-feedback";
import { useNavigation } from '@react-navigation/native';
import { useGetPendingCallsQuery, useGetScheduledCallsQuery } from '../../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';

const ChatRoomHeader = () => {
  const [searchString, setSearchString] = useState('');

  const [focus, setFocus] = useState(false);
  
  const isSearchActive = useSelector(state => state.chatRoomSearchValue.data.isSearchMode);

  const dispatch = useDispatch();

  useEffect(() => {
    let debounceSearch = setTimeout(() => {
      dispatch(insertSearchString({searchString}));
    }, 300);

    return () => {
      clearTimeout(debounceSearch);
    };
  }, [searchString]);

  const handleClearText = useCallback(() => {
    if (searchString?.length > 0) {
      dispatch(clearSearchString());
      setSearchString('');
    }
  }, [searchString]);
  
  const handleBackPress = () => {
    dispatch(setIsSearchMode(false));
    setFocus(false);
    Keyboard.dismiss();
    handleClearText();
  };

  const role = useSelector(state => state.auth.user.role);
  const token = useSelector(state => state.auth.user.token);
  const navigation = useNavigation();

  // Fetch Call Requests counts
  const { data: pendingCallsData } = useGetPendingCallsQuery(token, {
    pollingInterval: 30000,
  });
  const { data: scheduledCallsData } = useGetScheduledCallsQuery(token, {
    pollingInterval: 30000,
  });

  const pendingCount = pendingCallsData?.data?.metadata?.[0]?.total || 0;
  const scheduledCount = scheduledCallsData?.data?.metadata?.[0]?.total || 0;
  const totalCallRequests = Number(pendingCount) + Number(scheduledCount);

  const hapticOptions = {
    enableVibrateFallback: true,
    ignoreAndroidSystemSettings: false,
  };

  const handlePhonePress = () => {
    ReactNativeHapticFeedback.trigger("impactLight", hapticOptions);
    navigation.navigate('CallRequests');
  };

  const handleBurgerPress = () => {
    ReactNativeHapticFeedback.trigger("impactLight", hapticOptions);
    dispatch(toggleChatRoomModal());
  };

  return (
    <View style={styles.container}>
      {!isSearchActive && (
        <View style={{width: '100%', backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}>
          <Text style={styles.header}>Chats</Text>
          <View style={styles.headerIconsContainer}>
            <TouchableOpacity 
              activeOpacity={0.7}
              onPress={handlePhonePress}
              style={styles.headerIconButton}
            >
              <Image 
                source={require('../../../Assets/Images/chatRoomHeaderCall.png')} 
                style={styles.headerIconImage}
              />
              {totalCallRequests > 0 && (
                <View style={styles.headerBadge}>
                  <Text style={styles.headerBadgeText}>{totalCallRequests}</Text>
                </View>
              )}
            </TouchableOpacity>

            {role === 'creator' && (
              <TouchableOpacity 
                activeOpacity={0.7}
                onPress={handleBurgerPress}
                style={styles.headerIconButton}
              >
                <Image 
                  source={require('../../../Assets/Images/chatRoomHeaderBurger.png')} 
                  style={styles.headerIconImage}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      <View style={{flexDirection: 'row', alignItems: 'center', marginTop: isSearchActive ? 0 : responsiveWidth(3)}}>
        {isSearchActive && (
           <TouchableOpacity onPress={handleBackPress} style={{ marginRight: 10 }}>
              <DIcon provider={'AntDesign'} name={'arrowleft'} size={24} color={'#1e1e1e'} />
           </TouchableOpacity>
        )}
        <View style={[{flexDirection: 'row', backgroundColor: 'white', flex: 1, borderRadius: responsiveWidth(4), borderWidth: WIDTH_SIZES[1.5], borderColor: '#1e1e1e'}, focus && {backgroundColor: '#FFF9F5'}]}>
          <TextInput
            selectionColor={selectionTwin()}
            selectionHandleColor={'#ffa86b'}
            cursorColor={'#1e1e1e'}
            placeholderTextColor="#B2B2B2"
            placeholder="Search here..."
            value={searchString}
            style={[styles.textInputStyle, styles.textStyle, focus ? {backgroundColor: '#FFF9F5'} : {backgroundColor: '#fff'}]}
            onChangeText={str => setSearchString(str.replace(/[^a-z0-9áéíóúñü \.,_-]/gim, '').trim())}
            onFocus={() => {
                setFocus(true);
                dispatch(setIsSearchMode(true));
            }}
            onBlur={() => setFocus(false)}
          />
          <TouchableOpacity style={[{alignItems: 'center', justifyContent: 'center', right: responsiveWidth(3), position:'absolute', height:'100%'}, focus && {backgroundColor: '#FFF9F5'}]} onPress={() => handleClearText()}>
            <DIcon provider={'Feather'} name={searchString?.length > 0 ? 'x' : 'search'} size={nTwins(6, 4.4)} />
          </TouchableOpacity>
        </View>
      </View>

      {role === 'creator' && !isSearchActive && (
        <View style={{width: '100%', marginTop: responsiveWidth(3)}}>
          <ChatRoomAudienceSort />
        </View>
      )}
    </View>
  );
};

export default ChatRoomHeader;

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: responsiveWidth(4),
    paddingVertical: responsiveWidth(2),
    backgroundColor: '#fff',
  },
  header: {
    fontFamily: 'Rubik-Bold',
    fontSize: FONT_SIZES[22],
    color: '#1e1e1e',
  },
  filterWrapper: {
    borderRadius: responsiveWidth(2.5),
    paddingVertical: responsiveWidth(1.8),
    paddingHorizontal: responsiveWidth(3),
    // marginRight: responsiveWidth(2),
  },
  wrapper: {
    borderWidth: 0,
    width: responsiveWidth(30),
    height: nTwins(12, 10),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: responsiveWidth(2),
    borderRadius: responsiveWidth(2),
    overflow: 'hidden',
    marginRight: nTwins(2, -5),
  },
  sortModalContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: responsiveWidth(2),
    // overflow: "hidden",
    // bottom: responsiveWidth(14),
    // left: responsiveWidth(9),
    borderWidth: responsiveWidth(0.4),
    height: responsiveWidth(13),
    width: responsiveWidth(13),
    borderRadius: responsiveWidth(4),
  },

  textInputStyle: {
    paddingLeft: nTwins(4, 4),
    backgroundColor: 'white',
    fontFamily: 'Rubik-Regular',
    width: '80%',
    marginTop: nTwins(0, 0.6),
    borderRadius: responsiveWidth(4),
    height: Platform.OS === 'ios' ? responsiveWidth(12) : null,
  },

  textStyle: {
    fontSize: nTwinsFont(1.8, 1.8),
    fontFamily: 'Rubik-Regular',
    color: '#282828',
  },
  headerIconsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconButton: {
    width: 40,
    height: 40,
    backgroundColor: '#FFF3EB',
    borderWidth: 1,
    borderColor: '#1E1E1E',
    borderRadius: 53,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerIconImage: {
    width: 22,
    height: 22,
    resizeMode: 'contain',
  },
  headerBadge: {
    position: 'absolute',
    top: -2,
    right: -4,
    backgroundColor: '#FFA86B',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1E1E1E',
    paddingHorizontal: 3,
  },
  headerBadgeText: {
    color: '#1E1E1E',
    fontFamily: 'Rubik-Bold',
    fontSize: 10,
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
    lineHeight: 12,
  },
});
