import {StyleSheet, Text, View, Animated, TouchableOpacity, Image, Platform, Pressable} from 'react-native';
import React, {useCallback} from 'react';
import {responsiveFontSize, responsiveHeight, responsiveWidth} from 'react-native-responsive-dimensions';
import {useSelector, useDispatch} from 'react-redux';

import {Dialog} from 'react-native-simple-dialogs';
import {BlurView} from 'expo-blur';
import { FONT_SIZES, formatIndianNumber } from '../../../DesiginData/Utility';

import DIcon from '../../../DesiginData/DIcons';
import {useLazyIsValidFollowQuery, useSubscriptionPaymentsMutation} from '../../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
import {toggleConfirmSubscribe} from '../../../Redux/Slices/NormalSlices/HideShowSlice';
import {LoginPageErrors, chatRoomSuccess} from '../ErrorSnacks';
import {navigate} from '../../../Navigation/RootNavigation';

/**
 * todo : One dispatch to hide show modal, another one to set seelcted sort
 */

const ConfirmSubscribeModal = ({code, userId, userName, coins}) => {
  const dispatcher = useDispatch();

  const visible = useSelector(state => state.hideShow.visibility.confirmSubscribe);

  const [subscriptionPayments] = useSubscriptionPaymentsMutation();

  const token = useSelector(state => state.auth.user.token);

  const [isValidFollow] = useLazyIsValidFollowQuery();

  const handleGoToOthersProfile = useCallback(
    async userName => {
      const {data, error} = await isValidFollow({token, userName}, false);

      if (data?.data?.follow) {
        navigate('othersProfile', {userName, userId, isFollowing: data?.data?.follow, role: 'creator'});
      }
    },
    [userId, userName],
  );

  const handlePaymentsApi = async () => {
    const {data, error} = await subscriptionPayments({token, data: {allowPay: true, code, offerApplied: false, userId}});

    if (error) {
      if (error?.status === 'FETCH_ERROR') {
        LoginPageErrors('Please check your network');
        return;
      }

      LoginPageErrors(error?.data?.message);
      setTimeout(() => {
        dispatcher(toggleConfirmSubscribe());
      }, 2000);
    }

    if (data?.statusCode === 200) {
      chatRoomSuccess(data?.message);
      dispatcher(toggleConfirmSubscribe());
      handleGoToOthersProfile(userName);
    }
  };

  return (
    // <Modal
    //   animationIn={"fadeInDown"}
    //   animationOut={"fadeOutUp"}
    //   animationInTiming={150}
    //   animationOutTiming={150}
    //   //   onRequestClose={() => dispatcher(toggleProfileAction())}
    //   transparent={true}
    //   isVisible={modalVisibility}
    //   // coverScreen={true}
    //   backdropColor="black"
    //   //   onBackButtonPress={() => dispatcher(toggleProfileAction())}
    //   onBackdropPress={() => dispatcher(toggleConfirmSubscribe())}
    //   useNativeDriver
    //   style={{
    //     width: "100%",
    //     alignSelf: "center",
    //     height: "100%",
    //     justifyContent: "flex-start",
    //   }}
    // >
    //   <View style={[{ position: "relative" }]}>
    //     <View style={styles.modalInnerWrapper}>
    //       <TouchableOpacity style={{ alignSelf: "flex-end" }}>
    //         {/* <DIcon name={"cross"} provider={"Entypo"} /> */}
    //       </TouchableOpacity>

    //       <Text style={{ fontFamily: "Rubik-Medium", color: "#282828", alignSelf: "center", marginTop : responsiveWidth(5) }}>Pay {coins} coins to Subscribe</Text>

    //       <View style={{ flexDirection: "row", gap: responsiveWidth(16), alignSelf: "center", marginTop: responsiveWidth(6) }}>
    //         <TouchableOpacity onPress={() => handlePaymentsApi()}>
    //           <DIcon name={"check-circle"} provider={"MaterialIcons"} color={"#BAFCA2"} size={responsiveWidth(14)} />
    //         </TouchableOpacity>
    //         <TouchableOpacity onPress={() => dispatcher(toggleConfirmSubscribe())}>
    //           <DIcon name={"cancel"} provider={"MaterialIcons"} color={"#FFA07A"} size={responsiveWidth(14)} />
    //         </TouchableOpacity>
    //       </View>
    //     </View>
    //   </View>
    // </Modal>

    visible && (
      <View style={styles.overlay}>
        <BlurView intensity={15} tint="dark" style={styles.blurBackground} />
        <Dialog visible={visible} dialogStyle={styles.dialog} contentStyle={{padding: 0, paddingTop: 0}}>
          <View style={styles.content}>
            <View style={styles.yesNoContainer}>
              <Text style={styles.textYesNo} numberOfLines={1}>
                Pay {formatIndianNumber(coins)} coins to Subscribe
              </Text>

              <View style={styles.buttonContainer}>
                <Pressable
                  onPress={() => dispatcher(toggleConfirmSubscribe())}
                  style={({pressed}) => [
                    styles.button,
                    styles.noButton,
                    {backgroundColor: pressed ? '#FFFFFF' : '#2A2A2A'},
                  ]}>
                  {({pressed}) => <Text style={[styles.buttonText, {color: pressed ? '#0D0D0D' : '#FFFFFF'}]}>Cancel</Text>}
                </Pressable>

                <Pressable
                  onPress={() => handlePaymentsApi()}
                  style={({pressed}) => [
                    styles.button,
                    styles.yesButton,
                    {backgroundColor: pressed ? '#E06A10' : '#FFA86B'},
                  ]}>
                  {({pressed}) => <Text style={[styles.buttonText, {color: '#1E1E1E'}]}>Pay</Text>}
                </Pressable>
              </View>
            </View>
          </View>
        </Dialog>
      </View>
    )
  );
};

export default ConfirmSubscribeModal;

const styles = StyleSheet.create({
  dialog: {
    borderRadius: responsiveWidth(5.33),
    borderWidth: 2,
    borderStyle: 'dashed',
    alignSelf: 'center',
    padding: 32,
    backgroundColor: '#1A1A1A',
    width: responsiveWidth(88), // Adjusted for consistency
    height: responsiveWidth(44), // Adjusted for consistency
    borderColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
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
  yesNoContainer: {
    alignItems: 'center',
    alignSelf: 'center',
  },
  textYesNo: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: FONT_SIZES['16'], // Adjust font size if needed
    textAlign: 'center',
    color: '#FFFFFF',
    width: '100%', // Ensure the text container takes full width
    flexShrink: 1, // Prevent text from wrapping
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: Platform.OS === 'ios' ? 4 : 0,
    width: '100%',
    marginTop: Platform.OS === 'ios' ? 16 : 12,
  },
  button: {
    width: responsiveWidth(34.5), // Adjusted for consistency
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: Platform.OS === 'android' ? 6 : 8,
    borderWidth: 1.5,
    borderColor: '#2A2A2A',
  },
  yesButton: {
    backgroundColor: '#FFA86B',
  },
  noButton: {
    backgroundColor: '#2A2A2A',
  },
  buttonText: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: 14,
    color: '#FFFFFF',
  },
});
