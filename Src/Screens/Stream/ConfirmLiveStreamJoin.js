import { StyleSheet, Text, View, Pressable, ScrollView } from 'react-native';
import React, { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { responsiveFontSize, responsiveWidth } from 'react-native-responsive-dimensions';
import { FONT_SIZES, padios, WIDTH_SIZES } from '../../../DesiginData/Utility';
import { TouchableOpacity } from 'react-native-gesture-handler';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { token as memoizedToken } from '../../../Redux/Slices/NormalSlices/AuthSlice';
import { navigate } from '../../../Navigation/RootNavigation';
import DIcon from '../../../DesiginData/DIcons';
import Paisa from '../../../Assets/svg/paisa.svg';
import Back from '../../../Assets/svg/back.svg';
import Verify from '../../../Assets/svg/veribig.svg';
import { Image } from 'expo-image';
import AnimatedButton from '../../Components/AnimatedButton';
import { useAppTheme } from '../../Hook/useAppTheme';

const ConfirmLiveStreamJoin = ({ route }) => {
  console.log(route?.params?.data?.creatorInfo, route?.params?.roomId);

  const token = useSelector(state => state.auth.user.token);
  const { colors, isDark } = useAppTheme();

  const [fetchingCoins, setFetchingCoins] = useState(true);

  const [canJoin, setCanJoin] = useState(false);

  const [coins, setCoins] = useState();

  const fetchCoins = async () => {
    try {
      setFetchingCoins(true);

      let { data } = await axios.get('https://api.fahdu.in/api/wallet/get-coins', { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, timeout: 10000 });

      setCoins(data?.data);

      setFetchingCoins(false);
    } catch (e) {
      console.log('Get Coin Error ', e);
    }
  };

  useEffect(() => {
    fetchCoins();

    if (route?.params?.data?.subscribed && Number(route?.params?.data?.feeDetails?.subscribers) < coins) {
      setCanJoin(true);
    } else if (Number(route?.params?.data?.feeDetails?.followers) < coins) {
      setCanJoin(true);
    } else {
      setCanJoin(false);
    }
  }, [route?.params, coins]);

  const handleButton = () => {
    if (canJoin) {
      console.log('join');
      navigate('livestream', { data: { goals: route?.params?.data?.goals, isStarting: false, creatorInfo: route?.params?.data?.creatorInfo, roomId: route?.params?.roomId, doUserSubscribed: route?.params?.data?.subscribed } });
    } else {
      console.log('recharge');
      navigate('wallet');
    }
  };

  return (
    <SafeAreaView style={[styles.flexOne, isDark && { backgroundColor: colors.background }]}>
      <ScrollView>
        <View style={[styles.flexOne, styles.container, isDark && { backgroundColor: colors.background }]}>
          <View style={{ flexDirection: 'row', marginTop: responsiveWidth(2) }}>{/* <Text style={styles.titleText}> Livestream</Text> */}</View>
          {/* <View style={{marginTop: Platform.OS === 'ios' ? responsiveWidth(-4) : responsiveWidth(4)}}>
          <View style={styles.outerBigBox}>
            <View style={[styles.outerBigBox, {height: responsiveWidth(30), width: responsiveWidth(30)}]}>
              <View style={[styles.outerBigBox, styles.imageContainerBox]}>
                <Image source={{uri: route?.params?.data?.creatorInfo?.profile_image?.url}} style={{height: '100%', width: '100%'}} resizeMethod="resize" resizeMode="contain" />
              </View>
              <View style={{zIndex: 222, position: 'absolute', top: responsiveWidth(1), right: 2}}>
                <View style={styles.verifyContainer}>
                  <Image cachePolicy="memory-disk" source={require('../../../Assets/Images/verify.png')} contentFit="contain" style={{flex: 1}} />
                </View>
              </View>
            </View>
          </View>
        </View> */}

          <View style={styles.containerImg}>
            {/* Outer Dashed Border */}
            <View style={[styles.outerBorder, isDark && { borderColor: colors.text }]}>
              <View style={[styles.innerBorder, isDark && { borderColor: colors.text }]}>
                {/* Image Container */}
                <Image source={{ uri: route?.params?.data?.creatorInfo?.profile_image?.url }} style={styles.image} contentFit="cover" />
              </View>
            </View>

            {/* Verification Badge */}
            <View style={styles.verifyContainer}>
              <Image source={require('../../../Assets/Images/verify.png')} style={styles.verifyIcon} contentFit="contain" />
            </View>
          </View>

          <Text style={[styles.title, { marginTop: WIDTH_SIZES[16], fontSize: responsiveFontSize(2.3) }, isDark && { color: colors.text }]}>
            Join <Text style={{ fontFamily: 'Rubik-Bold' }}>{route?.params?.data?.creatorInfo?.displayName}'s</Text> Livestream
          </Text>

          <View style={{ marginTop: WIDTH_SIZES[32] }}>
            <View style={[styles.card, { backgroundColor: '#FFF6F0', borderStyle: 'dashed', borderWidth: responsiveWidth(0.5), borderColor: 'black', flexDirection: 'column' }, isDark && { backgroundColor: 'rgba(255, 168, 107, 0.2)', borderColor: '#FFA86B' }]}>
              <View style={[styles.card, { borderStyle: 'dashed' }]}>
                <View style={styles.cardLeftView}>
                  <Text style={[styles.heading, isDark && { color: colors.text }]}>Fee Details</Text>
                  {/*
                <View style={styles.eachDetailWrapper}>
                  <View
                    style={{
                      backgroundColor: '#FF8580',
                      height: responsiveWidth(12.3),
                      width: Platform.OS === 'ios' ? responsiveWidth(25) : responsiveWidth(27),
                      borderTopStartRadius: responsiveWidth(3),
                      borderBottomLeftRadius: responsiveWidth(3),
                      borderRightWidth: responsiveWidth(0.4),
                    }}>
                    <Text style={styles.inputColor}>Followers</Text>
                  </View>

                  <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginRight: responsiveWidth(4), gap: responsiveWidth(1)}}>
                    <Text style={styles.description}>{route?.params?.data?.feeDetails?.followers}</Text>
                    <Paisa />
                  </View>
                </View> */}

                  <View style={[styles.containerSub, isDark && { backgroundColor: '#121212', borderColor: '#FF7819' }]}>
                    <Text style={[styles.text, isDark && { color: colors.text }]}>Follower Fee</Text>
                    <View style={styles.rightSection}>
                      <Text style={[styles.amount, isDark && { color: colors.text }]}>{route?.params?.data?.feeDetails?.followers}</Text>
                      <Paisa />
                    </View>
                  </View>

                  <Text style={[styles.description, { color: isDark ? colors.text : '#1E1E1E', left: responsiveWidth(55) }]}>*Live/Minute</Text>

                  {/* <View style={styles.eachDetailWrapper}>
                  <View
                    style={{
                      backgroundColor: '#C5FFD2',
                      height: responsiveWidth(12.3),
                      width: Platform.OS === 'ios' ? responsiveWidth(25) : responsiveWidth(27),
                      borderTopStartRadius: responsiveWidth(3),
                      borderBottomLeftRadius: responsiveWidth(3),
                      borderRightWidth: responsiveWidth(0.4),
                    }}>
                    <Text style={styles.inputColor}>Subscribers</Text>
                  </View>

                  <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginRight: responsiveWidth(4), gap: responsiveWidth(1)}}>
                    <Text style={styles.description}>{route?.params?.data?.feeDetails?.subscribers}</Text>

                    <Paisa />
                  </View>
                </View> */}
                  <View style={[styles.containerSub, isDark && { backgroundColor: '#121212', borderColor: '#FF7819' }]}>
                    <Text style={[styles.text, isDark && { color: colors.text }]}>Subscriber Fee</Text>
                    <View style={styles.rightSection}>
                      <Text style={[styles.amount, isDark && { color: colors.text }]}>{route?.params?.data?.feeDetails?.subscribers}</Text>
                      <Paisa />
                    </View>
                  </View>

                  <Text style={[styles.description, { color: isDark ? colors.text : '#1E1E1E', left: responsiveWidth(55) }]}>*Live/Minute</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={[styles.card, { borderStyle: 'dashed', borderWidth: responsiveWidth(0.5), backgroundColor: '#FFF6F0', flexDirection: 'column', marginTop: responsiveWidth(8) }, isDark && { backgroundColor: 'rgba(255, 168, 107, 0.2)', borderColor: '#FFA86B' }]}>
            <View style={[styles.card, {}]}>
              <View style={styles.cardLeftView}>
                <Text style={[styles.heading, isDark && { color: colors.text }]}>My Wallet</Text>

                {/* <View style={styles.eachDetailWrapper}>
                <View style={{height: responsiveWidth(11.2)}}>
                  <Text
                    style={{
                      fontFamily: 'Rubik-Rgeular',
                      color: '#1e1e1e',
                      fontSize: responsiveFontSize(1.8),

                      top: responsiveWidth(4),
                      left: responsiveWidth(4),
                    }}>
                    Coins
                  </Text>
                </View>

                <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginRight: responsiveWidth(4), gap: responsiveWidth(1)}}>
                  <Text style={styles.description}>{coins}</Text>

                  <Paisa />
                </View>
              </View> */}

                <View style={[styles.containerSub, isDark && { backgroundColor: '#121212', borderColor: '#FF7819' }]}>
                  <Text style={[styles.text, isDark && { color: colors.text }]}>Coins</Text>
                  <View style={styles.rightSection}>
                    <Text style={[styles.amount, isDark && { color: colors.text }]}>{Math.trunc(coins || 0).toLocaleString('en-IN')}</Text>
                    <Paisa />
                  </View>
                </View>
              </View>
            </View>
          </View>
          {/* <View style={{marginTop: responsiveWidth(6)}}>
          <View style={{marginTop: responsiveWidth(3), position: 'relative', zIndex: 222}}>
            <Pressable style={{borderWidth: responsiveWidth(0.4), borderRadius: responsiveWidth(3.5)}} onPress={() => handleButton()}>
              <Text style={[styles.loginButton]}>{canJoin ? 'Join Now' : 'RECHARGE'}</Text>
            </Pressable>
          </View>
          <View style={[styles.loginButton, {backgroundColor: 'black', position: 'absolute', marginTop: responsiveWidth(3), left: responsiveWidth(1.5), top: responsiveWidth(1.5)}]}></View>
        </View> */}

          <View style={{ width: '84%' }}>
            <AnimatedButton title={'Join Now'} onPress={handleButton} disabled={fetchingCoins} isDark={isDark} />
          </View>

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ConfirmLiveStreamJoin;

const styles = StyleSheet.create({
  flexOne: {
    flex: 1,
    backgroundColor: '#fff',
  },

  container: {
    backgroundColor: '#fff',
    alignItems: 'center',
    // paddingTop: responsiveWidth(5),
    // padding: responsiveWidth(4),
  },
  titleText: {
    fontFamily: 'Rubik-SemiBold',
    color: '#1e1e1e',
    fontSize: responsiveFontSize(3.5),
    textAlign: 'center',
    marginBottom: responsiveWidth(1),
  },

  outerBigBox: {
    borderWidth: 2,
    height: responsiveWidth(30),
    width: responsiveWidth(30),
    borderRadius: responsiveWidth(5),
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    // borderColor: "#ffa07a80",
  },
  inputColor: {
    fontFamily: 'Rubik-Medium',
    color: '#1e1e1e',
    fontSize: responsiveFontSize(1.8),
    top: responsiveWidth(3),
    left: responsiveWidth(2),
    // fontWeight:'900'
  },
  imageContainerBox: {
    height: responsiveWidth(25),
    width: responsiveWidth(25),
    borderStyle: 'solid',

    // borderColor: "#1e1e1e",
    borderRadius: responsiveWidth(5),
    resizeMode: 'contain',
    overflow: 'hidden',
  },
  description: {
    fontFamily: 'Rubik-Medium',
    color: '#1e1e1e',
    fontSize: responsiveFontSize(1.6),
  },
  card: {
    // backgroundColor: "#fff",
    // elevation: 2,
    paddingHorizontal: responsiveWidth(4),
    paddingVertical: responsiveWidth(3),
    flexDirection: 'row',
    borderStyle: 'dashed',
    borderRadius: responsiveWidth(4),
    width: responsiveWidth(85),
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  heading: {
    fontFamily: 'Rubik-SemiBold',
    color: '#1e1e1e',
    fontSize: FONT_SIZES[16],
  },

  description: {
    fontFamily: 'Rubik-Medium',
    color: '#1e1e1e',
    fontSize: responsiveFontSize(1.6),
  },

  cardLeftView: {
    width: '100%',
    gap: responsiveWidth(2),
  },

  title: {
    fontFamily: 'Rubik-Medium',
    color: '#1e1e1e',
    fontSize: responsiveFontSize(2),
    textAlign: 'center',
  },

  eachDetailWrapper: {
    backgroundColor: '#FFF9F5',
    height: responsiveWidth(13),
    width: '100%',
    // padding: responsiveWidth(2),
    borderRadius: responsiveWidth(3),
    borderWidth: responsiveWidth(0.3),
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  loginButton: {
    paddingHorizontal: responsiveWidth(2),
    backgroundColor: '#FFA86B',
    borderRadius: responsiveWidth(3),
    color: '#1e1e1e',
    textAlign: 'center',
    fontFamily: 'Rubik-SemiBold',
    // elevation: 1,
    fontWeight: '600',
    width: responsiveWidth(85),
    height: responsiveWidth(13),
    textAlignVertical: 'center',
    alignSelf: 'center',
    borderTopColor: '#1e1e1e',
    borderLeftColor: '#1e1e1e',
    // elevation: 1,
    fontSize: responsiveFontSize(2.3),
    padding: padios(responsiveWidth(2.6)),
    overflow: 'hidden',
  },
  verifyContainer: {
    width: 30,
    height: 30,
  },

  //jkgh

  containerImg: {
    position: 'relative',
    alignItems: 'center',
  },
  outerBorder: {
    width: 110,
    height: 110,
    borderRadius: 24,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#1e1e1e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerBorder: {
    width: 90,
    height: 90,
    borderRadius: 18,
    borderWidth: 2,
    borderStyle: 'solid',
    borderColor: '#1e1e1e',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 15,
  },
  verifyContainer: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 30,
    height: 30,
  },
  verifyIcon: {
    width: '100%',
    height: '100%',
  },

  containerSub: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#FF7819',
    borderRadius: responsiveWidth(3.7),
    borderStyle: 'dashed',
    backgroundColor: '#fff',
    marginTop: 16,
  },
  text: {
    fontSize: responsiveFontSize(1.8),
    fontFamily: 'Rubik-Medium',
    color: '#1e1e1e',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  amount: {
    fontSize: responsiveFontSize(1.8),
    fontFamily: 'Rubik-Medium',
    color: '#1e1e1e',
    marginRight: 6,
  },
});
