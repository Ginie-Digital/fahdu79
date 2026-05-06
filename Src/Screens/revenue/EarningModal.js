import React, {useEffect, useState, useRef} from 'react';
import {View, Text, StyleSheet, Linking, Alert, FlatList, Platform, Pressable, Dimensions} from 'react-native';
import {Dialog} from 'react-native-simple-dialogs';
import AnimatedButton from '../../Components/AnimatedButton';
import {responsiveFontSize, responsiveHeight, responsiveWidth} from 'react-native-responsive-dimensions';
import {BlurView} from 'expo-blur';
import {Image} from 'expo-image';
import {navigate} from '../../../Navigation/RootNavigation';
import {nTwins} from '../../../DesiginData/Utility';
import {WINDOW_HEIGHT, WINDOW_WIDTH} from '@gorhom/bottom-sheet';
import {toggleBankDetailsModal, toggleConfirmBankDetails, toggleShowBankDetailsModal} from '../../../Redux/Slices/NormalSlices/HideShowSlice';
import {useDispatch, useSelector} from 'react-redux';
import {TouchableWithoutFeedback} from 'react-native-gesture-handler';
import {useLazyAlreadyFilledBankDetailsQuery, useLazyWithdrawableBalanceQuery} from '../../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';

const EarningsModalContent = ({withdrawData, onLayout}) => {
  console.log(withdrawData, 'LLL');

  return (
    <View onLayout={onLayout}>
      <View style={styles.card}>
        <Text style={styles.heading}>Your Earnings</Text>
        <View style={styles.row}>
          <Text style={styles.amount}>{withdrawData?.Transfer_Balance?.toLocaleString('en-IN') || 0}</Text>
          <Image source={require('../../../Assets/Images/Coins2.png')} style={styles.coinIcon} />
        </View>
      </View>

      <View style={styles.dashedCard}>
        <View style={styles.item}>
          <View>
            <Text style={styles.title}>Transfer Balance</Text>
            <Text style={styles.subtitle}>*in multiples of 100</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.amount}>{withdrawData?.Transfer_Balance?.toLocaleString('en-IN') || 0}</Text>
            <Image source={require('../../../Assets/Images/Coins2.png')} style={styles.coinIcon} />
          </View>
        </View>

        <View style={{height: responsiveWidth(5.6)}} />

        <View style={styles.item}>
          <View>
            <Text style={styles.title}>Fahdu fees</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.amount}>{withdrawData?.Fahdu_Fees?.toLocaleString('en-IN') || 0}</Text>
            <Image source={require('../../../Assets/Images/Coins2.png')} style={styles.coinIcon} />
          </View>
        </View>

        <View style={{height: responsiveWidth(5.6)}} />

        <View style={styles.item}>
          <View>
            <Text style={styles.title}>Withdrawable Balance</Text>
            <Text style={styles.subtitle}>*Withdrawable amount should be{'\n'}minimum 1000 coins.</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.amount}>{withdrawData?.Withdrawal_Balance?.toLocaleString('en-IN') || 0}</Text>
            <Image source={require('../../../Assets/Images/Coins2.png')} style={styles.coinIcon} />
          </View>
        </View>
      </View>
    </View>
  );
};

const EarningModal = ({visible, balance}) => {
  const dispatch = useDispatch();
  const [alreadyFilledBankDetails] = useLazyAlreadyFilledBankDetailsQuery();
  const token = useSelector(state => state.auth.user.token);
  const [loading, setLoading] = useState(false);
  const [contentHeight, setContentHeight] = useState(0);
  const [withdrawData, setWithdrawData] = useState(null);

  const buttonHeight = 50; // Approximate height of the button area
  const padding = 32; // Dialog padding
  const minModalHeight = 300; // Minimum height you want for the modal
  const maxModalHeight = Dimensions.get('window').height * 0.8; // Maximum height (80% of screen)

  const [withdrawableBalance] = useLazyWithdrawableBalanceQuery();

  const getWithDrawableBalance = async () => {
    const {data, error} = await withdrawableBalance({token});

    if (data && !error) {
      console.log('✅ Withdrawal data:', data);
      setWithdrawData(data?.data); // store it in state
    } else {
      console.log('❌ Error fetching balance:', error);
    }
  };

  useEffect(() => {
    console.log('CHALL');

    getWithDrawableBalance();
  }, []);

  const handleContentLayout = event => {
    const {height} = event.nativeEvent.layout;
    setContentHeight(height);
  };

  const calculateModalHeight = () => {
    const totalHeight = contentHeight + buttonHeight + padding * 2;
    return Math.min(Math.max(totalHeight, minModalHeight), maxModalHeight);
  };

  const handleTransfer = async () => {
    setLoading(true);

    const {data, error} = await alreadyFilledBankDetails({token});

    if (data?.data) {
      setLoading(false);
      dispatch(toggleConfirmBankDetails({show: false}));
      setTimeout(() => {
        dispatch(toggleShowBankDetailsModal({show: true, fahduFees: withdrawData?.Fahdu_Fees, amount: withdrawData?.Withdrawal_Balance}));
      }, 500);
    } else {
      setLoading(false);
      dispatch(toggleConfirmBankDetails({show: false}));
      setTimeout(() => {
        dispatch(toggleBankDetailsModal({show: true}));
      }, 500);
    }
  };

  return (
    visible && (
      <View style={styles.overlay}>
        <BlurView experimentalBlurMethod intensity={15} style={styles.blurBackground} />
        <Dialog visible={visible} dialogStyle={[styles.dialog, {height: calculateModalHeight() + 50}]} contentStyle={{padding: 0, paddingTop: 0, backgroundColor: '#fff'}} onTouchOutside={() => dispatch(toggleConfirmBankDetails({show: false}))}>
          <EarningsModalContent withdrawData={withdrawData} onLayout={handleContentLayout} />
          <View style={styles.buttonContainer}>
            <Pressable style={styles.fullWidthButton}>
              <AnimatedButton title={'Transfer'} buttonMargin={Platform.OS === 'android' ? 0 : 6} onPress={handleTransfer} loading={loading} disabled={balance < 1000} />
            </Pressable>
          </View>
        </Dialog>
      </View>
    )
  );
};

const styles = StyleSheet.create({
  dialog: {
    borderTopLeftRadius: responsiveWidth(5.33),
    borderTopRightRadius: responsiveWidth(5.33),
    alignSelf: 'center',
    padding: 32,
    backgroundColor: '#fff',
    width: WINDOW_WIDTH,
    borderColor: '#1e1e1e',
    position: 'absolute',
    bottom: 0,
    zIndex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  blurBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  buttonContainer: {
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  fullWidthButton: {
    flexBasis: '100%',
    marginBottom: responsiveWidth(10),
  },
  // Modal content styles remain the same
  container: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: responsiveWidth(3.73),
    paddingVertical: responsiveWidth(4.8),
    paddingHorizontal: responsiveWidth(4),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  heading: {
    fontSize: responsiveFontSize(1.8),
    fontFamily: 'Rubik-SemiBold',
    color: '#1e1e1e',
  },
  dashedCard: {
    marginTop: 16,
    borderRadius: responsiveWidth(3.73),
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#000',
    paddingVertical: responsiveWidth(5.33),
    paddingHorizontal: responsiveWidth(5),
    backgroundColor: '#fff',
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 14,
    fontFamily: 'Rubik-SemiBold',
    color: '#1e1e1e',
  },
  subtitle: {
    fontSize: 12,
    fontFamily: 'Rubik-Regular',
    color: '#1e1e1e',
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  amount: {
    fontSize: responsiveFontSize(1.8),
    fontFamily: 'Rubik-Regular',
    color: '#1e1e1e',
    marginRight: 6,
  },
  coinIcon: {
    height: 19,
    width: 19,
  },
});

export default EarningModal;
