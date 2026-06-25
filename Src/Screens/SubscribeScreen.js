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

const colorArray = ['#1A2332', '#1A2B1A', '#2B2A1A', '#2B1A1A'];

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
    <View style={{ flex: 1, backgroundColor: '#0D0D0D' }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.chatRoomContainer}>
        <View style={{ position: 'relative', width: responsiveWidth(28), alignSelf: 'center' }}>
          <View style={[styles.profilePicBox, { overflow: 'hidden' }]}>
            <Image
              source={route?.params?.profileImageUrl ? { uri: route?.params?.profileImageUrl } : require('../../Assets/Images/DefaultProfile.jpg')}
              style={{ width: '100%', height: '100%', borderRadius: responsiveWidth(14) - 3 }}
            />
          </View>
          <View style={styles.verifyContainer}>
            <Image cachePolicy="memory-disk" source={require('../../Assets/Images/verify.png')} contentFit="contain" style={{ width: '100%', height: '100%' }} />
          </View>
        </View>

        <View style={styles.userNameContainer}>
          <Text style={styles.text}>{route?.params?.name}</Text>
        </View>

        <View style={styles.listContainer}>
          <Text style={{ fontFamily: 'Rubik-SemiBold', fontSize: 20, color: '#FFFFFF' }}>Subscription Fee</Text>
          <Text style={{ fontFamily: 'Rubik-Regular', fontSize: 12, color: '#FFFFFF' }}>Full Access to the Exclusive Content</Text>

          <FlatList
            data={subscriptionPlans}
            scrollEnabled={false}
            renderItem={({ item, index }) => {
              const isSelected = selected === index;
              return (
                item.active && (
                  <TouchableOpacity
                    style={[
                      styles.eachDescriptionContainer,
                      index === 0 ? { marginTop: responsiveWidth(4) } : {},
                      {
                        backgroundColor: isSelected ? '#FFA86B' : '#212121',
                        borderColor: isSelected ? '#FF7819' : '#292929',
                        borderTopLeftRadius: index < 2 ? 0 : 14,
                      }
                    ]}
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
                      <Text style={[styles.descriptionTitle, { color: isSelected ? '#1E1E1E' : '#FFFFFF' }]}>
                        {item?.name}
                      </Text>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' }}>
                        <Text style={[styles.amountStyle, { color: isSelected ? '#000000' : '#FFFFFF' }]}>
                          {`${item?.amount}`}
                        </Text>
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

                    <View style={[styles.offerView, { borderColor: isSelected ? '#FF7819' : '#292929' }]}>
                      <Text style={{ fontFamily: 'Rubik-SemiBold', fontSize: 8, color: '#FFFFFF' }}>{item.discount + '% Off'}</Text>
                    </View>
                  </TouchableOpacity>
                )
              );
            }}
          />
        </View>

        {Platform.OS !== 'android' && (
          <AnimatedButton isDark={true} title={!doHavePlan ? 'No Plans Found' : 'Pay Now'} loading={loading} disabled={!doHavePlan} onPress={handlePayment} />
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
                      tintColor: '#FFFFFF',
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
    backgroundColor: '#0D0D0D',
    paddingTop: responsiveWidth(4),
    paddingHorizontal: 24,
    paddingBottom: 40, // add extra bottom padding for scrollable area
  },
  profilePicBox: {
    height: responsiveWidth(28),
    width: responsiveWidth(28),
    alignSelf: 'center',
    borderRadius: responsiveWidth(14),
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
    backgroundColor: '#121212',
    borderWidth: 1.72,
    borderColor: '#1E1E1E',
    padding: 3,
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
    color: '#FFFFFF',
  },
  eachDescriptionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: responsiveWidth(1),
    borderWidth: 1.5,
    width: '100%',
    alignSelf: 'center',
    borderRadius: 14,
    height: 54,
    paddingTop: 19,
    paddingBottom: 19,
    paddingHorizontal: 20,
    position: 'relative',
  },
  descriptionTitle: {
    fontFamily: 'Rubik-Medium',
    color: '#FFFFFF',
    fontSize: 14,
  },
  amountStyle: {
    fontFamily: 'Rubik-SemiBold',
    color: '#FFFFFF',
    fontSize: 14,
    marginRight: responsiveWidth(1),
  },
  listContainer: {
    padding: 21,
    backgroundColor: '#1C1C1C',
    borderWidth: 2,
    borderColor: '#212121',
    borderStyle: 'dashed',
    borderRadius: 20,
    marginTop: 24,
  },
  offerView: {
    backgroundColor: '#1C1C1C',
    position: 'absolute',
    left: 0,
    top: 0,
    height: 16,
    width: 54,
    borderRadius: 18,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    paddingHorizontal: 7,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  walletParent: {
    width: '100%',
    height: 54,
    backgroundColor: '#1A1A1A',
    borderWidth: WIDTH_SIZES['1.5'],
    borderColor: '#2A2A2A',
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
    backgroundColor: '#FF7819',
    position: 'absolute',
    borderWidth: WIDTH_SIZES['1.5'],
    borderColor: '#FF7819',
    left: 5,
    top: 5,
    borderRadius: 14,
  },
  center: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifyContainer: {
    width: 20,
    height: 20,
    zIndex: 4,
    left: '75%',
    top: '-20%',
  },
});
