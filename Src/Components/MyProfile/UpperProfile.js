import {StyleSheet, Text, View, ScrollView, Pressable, TouchableOpacity, FlatList, Linking, Share, Platform} from 'react-native';
import React, {useCallback, useEffect, useState} from 'react';
import {useLazyCreatorProfileQuery} from '../../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
import MyProfilePicture from './MyProfilePicture';
import {token as memoizedToken, setCategoryDescription, setCategoryHeader, setNicheDescription} from '../../../Redux/Slices/NormalSlices/AuthSlice';
import {useDispatch, useSelector} from 'react-redux';
import {responsiveFontSize, responsiveHeight, responsiveWidth} from 'react-native-responsive-dimensions';
import ReadMore from '@fawazahmed/react-native-read-more';
import {useFocusEffect} from '@react-navigation/native';
import {autoLogout} from '../../../AutoLogout';
import share from 'react-native-share';

import {Image} from 'expo-image';
import {navigate} from '../../../Navigation/RootNavigation';
import {formatNiche} from '../../../DesiginData/Utility';

const UpperProfile = ({isFocused}) => {
  const ref = React.useRef();

  console.log('isfocus', isFocused);

  const [getUserProfileDetailsApi] = useLazyCreatorProfileQuery({refetchOnFocus: true});

  const [userProfileDetails, setUserProfileDetails] = useState({});

  const loggedUserDetail = useSelector(state => state.auth.user);

  const token = useSelector(state => state.auth.user.token);

  // const userInformation = useSelector(state => state.auth.user);

  const dispatch = useDispatch();

  const handlePostActionHandler = async userId => {
    try {
      console.log('xxxx');

      let x = await share.open({
        url: userId,
        message: `Hey, Checkout Fahdu My Handle`,
      });

      if (x.success) {
        chatRoomSuccess('Shared successfully!');
      }

      if (x.dismissedAction) {
        console.log('Did not share!');
      }
    } catch (e) {
      console.log(e?.message);
    }
  };

  useEffect(() => {
    console.log('RENDERRRRRRRRRRRR');
  }, []);

  useFocusEffect(
    useCallback(() => {
      async function getUserProfileDetails() {
        let userDetail = await getUserProfileDetailsApi({token, displayName: loggedUserDetail?.currentUserDisplayName});

        console.log(userDetail?.data?.data, '::::userDetail');

        if (userDetail?.error?.data?.status_code === 2044) {
          autoLogout();
        }

        // console.log(userDetail?.data?.data, 'category header baby');

        dispatch(setCategoryHeader({categoryHeader: userDetail?.data?.data?.categoryHeader}));

        dispatch(setCategoryDescription({categoryDescription: userDetail?.data?.data?.categoryDescription}));

        setUserProfileDetails(userDetail?.data?.data);
      }

      getUserProfileDetails();
    }, [token, loggedUserDetail?.currentUserDisplayName]),
  );

  console.log(loggedUserDetail, ')_)_)_');

  const UserDetailMyProfile = useCallback(() => {
    return (
      <View style={[styles.userDetailContainer, (userProfileDetails?.role === 'creator' || userProfileDetails?.role === 'admin') ? {marginTop: responsiveWidth(10)} : {marginTop: responsiveWidth(8)}]}>
        <Text style={styles.name}>{loggedUserDetail?.currentUserFullName}</Text>

        {/* User Name */}
        <View style={styles.userName}>
          <View style={styles.userNameRow}>
            <Text style={styles.userNameTitle}>{loggedUserDetail?.currentUserDisplayName}</Text>
            {(userProfileDetails?.role === 'creator' || userProfileDetails?.role === 'admin') && (
              <View style={{height: 19, width: 19}}>
                <Image source={require('../../../Assets/Images/verify.png')} contentFit="contain" style={{flex: 1}} />
              </View>
            )}
          </View>
        </View>

        {/* Creator Info */}
        {(userProfileDetails?.role === 'creator' || userProfileDetails?.role === 'admin') && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.creatorScrollContainer}>
            <View style={styles.creatorRow}>
              {/* Category Tag */}
              <View style={styles.categoryTag}>
                <Text style={styles.categoryText}>{formatNiche(userProfileDetails?.niche?.[0]) || 'My Niche'}</Text>
              </View>

              {/* Followers */}
              <TouchableOpacity
                style={styles.statItem}
                onPress={() =>
                  navigate('fsPage', {
                    title: 'Followers',
                    token,
                    role: 'creator',
                    count: userProfileDetails?.followers?.count?.followers ? userProfileDetails?.followers?.count?.followers : 0,
                  })
                }>
                <View style={{height: 16, width: 14}}>
                  <Image source={require('../../../Assets/Images/follow.png')} contentFit="contain" style={{flex: 1}} />
                </View>
                <Text style={styles.statText}>{userProfileDetails?.followers?.count?.followers}</Text>
              </TouchableOpacity>

              {/* Stars */}
              <View style={styles.statItem}>
                <View style={{height: 16, width: 17}}>
                  <Image source={require('../../../Assets/Images/star.png')} contentFit="contain" style={{flex: 1}} />
                </View>
                <Text style={styles.statText}>{userProfileDetails?.likes}</Text>
              </View>

              {/* Share Button */}
              <Pressable style={styles.statItem} onPress={() => handlePostActionHandler(userProfileDetails?.deeplink?.link)}>
                <View style={{height: 17, width: 22}}>
                  <Image source={require('../../../Assets/Images/shares.png')} contentFit="contain" style={{flex: 1}} />
                </View>
              </Pressable>
            </View>
          </ScrollView>
        )}
      </View>
    );
  }, [userProfileDetails, loggedUserDetail]);

  const BioMyProfile = useCallback(
    ({ userProfileDetails }) => {
      // Default bio text if none is provided
      const defaultBio = 'Sharing unique content and engaging with my community. Join me on this journey! 🌟🎨';

      return (
        <View style={styles.bioContainer}>
          <ReadMore animate numberOfLines={5} style={styles.bioText} seeMoreStyle={styles.seeMoreLess} seeLessStyle={styles.seeMoreLess}>
            {loggedUserDetail?.aboutUser || userProfileDetails?.aboutUser || defaultBio}
          </ReadMore>
          {userProfileDetails?.username && <Text style={styles.usernameLink}>@{userProfileDetails.username}</Text>}
        </View>
      );
    },
    [userProfileDetails, loggedUserDetail?.aboutUser],
  );

  return (
    <View ref={ref} style={{maxHeight: responsiveHeight(60), backgroundColor: '#fff'}}>
      <MyProfilePicture userProfileDetails={userProfileDetails} />

      <UserDetailMyProfile userProfileDetails={userProfileDetails} currentUserRole={userProfileDetails?.role} />

      <View style={{flexDirection: 'column'}}>
        <BioMyProfile userProfileDetails={userProfileDetails} />
      </View>
    </View>
  );
};

export default UpperProfile;

const styles = StyleSheet.create({
  upperProfileContainer: {
    height: responsiveWidth(70),
    borderWidth: 1,
    // backgroundColor: 'red',
  },
  socialRatingContainer: {
    color: '#282828',
    paddingHorizontal: responsiveWidth(3.5),
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: responsiveWidth(2),
  },

  onlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: responsiveWidth(5),
    marginTop: responsiveWidth(3),
    paddingHorizontal: responsiveWidth(4),
    height: responsiveWidth(10),
    width: responsiveWidth(85),
    borderRadius: responsiveWidth(3),
    borderWidth: responsiveWidth(0.5),
  },
  userName: {
    flexDirection: 'row',
    alignItems: 'center',
    width: responsiveWidth(50),
    gap: responsiveWidth(1),
    fontFamily: 'Rubik',
  },
  seeMoreLess: {
    fontSize: responsiveFontSize(1.8),
    fontFamily: 'MabryPro-Medium',
    color: '#ffa07a',
    marginTop: responsiveWidth(2),
  },
  intdustryCategoryText: {
    borderColor: '#FE0BAC',
    backgroundColor: '#FFD6F1',
    paddingHorizontal: responsiveWidth(2),
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: responsiveWidth(5),
    paddingVertical: responsiveWidth(1.5),
    borderWidth: responsiveWidth(0.5),
  },
  userDetailContainer: {
    // backgroundColor: 'red',
    paddingHorizontal: 24,
    paddingBottom: 0,
    // paddingBottom : 24
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    // backgroundColor : 'red',
    marginBottom: 4,
  },
  userNameTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#282828',
    marginRight: responsiveWidth(1),
    fontFamily: 'Rubik-SemiBold',
  },
  creatorInfo: {
    marginTop: responsiveWidth(3),
    marginRight: responsiveWidth(2),
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: responsiveWidth(2),
    paddingRight: responsiveWidth(1),
    // backgroundColor : 'red',
    // marginBottom : 4,
    width: '100%',
  },
  categoryTag: {
    backgroundColor: '#FFD6F1',
    borderColor: '#FE0BAC',
    borderWidth: 1.5,
    borderRadius: responsiveWidth(5),
    paddingVertical: Platform.OS === 'ios' ? 8 : 6,
    paddingHorizontal: 15,
    height: 35,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryText: {
    color: '#FE0BAC',
    fontSize: 13,
    fontFamily: 'Rubik-Medium',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: '#1e1e1e',
    borderWidth: 1.5,
    borderRadius: responsiveWidth(5),
    paddingVertical: Platform.OS === 'ios' ? 8 : 6,
    paddingHorizontal: responsiveWidth(4),
    height: 35,
  },
  statText: {
    marginLeft: responsiveWidth(1),
    color: '#1e1e1e',
    fontSize: 13,
    fontFamily: 'Rubik-SemiBold',
    verticalAlign: 'middle',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: '#1e1e1e',
    borderWidth: 1,
    borderRadius: responsiveWidth(5),
    paddingVertical: responsiveWidth(1.5),
    paddingHorizontal: responsiveWidth(3),
  },
  bioContainer: {
    marginTop: responsiveWidth(3),
    // paddingHorizontal: responsiveWidth(4),
    // backgroundColor: 'green',
    borderRadius: 8,
    marginBottom: 8,
    width: responsiveWidth(88),
    alignSelf: 'center',
  },
  bioText: {
    fontSize: 14,
    fontFamily: 'Rubik-Regular',
    color: '#1e1e1e',
    lineHeight: 18,
    // marginBottom: responsiveWidth(1),
    // backgroundColor : 'red',
    // paddingLeft : 8
  },
  seeMoreLess: {
    fontSize: responsiveFontSize(2),
    fontFamily: 'Rubik-Medium',
    color: '#FE0BAC',
    marginTop: responsiveWidth(1),
  },
  usernameLink: {
    fontSize: responsiveFontSize(1.8),
    fontFamily: 'Rubik-Medium',
    color: '#FE0BAC',
    marginTop: responsiveWidth(1.5),
  },
  name: {
    fontFamily: 'Rubik-Regular',
    fontSize: 14,
    color: '#1e1e1e',
    marginVertical: 6,
    textAlign: 'left',
  },
  creatorScrollContainer: {
    marginTop: responsiveWidth(1.8),
    // backgroundColor : 'red',

    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
  },
});
