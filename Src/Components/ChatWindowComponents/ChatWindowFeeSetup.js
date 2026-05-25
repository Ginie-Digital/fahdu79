import React, {useMemo, useCallback, useEffect, useState} from 'react';
import {View, Text, StyleSheet, Platform, TextInput, ScrollView, Pressable, Dimensions, Keyboard, KeyboardAvoidingView} from 'react-native';
import Modal from 'react-native-modal';
import {responsiveFontSize, responsiveWidth} from 'react-native-responsive-dimensions';
import {FONT_SIZES, WIDTH_SIZES} from '../../../DesiginData/Utility';
import Paisa from '../../../Assets/svg/paisa.svg';
import AnimatedButton from '../AnimatedButton';
import {useUpdateFeeSetupChatWindowMutation} from '../../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
import {useDispatch, useSelector} from 'react-redux';
import {chatRoomSuccess, LoginPageErrors} from '../ErrorSnacks';
import {toggleChatWindowFeeSetup} from '../../../Redux/Slices/NormalSlices/HideShowSlice';

const ChatWindowFeeSetup = () => {
  const visible = useSelector(state => state.hideShow.visibility.chatWindowFeeSetup);

  // State
  const [amount, setAmount] = useState('');
  const [amountError, setAmountError] = useState('');
  const [loading, setLoading] = useState(false);

  const token = useSelector(state => state.auth.user.token);
  const dispatch = useDispatch();

  // API
  const [updateFeeSetupChatWindow] = useUpdateFeeSetupChatWindowMutation();

  // Callbacks
  const handleClose = () => {
    dispatch(toggleChatWindowFeeSetup({show: false}));
  };


  // Handle Amount Change
  const handleAmount = t => {
    if (t === '') {
      setAmount('');
      setAmountError('');
      return;
    }

    const num = parseInt(t, 10);
    setAmount(t);

    if (!isNaN(num) && num % 2 !== 0) {
      setAmountError('Please enter a multiple of 2');
    } else {
      setAmountError('');
    }
  };

  const handleSave = async () => {
    setLoading(true);

    const {data, error} = await updateFeeSetupChatWindow({
      token,
      data: {
        chatFollowAmount: amount,
      },
    });

    if (error) {
      if (error?.status === 'FETCH_ERROR') {
        LoginPageErrors('Please check your network');
      }

      if (error?.data?.status_code === 2044) {
        autoLogout();
      }

      LoginPageErrors(error?.data?.message);
      setLoading(false);
      return;
    }

    if (data) {
      setLoading(false);
      dispatch(toggleChatWindowFeeSetup({show: false}));
      chatRoomSuccess('Fee updated successfully');
    }
  };

  // Calculate 50% of amount (rounded down)
  const subscriberFee = amount ? Math.floor(parseInt(amount, 10) / 2) : 0;

  return (
    <Modal
      isVisible={visible}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      onBackdropPress={handleClose}
      onBackButtonPress={handleClose}
      style={styles.modalStyle}
      avoidKeyboard={false}
      useNativeDriver={true}
    >
      <KeyboardAvoidingView
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 80}
        style={{ flex: 1, justifyContent: 'flex-end' }}
      >
        <View style={styles.dialog}>
          <ScrollView
            contentContainerStyle={styles.contentContainer}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <Text style={styles.heading}>Set Chat Fee</Text>
              <Text style={styles.subText}>Create your custom automated message</Text>
            </View>

            <View style={styles.amountInput}>
              <View style={styles.titleback}>
                <Text style={styles.titleSetPrice}>Set Price</Text>
              </View>
              <View style={styles.inputContainer}>
                <TextInput
                  maxLength={6}
                  keyboardType="number-pad"
                  style={styles.amountStyle}
                  value={amount}
                  onChangeText={t => handleAmount(t.replace(/[^0-9]/g, ''))}
                  placeholder="0"
                  placeholderTextColor="#888"
                />
                <Paisa width={20} height={20} />
              </View>
            </View>

            {amountError ? <Text style={styles.errorText}>*{amountError}</Text> : <Text style={styles.infoText}>*Chat/Message</Text>}

            <View style={styles.subscriberContainer}>
              <Text style={styles.subscriberText}>Subscriber Fee</Text>
              <View style={styles.rightSection}>
                <Text style={styles.subscriberAmount}>{subscriberFee}</Text>
                <Paisa width={20} height={20} />
              </View>
            </View>

            <AnimatedButton title={'Save'} showOverlay={false} onPress={handleSave} loading={loading} buttonStyle={styles.saveButton} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalStyle: {
    justifyContent: 'flex-end',
    margin: 0,
  },
  contentContainer: {
    paddingHorizontal: WIDTH_SIZES[32],
    paddingBottom: 24,
    paddingTop: 10,
  },
  header: {
    marginBottom: 20,
  },
  heading: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: FONT_SIZES[20],
    color: '#1E1E1E',
    marginBottom: 5,
  },
  subText: {
    fontFamily: 'Rubik-Regular',
    fontSize: FONT_SIZES[12],
    color: '#1e1e1e',
    opacity: 0.7,
  },
  amountInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#1e1e1e',
    height: responsiveWidth(12),
    borderRadius: responsiveWidth(3.14),
    overflow: 'hidden',
    marginVertical: 5,
  },
  titleback: {
    backgroundColor: '#FFE1CC',
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderColor: '#1e1e1e',
  },
  titleSetPrice: {
    fontSize: responsiveFontSize(1.8),
    fontFamily: 'Rubik-Medium',
    color: '#1e1e1e',
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingRight: 15,
    gap: 5,
  },
  amountStyle: {
    color: '#1e1e1e',
    fontFamily: 'Rubik-Medium',
    fontSize: responsiveFontSize(1.8),
    textAlign: 'right',
    minWidth: 50,
  },
  errorText: {
    fontSize: responsiveFontSize(1.5),
    fontFamily: 'Rubik-Regular',
    color: '#F73B3B',
    textAlign: 'right',
    marginTop: 5,
  },
  infoText: {
    fontSize: responsiveFontSize(1.5),
    fontFamily: 'Rubik-Regular',
    color: '#1e1e1e',
    textAlign: 'right',
    marginTop: 5,
    opacity: 0.7,
  },
  subscriberContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#FF7819',
    borderRadius: responsiveWidth(3.7),
    borderStyle: 'dashed',
    backgroundColor: '#FFF9F5',
    marginVertical: 10,
  },
  subscriberText: {
    fontSize: responsiveFontSize(1.8),
    fontFamily: 'Rubik-Medium',
    color: '#1e1e1e',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  subscriberAmount: {
    fontSize: responsiveFontSize(1.8),
    fontFamily: 'Rubik-Medium',
    color: '#1e1e1e',
  },
  saveButton: {
    marginTop: 10,
  },
  dialog: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: '#fff',
    width: '100%',
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 36,
  },
});

export default ChatWindowFeeSetup;
