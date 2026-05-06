import React, {useEffect, useState, useRef} from 'react';
import {View, Text, StyleSheet, Pressable, Platform, Image, Dimensions, Animated} from 'react-native';
import AnimatedButton from '../../Components/AnimatedButton';
import {responsiveFontSize, responsiveHeight, responsiveWidth} from 'react-native-responsive-dimensions';
import {BlurView} from 'expo-blur';
import {useDispatch, useSelector} from 'react-redux';
import {toggleBankDetailsModal, toggleConfirmBankDetails, toggleShowBankDetailsModal} from '../../../Redux/Slices/NormalSlices/HideShowSlice';
import {WINDOW_WIDTH} from '@gorhom/bottom-sheet';
import {FONT_SIZES, WIDTH_SIZES} from '../../../DesiginData/Utility';
import {useDeleteBankDetailsMutation, useLazyGetShowBankDetailsQuery} from '../../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
import {CommonSuccess, LoginPageErrors, successSnack} from '../../Components/ErrorSnacks';
import {navigate} from '../../../Navigation/RootNavigation';

const ShowBankDetails = ({visible}) => {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [getShowBankDetails] = useLazyGetShowBankDetailsQuery();
  const [bankDetails, setBankDetails] = useState({});
  const [contentHeight, setContentHeight] = useState(0);

  const slideAnim = useRef(new Animated.Value(600)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }).start();
    } else {
      slideAnim.setValue(600);
    }
  }, [visible]);

  const {token, currentUserId} = useSelector(state => state.auth.user);

  const [deleteBankDetails, {isLoading: isDeleteLoading, isSuccess: isDeleteSuccess, isError: isDeleteError, error: deleteError}] = useDeleteBankDetailsMutation();

  // Height calculations
  const padding = 32; // Dialog padding
  const minModalHeight = 250; // Reduced since buttons are removed
  const maxModalHeight = Dimensions.get('window').height * 0.8; // Maximum height (80% of screen)

  const getBankDetails = async () => {
    const {data, error} = await getShowBankDetails({token});
    if (data?.statusCode === 200) {
      setBankDetails(data?.data);
    }
  };

  useEffect(() => {
    if (visible) {
      getBankDetails();
    }
  }, [visible]);

  const handleEditDetails = () => {
    dispatch(toggleShowBankDetailsModal({show: false}));
    setTimeout(() => {
      dispatch(toggleBankDetailsModal({show: true}));
    }, 500);
  };

  const handleContentLayout = event => {
    const {height} = event.nativeEvent.layout;
    setContentHeight(height);
  };

  const calculateModalHeight = () => {
    const totalHeight = contentHeight + padding * 2;
    return Math.min(totalHeight, maxModalHeight);
  };


  const handleDeleteBankDetails = async () => {
    try {
      const res = await deleteBankDetails({
        token,
        data: {userId: currentUserId},
      }).unwrap();

      // ---------------------------
      // ✅ SUCCESS CASE (statusCode === 200)
      // ---------------------------
      if (res?.statusCode === 200) {
        console.log('Delete Success:', res?.message);
        dispatch(toggleShowBankDetailsModal({show: false}));

        CommonSuccess(String(res?.message)); // your success popup/toast

        // navigate to home
        navigate('home');
        return;
      }

      // In case API returns success but not 200
      LoginPageErrors('Unexpected response');
    } catch (err) {
      // ---------------------------
      // ❌ ERROR CASE (statusCode === 400)
      // ---------------------------
      console.log('Delete Failed:', err);
      dispatch(toggleShowBankDetailsModal({show: false}));

      LoginPageErrors(err?.data?.message || 'Something went wrong, try again!');
    }
  };

  return (
    visible && (
      <View style={styles.overlay}>
        <BlurView intensity={15} style={styles.blurBackground} />
        <Pressable style={styles.touchOutside} onPress={() => dispatch(toggleShowBankDetailsModal({show: false}))} />
        <Animated.View style={[styles.dialog, {transform: [{translateY: slideAnim}]}]}>
          <View style={styles.dialogContainer} onLayout={handleContentLayout}>
            {/* Header with Title & Edit Icon */}
            <View style={styles.header}>
              <Text style={styles.heading}>Bank Details</Text>
              <Pressable onPress={handleEditDetails}>
                <Image source={require('../../../Assets/Images/ChangeProfile.png')} style={styles.editIcon} />
              </Pressable>
            </View>

            {/* Bank Details List */}
            {[
              {label: 'Beneficiary Name', value: bankDetails?.beneficiaryName},
              {label: 'Account Number', value: bankDetails?.accountNo},
              {label: 'IFSC Code', value: bankDetails?.IFSC},
            ].map((item, index) => (
              <View style={styles.detailItem} key={index}>
                <Text style={styles.label}>{item.label}</Text>
                <Text style={styles.valueBold}>{item.value || 'Not provided'}</Text>
              </View>
            ))}

            {/* Note */}
            <Text style={styles.note}>
              <Text style={styles.bold}>Note:</Text> Kindly ensure the accuracy of the details you submit, as once submitted, these details will not be changed.
            </Text>

            {/* Contact Info */}
            <Text style={styles.contact}>
              For further enquiry email at <Text style={styles.email}>contact@fahdu.com</Text>
            </Text>
          </View>
        </Animated.View>
      </View>
    )
  );
};

const styles = StyleSheet.create({
  dialog: {
    borderTopLeftRadius: responsiveWidth(5.33),
    borderTopRightRadius: responsiveWidth(5.33),
    backgroundColor: '#fff',
    width: WINDOW_WIDTH,
    position: 'absolute',
    bottom: 0,
    left: 0, 
    right: 0,
    padding: 32,
    zIndex: 1,
    minHeight: responsiveHeight(40),
  },
  touchOutside: {
    flex: 1,
    width: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 999,
  },
  blurBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  dialogContainer: {
    backgroundColor: '#fff',
    borderRadius: responsiveWidth(4),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: responsiveHeight(2),
  },
  heading: {
    fontSize: FONT_SIZES[20],
    fontFamily: 'Rubik-Bold',
    color: '#1e1e1e',
  },
  editIcon: {
    width: 21,
    height: 21,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: WIDTH_SIZES[16],
  },
  label: {
    fontSize: responsiveFontSize(1.8),
    fontFamily: 'Rubik-Regular',
    color: '#1e1e1e',
  },
  valueBold: {
    fontSize: responsiveFontSize(1.8),
    fontFamily: 'Rubik-SemiBold',
    color: '#1e1e1e',
  },
  buttonWrapper: {
    marginTop: responsiveHeight(3),
    marginBottom: responsiveHeight(2),
  },
  note: {
    fontSize: responsiveFontSize(1.6),
    fontFamily: 'Rubik-Regular',
    color: '#1e1e1e',
    marginTop: WIDTH_SIZES[20] + WIDTH_SIZES[2],
  },
  bold: {
    fontFamily: 'Rubik-SemiBold',
  },
  contact: {
    fontSize: responsiveFontSize(1.6),
    fontFamily: 'Rubik-Regular',
    color: '#1e1e1e',
    marginTop: responsiveHeight(2),
  },
  email: {
    color: '#FFA86B',
    fontFamily: 'Rubik-SemiBold',
  },
});

export default ShowBankDetails;
