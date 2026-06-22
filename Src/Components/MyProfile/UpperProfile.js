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
import axios from 'axios';
import {BASE_URL} from '../../Configs/ApiConfig';

// Badge image mapping
const BADGE_IMAGES = {
  DIAMOND: require('../../../Assets/Images/Badges/Diamond.png'),
  PLATINUM: require('../../../Assets/Images/Badges/Platinum.png'),
  BRONZE: require('../../../Assets/Images/Badges/Bronze.png'),
  GOLD: require('../../../Assets/Images/Badges/Gold.png'),
  SILVER: require('../../../Assets/Images/Badges/Silver.png'),
  ELITE: require('../../../Assets/Images/Badges/Elite.png'),
  LEGEND: require('../../../Assets/Images/Badges/Legend.png'),
  ROYAL: require('../../../Assets/Images/Badges/Royal.png'),
};

const UpperProfile = ({isFocused}) => {
  const ref = React.useRef();

  console.log('isfocus', isFocused);

  const [getUserProfileDetailsApi] = useLazyCreatorProfileQuery({refetchOnFocus: true});

  const [userProfileDetails, setUserProfileDetails] = useState({});

  const loggedUserDetail = useSelector(state => state.auth.user);

  const token = useSelector(state => state.auth.user.token);

  // const userInformation = useSelector(state => state.auth.user);

  const dispatch = useDispatch();

  const [walletBadges, setWalletBadges] = useState([]);

  // Fetch wallet badges for user role
  const fetchWalletBadges = useCallback(async () => {
    try {
      const {data} = await axios.get(`${BASE_URL}/api/wallet/latest/recharge`, {
        headers: {Authorization: `Bearer ${token}`, 'Content-Type': 'application/json'},
        timeout: 10000,
      });
      if (data?.statusCode === 200 && data?.data) {
        setWalletBadges(data.data);
      }
    } catch (e) {
      console.log('Error fetching wallet badges:', e?.message);
    }
  }, [token]);

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

      // Fetch badges for user role
      if (loggedUserDetail?.role !== 'creator' && loggedUserDetail?.role !== 'admin') {
        fetchWalletBadges();
      }
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

  // Collapse 3+ consecutive newlines into 2, trim, and cap at 10 lines
  const sanitizeBio = (text) => {
    if (!text) return text;
    let cleaned = text.replace(/\n{3,}/g, '\n\n').trim();
    const lines = cleaned.split('\n');
    if (lines.length > 10) {
      cleaned = lines.slice(0, 10).join('\n') + '...';
    }
    return cleaned;
  };

  const BioMyProfile = useCallback(
    ({ userProfileDetails }) => {
      // Default bio text if none is provided
      const defaultBio = 'Sharing unique content and engaging with my community. Join me on this journey! 🌟🎨';
      const rawBio = loggedUserDetail?.aboutUser || userProfileDetails?.aboutUser || defaultBio;
      const bioText = sanitizeBio(rawBio);
      const centered = loggedUserDetail?.role !== 'creator' && loggedUserDetail?.role !== 'admin';

      return (
        <View style={[styles.bioContainer, centered && {alignItems: 'center', marginTop: 0, marginBottom: 0, width: '100%', paddingHorizontal: 12}]}>
          {centered ? (
            <Text numberOfLines={2} style={[styles.bioText, {textAlign: 'center', fontSize: 16, lineHeight: 22, width: '100%'}]}>
              {bioText}
            </Text>
          ) : (
            <ReadMore animate numberOfLines={5} style={[styles.bioText, centered && {textAlign: 'center', fontSize: 16, lineHeight: 22}]} seeMoreStyle={styles.seeMoreLess} seeLessStyle={styles.seeMoreLess}>
              {bioText}
            </ReadMore>
          )}
          {userProfileDetails?.username && <Text style={[styles.usernameLink, centered && {textAlign: 'center'}]}>@{userProfileDetails.username}</Text>}
        </View>
      );
    },
    [userProfileDetails, loggedUserDetail?.aboutUser, loggedUserDetail?.role],
  );

  // Wallet Badges Component for user role
  const WalletBadges = useCallback(() => {
    if (!walletBadges || walletBadges.length === 0) return null;

    return (
      <View style={styles.badgesContainer}>
        {walletBadges.map((badge, index) => {
          const badgeImage = BADGE_IMAGES[badge.badgeCode?.toUpperCase()];
          if (!badgeImage) return null;
          return (
            <Image
              key={index}
              source={badgeImage}
              style={styles.badgeIcon}
              contentFit="contain"
            />
          );
        })}
      </View>
    );
  }, [walletBadges]);

  const isUserRole = loggedUserDetail?.role !== 'creator' && loggedUserDetail?.role !== 'admin';

  return (
    <View ref={ref} style={{backgroundColor: '#0D0D0D'}}>
      {isUserRole ? (
        // User role: Centered layout without cover photo
        <View style={styles.userRoleContainer}>
          {/* Centered Profile Picture */}
          <View style={styles.userProfilePicWrapper}>
            <View style={styles.userProfilePicContainer}>
              <Image
                placeholder={require('../../../Assets/Images/DefaultProfile.jpg')}
                source={loggedUserDetail?.currentUserProfilePicture ? {uri: loggedUserDetail?.currentUserProfilePicture} : require('../../../Assets/Images/DefaultProfile.jpg')}
                style={styles.userProfilePic}
                contentFit="cover"
              />
            </View>
            {/* Online Indicator */}
            <View style={styles.onlineDot} />
          </View>

          {/* Username */}
          <Text style={styles.userRoleUsername}>{loggedUserDetail?.currentUserDisplayName}</Text>

          {/* Bio */}
          <BioMyProfile userProfileDetails={userProfileDetails} />

          {/* Wallet Badges */}
          <WalletBadges />
        </View>
      ) : (
        // Creator/Admin role: Original layout with cover photo
        <>
          <MyProfilePicture userProfileDetails={userProfileDetails} />

          <UserDetailMyProfile userProfileDetails={userProfileDetails} currentUserRole={userProfileDetails?.role} />

          <View style={{flexDirection: 'column'}}>
            <BioMyProfile userProfileDetails={userProfileDetails} />
          </View>
        </>
      )}
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
    color: '#E0E0E0',
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
  // User role styles
  userRoleContainer: {
    alignItems: 'center',
    paddingTop: responsiveWidth(10),
    paddingBottom: responsiveWidth(2),
    backgroundColor: '#0D0D0D',
  },
  userProfilePicWrapper: {
    position: 'relative',
    width: 119,
    height: 119,
    borderRadius: 59.5,
    borderWidth: 1.72,
    borderColor: '#2A2A2A',
    backgroundColor: '#0D0D0D',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  userProfilePicContainer: {
    width: 110,
    height: 110,
    borderRadius: 53.5,
    overflow: 'hidden',
    backgroundColor: '#1A1A1A',
  },
  userProfilePic: {
    width: '100%',
    height: '100%',
  },
  onlineDot: {
    width: 18.4,
    height: 18.4,
    borderRadius: 9.2,
    backgroundColor: '#52E13B',
    borderWidth: 3.2,
    borderColor: '#0D0D0D',
    position: 'absolute',
    bottom: 18,
    right: -2,
  },
  userRoleUsername: {
    fontSize: 20,
    fontFamily: 'Rubik-SemiBold',
    color: '#FFFFFF',
    lineHeight: 20,
    marginBottom: 16,
  },
  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    marginBottom: 0,
  },
  badgeIcon: {
    width: 90,
    height: 90,
    marginHorizontal: 0.5,
    marginVertical: 1.75,
  },
});
