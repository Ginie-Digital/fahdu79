import {StyleSheet, View, Text, Pressable, BackHandler, Keyboard, Platform, TouchableOpacity, KeyboardAvoidingView, ScrollView, TextInput} from 'react-native';
import React, {useState} from 'react';
import {responsiveWidth, responsiveFontSize} from 'react-native-responsive-dimensions';
import {useDispatch, useSelector} from 'react-redux';
import ProgressBar from 'react-native-progress/Bar';
import {LoginPageErrors, chatRoomSuccess} from '../Components/ErrorSnacks';
import {useWishListDonationMutation} from '../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
import DIcon from '../../DesiginData/DIcons';
import {Image} from 'expo-image';
import AnimatedButton from '../Components/AnimatedButton';
import {WIDTH_SIZES} from '../../DesiginData/Utility';
import Paisa from '../../Assets/svg/paisa.svg';
import {triggerImpactHeavy, triggerImpactLight, triggerSuccess} from '../Utils/Haptics';
import {useAppTheme} from '../Hook/useAppTheme';

const WishListDonateScreen = ({navigation}) => {
  const donateData = useSelector(state => state.wishListDonateSheet.data.donationInfo);
  const token = useSelector(state => state.auth.user.token);

  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [wishListDonation] = useWishListDonationMutation();
  const {isDark} = useAppTheme();

  const handleClose = () => {
    triggerImpactLight();
    Keyboard.dismiss();
    navigation.goBack();
  };

  const handleAmountInput = x => {
    triggerImpactLight();
    if (/^[0-9]*$/.test(x) && !/^0+/.test(x)) {
      setAmount(x);
    } else if (x === '') {
      setAmount('');
    }
  };

  const incrementAmount = () => {
    triggerImpactHeavy();
    setAmount(prev => (Number(prev) > 90 ? String(Number(prev || '0') + 100) : String(Number(prev || '0') + 10)));
  };

  const decrementAmount = () => {
    triggerImpactHeavy();
    setAmount(prev => (Number(prev) > 100 ? String(Number(prev || '0') - 100) : String(Number(prev || '0') - 10)));
  };

  const handleSubmitMoney = () => {
    Keyboard.dismiss();

    const numericAmount = Number(amount);
    if (amount === '' || numericAmount === 0) {
      LoginPageErrors("Amount can't be empty");
      return;
    }
    if (numericAmount < 100) {
      LoginPageErrors('Amount must be greater than 100');
      return;
    }

    setLoading(true);

    wishListDonation({token, data: {wishlistItem: donateData?._id, amount: numericAmount}}).then(e => {
      if (e?.error?.status === 'FETCH_ERROR') {
        LoginPageErrors('Please check your network');
      } else {
        if (e?.error?.data?.status_code === 2044) {
          setLoading(false);
          handleClose();
        }

        if (e?.data?.statusCode === 200) {
          setLoading(false);
          chatRoomSuccess(e?.data?.message);
          triggerSuccess();
          handleClose();
        }

        if (e?.error) {
          LoginPageErrors(e?.error?.data?.message);
          setLoading(false);
          handleClose();
        }
      }
    });
  };

  if (!donateData || Object.keys(donateData).length === 0) return null;

  return (
    <View style={[styles.container, isDark && {backgroundColor: '#0D0D0D'}]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboardView} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
        <View style={[styles.dialog, isDark && {backgroundColor: '#0D0D0D'}]}>
          
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={handleClose} style={styles.backButton}>
              <DIcon provider={'AntDesign'} name={'arrowleft'} color={isDark ? '#FFFFFF' : '#000'} size={responsiveFontSize(3)} />
            </TouchableOpacity>
            <Text style={[styles.sendTipText, isDark && {color: '#FFFFFF'}]}>Raise Fund</Text>
            <View style={{width: responsiveFontSize(3)}} /> 
          </View>

          <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
            <View style={[styles.cardBottomView, isDark && {borderColor: '#2A2A2A'}]}>
              <View style={{width: '100%', overflow: 'hidden', height: responsiveWidth(55)}}>
                <Image placeholder={require('../../Assets/Images/WishlistDefault.jpg')} source={donateData?.images[0]?.url} style={[styles.donationImage, {width: '100%', height: '100%'}]} placeholderContentFit="cover" contentFit="cover" />
              </View>

              <Text style={[styles.description, isDark && {color: '#FFFFFF'}]}>{donateData?.title}</Text>

              <View style={styles.cardHeader}>
                <Text style={[styles.fundLabel, isDark && {color: '#9E9E9E'}]}>Fund Raised</Text>
                <View style={styles.fundValueContainer}>
                  <Text style={[styles.fundValue, isDark && {color: '#FFFFFF'}]}>
                    <Text style={{fontFamily: 'Rubik-Regular'}}>{Number(donateData?.totalCollected).toLocaleString('en-IN')}</Text>/{Number(donateData?.listedCoinsRequired).toLocaleString('en-IN')}
                  </Text>
                  <Image source={isDark ? require('../../Assets/Images/BlackModeCoin.png') : require('../../Assets/Images/Coins.png')} style={styles.coinIcon} />
                </View>
              </View>

              <View style={styles.progressBarContainer}>
                <ProgressBar borderWidth={0} height={responsiveWidth(3)} unfilledColor={isDark ? '#1A1A1A' : '#f2f2f2'} width={responsiveWidth(80)} progress={Number(donateData?.totalCollected + Number(amount)) / donateData?.listedCoinsRequired} color={'#FFA86B'} />
              </View>
            </View>

            <View style={styles.tipContainer}>
              <View style={styles.tipCounterContainer}>
                <View style={[styles.sendTipInputContainer, isDark && {backgroundColor: '#1A1A1A', borderColor: '#2A2A2A'}]}>
                  <View style={styles.leftAction}>
                    <Paisa width={24} height={24} />
                  </View>
                  <TextInput 
                    placeholder="Amount" 
                    maxLength={6} 
                    value={amount} 
                    style={[styles.amountInput, isDark && {color: '#FFFFFF'}]} 
                    onChangeText={handleAmountInput} 
                    keyboardType="numeric" 
                    showsVerticalScrollIndicator={false}
                    placeholderTextColor={isDark ? '#555555' : '#888'}
                  />
                  <View style={styles.rightAction}>
                    <TouchableOpacity style={[styles.plusMinusButton, isDark && {backgroundColor: '#1A1A1A'}]} onPress={decrementAmount}>
                      <View style={[styles.plusMinusButtonInside, {backgroundColor: '#ff6961'}, isDark && {borderColor: '#2A2A2A'}]}>
                        <DIcon provider={'Entypo'} name={'minus'} size={18} />
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.plusMinusButton, isDark && {backgroundColor: '#1A1A1A'}]} onPress={incrementAmount}>
                      <View style={[styles.plusMinusButtonInside, {backgroundColor: '#bafca2'}, isDark && {borderColor: '#2A2A2A'}]}>
                        <DIcon provider={'Entypo'} name={'plus'} size={18} />
                      </View>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              <View style={styles.buttonWrapper}>
                <AnimatedButton title={'Pay'} onPress={handleSubmitMoney} loading={loading} isDark={isDark} />
              </View>
            </View>

          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardView: {
    flex: 1,
  },
  dialog: {
    flex: 1,
    backgroundColor: '#fff',
    width: '100%',
    paddingTop: Platform.OS === 'ios' ? 50 : 20, 
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  contentContainer: {
    paddingHorizontal: responsiveWidth(4),
    paddingTop: responsiveWidth(2),
    paddingBottom: responsiveWidth(30),
    alignItems: 'center',
    flexGrow: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: responsiveWidth(4),
    marginBottom: responsiveWidth(4),
  },
  backButton: {
    padding: responsiveWidth(1),
  },
  sendTipText: {
    textAlign: 'center',
    fontFamily: 'Rubik-Bold',
    color: 'black',
    fontSize: responsiveFontSize(2.5),
  },
  donationImage: {
    resizeMode: 'cover',
  },
  description: {
    fontFamily: 'Rubik-Bold',
    fontSize: responsiveFontSize(2.2),
    color: '#333',
    marginBottom: responsiveWidth(1),
    paddingHorizontal: responsiveWidth(2),
    marginTop: responsiveWidth(2),
  },
  cardBottomView: {
    borderRadius: responsiveWidth(4),
    marginTop: responsiveWidth(1),
    marginBottom: responsiveWidth(2),
    borderWidth: WIDTH_SIZES[1.5],
    overflow: 'hidden',
    width: '100%',
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
  tipContainer: {
    marginTop: responsiveWidth(1),
    width: '100%',
  },
  tipCounterContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: responsiveWidth(2),
  },
  plusMinusButton: {
    backgroundColor: '#FFFFFF',
    zIndex: 2,
    elevation: 2,
  },
  plusMinusButtonInside: {
    borderWidth: WIDTH_SIZES[1.5],
    height: responsiveWidth(9),
    width: responsiveWidth(9),
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: responsiveWidth(2),
    borderColor: '#282828',
  },
  leftAction: {
    width: 'auto',
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: responsiveWidth(4),
  },
  rightAction: {
    width: responsiveWidth(25),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: responsiveWidth(1),
  },
  sendTipInputContainer: {
    borderWidth: WIDTH_SIZES[1.5],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    borderColor: '#282828',
    height: responsiveWidth(14),
    borderRadius: responsiveWidth(3),
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    zIndex: 1,
    elevation: 1,
  },
  amountInput: {
    flex: 1,
    textAlign: 'center',
    color: '#282828',
    fontFamily: 'Rubik-Medium',
    fontSize: responsiveFontSize(2.2),
    paddingVertical: Platform.OS === 'ios' ? responsiveWidth(4) : 0,
  },
  buttonWrapper: {
    width: '100%',
    marginTop: responsiveWidth(5),
    marginBottom: responsiveWidth(2),
    alignSelf: 'center',
  },
});

export default WishListDonateScreen;
