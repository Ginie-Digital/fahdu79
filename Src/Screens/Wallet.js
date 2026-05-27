// WalletScreen.js

import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, Linking, Platform, Alert, ActivityIndicator } from 'react-native';
import { responsiveWidth, responsiveFontSize, responsiveHeight } from 'react-native-responsive-dimensions';
import WalletSVG from '../../Assets/svg/WalletIcon.svg';
import AnimatedNumber from '../Components/AnimatedNumber';
import PackageBox from '../Components/PackageBox';
import axios from 'axios';
import { useDispatch, useSelector } from 'react-redux';
import { useGetPaymentTokenMutation, useLazyGetWalletPackQuery } from '../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
import { FONT_SIZES, nTwins, WIDTH_SIZES } from '../../DesiginData/Utility';
import { usePaymentCheckOutMutation } from '../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
import { CFEnvironment, CFSession, CFPaymentModes, CFThemeBuilder, CFPaymentComponentBuilder, CFDropCheckoutPayment } from 'cashfree-pg-api-contract';

const { CFPaymentGatewayService } = Platform.OS === 'android' ? require('react-native-cashfree-pg-sdk') : { CFPaymentGatewayService: null };
import { toggleWalletLoader } from '../../Redux/Slices/NormalSlices/HideShowSlice';
import { useFocusEffect, useIsFocused, useNavigation } from '@react-navigation/native';
import { chatRoomSuccess } from '../Components/ErrorSnacks';
import { navigate } from '../../Navigation/RootNavigation';

const WalletScreen = ({ route }) => {
  const token = useSelector(state => state.auth.user.token);

  const method = route?.params?.method;

  const [walletHeight, setWalletHeight] = useState(0);

  const [getWalletPack] = useLazyGetWalletPackQuery();

  const [balance, setBalance] = useState(0);

  const [packages, setPackages] = useState([]);

  const [coins, setCoins] = useState(0);

  const [paymentCheckOut] = usePaymentCheckOutMutation();

  const [responseText, setResponseText] = useState('');

  const [loading, setLoading] = useState(false);

  const [getPaymentToken] = useGetPaymentTokenMutation();

  const dispatch = useDispatch();

  const navigation = useNavigation();

  async function getUserCoins() {
    let { data } = await axios.get('https://api.fahdu.in/api/wallet/get-coins', {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      timeout: 10000,
    });

    setCoins(data?.data);
  }

  useEffect(() => {
    let timeoutId;

    if (CFPaymentGatewayService) {
      CFPaymentGatewayService.setCallback({
        onVerify: orderID => {
          setResponseText('orderId is :' + orderID);
          dispatch(toggleWalletLoader({ packId: null }));

          timeoutId = setTimeout(() => {
            getUserCoins();
          }, 1000);
        },
        onError: (error, orderID) => {
          setResponseText('exception is : ' + JSON.stringify(error) + '\norderId is :' + orderID);
          dispatch(toggleWalletLoader({ packId: null }));

          timeoutId = setTimeout(() => {
            getUserCoins();
          }, 1000);
        },
      });
    }

    return () => {
      if (CFPaymentGatewayService) {
        CFPaymentGatewayService.removeCallback();
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  const checkoutPayment = async packId => {
    console.log('Selected method:', packId);

    dispatch(toggleWalletLoader({ packId }));

    // setLoading(true);
    try {
      const response = await getPaymentToken({
        token,
        data: { packId },
      });

      console.log(response);

      if (!response?.data?.data?.sessionId || !response?.data?.data?.orderId) {
        throw new Error('Invalid payment session response');
      }

      const session = new CFSession(response?.data?.data?.sessionId, response?.data?.data?.orderId, CFEnvironment.PRODUCTION);

      const paymentModes = new CFPaymentComponentBuilder().add(CFPaymentModes.CARD).add(CFPaymentModes.UPI).add(CFPaymentModes.NB).add(CFPaymentModes.WALLET).add(CFPaymentModes.PAY_LATER).build();

      const theme = new CFThemeBuilder().setNavigationBarBackgroundColor('#1e1e1e').setNavigationBarTextColor('#FFFFFF').setButtonBackgroundColor('#FFA86B24').setButtonTextColor('#FFFFFF').setPrimaryTextColor('#212121').setSecondaryTextColor('#757575').build();

      const dropPayment = new CFDropCheckoutPayment(session, paymentModes, theme);

      if (CFPaymentGatewayService) {
        CFPaymentGatewayService.doPayment(dropPayment);
      }
    } catch (error) {
      setLoading(false);
      console.error('Payment Error:', error);
    }
  };

  const fetchPack = async () => {
    const os = Platform.OS;
    console.log('📱 Platform.OS detected:', os);
    
    const { data, error } = await getWalletPack({ token, os }, false); // False to skip cache

    const packs = data?.data?.packs || [];
    console.log('📦 [Wallet:FetchPack] OS:', os);
    console.log('📦 [Wallet:FetchPack] Pack Count:', packs.length);

    if (error) {
      console.log('📦 [Wallet:FetchPack] Error:', error);
    }

    setPackages(packs);
  };

  useFocusEffect(
    useCallback(() => {
      fetchPack();
      getUserCoins();
    }, [])
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#3d84b8" />
        <Text style={styles.loadingText}>Processing payment...</Text>
      </View>
    );
  }

  const limitedPackages = packages?.slice(0, 5) || [];

  const getOfferData = item => {
    const name = item?.name?.toLowerCase() || '';
    const discount = item?.discount || 0;

    let isFahdu = false;
    if (name.includes('fahdu') || (name.includes('fukrey') && (item?.cost || item?.amount) > 8000)) {
      isFahdu = true;
    }

    if (discount === 0) return null;

    return {text: `+${discount}% EXTRA`, isFahdu};
  };

  const offerData = (item) => getOfferData(item);

  return (
    <View style={styles.container}>
      <View style={[styles.overlay, { height: walletHeight }]} />
      <View style={styles.walletCard} onLayout={event => setWalletHeight(event.nativeEvent.layout.height)}>
        <View style={styles.walletHeader}>
          <Text style={styles.walletText}>Total Balance</Text>
        </View>

        <View style={styles.priceWallet}>
          <Text style={styles.balance}>
            ₹
            <AnimatedNumber target={coins} style={styles.balance} />
          </Text>
          <WalletSVG />
        </View>
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.title}>Choose Package</Text>
        <Text style={styles.subtitle}>Select the package that suits your needs</Text>
      </View>
      {/* Packages Grid */}
      <FlatList
        data={limitedPackages}
        renderItem={({ item, index }) => {
          const data = offerData(item);
          return (
            <PackageBox 
              item={item} 
              index={index} 
              isLastItem={index === limitedPackages.length - 1 && limitedPackages.length % 2 !== 0} 
              handler={checkoutPayment} 
              offerText={data?.text}
              isFahdu={data?.isFahdu}
            />
          );
        }}        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={styles.packagesList}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={() => (
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderWidth: WIDTH_SIZES['1.5'],
              borderColor: '#1e1e1e',
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 10,
              marginBottom: 40,
              width: '100%',
            }}>
            <Text style={{ fontSize: FONT_SIZES['12'], color: '#1e1e1e', fontFamily: 'Rubik-Regular' }}>Have questions about refund?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('webView', { title: 'Refund Policy', type: 'refund' })}>
              <Text style={{ fontSize: FONT_SIZES['14'], fontFamily: 'Rubik-Bold', color: '#1e1e1e' }}>Read Policy</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: responsiveWidth(5),
  },
  walletCard: {
    backgroundColor: '#FFA86B',
    borderRadius: responsiveWidth(4),
    paddingHorizontal: responsiveWidth(5),
    paddingVertical: responsiveWidth(4),
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: responsiveWidth(0.4),
    borderColor: '#282828',
    position: 'relative',
  },
  walletHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  walletText: {
    fontSize: responsiveFontSize(1.6),
    color: '#000',
    fontFamily: 'Rubik-Medium',
  },
  balance: {
    fontSize: 32,
    marginVertical: 10,
    fontFamily: 'Rubik-Bold',
    color: '#000',
  },
  priceWallet: {
    flexDirection: 'row',
    alignItems: 'center',
    width: responsiveWidth(82),
    justifyContent: 'space-between',
    paddingHorizontal: responsiveWidth(2),
  },
  overlay: {
    width: '100%',
    borderRadius: responsiveWidth(4),
    backgroundColor: 'white',
    position: 'absolute',
    left: '7.1%',
    top: '0.80%',
    borderWidth: responsiveWidth(0.4),
  },
  textContainer: {
    paddingVertical: 15,
    paddingHorizontal: responsiveWidth(1.8),
  },
  title: {
    fontFamily: 'Rubik-Bold',
    fontSize: responsiveFontSize(2.5),
    color: '#000',
  },
  subtitle: {
    fontFamily: 'Rubik-Regular',
    fontSize: responsiveFontSize(1.5),
    color: '#1E1E1E',
    marginTop: responsiveWidth(1),
  },
  packagesList: {
    alignItems: 'center',
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: responsiveWidth(4),
  },
});

export default WalletScreen;
