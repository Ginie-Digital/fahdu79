import { StyleSheet, Text, View, TouchableOpacity, Platform } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { TextInput } from 'react-native-gesture-handler';
import React, { useEffect, useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { responsiveFontSize, responsiveHeight, responsiveWidth } from 'react-native-responsive-dimensions';
import { useSelector, useDispatch } from 'react-redux';
import { FONT_SIZES, WIDTH_SIZES, formatIndianNumber, selectionTwin, validateEmail } from '../../DesiginData/Utility';
import DIcon from '../../DesiginData/DIcons';
import { useNavigation } from '@react-navigation/native';
import { LoginPageErrors } from '../Components/ErrorSnacks';
import AnimatedButton from '../Components/AnimatedButton';
import moment from 'moment';
import { useCreateSubscriptionMutation } from '../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
const CFPaymentGatewayService = Platform.OS === 'android' ? require('react-native-cashfree-pg-sdk').CFPaymentGatewayService : null;
import { CFEnvironment, CFSubscriptionSession } from 'cashfree-pg-api-contract';
import LottieView from 'lottie-react-native';
import { toggleRefreshOtherProfile } from '../../Redux/Slices/NormalSlices/HideShowSlice';

const LoadingOverlay = ({ isVisible }) => {
  if (!isVisible) return null;
  return (
    <View style={styles.overlay}>
      <View style={styles.animationContainer}>
        <LottieView
          source={require('../../Assets/Animation/Loading.json')}
          autoPlay
          loop
          style={styles.lottieLoader}
        />
        <Text style={styles.overlayText}>Proceeding to pay...</Text>
      </View>
    </View>
  );
};

const SuccessOverlay = ({ isVisible, onVisitProfile }) => {
  if (!isVisible) return null;
  return (
    <View style={styles.overlay}>
      <View style={styles.animationContainer}>
        <LottieView
          source={require('../../Assets/Animation/Success.json')}
          autoPlay
          loop={false}
          style={styles.lottieSuccess}
        />
        <Text style={styles.overlayText}>Payment success</Text>
        <TouchableOpacity 
          style={styles.visitProfileBtn}
          onPress={onVisitProfile}
        >
          <Text style={styles.visitProfileBtnText}>Visit Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const CompleteDetailsScreen = ({ route }) => {
  const { plan, userId, userName, amount, code, coins } = route.params || {};
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const token = useSelector(state => state.auth.user.token);
  const [createSubscription, { isLoading: isApiLoading }] = useCreateSubscriptionMutation();
  
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isProceeding, setIsProceeding] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const [pendingVerifyId, setPendingVerifyId] = useState(null);
  const [paymentError, setPaymentError] = useState(null);

  // Cashfree subscription callbacks — no async here, just set state
  useEffect(() => {
    if (CFPaymentGatewayService) {
      CFPaymentGatewayService.setCallback({
        onVerify(subscriptionId) {
          console.log('onVerify called, subscription ID:', subscriptionId);
          setPendingVerifyId(subscriptionId);
        },
        onError(error, subscriptionId) {
          console.log('onError called:', JSON.stringify(error), 'Subscription ID:', subscriptionId);
          setIsProceeding(false);
          const errorMessage = error?.getMessage?.() || error?.message || 'Payment failed. Please try again.';
          if (errorMessage.toLowerCase().includes('cancel')) {
            // If cancelled, go back to profile instead of showing error
            dispatch(toggleRefreshOtherProfile());
            navigation.navigate('othersProfile', {
              userName: userName,
              userId: userId,
              isFollowing: true,
              role: 'creator',
            });
          } else {
            setPaymentError(errorMessage);
          }
        },
      });
    }

    return () => {
      if (CFPaymentGatewayService) {
        CFPaymentGatewayService.removeCallback();
      }
    };
  }, []);

  // Handle server-side verification when onVerify fires
  useEffect(() => {
    if (!pendingVerifyId) return;

    const verifyPayment = async () => {
      try {
        const verifyResponse = await fetch(
          `https://api.fahdu.com/api/payments/cashfree/subscription?creatorId=${userId}`,
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          }
        );
        const verifyData = await verifyResponse.json();
        console.log('Subscription verify response:', JSON.stringify(verifyData));

        if (verifyData?.success && verifyData?.data?.subscriptionId) {
          setIsProceeding(false);
          setShowSuccess(true);
        } else {
          setIsProceeding(false);
          LoginPageErrors('Payment failed. Please try again.');
        }
      } catch (verifyError) {
        console.error('Verification API error:', verifyError);
        setIsProceeding(false);
        LoginPageErrors('Unable to verify payment. Please check your subscription status.');
      }
      setPendingVerifyId(null);
    };

    verifyPayment();
  }, [pendingVerifyId, userId, token]);

  // Show error toast when payment error occurs
  useEffect(() => {
    if (paymentError) {
      LoginPageErrors(paymentError);
      setPaymentError(null);
    }
  }, [paymentError]);

  // const coins = useSelector(state => state.auth.user.coins || 0); // Assuming coins are stored here

  const isFormValid = useMemo(() => {
    const isNameValid = fullName.trim().length >= 2;
    const isEmailValid = validateEmail(email).isValid;
    const isPhoneValid = /^[6-9]\d{9}$/.test(phoneNumber);
    return isNameValid && isEmailValid && isPhoneValid;
  }, [fullName, email, phoneNumber]);

  const handleProceed = async () => {
    if (!isFormValid) return;
    setIsProceeding(true);
    
    try {
      const body = {
        userId: userId,
        name: fullName,
        email: email,
        phone: phoneNumber,
        code: plan?.code || code,
        offerApplied: true
      };
      
      console.log('Creating subscription with body:', body);
      const response = await createSubscription({ token, data: body }).unwrap();
      console.log('Subscription API Response:', response);

      const subscriptionSessionId = response?.data?.subscription_session_id;
      const subscriptionId = response?.data?.subscription_id;

      if (!subscriptionSessionId || !subscriptionId) {
        throw new Error('Invalid subscription session response');
      }

      const session = new CFSubscriptionSession(
        subscriptionSessionId,
        subscriptionId,
        CFEnvironment.PRODUCTION
      );
      
      console.log('Starting Cashfree Subscription Checkout...');
      if (CFPaymentGatewayService) {
        CFPaymentGatewayService.doSubscriptionPayment(session);
      } else {
        console.warn('Cashfree Payment Gateway Service not available on this platform');
        setIsProceeding(false);
      }
      
    } catch (error) {
      console.error('Error in handleProceed:', error);
      setIsProceeding(false);
      LoginPageErrors(error?.data?.message || error?.message || 'Something went wrong');
    }
  };

  const handleVisitProfile = () => {
    dispatch(toggleRefreshOtherProfile());
    navigation.navigate('othersProfile', {
      userName: userName,
      userId: userId,
      isFollowing: true,
      role: 'creator',
    });
  };

  const startDate = useMemo(() => moment().format('D MMMM, YYYY'), []);
  const endDate = useMemo(() => moment().add(plan?.duration || 1, 'months').subtract(1, 'day').format('D MMMM, YYYY'), [plan]);
  const nextPaymentDate = useMemo(() => moment().add(plan?.duration || 1, 'months').format('D MMMM, YYYY'), [plan]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top', 'bottom']}>
      <KeyboardAwareScrollView
        style={{ flex: 1, backgroundColor: '#fff' }}
        contentContainerStyle={styles.container}
        enableOnAndroid={true}
        enableAutomaticScroll={true}
        extraScrollHeight={50}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={styles.headerSection}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.title}>Complete Your Details</Text>
              <Text style={styles.subtitle}>Fill in your info to proceed</Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
              <DIcon provider="Ionicons" name="close" size={20} color="#1E1E1E" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Selected Plan Summary */}
        <View style={styles.planSummaryCard}>
          <View style={styles.planHeader}>
            <View>
              <Text style={styles.planLabel}>Selected Plan</Text>
              <Text style={styles.planName}>{plan?.name || 'Annually'}</Text>
            </View>
            <Text style={styles.planPrice}>₹{formatIndianNumber(plan?.amount || 10000)}</Text>
          </View>
          
          <View style={styles.divider} />

          <View style={styles.scheduleSection}>
            <Text style={styles.sectionTitle}>Auto-Pay Schedule</Text>
            
            <View style={styles.row}>
              <Text style={styles.label}>Start Date</Text>
              <Text style={styles.value}>{startDate}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>End Date</Text>
              <Text style={styles.value}>{endDate}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.row}>
              <Text style={styles.label}>Next Payment</Text>
              <Text style={styles.value}>{nextPaymentDate}</Text>
            </View>
          </View>
        </View>

        {/* Form Inputs */}
        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Full Name*</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Aashna Hegde"
                placeholderTextColor="#B2B2B2"
                selectionHandleColor={'#ffa86b'}
                selectionColor={selectionTwin()}
                cursorColor={'#1e1e1e'}
                value={fullName}
                onChangeText={setFullName}
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Email Address*</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. aashna@email.com"
                placeholderTextColor="#B2B2B2"
                selectionHandleColor={'#ffa86b'}
                selectionColor={selectionTwin()}
                cursorColor={'#1e1e1e'}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Phone Number*</Text>
            <View style={styles.phoneInputRow}>
              <View style={styles.countryPicker}>
                <Text style={styles.flag}>🇮🇳</Text>
                <Text style={styles.code}>+91</Text>
              </View>
              <TextInput
                style={styles.phoneInput}
                placeholder="98765 43210"
                placeholderTextColor="#B2B2B2"
                selectionHandleColor={'#ffa86b'}
                selectionColor={selectionTwin()}
                cursorColor={'#1e1e1e'}
                keyboardType="phone-pad"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
              />
            </View>
          </View>
        </View>

        {/* Footer */}
        <AnimatedButton 
          title="Proceed to Payment"
          showOverlay={false}
          disabled={!isFormValid}
          loading={isApiLoading}
          onPress={handleProceed}
          style={[styles.btn, isFormValid && styles.btnActive]}
          textStyle={[styles.btnText, isFormValid && styles.btnTextActive]}
          buttonMargin={0}
        />

      </KeyboardAwareScrollView>
      <LoadingOverlay isVisible={isProceeding} />
      <SuccessOverlay 
        isVisible={showSuccess} 
        onVisitProfile={handleVisitProfile}
      />
    </SafeAreaView>
  );
};

export default CompleteDetailsScreen;

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 20,
    backgroundColor: '#fff',
  },
  headerSection: {
    marginBottom: 24,
    marginTop: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: 20,
    color: '#1E1E1E',
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'Rubik-Regular',
    fontSize: 12,
    color: '#1E1E1E',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4, // Pushing it a bit further down
  },
  planSummaryCard: {
    backgroundColor: 'rgba(255, 168, 107, 0.1)',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 168, 107, 0.3)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  planLabel: {
    fontFamily: 'Rubik-Regular',
    fontSize: 10,
    color: 'rgba(30, 30, 30, 0.5)',
    marginBottom: 4,
  },
  planName: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: 16,
    color: '#1E1E1E',
  },
  planPrice: {
    fontFamily: 'Rubik-Bold',
    fontSize: 18,
    color: '#1E1E1E',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 168, 107, 0.2)',
    marginVertical: 12,
  },
  scheduleSection: {
    gap: 12,
  },
  sectionTitle: {
    fontFamily: 'Rubik-Medium',
    fontSize: 10,
    color: '#FFA86B',
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontFamily: 'Rubik-Regular',
    fontSize: 12,
    color: '#1E1E1E',
  },
  value: {
    fontFamily: 'Rubik-Bold',
    fontSize: 12,
    color: '#1E1E1E',
  },
  form: {
    gap: 20,
    marginBottom: 40,
  },
  field: {
    gap: 12,
  },
  fieldLabel: {
    fontFamily: 'Rubik-Regular',
    fontSize: 14,
    color: '#1E1E1E',
  },
  inputContainer: {
    height: 48,
    borderWidth: 1,
    borderColor: '#1E1E1E',
    borderRadius: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  textInput: {
    fontFamily: 'Rubik-Regular',
    fontSize: 14,
    color: '#1E1E1E',
    padding: 0,
  },
  phoneInputRow: {
    flexDirection: 'row',
    height: 48,
    borderWidth: 1,
    borderColor: '#1E1E1E',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  countryPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 168, 107, 0.1)',
    borderRightWidth: 1,
    borderRightColor: '#1E1E1E',
    gap: 6,
  },
  flag: {
    fontSize: 16,
  },
  code: {
    fontFamily: 'Rubik-Regular',
    fontSize: 14,
    color: '#1E1E1E',
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 16,
    fontFamily: 'Rubik-Regular',
    fontSize: 14,
    color: '#1E1E1E',
  },
  btn: {
    height: 48,
    backgroundColor: '#EDEDED',
    borderWidth: 1,
    borderColor: '#1E1E1E',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnActive: {
    backgroundColor: '#1E1E1E',
  },
  btnText: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: 16,
    color: '#9A9A9A',
  },
  btnTextActive: {
    color: '#FFFFFF',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  animationContainer: {
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 20,
  },
  lottieLoader: {
    width: 150,
    height: 150,
  },
  lottieSuccess: {
    width: 200,
    height: 200,
  },
  overlayText: {
    fontFamily: 'Rubik-Medium',
    fontSize: 18,
    color: '#1E1E1E',
    marginTop: 10,
    marginBottom: 30,
  },
  visitProfileBtn: {
    backgroundColor: '#1E1E1E',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 12,
  },
  visitProfileBtnText: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
  },
});
