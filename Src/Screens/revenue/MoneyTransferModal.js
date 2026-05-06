import React, {useRef, useState} from 'react';
import {View, Text, StyleSheet, Linking, Alert, Platform} from 'react-native';
import {Dialog} from 'react-native-simple-dialogs';
import AnimatedButton from '../../Components/AnimatedButton';
import {responsiveFontSize, responsiveHeight, responsiveWidth} from 'react-native-responsive-dimensions';
import {BlurView} from 'expo-blur';
import {Image} from 'expo-image';
import {navigate} from '../../../Navigation/RootNavigation';
import {nTwins} from '../../../DesiginData/Utility';
import InputOverlay from '../../Components/InputOverlay';
import {TextInput} from 'react-native-gesture-handler';
import {toggleAppliedVerify, toggleBankDetailsModal, toggleTransferModal} from '../../../Redux/Slices/NormalSlices/HideShowSlice';
import {useSaveBankDetailsMutation} from '../../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
import {useDispatch, useSelector} from 'react-redux';
import {CommonSuccess, LoginPageErrors} from '../../Components/ErrorSnacks';

const MoneyTransferModal = ({visible, formDetails}) => {
  console.log(formDetails, '::::{{}{}{}');

  const [saveBankDetails] = useSaveBankDetailsMutation();

  const [loading, setLoading] = useState(false);

  const token = useSelector(state => state.auth.user.token);

  const dispatch = useDispatch();

  const handleEdit = () => {
    dispatch(toggleTransferModal({show: false}));

    setTimeout(() => {
      console.log('oening bank deatilas');
      dispatch(toggleBankDetailsModal({show: true}));
    }, 500);
  };

  const handleSubmit = async () => {
    setLoading(true);

    saveBankDetails({
      token,
      data: {
        beneficiaryName: formDetails.beneficiaryName,
        accountNo: formDetails.accountNumber,
        confirmAccountNo: formDetails.accountNumber,
        IFSC: formDetails.ifscCode,
        PAN: formDetails.pan,
        email: formDetails.email,
        phone: formDetails.phone,
        address: formDetails.address,
        city: formDetails.city,
        state: formDetails.state,
        pincode: formDetails.postalCode,
      },
    })
      .then(e => {
        setLoading(false);

        if (e?.error?.status === 400) {
          LoginPageErrors(e?.error?.data?.message);
          dispatch(toggleTransferModal({show: false}));
          return;
        }

        dispatch(toggleTransferModal({show: false}));

        CommonSuccess('Bank Details Saved Successfully!');

        navigate('home');
      })
      .catch(e => {
        console.log('Error while submitting form', e);
        setLoading(false);
      });
  };
  const truncateText = (text, limit) => {
    return text.length > limit ? text.substring(0, limit) + '...' : text;
  };

  const BankDetails = () => {
    return (
      <View style={styles.container}>
        <Text style={styles.heading}>Bank Details</Text>

        <View style={styles.detailRow}>
          <Text style={styles.label}>Beneficiary Name</Text>
          <Text ellipsizeMode="tail" numberOfLines={1} style={[styles.value]}>
            {truncateText(formDetails?.beneficiaryName || '', 16)}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.label}>Account Number</Text>
          <Text style={styles.value}>{formDetails?.accountNumber || ''}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.label}>IFSC Code</Text>
          <Text style={styles.value}>{formDetails?.ifscCode || ''}</Text>
        </View>

        <View style={[styles.detailRow, {marginBottom: 22}]}>
          <Text style={styles.label}>PAN</Text>
          <Text style={styles.value}>{formDetails?.pan || ''}</Text>
        </View>

        <View style={{width: '100%', alignSelf: 'center', flexDirection: 'row-reverse', justifyContent: 'space-between'}}>
          <View style={{flexBasis: '47.5%', width: '100%'}}>
            <AnimatedButton title={'Edit'} buttonMargin={Platform.OS === 'android' ? 0 : 0} style={{backgroundColor: '#fff'}} onPress={handleEdit} showOverlay={false} />
          </View>
          <View style={{flexBasis: '47.5%', width: '100%'}}>
            <AnimatedButton title={'Confirm'} buttonMargin={Platform.OS === 'android' ? 0 : 0} onPress={handleSubmit} loading={loading} showOverlay={false} />
          </View>
        </View>

        <Text style={styles.note}>
          <Text style={styles.boldText}>Note:</Text> Kindly ensure the accuracy of the details you submit, as once submitted, these details will not be changed.
        </Text>

        <Text style={styles.emailText}>
          For further enquiry email at <Text style={styles.email}>{'\n'}contact@fahdu.com</Text>
        </Text>
      </View>
    );
  };

  return (
    visible && (
      <View style={styles.overlay}>
        <BlurView experimentalBlurMethod intensity={15} style={styles.blurBackground} />
        <Dialog visible={visible} dialogStyle={styles.dialog} contentStyle={{padding: 0, paddingTop: 0, backgroundColor: '#fff'}}>
          <BankDetails />
        </Dialog>
      </View>
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
    height: '60%',
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

  //Contnet style

  container: {
    width: '100%',
  },
  heading: {
    fontSize: responsiveFontSize(2.5),
    fontFamily: 'Rubik-Bold',
    color: '#1e1e1e',
    marginBottom: responsiveWidth(5.33),
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: responsiveWidth(5.07),
  },
  label: {
    fontSize: 14,
    fontFamily: 'Rubik-Regular',
    color: '#1e1e1e',
  },
  value: {
    fontSize: 14,
    fontFamily: 'Rubik-SemiBold',
    color: '#000',
  },
  commentContainer: {
    marginVertical: 10,
  },
  note: {
    fontSize: 12,
    fontFamily: 'Rubik-Regular',
    color: '#1e1e1e',
    marginTop: responsiveWidth(4.53),
    lineHeight: responsiveWidth(5.2),
  },
  boldText: {
    fontFamily: 'Rubik-SemiBold',
  },
  emailText: {
    fontSize: 12,
    fontFamily: 'Rubik-Regular',
    color: '#1e1e1e',
    marginTop: responsiveWidth(6),
  },
  email: {
    fontFamily: 'Rubik-SemiBold',
    color: '#ff784b',
  },
});

export default MoneyTransferModal;
