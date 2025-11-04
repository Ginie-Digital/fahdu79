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
import BottomSheet from '@gorhom/bottom-sheet';

import {ScrollView} from 'react-native-gesture-handler';

import {useDispatch, useSelector} from 'react-redux';

import {token as memoizedToken} from '../../../Redux/Slices/NormalSlices/AuthSlice';
import {useRequestBrandCollabMutation} from '../../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
import {CommonSuccess, LoginPageErrors} from '../ErrorSnacks';
import {toggleDetailedBrandBottomSheet} from '../../../Redux/Slices/NormalSlices/HideShowSlice';

const DetailedBrandBottomSheet = ({sheetData}) => {
  const bottomSheetRef = useRef(null);

  const dispatch = useDispatch();

  const detailedBrandBottomSheetVisibility = useSelector(
    state => state.hideShow.visibility.detailedBrandBottomSheet,
  );

  console.log(detailedBrandBottomSheetVisibility);

  const token = useSelector(state => state.auth.user.token);

  const [requestBrandCollab] = useRequestBrandCollabMutation();

  const [loading, setLoading] = useState(false);

  const snapPoints = useMemo(() => ['80%', '90%', '95%'], []);

  const handleSheetChanges = useCallback(index => {
    if (index === -1) {
      dispatch(toggleDetailedBrandBottomSheet({show: -1}));
    }
  }, []);

  const onBackPress = () => {
    if (bottomSheetRef !== null) {
      bottomSheetRef.current?.close();
      return true;
    }
  };

  useEffect(() => {
    if (detailedBrandBottomSheetVisibility === -1) {
      bottomSheetRef.current.close();
      console.log('Closing');
    } else {
      const backHandler = BackHandler.addEventListener(
        'hardwareBackPress',
        onBackPress,
      );

      return () => backHandler.remove(); // Use .remove() instead
    }
  }, [detailedBrandBottomSheetVisibility]);

  useEffect(() => {
    dispatch(toggleDetailedBrandBottomSheet({show: -1}));
  }, []);

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={detailedBrandBottomSheetVisibility}
      snapPoints={snapPoints}
      onChange={handleSheetChanges}
      enablePanDownToClose={true}
      backgroundStyle={{backgroundColor: '#fffef9'}}>
      <View style={styles.contentContainer}>
        <Text
          style={{
            textAlign: 'center',
            color: '#FFA07A',
            fontFamily: 'MabryPro-Bold',
            fontSize: responsiveWidth(4.5),
          }}>
          {sheetData.title}
        </Text>

        <Image
          source={
            sheetData?.image?.url
              ? {uri: sheetData?.image?.url}
              : require('../../../Assets/Images/DefaultPost.jpg')
          }
          style={{
            height: responsiveWidth(40),
            width: responsiveWidth(60),
            resizeMode: 'contain',
            alignSelf: 'center',
            borderRadius: responsiveWidth(2),
            marginTop: responsiveWidth(2),
          }}
        />

        <View style={{height: '60%'}}>
          <ScrollView
            style={{
              flex: 1,
              paddingBottom: 320,
              marginTop: responsiveWidth(4),
              height: 30,
            }}>
            <View
              style={{
                borderWidth: 1,
                borderRadius: responsiveWidth(2),
                marginVertical: responsiveWidth(2),
              }}>
              <Text
                style={{
                  fontFamily: 'MabryPro-Regular',
                  padding: responsiveWidth(2),
                  textAlign: 'center',
                  borderBottomWidth: 1,
                  fontFamily: 'MabryPro-Bold',
                  fontSize: responsiveWidth(4),
                  color: '#282828',
                }}>
                Description
              </Text>

              <Text
                style={{
                  padding: responsiveWidth(2),
                  fontFamily: 'Lexend-Regular',
                  color: '#282828',
                  fontSize: responsiveWidth(3),
                }}>
                {sheetData.overview}
              </Text>
            </View>

            <View
              style={{
                borderWidth: 1,
                borderRadius: responsiveWidth(2),
                marginVertical: responsiveWidth(2),
              }}>
              <Text
                style={{
                  fontFamily: 'MabryPro-Regular',
                  padding: responsiveWidth(2),
                  textAlign: 'center',
                  borderBottomWidth: 1,
                  fontFamily: 'MabryPro-Bold',
                  fontSize: responsiveWidth(4),
                  color: '#282828',
                }}>
                Task
              </Text>

              <Text
                style={{
                  padding: responsiveWidth(2),
                  fontFamily: 'Lexend-Regular',
                  color: '#282828',
                  fontSize: responsiveWidth(3),
                }}>
                {sheetData.task}
              </Text>
            </View>

            <View
              style={{
                borderWidth: 1,
                borderRadius: responsiveWidth(2),
                marginVertical: responsiveWidth(2),
              }}>
              <Text
                style={{
                  fontFamily: 'MabryPro-Regular',
                  padding: responsiveWidth(2),
                  textAlign: 'center',
                  borderBottomWidth: 1,
                  fontFamily: 'MabryPro-Bold',
                  fontSize: responsiveWidth(4),
                  color: '#282828',
                }}>
                Rules
              </Text>

              <Text
                style={{
                  padding: responsiveWidth(2),
                  fontFamily: 'Lexend-Regular',
                  color: '#282828',
                  fontSize: responsiveWidth(3),
                }}>
                {sheetData.rules}
              </Text>
            </View>

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'flex-end',
                marginTop: responsiveWidth(4),
              }}>
              <View style={styles.amountInput}>
                <Text style={styles.titleSetPrice}>Amount</Text>
                <View style={{flexDirection: 'row', gap: 2}}>
                  <Text
                    maxLength={7}
                    style={{
                      padding: 0,
                      paddingLeft: 2,
                      fontFamily: 'MabryPro-Regular',
                      color: '#282828',
                      marginRight: responsiveWidth(1),
                    }}>
                    {sheetData.budget}
                  </Text>
                  <Image
                    source={require('../../../Assets/Images/Coin.png')}
                    style={{
                      height: responsiveWidth(5),
                      width: responsiveWidth(5),
                      resizeMode: 'contain',
                      alignSelf: 'center',
                      marginRight: responsiveWidth(1),
                    }}
                  />
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </BottomSheet>
  );
};

export default DetailedBrandBottomSheet;

const styles = StyleSheet.create({
  contentContainer: {
    backgroundColor: '#fffef9',
    height: '100%',
    paddingHorizontal: responsiveWidth(4),
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
    backgroundColor: '#ffa07a',
    borderRadius: responsiveWidth(2),
    color: '#282828',
    textAlign: 'center',
    fontFamily: 'Lexend-Medium',
    elevation: 1,
    width: '100%',
    height: responsiveWidth(10),
    textAlignVertical: 'center',
    borderTopColor: '#282828',
    borderLeftColor: '#282828',
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
    backgroundColor: '#e3dff2',
    height: '90%',
    borderRadius: responsiveWidth(2),
    textAlign: 'center',
    textAlignVertical: 'center',
    flexBasis: '50%',
    fontFamily: 'MabryPro-Bold',
    color: '#282828',
  },
});
