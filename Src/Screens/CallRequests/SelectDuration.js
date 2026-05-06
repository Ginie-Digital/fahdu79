import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {responsiveWidth, responsiveFontSize, responsiveHeight} from 'react-native-responsive-dimensions';
import {useNavigation, useFocusEffect} from '@react-navigation/native';

import Back from '../../../Assets/svg/back.svg';
import LowBalanceModal from './LowBalanceModal';
import {ChatWindowError, chatRoomSuccess} from '../../Components/ErrorSnacks';
import MicPermissionModal from '../../Components/Calling/MicPermissionModal';
import HowCallsWorkSheet from '../../Components/Calling/HowCallsWorkSheet';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { Platform } from 'react-native';

import {FONT_SIZES, WIDTH_SIZES, nTwins, formatIndianNumber} from '../../../DesiginData/Utility';
import AnimatedIconButton from '../../Components/AnimatedIconButton';
import {useSelector} from 'react-redux';
import {useGetCoinsQuery, useCalculateCallAmountMutation, useRequestCallMutation, useLazyOthersCallingFeeDetailQuery} from '../../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';

const DURATION_OPTIONS = [
  {value: 10, label: '10'},
  {value: 20, label: '20'},
  {value: 30, label: '30'},
  {value: 40, label: '40'},
  {value: 50, label: '50'},
  {value: 60, label: '60'},
];

const SelectDuration = ({route}) => {
  const navigation = useNavigation();
  const token = useSelector(state => state.auth.user.token);
  const {data: coinData, refetch} = useGetCoinsQuery({token});
  const [calculateCallAmount] = useCalculateCallAmountMutation();
  const [requestCall] = useRequestCallMutation();
  // Enhanced API Logging
  const [getFees, {data: feeData, error: feeError, isFetching: isFeeFetching}] = useLazyOthersCallingFeeDetailQuery();

  const [selectedDuration, setSelectedDuration] = useState(20);

  // Get params - userId here is the OTHER user's ID (the creator being called)
  const userId = route?.params?.userId;
  const roomId = route?.params?.roomId;
  const callType = route?.params?.callType || 'Audio';

  // Fetch fees on focus
  useFocusEffect(
    useCallback(() => {
      refetch();
      if (userId) {
        console.log('--- [FEE_API_TRIGGER] ---', { userId, hasToken: !!token });
        getFees({token, userId});
      }
    }, [userId, token, refetch, getFees])
  );

  useEffect(() => {
    if (feeData) {
      console.log('🔥🔥🔥 [FEE_API_SUCCESS] 🔥🔥🔥', JSON.stringify(feeData, null, 2));
    }
    if (feeError) {
      console.error('❌❌❌ [FEE_API_ERROR] ❌❌❌', feeError);
    }
  }, [feeData, feeError]);

  // Fees extraction
  const currentFeeData = callType === 'Audio' ? feeData?.data?.AudioFee : feeData?.data?.VideoFee;
  const subFee = Number(currentFeeData?.subsAmount || 0);
  const followFee = Number(currentFeeData?.followAmount || 0);

  // For the final calculation, we use the higher of the two or a default if neither exists
  // Typically, if a user is not a subscriber, followFee applies.
  const coinsPerMinute = followFee || subFee || route?.params?.coinsPerMinute || 20;

  const walletBalance = coinData?.data ?? route?.params?.walletBalance ?? 200;

  const [showLowBalance, setShowLowBalance] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showMicModal, setShowMicModal] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  // Calculate required balance based on selected duration for display/modal
  const requiredBalance = selectedDuration * coinsPerMinute;

  const handleConfirmCall = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    
    // 🔒 Pre-check permissions before requesting a call
    try {
      const isVideo = callType?.toLowerCase() === 'video';
      const micPermission = Platform.OS === 'ios' ? PERMISSIONS.IOS.MICROPHONE : PERMISSIONS.ANDROID.RECORD_AUDIO;
      let micStatus = await check(micPermission);
      if (micStatus === RESULTS.DENIED) micStatus = await request(micPermission);

      let camStatus = RESULTS.GRANTED;
      if (isVideo) {
        const camPermission = Platform.OS === 'ios' ? PERMISSIONS.IOS.CAMERA : PERMISSIONS.ANDROID.CAMERA;
        camStatus = await check(camPermission);
        if (camStatus === RESULTS.DENIED) camStatus = await request(camPermission);
      }

      const micGranted = micStatus === RESULTS.GRANTED || micStatus === RESULTS.LIMITED;
      const camGranted = camStatus === RESULTS.GRANTED || camStatus === RESULTS.LIMITED;

      if (!micGranted || (isVideo && !camGranted)) {
        setShowMicModal(true);
        setIsProcessing(false);
        return;
      }
    } catch (err) {
      console.log('⚠️ Mic/Cam permission check error:', err);
    }

    try {
      // 1. Calculate Call Amount
      const payload = {
        roomId: roomId,
        type: callType,
        duration: selectedDuration,
      };

      const amountResponse = await calculateCallAmount({
        token,
        data: payload
      });

      if (amountResponse.error) {
        console.log('Error calculating amount:', amountResponse.error);
        ChatWindowError(amountResponse.error?.data?.message || 'Error calculating call amount');
        return;
      }

      const calculatedAmount = amountResponse?.data?.data?.callAmount;
      console.log('Calculated Amount:', calculatedAmount);

      // 2. Check Balance
      if (walletBalance < calculatedAmount) {
        setShowLowBalance(true);
        return;
      }

      // 3. Request Call
      const requestResponse = await requestCall({
        token,
        data: payload
      });

      if (requestResponse?.data?.data === true) {
        console.log('Request sent successfully');
        chatRoomSuccess('Call request sent successfully!');
        navigation.goBack();
      } else {
         console.log('Request Failed:', requestResponse);
         ChatWindowError(requestResponse?.data?.message || requestResponse?.error?.data?.message || 'Failed to send call request');
      }

    } catch (error) {
      console.error('Call processing error:', error);
      ChatWindowError('Something went wrong. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRecharge = () => {
    setShowLowBalance(false);
    navigation.navigate('chooseWallet');
  };

  const renderDurationOption = (option, index) => {
    const isSelected = selectedDuration === option.value;
    
    return (
      <TouchableOpacity
        key={option.value}
        style={[
          styles.durationCard,
          isSelected && styles.durationCardSelected,
        ]}
        onPress={() => setSelectedDuration(option.value)}
        activeOpacity={0.7}
      >
        <Text style={[styles.durationValue, isSelected && styles.durationValueSelected]}>
          {option.label}
        </Text>
        <Text style={[styles.durationLabel, isSelected && styles.durationLabelSelected]}>
          MINUTES
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: '#fff9f5'}} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={{flexDirection: 'row', alignItems: 'center', flex: 1}}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Back />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Select Duration</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.infoButton}
            onPress={() => setShowHowItWorks(true)} 
            activeOpacity={0.7}
          >
            <Image 
              source={require('../../../Assets/Images/CallRequests/info.png')} 
              style={styles.infoIcon}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Subtitle */}
          <View style={styles.subtitleRow}>
            <Text style={styles.subtitle}>Choose how long you'd like to talk</Text>
          </View>
          {/* Fee Info Box */}
          <View style={styles.feeInfoContainer}>
            <View style={styles.feeRow}>
              <Text style={styles.feeLabel}>For Subscribers</Text>
              <Text style={styles.feeAmountText}>
                <Text style={styles.feeAmount}>{subFee} Coins</Text>
                <Text style={styles.feeUnit}>/min</Text>
              </Text>
            </View>

            <View style={styles.separator} />

            <View style={styles.feeRow}>
              <Text style={styles.feeLabel}>For Followers</Text>
              <Text style={styles.feeAmountText}>
                <Text style={styles.feeAmount}>{followFee} Coins</Text>
                <Text style={styles.feeUnit}>/min</Text>
              </Text>
            </View>
          </View>

          {/* Duration Grid */}
          <View style={styles.durationGrid}>
            {DURATION_OPTIONS.map((option, index) => renderDurationOption(option, index))}
          </View>

          {/* Wallet Balance */}
          <View style={styles.walletContainer}>
            <View style={styles.walletLeft}>
              <Image
                source={require('../../../Assets/Images/newWallet.png')}
                style={{ width: 44, height: 44 }}
                resizeMode="contain"
              />
              <View style={styles.walletTextContainer}>
                <Text style={styles.walletLabel}>WALLET BALANCE</Text>
                <Text style={styles.walletBalance}>{formatIndianNumber(walletBalance)} Coins</Text>
              </View>
            </View>
            <TouchableOpacity onPress={handleRecharge}>
              <Text style={styles.rechargeText}>Recharge</Text>
            </TouchableOpacity>
          </View>

          {/* Action Button */}
<View style={{width : "98%", alignSelf: 'center'}}>
            <AnimatedIconButton
            title="Confirm & Call"
            onPress={handleConfirmCall}
            loading={isProcessing}
            showOverlay={false}
            buttonMargin={0}
            textStyle={{ fontFamily: 'Rubik-Bold' }}
            icon={require('../../../Assets/Images/CallRequests/arrow-right.png')}
            iconPosition="right"
          />
</View>
        </ScrollView>

        </View>

        {/* Low Balance Modal */}
        <LowBalanceModal
          visible={showLowBalance}
          onClose={() => setShowLowBalance(false)}
          onRecharge={handleRecharge}
          currentBalance={walletBalance}
          requiredBalance={requiredBalance}
        />

        {/* Mic/Cam Permission Modal */}
        <MicPermissionModal
          visible={showMicModal}
          mode="caller"
          callType={callType?.toLowerCase()}
          onCancel={() => setShowMicModal(false)}
        />

        {/* How Calls Work Tutorial */}
        <HowCallsWorkSheet
          visible={showHowItWorks}
          onClose={() => setShowHowItWorks(false)}
          initialTab={callType?.toLowerCase() === 'video' ? 'video' : 'audio'}
        />

    </SafeAreaView>
  );
};

export default SelectDuration;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff9f5',
    margin: responsiveWidth(6.4),
  },
  backButton: {
    height: responsiveWidth(10),
    width: responsiveWidth(7),
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerTitle: {
    fontFamily: 'Rubik-Bold',
    fontSize: responsiveFontSize(2.5),
    color: '#1e1e1e',
    marginLeft: 8,
  },
  subtitle: {
    fontFamily: 'Rubik-Regular',
    fontSize: responsiveFontSize(1.8),
    color: '#1e1e1e',
  },
  subtitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  howItWorksText: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: responsiveFontSize(1.6),
    color: '#FF7C21',
    textDecorationLine: 'underline',
  },
  infoButton: {
    padding: 4,
  },
  infoIcon: {
    width: 24,
    height: 24,
  },
  feeInfoContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#1e1e1e',
    borderRadius: 14,
    paddingVertical: 20,
    paddingHorizontal: 20,
    marginBottom: 16,
    justifyContent: 'center',
    gap: 10,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  feeLabel: {
    fontFamily: 'Rubik-Regular',
    fontSize: responsiveFontSize(1.8),
    color: '#1E1E1E',
  },
  feeAmountText: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  feeAmount: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: responsiveFontSize(2),
    color: '#1E1E1E',
  },
  feeUnit: {
    fontFamily: 'Rubik-Regular',
    fontSize: responsiveFontSize(1.8),
    color: '#1E1E1E',
  },
  separator: {
    height: 1,
    backgroundColor: '#EBEBEB',
    width: '100%',
  },
  durationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  durationCard: {
    width: '48%',
    height: 104,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#1e1e1e',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  durationCardSelected: {
    backgroundColor: '#ffa86b',
    borderColor: '#1e1e1e',
    borderWidth: 1.5,
  },
  durationValue: {
    fontFamily: 'Rubik-Bold',
    fontSize: responsiveFontSize(4.5),
    color: '#101828',
  },
  durationValueSelected: {
    color: '#1e1e1e',
  },
  durationLabel: {
    marginTop: -8,
    fontFamily: 'Rubik-Regular',
    fontSize: responsiveFontSize(1.5),
    color: '#1e1e1e',
    letterSpacing : 0.6
  },
  durationLabelSelected: {
    color: '#1e1e1e',
  },
  walletContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FF7C21',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  walletLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  walletTextContainer: {
    marginLeft: 12,
  },
  walletLabel: {
    fontFamily: 'Rubik-Regular',
    fontSize: responsiveFontSize(1.25),
    color: '#1e1e1e',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  walletBalance: {
    fontFamily: 'Rubik-Bold',
    fontSize: responsiveFontSize(2.25),
    color: '#101828',
  },
  rechargeText: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: responsiveFontSize(1.8),
    color: '#FF7C21',
  },
  bottomContainer: {
    paddingVertical: 16,
    paddingBottom: 24,
  },
});

