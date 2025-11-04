import {
  StyleSheet,
  View,
  Text,
  Pressable,
  BackHandler,
  ActivityIndicator,
  Keyboard,
  Platform,
  TouchableOpacity,
} from 'react-native';
import React, {useMemo, useCallback, useRef, useState, useEffect} from 'react';
import {
  responsiveWidth,
  responsiveFontSize,
} from 'react-native-responsive-dimensions';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetTextInput,
} from '@gorhom/bottom-sheet';
import {useDispatch, useSelector} from 'react-redux';
import {toggleWishListSheet} from '../../../Redux/Slices/NormalSlices/HideShowSlice';
import ProgressBar from 'react-native-progress/Bar';

import {LoginPageErrors, chatRoomSuccess} from '../ErrorSnacks';
import {useWishListDonationMutation} from '../../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
import DIcon from '../../../DesiginData/DIcons';
import {Image} from 'expo-image';
import AnimatedButton from '../AnimatedButton';
import {WIDTH_SIZES} from '../../../DesiginData/Utility';

const WishListDonateSheet = () => {
  const bottomSheetRef = useRef(null);
  const donateData = useSelector(
    state => state.wishListDonateSheet.data.donationInfo,
  );
  const wishListBottomSheetVisibility = useSelector(
    state => state.hideShow.visibility.wishListSheet,
  );
  const dispatch = useDispatch();

  const snapPoints = useMemo(() => ['75%', '85%', '90%'], []);

  const handleSheetChanges = useCallback(
    index => {
      if (index === -1) {
        dispatch(toggleWishListSheet({show: -1}));
      }
    },
    [dispatch],
  );

  // State for amount input. Stored as string to easily work with BottomSheetTextInput.
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const onBackPress = () => {
    if (bottomSheetRef !== null) {
      bottomSheetRef.current?.close();
      return true;
    }
  };

  useEffect(() => {
    // Make sure the ref exists before using it
    if (!bottomSheetRef.current) return;

    if (wishListBottomSheetVisibility === -1) {
      // Close the bottom sheet
      bottomSheetRef.current.close();
      return; // Stop here; no need to attach back handler
    }

    // Add hardware back press listener when sheet is open
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      onBackPress,
    );

    // Cleanup listener when visibility changes or component unmounts
    return () => backHandler.remove();
  }, [wishListBottomSheetVisibility]);

  const token = useSelector(state => state.auth.user.token);

  // Allow only numeric inputs and no leading zeros.
  const handleAmountInput = x => {
    if (/^[0-9]*$/.test(x) && !/^0+/.test(x)) {
      setAmount(x);
    }
  };

  // Increment and decrement handlers
  const incrementAmount = () => {
    // If empty, start with 1
    setAmount(prev =>
      Number(prev) > 90
        ? String(Number(prev || '0') + 100)
        : String(Number(prev || '0') + 10),
    );
  };

  const decrementAmount = () => {
    setAmount(prev =>
      Number(prev) > 100
        ? String(Number(prev || '0') - 100)
        : String(Number(prev || '0') - 10),
    );
  };

  const renderBackdrop = useCallback(
    props => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={1}
      />
    ),
    [],
  );

  const [wishListDonation] = useWishListDonationMutation();

  const handleSubmitMoney = () => {
    Keyboard.dismiss();

    // Convert amount to number for comparison.
    const numericAmount = Number(amount);
    if (amount === '' || numericAmount === 0) {
      LoginPageErrors("Amount can't be empty");
      return;
    }
    if (numericAmount < 100) {
      LoginPageErrors('Amount must be greater than 100');
      return;
    }

    console.log('Paying');
    setLoading(true);

    wishListDonation({
      token,
      data: {wishlistItem: donateData?._id, amount: numericAmount},
    }).then(e => {
      if (e?.error?.status === 'FETCH_ERROR') {
        LoginPageErrors('Please check your network');
      } else {
        if (e?.error?.data?.status_code === 401) {
          setLoading(false);
          // autoLogout(); // Uncomment if autoLogout is defined
          bottomSheetRef.current.close();
        }

        if (e?.data?.statusCode === 200) {
          setLoading(false);
          chatRoomSuccess(e?.data?.message);
          setAmount('');
          bottomSheetRef.current.close();
        }

        if (e?.error) {
          LoginPageErrors(e?.error?.data?.message);
          setAmount('');
          setLoading(false);
          bottomSheetRef.current.close();
        }
      }
    });
  };

  if (Object.keys(donateData)?.length > 0) {
    return (
      <BottomSheet
        backdropComponent={renderBackdrop}
        ref={bottomSheetRef}
        index={wishListBottomSheetVisibility}
        snapPoints={snapPoints}
        onChange={handleSheetChanges}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        enablePanDownToClose={true}
        backgroundStyle={styles.bottomSheetBackground}>
        <View style={styles.contentContainer}>
          <View style={styles.container}>
            <View style={styles.expectButtonContainer}>
              <View style={styles.header}>
                <Text style={styles.title}>Raise Fund</Text>
              </View>

              <View style={styles.cardBottomView}>
                <View
                  style={{
                    width: '100%',
                    overflow: 'hidden',
                    backgroundColor: 'red',
                    height: responsiveWidth(60),
                  }}>
                  <Image
                    placeholder={require('../../../Assets/Images/WishlistDefault.jpg')}
                    source={donateData?.images[0]?.url}
                    style={[
                      styles.donationImage,
                      {width: '100%', height: '100%'},
                    ]}
                    placeholderContentFit="cover"
                    contentFit="cover"
                  />
                </View>

                <Text style={styles.description}>{donateData?.title}</Text>

                <View style={styles.cardHeader}>
                  <Text style={styles.fundLabel}>Fund Raised</Text>
                  <View style={styles.fundValueContainer}>
                    <Text style={styles.fundValue}>
                      <Text style={{fontFamily: 'Rubik-Regular'}}>
                        {Number(donateData?.totalCollected).toLocaleString(
                          'en-IN',
                        )}
                      </Text>
                      /
                      {Number(donateData?.listedCoinsRequired).toLocaleString(
                        'en-IN',
                      )}
                    </Text>

                    <Image
                      source={require('../../../Assets/Images/Coins.png')}
                      style={styles.coinIcon}
                    />
                  </View>
                </View>

                <View style={styles.progressBarContainer}>
                  <ProgressBar
                    borderWidth={0}
                    height={responsiveWidth(3)}
                    unfilledColor={'#f2f2f2'}
                    width={responsiveWidth(80)}
                    progress={
                      Number(donateData?.totalCollected + Number(amount)) /
                      donateData?.listedCoinsRequired
                    }
                    color={'#FFA86B'}
                  />
                </View>
              </View>

              {/* Amount input with increment and decrement buttons */}
              <View style={styles.amountContainer}>
                {/* Coin image on the very left */}
                <Image
                  source={require('../../../Assets/Images/Coins.png')}
                  style={styles.coinIcon}
                />

                {/* Amount input */}
                <BottomSheetTextInput
                  maxLength={6}
                  style={styles.amountInput}
                  placeholder="Amount"
                  keyboardType="numeric"
                  onChangeText={handleAmountInput}
                  value={amount}
                  placeholderTextColor="#888"
                />

                {/* Increment/Decrement buttons in a horizontal row */}
                <View style={styles.incDecContainer}>
                  {/* <Pressable onPress={decrementAmount} style={[styles.incDecButton, {backgroundColor: '#FF8080'}]}>
                    <Text style={styles.incDecButtonText}>–</Text>
                  </Pressable> */}

                  <Pressable
                    onPress={decrementAmount}
                    style={({pressed}) => [
                      styles.incDecButton,
                      {backgroundColor: pressed ? '#FFCCCC' : '#FF8080'}, // darker when pressed
                    ]}>
                    <Text style={styles.incDecButtonText}>–</Text>
                  </Pressable>

                  <Pressable
                    onPress={incrementAmount}
                    style={({pressed}) => [
                      styles.incDecButton,
                      {backgroundColor: pressed ? '#CCFFD7' : '#A4FFB8'},
                    ]}>
                    <Text style={styles.incDecButtonText}>+</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </View>

          <View style={{width: '90%', alignSelf: 'center'}}>
            <AnimatedButton
              onPress={handleSubmitMoney}
              loading={loading}
              title={'Pay'}
            />
          </View>
        </View>
      </BottomSheet>
    );
  } else {
    return (
      <BottomSheet
        backdropComponent={renderBackdrop}
        ref={bottomSheetRef}
        index={wishListBottomSheetVisibility}
        snapPoints={snapPoints}
        onChange={handleSheetChanges}
        enablePanDownToClose={true}
        backgroundStyle={styles.bottomSheetBackground}
      />
    );
  }
};

export default WishListDonateSheet;

const styles = StyleSheet.create({
  bottomSheetBackground: {
    backgroundColor: '#ffffff',
  },
  contentContainer: {
    flex: 1,
    // paddingTop: responsiveWidth(4),
    backgroundColor: '#ffffff',
  },
  container: {
    // padding: 1,
    borderRadius: 8,
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontFamily: 'Rubik-Medium',
  },
  title: {
    fontSize: 16,
    color: '#000',
    fontFamily: 'Rubik-Medium',
  },
  closeButton: {
    padding: responsiveWidth(1),
  },
  donationImage: {
    height: responsiveWidth(45),
    width: responsiveWidth(60),

    resizeMode: 'cover',
    // borderRadius: responsiveWidth(3),
    marginBottom: responsiveWidth(3),
  },
  description: {
    fontFamily: 'Rubik-Bold',
    fontSize: responsiveFontSize(2.4),
    color: '#333',
    marginBottom: responsiveWidth(2),
    paddingHorizontal: responsiveWidth(2),
    marginTop: responsiveWidth(4),
  },
  cardBottomView: {
    borderRadius: responsiveWidth(4),
    // paddingVertical: responsiveWidth(4),
    marginVertical: responsiveWidth(2),
    borderWidth: WIDTH_SIZES[1.5],
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: responsiveWidth(3),
    paddingHorizontal: responsiveWidth(2),
  },
  fundLabel: {
    fontFamily: 'Rubik-Bold',
    fontSize: responsiveFontSize(1.8),
    color: '#333',
  },
  fundValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fundValue: {
    fontFamily: 'Rubik-Bold',
    fontSize: responsiveFontSize(1.8),
    color: '#000000',
    marginRight: responsiveWidth(1),
  },
  coinIcon: {
    height: responsiveWidth(5),
    width: responsiveWidth(5),
    resizeMode: 'contain',
    marginRight: responsiveWidth(2),
  },
  progressBarContainer: {
    marginBottom: responsiveWidth(4),
    alignSelf: 'center',
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: '#1e1e1e',
    borderWidth: WIDTH_SIZES[1.5],
    borderRadius: responsiveWidth(2),
    backgroundColor: '#fff',
    paddingHorizontal: responsiveWidth(2),
    paddingVertical: responsiveWidth(1),
  },
  amountInput: {
    flex: 1,
    fontSize: responsiveFontSize(2.2),
    color: '#1e1e1e',
    textAlign: 'center',
    fontFamily: 'Rubik-Medium',
  },
  incDecContainer: {
    flexDirection: 'row',
    gap: responsiveWidth(2),
  },
  incDecButton: {
    paddingHorizontal: responsiveWidth(2),
    // paddingVertical: responsiveWidth(2),
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: responsiveWidth(1),
    borderRadius: responsiveWidth(1),
    borderWidth: WIDTH_SIZES[1.5],
    borderColor: '#1e1e1e',
  },
  incDecButtonText: {
    color: '#1e1e1e',
    fontSize: responsiveFontSize(2.4),
  },
  expectButtonContainer: {
    paddingHorizontal: responsiveWidth(5),
  },
});
