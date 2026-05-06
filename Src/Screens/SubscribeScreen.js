import { StyleSheet, Text, View, Image, TouchableOpacity, FlatList, Pressable, Linking, Platform, ScrollView } from 'react-native';
import React, { useEffect, useState } from 'react';
import { responsiveWidth, responsiveFontSize } from 'react-native-responsive-dimensions';
import { useLazyGetCreatorsPlanQuery } from '../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
import { useDispatch, useSelector } from 'react-redux';
import axios from 'axios';
import ConfirmSubscribeModal from '../Components/MyProfile/ConfirmSubscribeModal';
import { LoginPageErrors } from '../Components/ErrorSnacks';
import { toggleConfirmSubscribe } from '../../Redux/Slices/NormalSlices/HideShowSlice';
import { formatIndianNumber, padios, WIDTH_SIZES } from '../../DesiginData/Utility';
import AnimatedButton from '../Components/AnimatedButton';
import { navigate } from '../../Navigation/RootNavigation';

const colorArray = ['#F0F7FF', '#F0FEF1', '#FEFDF1', '#FFF0F0'];

const SubscribeScreen = ({ route }) => {
  const [getCreatorsPlan] = useLazyGetCreatorsPlanQuery();
  const [subscriptionPlans, setSubscriptionPlans] = useState([]);
  const [selected, setSelected] = useState(6);
  const [loading, setLoading] = useState(false);
  const token = useSelector(state => state.auth.user.token);
  const [coins, setCoins] = useState(0);
  const [currentAmont, setCurrentAmount] = useState(0);
  const [code, setCode] = useState();
  const [doHavePlan, setDoHavePlan] = useState(true);
  const dispatch = useDispatch();

  const fetchCoins = async () => {
    try {
      let { data } = await axios.get('https://api.fahdu.com/api/wallet/get-coins', {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        timeout: 10000,
      });
      setCoins(data?.data);
    } catch (e) {
      console.log('Get Coin Error ', e);
    }
  };

  useEffect(() => {
    const fetchPlans = async () => {
      // Plans may already be cached from pre-fetch in UpperOtherProfile
      const { data, error } = await getCreatorsPlan({ token, id: route?.params?.id });
      if (error?.data?.statusCode === 404) {
        setDoHavePlan(false);
      } else {
        setDoHavePlan(true);
        setSubscriptionPlans(data?.data?.subscriptions);
      }
    };
    fetchPlans();
    fetchCoins();
  }, [route?.params?.id, token]);

  useEffect(() => {
    if (subscriptionPlans?.every(x => x.active === false)) {
      setDoHavePlan(false);
    } else {
      setDoHavePlan(true);
    }
  }, [subscriptionPlans]);

  const handleSelect = async x => {
    setSelected(x?.index);
    setCurrentAmount(x.amount - Math.round((x?.discount / 100) * x?.amount));
    setCode(x?.code);
    if (Platform.OS === 'android') {
      navigate('completeDetails', {
        plan: subscriptionPlans[x?.index],
        userId: route?.params?.id,
        userName: route?.params?.name,
        amount: x.amount - Math.round((x?.discount / 100) * x?.amount),
        code: x?.code,
        coins: coins
      });
    }
  };

  const handlePayment = async obj => {
    setLoading(true);
    if (selected === 6) {
      LoginPageErrors('Please select one plan above');
      setLoading(false);
      return;
    }
    if (Number(currentAmont) < Number(coins) && code) {
      dispatch(toggleConfirmSubscribe());
    } else {
      LoginPageErrors('Please Add More Coins to Subscribe');
      setLoading(false);
      return;
    }
    setLoading(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.chatRoomContainer}>
        <View style={{ position: 'relative', width: responsiveWidth(28), alignSelf: 'center' }}>
          <View style={styles.overlayImage} />
          <View style={[styles.profilePicBox, { overflow: 'hidden' }]}>
            <Image source={route?.params?.profileImageUrl ? { uri: route?.params?.profileImageUrl } : require('../../Assets/Images/DefaultProfile.jpg')} style={{ width: '100%', height: '100%' }} />
          </View>
          <View style={styles.verifyContainer}>
            <Image cachePolicy="memory-disk" source={require('../../Assets/Images/verify.png')} contentFit="contain" style={{ width: '100%', height: '100%' }} />
          </View>
        </View>

        <View style={styles.userNameContainer}>
          <Text style={styles.text}>{route?.params?.name}</Text>
        </View>

        <View style={styles.listContainer}>
          <Text style={{ fontFamily: 'Rubik-SemiBold', fontSize: 20, color: '#1e1e1e' }}>Subscription Fee</Text>
          <Text style={{ fontFamily: 'Rubik-Regular', fontSize: 12, color: '#1e1e1e' }}>Full Access to the Exclusive Content</Text>

          <FlatList
            data={subscriptionPlans}
            scrollEnabled={false}
            renderItem={({ item, index }) =>
              item.active && (
                <TouchableOpacity
                  style={[styles.eachDescriptionContainer, index === 0 ? { marginTop: responsiveWidth(4) } : {}, { backgroundColor: colorArray[index] }, selected === index ? { backgroundColor: '#FFA07A' } : null]}
                  key={item?._id}
                  disabled={!item?.active}
                  onPress={() =>
                    handleSelect({
                      userId: route?.params?.id,
                      code: item?.code,
                      index,
                      amount: item?.amount,
                      discount: item?.discount,
                    })
                  }>
                  <View style={{ flexBasis: '100%', flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={[styles.descriptionTitle]}>{item?.name}</Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' }}>
                      <Text style={styles.amountStyle}>{`${item?.amount}`}</Text>
                      <Image
                        source={require('../../Assets/Images/Coins2.png')}
                        style={{
                          height: responsiveWidth(5),
                          width: responsiveWidth(5),
                          resizeMode: 'contain',
                          alignSelf: 'center',
                          marginRight: responsiveWidth(1),
                        }}
                      />
                    </View>
                  </View>

                  <View style={[styles.offerView]}>
                    <Text style={{ fontFamily: 'Rubik-SemiBold', fontSize: 8, color: '#1e1e1e' }}>{item.discount + '% Off'}</Text>
                  </View>
                </TouchableOpacity>
              )
            }
          />
        </View>

        {Platform.OS !== 'android' && (
          <AnimatedButton title={!doHavePlan ? 'No Plans Found' : 'Pay Now'} loading={loading} disabled={!doHavePlan} onPress={handlePayment} />
        )}

        <Pressable style={{ position: 'relative', marginTop: 40 }} onPress={() => navigate('chooseWallet')}>
          {({ pressed }) => (
            <>
              <View style={styles.walletParent}>
                <View style={[styles.center, { flexDirection: 'row-reverse' }]}>
                  <Text style={[styles.amountStyle, { marginTop: 4, fontFamily: 'Rubik-SemiBold' }]}>Wallet Balance</Text>
                  <Image
                    source={require('../../Assets/Images/Wallets.png')}
                    style={{
                      height: responsiveWidth(6),
                      width: responsiveWidth(6),
                      resizeMode: 'contain',
                      alignSelf: 'center',
                      marginRight: responsiveWidth(1),
                    }}
                  />
                </View>
                <View style={styles.center}>
                  <Text style={styles.amountStyle}>{formatIndianNumber(coins)}</Text>
                  <Image
                    source={require('../../Assets/Images/Coins2.png')}
                    style={{
                      height: responsiveWidth(5),
                      width: responsiveWidth(5),
                      resizeMode: 'contain',
                      alignSelf: 'center',
                      marginRight: responsiveWidth(1),
                    }}
                  />
                </View>
              </View>

              {/* Only show overlay if NOT pressed */}
              {!pressed && <View style={styles.walletOverlay} />}
            </>
          )}
        </Pressable>

        <ConfirmSubscribeModal code={code} userId={route?.params?.id} userName={route?.params?.name} coins={currentAmont} />
      </ScrollView>
    </View>
  );
};

export default SubscribeScreen;

const styles = StyleSheet.create({
  chatRoomContainer: {
    backgroundColor: '#fff',
    paddingTop: responsiveWidth(4),
    paddingHorizontal: 24,
    paddingBottom: 40, // add extra bottom padding for scrollable area
  },
  profilePicBox: {
    borderWidth: 2,
    height: responsiveWidth(28),
    width: responsiveWidth(28),
    alignSelf: 'center',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: '#1e1e1e',
    zIndex: 2,
  },
  userNameContainer: {
    width: responsiveWidth(80),
    alignSelf: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: responsiveFontSize(2.3),
    fontFamily: 'Lexend-Bold',
    color: '#1e1e1e',
  },
  eachDescriptionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: responsiveWidth(1),
    borderWidth: WIDTH_SIZES['1.5'],
    width: '100%',
    alignSelf: 'center',
    borderRadius: 14,
    borderTopLeftRadius: 0,
    height: 54,
    paddingTop: 19,
    paddingBottom: 19,
    paddingHorizontal: 20,
    position: 'relative',
  },
  descriptionTitle: {
    fontFamily: 'Rubik-Medium',
    color: '#1e1e1e',
    fontSize: 14,
  },
  amountStyle: {
    fontFamily: 'Rubik-Regular',
    color: '#1e1e1e',
    fontSize: 14,
    marginRight: responsiveWidth(1),
  },
  listContainer: {
    padding: 21,
    borderWidth: WIDTH_SIZES['1.5'],
    borderColor: '#1e1e1e',
    borderStyle: 'dashed',
    borderRadius: 20,
    marginTop: 24,
  },
  offerView: {
    backgroundColor: '#fff',
    ...StyleSheet.absoluteFill,
    height: 16,
    width: 54,
    borderRadius: 18,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    paddingHorizontal: 7,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: WIDTH_SIZES['1.5'],
    borderColor: '#1e1e1e',
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  walletParent: {
    width: '100%',
    height: 54,
    backgroundColor: '#fff',
    borderWidth: WIDTH_SIZES['1.5'],
    borderColor: '#1e1e1e',
    zIndex: 1,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 26,
  },
  walletOverlay: {
    width: '100%',
    height: 54,
    backgroundColor: '#C5FFA1',
    position: 'absolute',
    borderWidth: WIDTH_SIZES['1.5'],
    borderColor: '#1e1e1e',
    left: 5,
    top: 5,
    borderRadius: 14,
  },
  center: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayImage: {
    position: 'absolute',
    height: responsiveWidth(28),
    width: responsiveWidth(28),
    backgroundColor: '#fff',
    borderWidth: WIDTH_SIZES['1.5'],
    borderColor: '#1e1e1e',
    top: 4,
    left: 4,
    borderRadius: 18,
  },
  verifyContainer: {
    width: 20,
    height: 20,
    zIndex: 4,
    bottom: 12,
    left: '90%',
  },
});
