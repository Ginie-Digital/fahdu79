import { StyleSheet, View, TouchableOpacity, Text, Image, Pressable, BackHandler, Vibration, Keyboard, Platform } from 'react-native';
import React, { useMemo, useCallback, useRef, useState, useEffect } from 'react';
import { responsiveWidth, responsiveFontSize } from 'react-native-responsive-dimensions';
import { BottomSheetBackdrop, BottomSheetFlatList, BottomSheetModal, BottomSheetTextInput } from '@gorhom/bottom-sheet';

import { useDispatch, useSelector } from 'react-redux';
import { setPostsCardType, toggleAddGoals, toggleHideShowInformationModal } from '../../../Redux/Slices/NormalSlices/HideShowSlice';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { token as memoizedToken } from '../../../Redux/Slices/NormalSlices/AuthSlice';
import { FONT_SIZES, nTwins, nTwinsFont, selectionTwin, WIDTH_SIZES } from '../../../DesiginData/Utility';
import { TextInput } from 'react-native-gesture-handler';
import DIcon from '../../../DesiginData/DIcons';
import { useAddGoalsLiveStreamMutation } from '../../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
import { ChatWindowError, LoginPageErrors } from '../../Components/ErrorSnacks';
import Paisa from '../../../Assets/svg/paisa.svg';
import AnimatedButton from '../../Components/AnimatedButton';
import CircularProgress from '../../Components/CircularProgress';

let regex = /^[0-9]*$/;

const AddGoalsSheet = () => {
  const bottomSheetRef = useRef(null);

  const homeBottomSheetVisibility = useSelector(state => state.hideShow.visibility.addGoalsSheet);

  const dispatch = useDispatch();

  const [noSlotLeft, setNoSlotLeft] = useState(false);

  const snapPoints = useMemo(() => ['30%', '50%'], []);

  const titleRef = useRef('');
  const amountRef = useRef('');


  const [isLoading, setIsLoading] = useState(false);


  const [goalTitleLength, setGoalTitleLength] = useState(0);

  const handleSheetChanges = useCallback(index => {
    if (index === -1) {
      dispatch(toggleAddGoals({ show: -1 }));
    }
  }, []);

  const navigation = useNavigation();

  const onBackPress = () => {
    if (bottomSheetRef !== null) {
      bottomSheetRef.current?.close();

      return true;
    }
  };

  const [addGoalsLiveStream] = useAddGoalsLiveStreamMutation();

  const handlePresentModalPress = useCallback(() => {
    if (bottomSheetRef.current) {
      bottomSheetRef.current?.present();
    }
  }, []);

  useEffect(() => {
    if (bottomSheetRef.current !== null) {
      if (homeBottomSheetVisibility === -1) {
        bottomSheetRef.current.close();
        console.log('Closing');
        resetSheet();
      } else {
        const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);

        return () => {
          subscription.remove();
        };
      }
    }
  }, [homeBottomSheetVisibility]);

  useEffect(() => {
    if (homeBottomSheetVisibility === 1) {
      handlePresentModalPress();
    }
  }, [homeBottomSheetVisibility]);

  const token = useSelector(state => state.auth.user.token);



  const handleAddReward = async () => {
    if (
      amountRef.current.value?.length === 0 ||
      titleRef.current.value?.length === 0 ||
      amountRef.current.value === undefined ||
      titleRef.current.value === undefined
    ) {
      LoginPageErrors('Invalid goal input');
      return;
    }

    if (!regex.test(amountRef.current.value)) {
      LoginPageErrors('Invalid amount');
      return;
    }

    if (Number(amountRef.current.value) === 0) {
      LoginPageErrors("Amount can't be zero");
      return;
    }

    // ✅ Set loading to true before making API call
    setIsLoading(true);

    try {
      const { error, data } = await addGoalsLiveStream({
        token,
        data: {
          amount: amountRef.current.value,
          title: titleRef.current.value,
        },
      });

      if (data) {
        dispatch(toggleAddGoals({ show: -1 }));
      }

      if (error?.data?.statusCode === 400) {
        setNoSlotLeft(true);
        LoginPageErrors("No slots left, you can't add more");
      }

      if (amountRef.current && titleRef.current) {
        amountRef.current.value = '';
        titleRef.current.value = '';
        titleRef.current.clear();
        amountRef.current.clear();
        setGoalTitleLength(0);
      }
    } catch (err) {
      console.log('Error in handleAddReward:', err);
      LoginPageErrors('Something went wrong, please try again');
    } finally {
      // ✅ Reset loading state after everything finishes
      setIsLoading(false);
    }
  };

  const renderBackdrop = useCallback(props => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={1} />, []);

  return (
    <BottomSheetModal
      android_keyboardInputMode="adjustResize"
      name="HOmeBottom"
      backdropComponent={renderBackdrop}
      ref={bottomSheetRef}
      index={homeBottomSheetVisibility === 1 ? 0 : -1}
      snapPoints={snapPoints}
      onChange={handleSheetChanges}
      enablePanDownToClose={true}
      enableDynamicSizing={false}
      backgroundStyle={{ backgroundColor: '#fffef9' }}>
        <View style={styles.contentContainer}>
          <View style={{ marginTop: responsiveWidth(4) }}>
            <Text style={{ fontFamily: 'Rubik-Bold', color: 'black', fontSize: FONT_SIZES[20] }}>Add Goal</Text>
            <Text style={{ fontFamily: 'Rubik-Medium', color: 'black', fontSize: FONT_SIZES[12], marginTop: WIDTH_SIZES[4] + WIDTH_SIZES[2], lineHeight: 16 }}>You can add your goal to your livestream, so that the audience can give you tips for your goal.</Text>
          </View>

          <View style={styles.propertyTitle}>
            <BottomSheetTextInput
              ref={titleRef}
              placeholderTextColor={'gray'}
              placeholder="Enter your goal for your audience.."
              style={[styles.inputStyle]}
              onChangeText={t => {
                titleRef.current.value = t;
                setGoalTitleLength(t.length);
              }}
              maxLength={30}
            />
            <View style={{ marginRight: responsiveWidth(2) }}>
              <CircularProgress current={goalTitleLength} max={30} size={20} backgroundColor="#E0E0E0" />
            </View>
          </View>

          <View style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            {/* <View style={[styles.propertyTitle, {width: responsiveWidth(82)}]}>
              <Text style={styles.titleSetPrice}>Amount</Text>
              <BottomSheetTextInput ref={amountRef} keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'number-pad'} placeholderTextColor={'gray'} placeholder="10" style={[styles.inputStyle]} onChangeText={t => (amountRef.current.value = t)} />
              <Image source={require('../../../Assets/Images/Coin.png')} style={{height: responsiveWidth(5), width: responsiveWidth(5), resizeMode: 'contain', alignSelf: 'center', marginRight: responsiveWidth(1)}} />
            </View> */}

            <View style={[styles.amountInput, { alignSelf: 'center', width: responsiveWidth(82), backgroundColor: 'white' }]}>
              <View style={{ flexDirection: 'row' }}>
                <View style={[styles.titleback, { backgroundColor: '#FFE1CC' }]}>
                  <Text style={[styles.titleSetPrice]}>Amount</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: responsiveWidth(2), gap: responsiveWidth(2) }}>
                <BottomSheetTextInput
                  ref={amountRef}
                  keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'number-pad'}
                  selectionHandleColor={'#ffa86b'}
                  selectionColor={selectionTwin()}
                  cursorColor={'#1e1e1e'}
                  maxLength={6}
                  style={[{ padding: 0, color: '#1e1e1e', fontFamily: 'Rubik-Medium', width: responsiveWidth(40), height: '100%', textAlign: 'right' }, styles.amountStyle]}
                  // value={String(amount)}
                  onChangeText={t => (amountRef.current.value = t)}
                  placeholder="10"
                />
                <Paisa />
              </View>
            </View>

            <Text style={{ marginTop: responsiveWidth(1), left: responsiveWidth(13), width: responsiveWidth(80), color: 'black', fontFamily: 'Rubik-Regular', fontSize: responsiveWidth(3) }}>*That you need for the completion of your goal</Text>
            {/* <Pressable style={[styles.propertyTitle, {width: responsiveWidth(82), justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFA86B', borderBottomWidth: responsiveWidth(1.2), borderRightWidth: responsiveWidth(1)}]} onPress={() => handleAddReward()}>

              <Text style={{fontFamily: 'Rubik-Medium', color: 'black'}}>Add Goal</Text>
            </Pressable> */}

            <View style={{ width: responsiveWidth(80) }}>
              <AnimatedButton title={'Add Goal'} onPress={handleAddReward} loading={isLoading} />
            </View>
          </View>
        </View>
      </BottomSheetModal>
  );
};

export default AddGoalsSheet;

const styles = StyleSheet.create({
  contentContainer: {
    backgroundColor: '#fffef9',
    height: '100%',
    paddingHorizontal: responsiveWidth(8.53),
    alignItems: 'center',
  },

  propertyTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    borderLeftWidth: 1,
    padding: responsiveWidth(1),
    borderColor: '#282828',
    height: responsiveWidth(14),
    borderWidth: 1,
    alignSelf: 'center',
    marginTop: responsiveWidth(4),
    borderRadius: responsiveWidth(4),
    width: responsiveWidth(82),
    fontFamily: 'Rubik-Regular',
  },
  titleback: {
    justifyContent: 'center', // Center content vertically
    alignItems: 'center', // Center content horizontally
    paddingHorizontal: responsiveWidth(4), // Add horizontal padding
    borderTopLeftRadius: responsiveWidth(2),
    borderBottomLeftRadius: responsiveWidth(2),
    height: "100%"
  },

  titleSetPrice: {
    fontSize: nTwinsFont(1.6, 1.7),
    fontFamily: 'Rubik-Medium',
    textAlign: 'center', // Center text horizontally
    textAlignVertical: 'center', // Center text vertically (Android)
    includeFontPadding: false, // Remove extra padding (Android)
  },
  inputStyle: {
    flex: 1,
    padding: 0,
    paddingLeft: 2,
    marginLeft: responsiveWidth(2),
    fontSize: responsiveFontSize(1.6),
    backgroundColor: '#fff',
    height: '100%',
    fontFamily: 'Rubik-Regular',
    paddingHorizontal: 20,
    fontSize: responsiveFontSize(1.8),
    color: '#1e1e1e',
    height: '100%',
  },

  amountInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderLeftWidth: 1,
    borderColor: '#1e1e1e',
    height: responsiveWidth(14.1),
    borderWidth: 1,
    alignSelf: 'center',
    marginTop: responsiveWidth(3.06),
    borderRadius: responsiveWidth(3.14),
    width: responsiveWidth(85),
    fontFamily: 'Rubik-Regular',
    overflow: 'hidden',
    backgroundColor: 'red',
  },
});
