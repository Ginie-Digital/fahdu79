import {StyleSheet, View, TouchableOpacity, Text, Image, Pressable, BackHandler, ActivityIndicator, Keyboard} from 'react-native';
import React, {useMemo, useCallback, useRef, useState, useEffect} from 'react';
import {responsiveWidth, responsiveFontSize} from 'react-native-responsive-dimensions';
import BottomSheet, {BottomSheetBackdrop, BottomSheetTextInput} from '@gorhom/bottom-sheet';
import {useDispatch, useSelector} from 'react-redux';
import {toggleWishListSheet} from '../../../Redux/Slices/NormalSlices/HideShowSlice';
import DIcon from '../../../DesiginData/DIcons';
import ProgressBar from 'react-native-progress/Bar';

import {token as memoizedToken} from '../../../Redux/Slices/NormalSlices/AuthSlice';
import {TextInput} from 'react-native-gesture-handler';
import {LoginPageErrors, chatRoomSuccess, successSnack} from '../ErrorSnacks';
import {useWishListDonationMutation} from '../../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';

const StarBottomSheet = ({donateData}) => {
  const bottomSheetRef = useRef(null);

  const wishListBottomSheetVisibility = useSelector(state => state.hideShow.visibility.wishListSheet);

  const dispatch = useDispatch();

  const snapPoints = useMemo(() => ['55%', '65%', '70%'], []);

  const handleSheetChanges = useCallback(index => {
    if (index === -1) {
      dispatch(toggleWishListSheet({show: -1}));
    }
  }, []);

  const [amount, setAmount] = useState('');

  const [loading, setLoading] = useState(false);

  const onBackPress = () => {
    if (bottomSheetRef !== null) {
      bottomSheetRef.current?.close();
      return true;
    }
  };

  useEffect(() => {
    if (wishListBottomSheetVisibility === -1) {
      bottomSheetRef.current.close();
    } else {
      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);

      return () => {
        subscription.remove();
      };
    }
  }, [wishListBottomSheetVisibility]);

  const token = useSelector(state => state.auth.user.token);

  const handleAmountInput = x => {
    if (/^[0-9]*$/.test(x) && !/^0+/.test(x)) {
      setAmount(x);
    }
  };

  const renderBackdrop = useCallback(props => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={1} />, []);

  const [wishListDonation] = useWishListDonationMutation();

  const handleSubmitMoney = () => {
    Keyboard.dismiss();

    if (amount !== 0) {
      if (amount < 100) {
        LoginPageErrors('Amount must be greater than 100');
      } else {
        console.log('Paying');

        setLoading(true);

        wishListDonation({token, data: {wishlistItem: donateData?._id, amount}}).then(e => {
          if (e?.error?.status === 'FETCH_ERROR') {
            LoginPageErrors('Please check your network');
          } else {
            if (e?.error?.data?.status_code === 2044) {
              setLoading(false);
              autoLogout();
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
          1500;
        });
      }
    } else {
      LoginPageErrors("Amount can't be empty");
    }
  };

  if (Object.keys(donateData)?.length > 0) {
    return (
      <BottomSheet backdropComponent={renderBackdrop} ref={bottomSheetRef} index={wishListBottomSheetVisibility} snapPoints={snapPoints} onChange={handleSheetChanges} enablePanDownToClose={true} backgroundStyle={{backgroundColor: '#fffef9'}}>
        <View style={styles.contentContainer}>
          <Text style={styles.title}>Rate User</Text>
        </View>
      </BottomSheet>
    );
  } else {
    return <BottomSheet backdropComponent={renderBackdrop} ref={bottomSheetRef} index={wishListBottomSheetVisibility} snapPoints={snapPoints} onChange={handleSheetChanges} enablePanDownToClose={true} backgroundStyle={{backgroundColor: '#fffef9'}}></BottomSheet>;
  }
};

export default StarBottomSheet;

const styles = StyleSheet.create({
  contentContainer: {
    backgroundColor: '#fffef9',
    height: '100%',
    paddingHorizontal: responsiveWidth(4),
  },
  headerLeftWrapper: {
    height: responsiveWidth(12),
    justifyContent: 'center',
    // borderWidth : 1,
    flexBasis: '50%',
  },

  amountInput: {
    flexBasis: '70%',
    color: '#282828',
    fontFamily: 'MabryPro-Regular',
    fontSize: responsiveFontSize(2.2),
  },
  cardBottomView: {
    // borderWidth : 1,
    marginTop: responsiveWidth(4),
    height: responsiveWidth(16),
  },

  cardBottomViewUpper: {
    // borderWidth : 1,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: responsiveWidth(4),
  },

  title: {
    fontFamily: 'Lexend-Medium',
    textAlign: 'center',
    color: '#FF9E99',
    fontSize: responsiveFontSize(2.2),
  },

  sendTipInputContainer: {
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '40%',
    borderRadius: responsiveWidth(2),
    borderColor: '#282828',
    marginTop: responsiveWidth(4),
    alignSelf: 'center',
  },

  notePoints: {
    fontFamily: 'MabryPro-Medium',
    color: '#282828',
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: responsiveWidth(4),
  },

  headerLeftContentContainer: {
    height: '100%',
    borderColor: 'blue',
    flexDirection: 'row',
    alignItems: 'center',
    gap: responsiveWidth(4),
  },
  profileImageContainer: {
    borderColor: '#282828',
    height: responsiveWidth(9),
    width: responsiveWidth(9),
    borderRadius: responsiveWidth(10),
    overflow: 'hidden',
    borderWidth: 1,
    borderRadius: responsiveWidth(10),
    position: 'relative',
  },
  profileImage: {
    width: '100%',
    resizeMode: 'cover',
    height: '100%',
  },
  userName: {
    fontFamily: 'Lexend-Bold',
    color: '#282828',
    fontSize: responsiveFontSize(1.9),
  },
  status: {
    fontSize: responsiveFontSize(1.6),
    letterSpacing: 0.5,
    color: '#282828',
    fontFamily: 'MabryPro-Regular',
  },
  cardHeaderWrapper: {
    justifyContent: 'space-between',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#282828',
    paddingVertical: responsiveWidth(3),
    paddingHorizontal: responsiveWidth(4),
    borderRadius: responsiveWidth(2),
  },
  likeCommentText: {
    fontFamily: 'MabryPro-Medium',
    marginLeft: responsiveWidth(1),
    color: '#282828',
  },
  eachSortByModalListText: {
    fontSize: responsiveFontSize(2),
    color: '#282828',

    fontFamily: 'MabryPro-Bold',
  },
  eachSortModalList: {
    flexDirection: 'row',
    gap: responsiveWidth(5),
    alignItems: 'center',
    marginVertical: responsiveWidth(3),
  },

  loginButton: {
    borderWidth: 1,
    paddingHorizontal: responsiveWidth(2),
    backgroundColor: '#ffa07a',
    marginTop: responsiveWidth(4),
    borderRadius: responsiveWidth(2),
    color: '#282828',
    textAlign: 'center',
    fontFamily: 'Lexend-Medium',
    elevation: 1,
    fontWeight: '600',
    width: responsiveWidth(20),
    height: responsiveWidth(10),
    textAlignVertical: 'center',
    alignSelf: 'center',
    borderTopColor: '#282828',
    borderLeftColor: '#282828',
    elevation: 1,
    fontSize: responsiveFontSize(2.8),
  },
});
