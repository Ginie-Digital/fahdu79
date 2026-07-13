import React, {useEffect, useState, useRef} from 'react';
import {View, Text, StyleSheet, Linking, Alert, FlatList, Platform, Pressable, Dimensions, TouchableOpacity} from 'react-native';
import Modal from 'react-native-modal';
import AnimatedButton from '../../Components/AnimatedButton';
import {responsiveFontSize, responsiveHeight, responsiveWidth} from 'react-native-responsive-dimensions';
import {BlurView} from 'expo-blur';
import {Image} from 'expo-image';
import {navigate} from '../../../Navigation/RootNavigation';
import {FONT_SIZES, nTwins, WIDTH_SIZES} from '../../../DesiginData/Utility';
import {WINDOW_HEIGHT, WINDOW_WIDTH} from '@gorhom/bottom-sheet';
import {toggleBankDetailsModal, toggleConfirmBankDetails, toggleShowBankDetailsModal, toggleTransactionDetailModal} from '../../../Redux/Slices/NormalSlices/HideShowSlice';
import {useDispatch, useSelector} from 'react-redux';
import {TouchableWithoutFeedback} from 'react-native-gesture-handler';
import {useLazyAlreadyFilledBankDetailsQuery} from '../../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
import DIcon from '../../../DesiginData/DIcons';
import { useAppTheme, darkColors, lightColors } from '../../Hook/useAppTheme';

const TransactionDetailsModal = ({visible, transaction, isDark: customIsDark}) => {
  const { colors: themeColors, isDark: systemIsDark } = useAppTheme();
  const isDark = customIsDark !== undefined ? customIsDark : systemIsDark;
  const colors = isDark ? darkColors : lightColors;
  const dispatch = useDispatch();

  const [contentHeight, setContentHeight] = useState(0);

  // Calculate modal height based on content
  const calculateModalHeight = () => {
    const headerHeight = 50; // Approximate height of header
    const contentPadding = 32; // Padding inside dialog
    const minHeight = 300; // Minimum height you want
    const maxHeight = Dimensions.get('window').height * 0.8; // Maximum height (80% of screen)

    // Total height calculation
    const totalHeight = headerHeight + contentHeight + contentPadding;

    // Ensure height is between min and max
    return Math.min(Math.max(totalHeight, minHeight), maxHeight);
  };

  const handleContentLayout = event => {
    const {height} = event.nativeEvent.layout;
    setContentHeight(height);
  };

  function Detail({label, value, bold}) {
    return (
      <View style={{marginBottom: 14}}>
        <Text style={[styles.label, { color: isDark ? '#FFFFFF' : '#1e1e1e', opacity: isDark ? 0.4 : 1 }]}>{label}</Text>
        <Text style={[styles.value, { color: isDark ? '#FFFFFF' : '#1e1e1e' }, bold && {fontWeight: 'bold'}]}>{value}</Text>
      </View>
    );
  }


  return (
    <Modal
      isVisible={visible}
      backdropColor="#000000"
      backdropOpacity={0.6}
      onBackButtonPress={() => dispatch(toggleTransactionDetailModal({show: false}))}
      onBackdropPress={() => dispatch(toggleTransactionDetailModal({show: false}))}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      animationInTiming={300}
      animationOutTiming={250}
      backdropTransitionInTiming={300}
      backdropTransitionOutTiming={250}
      hideModalContentWhileAnimating={true}
      useNativeDriver={true}
      useNativeDriverForBackdrop={true}
      style={styles.modalContainer}
    >
      <View 
        style={[
          styles.dialog, 
          { 
            backgroundColor: isDark ? '#121212' : '#fff', 
            borderColor: isDark ? '#212121' : '#1e1e1e',
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            paddingTop: 32,
            paddingHorizontal: 32,
            paddingBottom: 40,
          }
        ]}>
        <View style={{position: 'relative'}}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: isDark ? '#FFFFFF' : '#1e1e1e' }]}>Transaction Details</Text>
            <TouchableOpacity onPress={() => dispatch(toggleTransactionDetailModal({show: false}))}>
              <DIcon provider={'Ionicons'} name={'close'} color={isDark ? '#FFFFFF' : '#1e1e1e'} />
            </TouchableOpacity>
          </View>

          <View>
            {!isDark && (
              <View style={[styles.overlayTwo, {width: '100%', height: contentHeight}]} />
            )}

            <View
              style={[
                styles.content, 
                { 
                  backgroundColor: isDark ? '#1C1C1C' : '#fff', 
                  borderColor: isDark ? '#212121' : '#1e1e1e',
                  borderWidth: isDark ? 1.5 : 1,
                  borderRadius: isDark ? 16 : 12,
                }
              ]}
              onLayout={event => {
                const {height} = event.nativeEvent.layout;
                setContentHeight(height);
              }}>
              <Detail label="Transaction ID" value={transaction.id} bold />
              <Detail label="Transfer Amount" value={`₹${transaction.amount}`} />
              <Detail label="Transfer Date" value={transaction.date} />
              <Detail label="Transfer Time" value={transaction.time} bold />
              <Detail label="Transfer Account" value={transaction.account} />
              <Detail label="Transfer Category" value={transaction.category} />
              <Detail label="Transfer Status" value={transaction.status} />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    margin: 0,
    justifyContent: 'flex-end',
  },
  dialog: {
    borderTopLeftRadius: responsiveWidth(5.33),
    borderTopRightRadius: responsiveWidth(5.33),
    padding: 32,
    backgroundColor: '#fff',
    width: '100%',
    borderColor: '#1e1e1e',
    borderWidth: 1.5,
    borderBottomWidth: 0,
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

  //Card

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  title: {
    fontSize: FONT_SIZES[18],
    fontFamily: 'Rubik-Medium',
    color: '#1e1e1e',
  },

  content: {
    borderWidth: 1,
    borderColor: '#1e1e1e',
    borderRadius: 12,
    paddingVertical: WIDTH_SIZES[24],
    paddingHorizontal: WIDTH_SIZES[24],
    marginTop: 10,
    backgroundColor: '#fff',
  },
  label: {
    fontSize: FONT_SIZES[12],
    fontFamily: 'Rubik-Regular',
    color: '#1e1e1e',
  },
  value: {
    fontSize: FONT_SIZES[16],
    marginTop: WIDTH_SIZES[8],
    color: '#1e1e1e',
    fontFamily: 'Rubik-Medium',
  },
  overlayTwo: {
    position: 'absolute',
    top: '3.6%',
    left: '1.6%',
    backgroundColor: '#1e1e1e',
    borderRadius: 14,
    zIndex: -1,
    borderWidth: WIDTH_SIZES[1.5],
  },
});

export default TransactionDetailsModal;
