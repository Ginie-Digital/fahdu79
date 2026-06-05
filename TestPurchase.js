import {StyleSheet, Text, View, Platform, Button, Alert, Image} from 'react-native';
import React, {useEffect, useState} from 'react';

import * as IAP from 'react-native-iap';
import {FlatList} from 'react-native-gesture-handler';
import {responsiveFontSize, responsiveWidth} from 'react-native-responsive-dimensions';

import DIcon from './DesiginData/DIcons';
import {nTwins} from './DesiginData/Utility';
import axios from 'axios';
import {useSelector} from 'react-redux';
import {token as memoizedToken} from './Redux/Slices/NormalSlices/AuthSlice';
import AnimatedNumber from './Src/Components/AnimatedNumber';
import WalletSVG from './Assets/svg/WalletIcon.svg';
import PackageBox from './Src/Components/PackageBox';
import {useAppleReceiptVerifyMutation} from './Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
import Purchases from 'react-native-purchases';
import Loader from './Src/Components/Loader';
import {LoginPageErrors} from './Src/Components/ErrorSnacks';

let purchaseUpdateListener;

let purchaseError;

let retry = false;

const TestPurchase = () => {
  const [purchased, setPurchased] = useState(false);
  const [products, setProducts] = useState([]);

  const token = useSelector(state => state.auth.user.token);

  const [appleReceiptVerify] = useAppleReceiptVerifyMutation();

  const [loading, setLoading] = useState(false);

  const [balance, setBalance] = useState(0);
  const [coins, setCoins] = useState(0);

  const [packages, setPackages] = useState([
    {id: 1, name: 'Faltu Pack', pack_id: null, cost: 499},
    {id: 2, name: 'Farzi Pack', pack_id: null, cost: 999},
    {id: 3, name: 'Fukrey Pack', pack_id: null, cost: 1999},
    {id: 4, name: 'Funtoosh Pack', pack_id: null, cost: 4999},
    {id: 5, name: 'Fahdu Pack', pack_id: null, cost: 9999},
  ]);

  async function getUserCoins() {
    let {data} = await axios.get('https://api.fahdu.in/api/wallet/get-coins', {
      headers: {Authorization: `Bearer ${token}`, 'Content-Type': 'application/json'},
      timeout: 10000,
    });

    setCoins(data?.data);
  }

  useEffect(() => {
    getUserCoins();
  }, []);

  useEffect(() => {
    async function fetchPackages() {
      try {
        const result = await Purchases.getOfferings();
        const availablePackages = result.current?.availablePackages ?? [];

        if (availablePackages.length < 5) {
          console.warn('Expected at least 5 packages but found', availablePackages.length);
        }

        // Sort packages by price ascending so they map correctly to our predefined packages
        const sortedPackages = [...availablePackages].sort(
          (a, b) => (a.product?.price ?? 0) - (b.product?.price ?? 0),
        );

        console.log('Sorted RevenueCat packages:', sortedPackages.map(p => ({
          id: p.identifier,
          price: p.product?.price,
        })));

        // Map package ids into your predefined packages array
        const updatedPackages = packages.map((pack, index) => {
          return {
            ...pack,
            pack_id: sortedPackages[index] ?? null,
          };
        });

        setPackages(updatedPackages);

        console.log('Updated packages:', updatedPackages);
      } catch (error) {
        console.error('Failed to fetch offerings from RevenueCat:', error);
      }
    }

    fetchPackages();
  }, []);

  const handlePurchase = async selectedPackage => {
    console.log('Starting purchase for:', selectedPackage);

    setLoading(true);

    try {
      const purchaseResult = await Purchases.purchasePackage(selectedPackage);

      console.log('Purchase successful:', purchaseResult);

      // You can also handle any post-purchase logic here (like updating backend or showing success message)
    } catch (error) {
      if (error.userCancelled) {
        console.warn('User cancelled the purchase.');
      } else {
        LoginPageErrors(error);
      }
    } finally {
      setLoading(false); // Always set loading to false (success or error)
    }
  };

  if (loading) {
    return <Loader />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.overlayButton} />
      <View style={styles.walletCard}>
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

      {/* <Button title='pay' onPress={() => handlePurchase()}/> */}

      {packages?.length > 0 && (
        <FlatList
          data={packages}
          renderItem={({item, index}) => <PackageBox handler={handlePurchase} loading={loading} item={item} index={index} isLastItem={index === packages.length - 1 && packages.length % 2 !== 0} />}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.packagesList}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

export default TestPurchase;

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
  overlayButton: {
    width: responsiveWidth(90),
    height: nTwins(34, 28),
    borderRadius: responsiveWidth(4),
    backgroundColor: 'white',
    position: 'absolute',

    // transform: [
    //   { translateX: responsiveWidth(6.4) },
    //   { translateY: responsiveWidth(8.5) }
    // ],
    ...Platform.select({
      ios: {
        transform: [{translateX: responsiveWidth(7)}, {translateY: responsiveWidth(1)}],
      },
      android: {
        transform: [
          {translateX: responsiveWidth(7.2)}, // Adjust for Android
          {translateY: responsiveWidth(2.5)}, // Adjust for Android
        ],
      },
    }),

    paddingHorizontal: responsiveWidth(5),
    borderWidth: responsiveWidth(0.4),
    // paddingVertical: responsiveWidth(4),
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
    justifyContent: 'space-between', // Ensures spacing between columns
    marginBottom: responsiveWidth(4), // Space between rows
  },
});
