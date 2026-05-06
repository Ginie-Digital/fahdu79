import React, {useState} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, Alert, Platform, KeyboardAvoidingView, TouchableWithoutFeedback, Keyboard, ScrollView} from 'react-native';
import {Dialog} from 'react-native-simple-dialogs';
import AnimatedButton from '../../Components/AnimatedButton';
import {responsiveFontSize, responsiveWidth} from 'react-native-responsive-dimensions';
import {BlurView} from 'expo-blur';

import InputOverlay from '../../Components/InputOverlay';
import {TextInput} from 'react-native-gesture-handler';
import {ChatWindowError, LoginPageErrors} from '../../Components/ErrorSnacks';
import {useSaveBankDetailsMutation, useVerifyPanMutation} from '../../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
import {useDispatch, useSelector} from 'react-redux';
import {toggleBankDetailsModal, toggleTransferModal} from '../../../Redux/Slices/NormalSlices/HideShowSlice';
import {WIDTH_SIZES} from '../../../DesiginData/Utility';

const BankDetailsModal = ({visible, setFormDetails}) => {
  const [focusedInput, setFocusedInput] = useState(null);
  const [beneficiaryName, setBeneficiaryName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [confirmAccountNumber, setConfirmAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [pan, setPan] = useState('');
  const [isPanVerified, setIsPanVerified] = useState(false);

  const [step, setStep] = useState(1);

  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const token = useSelector(state => state.auth.user.token);

  const [loading, setLoading] = useState(false);

  const dispatch = useDispatch();

  const [verifyPan, {isLoading: isVerifyingPan}] = useVerifyPanMutation();

  // State for errors

  const [errors, setErrors] = useState({
    beneficiaryName: '',
    accountNumber: '',
    confirmAccountNumber: '',
    ifscCode: '',
    pan: '',
    address: '',
    city: '',
    stateName: '',
    postalCode: '',
    email: '',
    phone: '',
  });

  const dismissKeyboard = () => Keyboard.dismiss();

  // Validation functions
  const validateForm = () => {
    let isValid = true;
    const newErrors = {
      beneficiaryName: '',
      accountNumber: '',
      confirmAccountNumber: '',
      ifscCode: '',
      pan: '',
    };

    // Beneficiary Name Validation
    if (!beneficiaryName.trim()) {
      newErrors.beneficiaryName = 'Beneficiary Name is required';
      isValid = false;
    }

    // Account Number Validation
    if (!accountNumber.trim()) {
      newErrors.accountNumber = 'Account Number is required';
      isValid = false;
    } else if (!/^\d{9,18}$/.test(accountNumber)) {
      newErrors.accountNumber = 'Account Number must be 9-18 digits';
      isValid = false;
    }

    // Confirm Account Number Validation
    if (!confirmAccountNumber.trim()) {
      newErrors.confirmAccountNumber = 'Confirm Account Number is required';
      isValid = false;
    } else if (confirmAccountNumber !== accountNumber) {
      newErrors.confirmAccountNumber = 'Account Numbers do not match';
      isValid = false;
    }

    // IFSC Code Validation
    if (!ifscCode.trim()) {
      newErrors.ifscCode = 'IFSC Code is required';
      isValid = false;
    } else if (!/^[A-Za-z]{4}0[A-Za-z0-9]{6}$/.test(ifscCode)) {
      newErrors.ifscCode = 'Invalid IFSC Code';
      isValid = false;
    }

    // PAN Number Validation
    if (!pan.trim()) {
      newErrors.pan = 'PAN Number is required';
      isValid = false;
    } else if (!/^[A-Z]{5}\d{4}[A-Z]{1}$/.test(pan)) {
      newErrors.pan = 'Invalid PAN Number';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleVerifyPan = async () => {
    if (!beneficiaryName || !pan) {
      Alert.alert('Error', 'Enter Beneficiary Name and PAN first');
      return;
    }

    if (!/^[A-Z]{5}\d{4}[A-Z]{1}$/.test(pan)) {
      Alert.alert('Invalid PAN', 'Please enter valid PAN Number');
      return;
    }

    try {
      console.log('Verifying →', {beneficiaryName, pan});

      const res = await verifyPan({
        token,
        data: {
          name: beneficiaryName.trim(),
          pan: pan.trim(),
        },
      }).unwrap();

      console.log('PAN VERIFY RESPONSE →', res);

      // ✅ Your actual success condition
      if (res?.data?.valid === true) {
        setIsPanVerified(true);
        Alert.alert('Verified', 'PAN verified successfully');
      } else {
        setIsPanVerified(false);
        Alert.alert('Verification Failed', res?.data?.message || 'Invalid PAN');
      }
    } catch (error) {
      console.log('PAN ERROR →', error);

      setIsPanVerified(false);

      Alert.alert('Error', error?.data?.message || (error?.data?.data?.providedName && `Provided: ${error?.data?.data?.providedName}\nRegistered: ${error?.data?.data?.registeredName}`) || 'PAN verification failed');
    }
  };

  const handleNext = () => {
    if (!isPanVerified) {
      Alert.alert('PAN not verified', 'Please verify PAN before proceeding');
      return;
    }

    if (!validateForm()) {
      return;
    }

    setErrors(prev => ({
      ...prev,
      beneficiaryName: '',
      accountNumber: '',
      confirmAccountNumber: '',
      ifscCode: '',
      pan: '',
    }));

    setStep(2);
  };

  const handleSubmit = async () => {
    if (!address || !city || !stateName || !postalCode || !phone) {
      Alert.alert('Error', 'Please fill all address details');
      return;
    }

    if (!/^[6-9]\d{9}$/.test(phone)) {
      Alert.alert('Invalid Phone', 'Enter a valid 10 digit mobile number');
      return;
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      Alert.alert('Invalid Email', 'Enter a valid email');
      return;
    }

    setFormDetails({
      beneficiaryName,
      accountNumber,
      ifscCode,
      pan,
      email,
      phone,
      address,
      city,
      state: stateName,
      postalCode,
    });

    dispatch(toggleBankDetailsModal({show: false}));

    setTimeout(() => {
      dispatch(toggleTransferModal({show: true}));
    }, 500);
  };

  const handleResetFields = () => {
    setStep(1);
    setIsPanVerified(false);
    setPan('');
    setBeneficiaryName('');
    setAccountNumber('');
    setConfirmAccountNumber('');
    setIfscCode('');
    setEmail('');
    setPhone('');
    setAddress('');
    setCity('');
    setStateName('');
    setPostalCode('');
  };

  return (
    visible && (
      <TouchableWithoutFeedback onPress={dismissKeyboard}>
        <View style={styles.overlay}>
          <BlurView experimentalBlurMethod intensity={15} style={styles.blurBackground} />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{flex: 1}}>
            <Dialog
              visible={visible}
              dialogStyle={styles.dialog}
              contentStyle={{padding: 0, paddingTop: 0, backgroundColor: '#fff'}}
              onTouchOutside={() => {
                dispatch(toggleBankDetailsModal({show: false}));
                handleResetFields();
              }}>
              <ScrollView showsVerticalScrollIndicator={false} keyboardDismissMode="on-drag" keyboardShouldPersistTaps={'always'} automaticallyAdjustKeyboardInsets>
                <Text style={styles.heading}>{step === 1 ? 'Bank Details' : 'Address Details'}</Text>

                {step === 1 && (
                  <>
                    {/* ✅ Beneficiary Name */}
                    <View style={styles.inputWrapper}>
                      <Text style={styles.label}>Beneficiary Name</Text>
                      <View style={styles.textInputContainer}>
                        <TextInput
                          value={beneficiaryName}
                          onChangeText={setBeneficiaryName}
                          placeholder="Enter your beneficiary name"
                          placeholderTextColor="#B2B2B2"
                          style={styles.textInputs}
                          onFocus={() => setFocusedInput('beneficiaryName')}
                          onBlur={() => setFocusedInput(null)}
                          selectionColor="#1e1e1e"
                          cursorColor="#1e1e1e"
                          autoCapitalize="characters"
                        />
                      </View>
                      {errors.beneficiaryName && (
                        <View style={styles.errorContainer}>
                          <Text style={styles.errorText}>{errors.beneficiaryName}</Text>
                        </View>
                      )}
                    </View>

                    {/* ✅ PAN Number */}
                    <View style={styles.inputWrapper}>
                      <Text style={styles.label}>PAN Number</Text>

                      <View style={styles.textInputContainer}>
                        <TextInput
                          autoCapitalize="characters"
                          value={pan}
                          onChangeText={text => {
                            const upper = text.toUpperCase();
                            setPan(upper);
                            setIsPanVerified(false);
                          }}
                          placeholder="Enter PAN number"
                          placeholderTextColor="#B2B2B2"
                          style={styles.textInputs}
                          onFocus={() => setFocusedInput('pan')}
                          onBlur={() => setFocusedInput(null)}
                          selectionColor="#1e1e1e"
                          cursorColor="#1e1e1e"
                          maxLength={10}
                        />

                        <TouchableOpacity onPress={handleVerifyPan} disabled={isVerifyingPan || isPanVerified} style={styles.verifyButton}>
                          <Text style={styles.verifyText}>{isVerifyingPan ? 'Checking...' : isPanVerified ? 'Verified' : 'Verify'}</Text>
                        </TouchableOpacity>
                      </View>

                      {errors.pan && !isPanVerified && (
                        <View style={styles.errorContainer}>
                          <Text style={styles.errorText}>{errors.pan}</Text>
                        </View>
                      )}
                    </View>

                    {/* ✅ Account Number */}
                    <View style={styles.inputWrapper}>
                      <Text style={styles.label}>Account Number</Text>
                      <View style={styles.textInputContainer}>
                        <TextInput
                          value={accountNumber}
                          onChangeText={setAccountNumber}
                          placeholder="Enter your account number"
                          placeholderTextColor="#B2B2B2"
                          style={styles.textInputs}
                          onFocus={() => setFocusedInput('accountNumber')}
                          onBlur={() => setFocusedInput(null)}
                          selectionColor="#1e1e1e"
                          cursorColor="#1e1e1e"
                          keyboardType="numeric"
                          maxLength={18}
                        />
                      </View>
                      {errors.accountNumber && (
                        <View style={styles.errorContainer}>
                          <Text style={styles.errorText}>{errors.accountNumber}</Text>
                        </View>
                      )}
                    </View>

                    {/* ✅ Confirm Account Number */}
                    <View style={styles.inputWrapper}>
                      <Text style={styles.label}>Confirm Account Number</Text>
                      <View style={styles.textInputContainer}>
                        <TextInput
                          value={confirmAccountNumber}
                          onChangeText={setConfirmAccountNumber}
                          placeholder="Re-enter your account number"
                          placeholderTextColor="#B2B2B2"
                          style={styles.textInputs}
                          onFocus={() => setFocusedInput('confirmAccountNumber')}
                          onBlur={() => setFocusedInput(null)}
                          selectionColor="#1e1e1e"
                          cursorColor="#1e1e1e"
                          keyboardType="numeric"
                        />
                      </View>
                      {errors.confirmAccountNumber && (
                        <View style={styles.errorContainer}>
                          <Text style={styles.errorText}>{errors.confirmAccountNumber}</Text>
                        </View>
                      )}
                    </View>

                    {/* ✅ IFSC Code */}
                    <View style={styles.inputWrapper}>
                      <Text style={styles.label}>IFSC Code</Text>
                      <View style={styles.textInputContainer}>
                        <TextInput
                          value={ifscCode}
                          onChangeText={text => setIfscCode(text.toUpperCase())}
                          placeholder="Enter IFSC code"
                          placeholderTextColor="#B2B2B2"
                          style={styles.textInputs}
                          onFocus={() => setFocusedInput('ifscCode')}
                          onBlur={() => setFocusedInput(null)}
                          selectionColor="#1e1e1e"
                          cursorColor="#1e1e1e"
                          autoCapitalize="characters"
                          maxLength={11}
                        />
                      </View>
                      {errors.ifscCode && (
                        <View style={styles.errorContainer}>
                          <Text style={styles.errorText}>{errors.ifscCode}</Text>
                        </View>
                      )}
                    </View>
                  </>
                )}

                {step === 2 && (
                  <>
                    {/* ✅ Email */}

                    <View style={styles.inputWrapper}>
                      <Text style={styles.label}>Email</Text>
                      <View style={styles.textInputContainer}>
                        <TextInput value={email} onChangeText={text => setEmail(text.toLowerCase())} placeholder="Enter your email" keyboardType="email-address" autoCapitalize="none" placeholderTextColor="#B2B2B2" style={styles.textInputs} />
                      </View>
                    </View>

                    {/* ✅ Phone */}
                    <View style={styles.inputWrapper}>
                      <Text style={styles.label}>Phone Number</Text>
                      <View style={styles.textInputContainer}>
                        <TextInput value={phone} onChangeText={setPhone} placeholder="Enter phone number" keyboardType="numeric" maxLength={10} placeholderTextColor="#B2B2B2" style={styles.textInputs} />
                      </View>
                    </View>

                    {/* ✅ Address */}
                    <View style={styles.inputWrapper}>
                      <Text style={styles.label}>Address</Text>
                      <View style={styles.textInputContainer}>
                        <TextInput value={address} onChangeText={setAddress} placeholder="Enter your address" placeholderTextColor="#B2B2B2" style={styles.textInputs} />
                      </View>
                    </View>

                    {/* ✅ City */}
                    <View style={styles.inputWrapper}>
                      <Text style={styles.label}>City</Text>
                      <View style={styles.textInputContainer}>
                        <TextInput value={city} onChangeText={setCity} placeholder="Enter your city" placeholderTextColor="#B2B2B2" style={styles.textInputs} />
                      </View>
                    </View>

                    {/* ✅ State */}
                    <View style={styles.inputWrapper}>
                      <Text style={styles.label}>State</Text>
                      <View style={styles.textInputContainer}>
                        <TextInput value={stateName} onChangeText={setStateName} placeholder="Enter your state" placeholderTextColor="#B2B2B2" style={styles.textInputs} />
                      </View>
                    </View>

                    {/* ✅ Postal Code */}
                    <View style={styles.inputWrapper}>
                      <Text style={styles.label}>Postal Code</Text>
                      <View style={styles.textInputContainer}>
                        <TextInput value={postalCode} onChangeText={setPostalCode} placeholder="Enter postal code" keyboardType="numeric" placeholderTextColor="#B2B2B2" style={styles.textInputs} />
                      </View>
                    </View>
                  </>
                )}
              </ScrollView>

              <View style={{width: '100%', alignSelf: 'center', flexDirection: 'row', gap: responsiveWidth(2)}}>
                {step !== 1 && (
                  <View style={{flexBasis: '30%'}}>
                    <AnimatedButton title={'Back'} style={{backgroundColor: '#fff', color: '#1e1e1e'}} buttonMargin={Platform.OS === 'android' ? 5 : 3} onPress={() => setStep(1)} loading={loading} />
                  </View>
                )}
                <View style={step !== 1 ? {flexBasis: '70%'} : {flexBasis: '100%'}}>
                  <AnimatedButton title={step === 1 ? 'Next' : 'Submit'} buttonMargin={Platform.OS === 'android' ? 5 : 3} onPress={step === 1 ? handleNext : handleSubmit} loading={loading} />
                </View>
              </View>
            </Dialog>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    )
  );
};

const styles = StyleSheet.create({
  dialog: {
    borderRadius: responsiveWidth(5.33),
    borderWidth: 2,
    borderStyle: 'dashed',
    alignSelf: 'center',
    padding: 32,
    backgroundColor: '#fff',
    width: responsiveWidth(92),
    height: '90%',
    borderColor: '#1e1e1e',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: responsiveFontSize(2.46),
    textAlign: 'center',
    lineHeight: responsiveWidth(6.93),
    marginVertical: 16,
    textTransform: 'capitalize',
    color: '#1e1e1e',
    width: responsiveWidth(75),
  },
  iconContainer: {
    height: 45,
    width: 40,
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

  //Input styles
  container: {
    paddingBottom: 20, // Extra space for better layout
  },

  heading: {
    fontSize: responsiveFontSize(2.5),
    fontFamily: 'Rubik-Bold',
    color: '#1e1e1e',
    marginBottom: responsiveWidth(6.4),
  },

  inputWrapper: {
    marginBottom: 12,
  },

  label: {
    fontSize: responsiveFontSize(1.8),
    fontFamily: 'Rubik-Medium',
    color: '#1e1e1e',
  },

  textInputContainer: {
    borderWidth: 2,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: responsiveWidth(4),
    paddingLeft: responsiveWidth(5.33),
    width: '100%',
    marginTop: responsiveWidth(1.87),
  },

  textInputs: {
    fontSize: responsiveFontSize(1.8),
    fontFamily: 'Rubik-Regular',
    color: '#1e1e1e',
    flex: 1,
    height: responsiveWidth(12.8),
    borderRadius: responsiveWidth(3.73),
  },
  errorContainer: {
    flexDirection: 'row',
    borderRadius: responsiveWidth(2),
    // marginLeft: 90,
    alignSelf: 'flex-end',
    marginTop: 6,
    marginRight: 6,
    width: responsiveWidth(52),
    justifyContent: 'flex-end',
  },
  errorText: {
    fontFamily: 'Rubik-Regular',
    fontSize: responsiveFontSize(1.48),
    color: 'red',
    flexShrink: 1,
  },
  verifyButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginRight: 6,
    borderColor: '#1e1e1e',
    borderWidth: WIDTH_SIZES['1.5'],
    backgroundColor: '#FFA86B',
  },

  verifyText: {
    color: '#000',
    fontFamily: 'Rubik-Medium',
    fontSize: responsiveFontSize(1.6),
  },
});

export default BankDetailsModal;
