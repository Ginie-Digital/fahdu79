import {
  StyleSheet,
  View,
  TouchableOpacity,
  Text,
  Image,
  Pressable,
  ActivityIndicator,
  ToastAndroid,
  BackHandler,
} from 'react-native';
import React, {useMemo, useCallback, useRef, useState, useEffect} from 'react';
import {
  responsiveWidth,
  responsiveFontSize,
} from 'react-native-responsive-dimensions';
import BottomSheet, {
  BottomSheetModal,
  BottomSheetBackdrop,
} from '@gorhom/bottom-sheet';

import {ScrollView} from 'react-native-gesture-handler';

import {useDispatch, useSelector} from 'react-redux';

import {toggleBrandBottomSheet} from '../../../Redux/Slices/NormalSlices/HideShowSlice';
import {token as memoizedToken} from '../../../Redux/Slices/NormalSlices/AuthSlice';
import {
  useApplyInCampaignMutation,
  useRequestBrandCollabMutation,
} from '../../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
import {
  ChatWindowError,
  CommonSuccess,
  LoginPageErrors,
  successSnack,
} from '../ErrorSnacks';
import {showMessage} from 'react-native-flash-message';
import Paisa from '../../../Assets/svg/paisa.svg';
import Req from '../../../Assets/svg/request.svg';
import Download from '../../../Assets/svg/download.svg';

const BrandBottomSheet = () => {
  const bottomSheetRef = useRef(null);

  const dispatch = useDispatch();

  const sheetData = useSelector(state => state.campaignData.data);

  const currentUserDetails = useSelector(state => state?.auth?.user);

  const currentCampaignId = useSelector(state => state.campaignData.data._id);

  const brandBottomSheetVisibility = useSelector(
    state => state.hideShow.visibility.brandBottomSheet,
  );

  const token = useSelector(state => state.auth.user.token);

  // const [requestBrandCollab] = useRequestBrandCollabMutation();

  const [loading, setLoading] = useState(false);

  const snapPoints = useMemo(() => ['95%', '95%', '100%'], []);

  const handleSheetChanges = useCallback(index => {
    if (index === -1) {
      dispatch(toggleBrandBottomSheet({show: -1}));
    }
  }, []);

  const [applyInCampaign] = useApplyInCampaignMutation();

  const onBackPress = () => {
    if (bottomSheetRef !== null) {
      bottomSheetRef.current?.close();
      return true;
    }
  };

  const handlePresentModalPress = useCallback(() => {
    if (bottomSheetRef.current) {
      bottomSheetRef.current?.present();
    }
  }, []);

  useEffect(() => {
    if (brandBottomSheetVisibility === -1) {
      bottomSheetRef.current.close();
      console.log('Closing');
    } else {
      const backHandler = BackHandler.addEventListener(
        'hardwareBackPress',
        onBackPress,
      );

      return () => backHandler.remove(); // Use .remove() instead
    }
  }, [brandBottomSheetVisibility]);

  useEffect(() => {
    if (brandBottomSheetVisibility === 1) {
      handlePresentModalPress();
    }
  }, [brandBottomSheetVisibility]);

  async function handleRequestBrandCollab(cardId) {
    const {data, error} = await applyInCampaign({
      token,
      data: {
        creatorId: currentUserDetails?.ylyticInstagramUserId,
        campaignId: currentCampaignId,
      },
    });

    console.log(currentUserDetails?.ylyticInstagramUserId, currentCampaignId);

    if (data?.success === false) {
      // showMessage({
      //   message: data?.message,
      //   type: "danger",
      // });

      ChatWindowError(data?.message);
    }

    if (data?.success === true) {
      dispatch(toggleBrandBottomSheet({show: -1}));
      ChatWindowError(data?.message);
    }
  }

  const renderBackdrop = useCallback(
    props => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={1}
      />
    ),
    [],
  );

  return (
    <BottomSheetModal
      name="brandBottom"
      ref={bottomSheetRef}
      index={brandBottomSheetVisibility}
      backdropComponent={renderBackdrop}
      snapPoints={snapPoints}
      onChange={handleSheetChanges}
      enablePanDownToClose={true}
      backgroundStyle={{backgroundColor: '#fffef9'}}>
      <View style={styles.contentContainer}>
        <Text
          style={{
            textAlign: 'center',
            color: 'black',
            fontFamily: 'Rubik-Bold',
            fontSize: responsiveWidth(5),
          }}>
          Thew Brand
        </Text>

        <View style={{gap: responsiveWidth(3), marginTop: responsiveWidth(3)}}>
          <View
            style={{
              paddingHorizontal: responsiveWidth(2),
              flexDirection: 'row',
              justifyContent: 'space-between',
              padding: responsiveWidth(1),
            }}>
            <View>
              <Text
                style={{
                  fontFamily: 'Rubik-SemiBold',
                  color: '#282828',
                  marginLeft: responsiveWidth(3),
                  fontSize: responsiveWidth(4.8),
                }}>
                Campaign Title:{' '}
              </Text>
              <Text
                style={{
                  color: 'black',
                  fontFamily: 'Rubik-Regular',
                  fontSize: responsiveWidth(4),
                  marginLeft: responsiveWidth(3),
                }}>
                {sheetData.campaignObjective}
              </Text>
            </View>
          </View>
          <View
            style={{
              paddingHorizontal: responsiveWidth(2),
              flexDirection: 'row',
              justifyContent: 'space-between',
              padding: responsiveWidth(1),
            }}>
            <View>
              <Text
                style={{
                  fontFamily: 'Rubik-SemiBold',
                  color: '#282828',
                  marginLeft: responsiveWidth(3),
                  fontSize: responsiveWidth(4.8),
                }}>
                Description:{' '}
              </Text>
              <Text
                style={{
                  color: 'black',
                  fontFamily: 'Rubik-Regular',
                  fontSize: responsiveWidth(4),
                  marginLeft: responsiveWidth(3),
                }}>
                {sheetData.campaignDescription}
              </Text>
            </View>
          </View>
          <View
            style={{
              paddingHorizontal: responsiveWidth(2),
              flexDirection: 'row',
              justifyContent: 'space-between',
              padding: responsiveWidth(1),
            }}>
            <View>
              <Text
                style={{
                  fontFamily: 'Rubik-SemiBold',
                  color: '#282828',
                  marginLeft: responsiveWidth(3),
                  fontSize: responsiveWidth(4.8),
                }}>
                Deliverables: :{' '}
              </Text>
              <Text
                style={{
                  color: 'black',
                  fontFamily: 'Rubik-Regular',
                  fontSize: responsiveWidth(4),
                  marginLeft: responsiveWidth(3),
                }}>
                {sheetData.rules}
              </Text>
            </View>
          </View>
          <View
            style={[
              styles.loginButton,
              {
                gap: responsiveWidth(2),
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: 'white',
                justifyContent: 'center',
                borderColor: '#FF8A38',
                marginLeft: responsiveWidth(5),
              },
            ]}>
            <Text style={[styles.titleSetPriceTwo, {color: '#FF8A38'}]}>
              Download
            </Text>
            <View style={{flexDirection: 'row'}}>
              <Download />
            </View>
          </View>
        </View>

        <View
          style={{
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginVertical: responsiveWidth(4),
            marginTop: responsiveWidth(46),
          }}>
          <View
            style={[
              styles.loginButtonTwo,
              {
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: 'white',
                borderStyle: 'dashed',
                justifyContent: 'space-between',
              },
            ]}>
            <Text style={styles.titleSetPrice}>Amount</Text>
            <View style={{flexDirection: 'row', gap: responsiveWidth(4)}}>
              <Text
                maxLength={7}
                style={{
                  textAlignVertical: 'center',
                  fontFamily: 'Rubik-SemiBold',
                  color: '#282828',
                }}>
                {sheetData.baseAmount}
              </Text>
              <Paisa />
            </View>
          </View>

          <View style={{position: 'relative', alignSelf: 'center'}}>
            <Text
              style={[
                styles.loginButton,
                {
                  backgroundColor: '#282828',
                  top: responsiveWidth(0.5),
                  left: responsiveWidth(0.5),
                  position: 'absolute',
                  alignSelf: 'center',
                  transform: [{translateX: 2}, {translateY: 2}],
                },
              ]}
            />
            <Pressable
              style={{flexDirection: 'row'}}
              disabled={loading}
              onPress={() => handleRequestBrandCollab(sheetData.id)}>
              <View
                style={[
                  styles.loginButton,
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: responsiveWidth(2),
                  },
                ]}>
                <Text
                  style={{
                    color: '#282828',
                    textAlign: 'center',
                    fontFamily: 'Rubik-SemiBold',
                    textAlignVertical: 'center',
                    fontSize: responsiveFontSize(2),
                  }}>
                  Request
                </Text>
                <Req />
              </View>
            </Pressable>
          </View>
        </View>
      </View>
    </BottomSheetModal>
  );
};

export default BrandBottomSheet;

const styles = StyleSheet.create({
  contentContainer: {
    backgroundColor: '#fffef9',
    height: '100%',
    paddingHorizontal: responsiveWidth(4),
    marginTop: responsiveWidth(4),
  },
  headerLeftWrapper: {
    height: responsiveWidth(12),
    justifyContent: 'center',
    // borderWidth : 1,
    flexBasis: '50%',
  },
  headerLeftContentContainer: {
    height: '100%',
    borderColor: 'blue',
    flexDirection: 'row',
    alignItems: 'center',
    gap: responsiveWidth(4),
  },
  profileImageContainer: {
    borderColor: '#282828',
    height: responsiveWidth(9),
    width: responsiveWidth(9),
    borderRadius: responsiveWidth(10),
    overflow: 'hidden',
    borderWidth: 1,
    borderRadius: responsiveWidth(10),
    position: 'relative',
  },

  profileImage: {
    width: '100%',
    resizeMode: 'cover',
    height: '100%',
  },

  userName: {
    fontFamily: 'Lexend-Bold',
    color: '#282828',
    fontSize: responsiveFontSize(1.9),
  },

  status: {
    fontSize: responsiveFontSize(1.6),
    letterSpacing: 0.5,
    color: '#282828',
    fontFamily: 'MabryPro-Regular',
  },

  cardHeaderWrapper: {
    justifyContent: 'space-between',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#282828',
    paddingVertical: responsiveWidth(3),
    paddingHorizontal: responsiveWidth(4),
    borderRadius: responsiveWidth(2),
  },

  likeCommentText: {
    fontFamily: 'MabryPro-Medium',
    marginLeft: responsiveWidth(1),
    color: '#282828',
  },

  eachSortByModalListText: {
    fontSize: responsiveFontSize(2),
    color: '#282828',
    fontFamily: 'MabryPro-Bold',
  },

  eachSortModalList: {
    flexDirection: 'row',
    gap: responsiveWidth(5),
    alignItems: 'center',
    marginVertical: responsiveWidth(3),
  },

  loginButton: {
    borderWidth: 1,
    paddingHorizontal: responsiveWidth(2),
    backgroundColor: '#FFA86B',
    borderRadius: responsiveWidth(3),
    color: '#282828',
    textAlign: 'center',
    fontFamily: 'Rubik-SemiBold',
    elevation: 1,
    marginTop: responsiveWidth(7),
    width: '100%',
    height: responsiveWidth(13),
    width: responsiveWidth(80),
    textAlignVertical: 'center',
    borderTopColor: '#282828',
    borderLeftColor: '#282828',
    fontSize: responsiveFontSize(2),
  },
  loginButtonTwo: {
    borderWidth: responsiveWidth(0.5),
    paddingHorizontal: responsiveWidth(2),
    borderRadius: responsiveWidth(3),
    color: '#282828',
    textAlign: 'center',
    fontFamily: 'Rubik-SemiBold',
    marginTop: responsiveWidth(7),
    width: '100%',
    height: responsiveWidth(13),
    width: responsiveWidth(80),
    textAlignVertical: 'center',
    fontSize: responsiveFontSize(2),
  },

  amountInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: responsiveWidth(1),
    borderColor: '#282828',
    height: responsiveWidth(12),
    borderWidth: 1,
    alignSelf: 'center',
    borderRadius: responsiveWidth(2),
    width: responsiveWidth(45),
    fontFamily: 'MabryPro-Regular',
  },
  titleSetPrice: {
    fontSize: responsiveFontSize(2),
    height: '90%',
    borderRadius: responsiveWidth(2),
    textAlignVertical: 'center',
    marginLeft: responsiveWidth(3),
    flexBasis: '50%',
    fontFamily: 'Rubik-Medium',
    color: '#282828',
  },
  titleSetPriceTwo: {
    fontSize: responsiveFontSize(2),
    height: '90%',
    borderRadius: responsiveWidth(2),
    textAlignVertical: 'center',
    marginLeft: responsiveWidth(3),
    fontFamily: 'Rubik-Medium',
    color: '#282828',
  },
});
