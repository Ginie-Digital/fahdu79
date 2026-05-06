import { StyleSheet, Text, View, SectionList, TouchableOpacity, FlatList, Image, Platform, Pressable } from 'react-native';
import { token as memoizedToken } from '../../Redux/Slices/NormalSlices/AuthSlice';
import React, { memo, useCallback, useEffect, useState } from 'react';
import { responsiveFontSize, responsiveWidth } from 'react-native-responsive-dimensions';
import MyProfilePicture from '../Components/MyProfile/MyProfilePicture';
import { useLazyCreatorProfileQuery, useLazyGetFSDQuery, useLazyGetFSQuery, useLazyLogoutFromServerQuery, useLazyGetFollowingQuery } from '../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { settingsList, subRevenue, userSettingList } from '../../DesiginData/Data';
import DIcon from '../../DesiginData/DIcons';
import { autoLogout, logoutExplicit } from '../../AutoLogout';
import { LoginPageErrors } from '../Components/ErrorSnacks';
import { nTwins, twins, WIDTH_SIZES } from '../../DesiginData/Utility';
import AddSvg from '../../AddSvg';
import Revenue from '../../Assets/svg/revenue.svg';
import Drops from '../../Assets/svg/dd.svg';
import Purchases from 'react-native-purchases';
import AccMang from '../../Assets/svg/accountManagement.svg';
const SettingsPage = () => {
  const [getUserProfileDetailsApi, { error: getUserProfileError }] = useLazyCreatorProfileQuery({ refetchOnFocus: true });

  const [userProfileDetails, setUserProfileDetails] = useState({});

  const [followers, setFollowers] = useState(0);

  const [subscribers, setSubscribers] = useState(0);

  const [subscribed, setSubscribed] = useState(0);

  const [followingCount, setFollowingCount] = useState(0);

  const [openRevenue, setOpenRevenue] = useState(false);

  const displayName = useSelector(state => state.auth.user.currentUserDisplayName);

  const role = useSelector(state => state.auth.user.role);

  const userInfo = useSelector(state => state.auth.user);

  const token = useSelector(state => state.auth.user.token);

  const navigation = useNavigation();

  const [logoutFromServer] = useLazyLogoutFromServerQuery();

  useFocusEffect(
    useCallback(() => {
      async function getUserProfileDetails() {
        let userDetail = await getUserProfileDetailsApi({ token, displayName }, false);
        setUserProfileDetails(userDetail?.data?.data);
      }
      getUserProfileDetails();
    }, [displayName, token]),
  );

  const [getFS] = useLazyGetFSQuery();

  const [getFSD] = useLazyGetFSDQuery();

  const [getFollowing] = useLazyGetFollowingQuery();

  useEffect(() => {
    const getFollowers = async () => {
      const subs = await getFS({ token, listType: 'followers', active: true });

      setFollowers(subs?.data?.data?.metadata[0]?.total);
    };

    const getSubscribers = async () => {
      const subs = await getFS({ token, listType: 'subscribers', active: true });

      setSubscribers(subs?.data?.data?.metadata[0]?.total);
    };

    const getFollowed = async () => {
      const subs = await getFSD({ token, listType: 'followed', active: true });

      setFollowers(subs?.data?.data?.metadata[0]?.total);
    };

    const getFollowingCount = async () => {
      const subs = await getFollowing({ token });
      setFollowingCount(subs?.data?.data?.metadata[0]?.total);
    };

    const getSubscribed = async () => {
      const subs = await getFSD({ token, listType: 'subscribed', active: true });

      setSubscribed(subs?.data?.data?.metadata[0]?.total);
    };

    if (role === 'user') {
      getFollowed();
      getSubscribed();
      getFollowingCount();
    } else {
      getFollowers();
      getSubscribers();
      getSubscribed();
      getFollowingCount();
    }
  }, [token, role]);

  const handleSelectOption = async id => {
    console.log('Settings page click id', id);

    if (id === 1) {
      navigation.navigate('editProfile');
    }

    if (id === 7) {
      setOpenRevenue(!openRevenue);
    }

    if (id === 3) {
      navigation.navigate('fsPage', { title: 'Subscribers', token, role, count: subscribers ? subscribers : 0 });
    }

    if (id === 4) {
      navigation.navigate('fsPage', { title: 'Followers', token, role, count: followers ? followers : 0 });
    }

    if (id === 5) {
      navigation.navigate('changePassword', { title: userInfo?.passwordCreated ? 'Change password' : 'Create password' });
    }

    if (id === 2) {
      navigation.navigate('fsPage', { title: 'Subscribed', token, role, count: subscribed ? subscribed : 0 });
    }

    if (id === 9) {
      navigation.navigate('blocklist', { title: 'blocklist', token, role, count: subscribed ? subscribed : 0 });
    }

    if (id === 16) {
      try {
        // Step 1: Logout from your server
        const { data, error } = await logoutFromServer({ token });

        // Step 2: Handle error cases
        if (error) {
          if (error.status === 'FETCH_ERROR') {
            return LoginPageErrors('Please check your network connection.');
          }

          if (error.data?.status_code === 2044) {
            return autoLogout(); // token expired
          }

          return LoginPageErrors('Failed to logout. Please try again.');
        }

        // Step 3: If server logout success
        if (data?.statusCode === 200) {
          console.log('✅ Server logout successful');

          // Step 4: Handle RevenueCat (iOS only)
          if (Platform.OS === 'ios') {
            try {
              const isAnonymous = await Purchases.isAnonymous();

              if (!isAnonymous) {
                console.log('Logging out from RevenueCat...');
                await Purchases.logOut();

                const customerInfo = await Purchases.getCustomerInfo();
                console.log('New customer info:', customerInfo);
              }
            } catch (err) {
              console.warn('⚠️ RevenueCat logout failed:', err);
            }
          }

          // Step 5: App-level logout
          logoutExplicit();
          console.log('✅ Logged out successfully');
        }
      } catch (err) {
        console.error('❌ Unexpected logout error:', err);
        LoginPageErrors('Something went wrong while logging out.');
      }
    }

    if (id === 13) {
      navigation.navigate('webView', { title: 'Terms and Conditions', type: 'tac' });
    }

    if (id === 14) {
      navigation.navigate('webView', { title: 'Privacy and Policy', type: 'pap' });
    }

    if (id === 15) {
      navigation.navigate('About');
    }

    if (id === 12) {
      navigation.navigate('linkAccount', { title: 'Account Linking' });
    }

    if (id === 30 || id === 17) {
      navigation.navigate('transactions');
    }

    if (id === 35) {
      //Check If already in verification process

      navigation.navigate('verificationStepOne');
    }

    if (id === 31) {
      navigation.navigate('mrDashboard');
    }

    if (id === 32) {
      navigation.navigate('mrFeeSetup');
    }

    if (id === 33) {
      navigation.navigate('mrSubscriptionFeeSetup');
    }

    if (id === 6) {
      navigation.navigate('referral');
    }

    if (id === 8) {
      navigation.navigate('chooseWallet');
    }

    if (id === 11) {
      navigation.navigate('twoFALanding');
    }

    if (id === 40) {
      navigation.navigate('accountmanagement');
    }

    if (id === 50) {
      navigation.navigate('webView', { title: 'Refund Policy', type: 'refund' });
    }

    if (id === 41) {
      navigation.navigate('fsPage', { title: 'Following', token, role, count: followingCount ? followingCount : 0 });
    }
  };

  const RenderEachSettings = ({ item, index }) => {
    if (item.id === 7 || item.id === 40) {
      return (
        <View style={{ flexDirection: 'column', gap: 3, borderTopWidth: responsiveWidth(0.1) }}>
          <Pressable style={({ pressed }) => [styles.item, { backgroundColor: pressed ? '#FFF3EB' : '#fff', justifyContent: 'space-between', paddingHorizontal: responsiveWidth(5) }]} onPress={() => handleSelectOption(item?.id)}>
            <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: responsiveWidth(6) }}>
              <View style={[{ height: responsiveWidth(8), width: responsiveWidth(8), justifyContent: 'center', alignItems: 'center' }]}>
                <AccMang />
              </View>
              <Text style={styles.title}>{item?.title}</Text>
            </View>

            <View>
              <Drops />
            </View>
          </Pressable>

          {openRevenue && (
            <FlatList
              ListHeaderComponent={() => <View style={{ borderBottomWidth: responsiveWidth(0.5), width: responsiveWidth(89), borderColor: '#EAEAEA' }} />}
              data={subRevenue}
              renderItem={({ item, index }) => (
                <Pressable style={({ pressed }) => [styles.item, { backgroundColor: pressed ? '#FFF3EB' : 'transparent' }]} onPress={() => handleSelectOption(item?.id)}>
                  <View
                    style={{
                      left: responsiveWidth(5),
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: responsiveWidth(6),
                    }}>
                    <AddSvg name={item?.iconName} />
                    <Text style={styles.title}>{item?.title}</Text>
                  </View>
                </Pressable>
              )}
              ItemSeparatorComponent={() => <View style={{ borderBottomWidth: responsiveWidth(0.5), width: responsiveWidth(89), borderColor: '#EAEAEA' }} />}
            />
          )}
        </View>
      );
    }

    return (
      <Pressable style={({ pressed }) => [styles.item, { backgroundColor: pressed ? '#FFF3EB' : '#fff' }]} onPress={() => handleSelectOption(item?.id)}>
        <View style={{ left: responsiveWidth(5), flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: responsiveWidth(6) }}>
          <AddSvg name={item?.iconName} />
          <Text style={styles.title}>{item?.title}</Text>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.settingsContainer}>
        <SectionList
          sections={role === 'creator' ? settingsList : userSettingList}
          keyExtractor={(item, index) => item + index}
          renderItem={({ item }) => (
            <View style={styles.eachSettingsWrapper}>
              <FlatList data={item.eachSettings} renderItem={({ item, index }) => <RenderEachSettings item={item} index={index} />} ItemSeparatorComponent={() => <View style={{ borderBottomWidth: responsiveWidth(0.3), width: responsiveWidth(89), borderColor: 'black' }} />} />
            </View>
          )}
          renderSectionHeader={({ section: { title } }) => <Text style={styles.header}>{title}</Text>}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={{ paddingTop: WIDTH_SIZES['10'] }}
        />
      </View>
    </View>
  );
};

export default SettingsPage;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopColor: '#282828',

    paddingHorizontal: responsiveWidth(2),
  },

  settingsContainer: {
    // marginTop: nTwins(1, 0),
  },

  header: {
    fontFamily: 'Rubik-Medium',
    fontSize: responsiveFontSize(2),
    color: 'black',
    paddingLeft: responsiveWidth(2),

    //  marginBottom:responsiveWidth(.3),
    //  marginTop:responsiveWidth(1)
    top: responsiveWidth(1.7),
  },

  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: responsiveWidth(2),
    paddingVertical: responsiveWidth(3),
    padding: responsiveWidth(1),
    // marginLeft: responsiveWidth(4),
    // borderBottomWidth:responsiveWidth(.3)
  },

  title: {
    fontFamily: 'Rubik-Medium',
    fontSize: responsiveFontSize(2),
    color: '#282828',
    marginLeft: responsiveWidth(1),
  },
  eachSettingsWrapper: {
    backgroundColor: 'transparent',
    marginTop: responsiveWidth(0.5),
    borderTopWidth: responsiveWidth(0.5),
    borderWidth: responsiveWidth(0.5),
    borderRadius: responsiveWidth(5),
    width: responsiveWidth(90),
    left: responsiveWidth(2),
    marginTop: responsiveWidth(4),
    marginBottom: responsiveWidth(3),
    overflow: 'hidden',
  },
});
