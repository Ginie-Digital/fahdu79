import {StyleSheet, Text, View, TextInput, Image, Pressable, TouchableOpacity, Keyboard, PermissionsAndroid, Linking, AppState, Platform} from 'react-native';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {responsiveFontSize, responsiveWidth} from 'react-native-responsive-dimensions';
import {FONT_SIZES, nTwinsFont, padios, selectionTwin, WIDTH_SIZES} from '../../../DesiginData/Utility';
import DIcon from '../../../DesiginData/DIcons';
import {FlatList, ScrollView, TouchableWithoutFeedback} from 'react-native-gesture-handler';
import {Link, useFocusEffect, useNavigation} from '@react-navigation/native';
import {useCreateLiveStreamMutation, useLazyGetFeeSetupDetailsQuery} from '../../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
import {token as memoizedToken} from '../../../Redux/Slices/NormalSlices/AuthSlice';
import {useSelector} from 'react-redux';
import {ChatWindowError, LoginPageErrors} from '../../Components/ErrorSnacks';
import {autoLogout} from '../../../AutoLogout';
import {request, PERMISSIONS, checkMultiple, openSettings, requestMultiple} from 'react-native-permissions';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import {ConfirmDialog, Dialog} from 'react-native-simple-dialogs';
import Paisa from '../../../Assets/svg/paisa.svg';
import Tick from '../../../Assets/svg/tik.svg';
import Kanta from '../../../Assets/svg/kanta.svg';
import AnimatedButton from '../../Components/AnimatedButton';

const BeforeStream = () => {
  const [userName, setUserName] = useState('');

  const [forSubscribers, setForSubscribers] = useState(false);

  const [title, setTitle] = useState('');

  const [amount, setAmount] = useState('');

  const [rewardArr, setRewardArr] = useState([]);

  const [followersFee, setFollowersFee] = useState();

  const [permissionModal, setPermissionModal] = useState(false);

  const [subscriberFee, setSubscriberFee] = useState();

  const [createLiveStream] = useCreateLiveStreamMutation();

  const [getFeeSetupDetails] = useLazyGetFeeSetupDetailsQuery();

  const navigation = useNavigation();

  const {token, suspended} = useSelector(state => state.auth.user);

  const handleAddReward = type => {
    if (rewardArr?.length < 3) {
      if (title !== '' && amount !== '') {
        setRewardArr([...rewardArr, {title, amount}]);
        setTitle('');
        setAmount('');
      } else {
        LoginPageErrors('Please add amount and goal title');
      }
    } else {
      LoginPageErrors('Max goal 2 allowed');
    }
  };

  const removeAward = index => {
    let tempArr = [...rewardArr];

    delete tempArr[index];

    setRewardArr([...tempArr.filter(Boolean)]);
  };

  const handleStartLiveStream = async () => {
    console.log(rewardArr);

    if (suspended) {
      LoginPageErrors('Your account is suspended');
      return;
    }

    if (rewardArr.length > 0) {
      setTimeout(() => {
        navigation.navigate('livestream', {
          data: {all: !forSubscribers, goals: rewardArr, isStarting: true},
        });
      }, 500);
    } else {
      navigation.navigate('livestream', {
        data: {all: !forSubscribers, goals: rewardArr, isStarting: true},
      });
    }
  };

  useFocusEffect(
    useCallback(() => {
      async function fetchCurrentStreamPrices() {
        const {data, error} = await getFeeSetupDetails({token});

        if (error) {
          if (error?.status === 'FETCH_ERROR') {
            LoginPageErrors('Please check your network');
          }

          if (error?.data?.status_code === 401) {
            autoLogout();
          }
        }

        if (data) {
          setFollowersFee(data?.data?.StreamFee?.followAmount);
          setSubscriberFee(data?.data?.StreamFee?.subsAmount);
        }
      }

      fetchCurrentStreamPrices();
    }, []),
  );

  async function checkPermissionAndroid() {
    let permission = await checkMultiple([PERMISSIONS.ANDROID.CAMERA, PERMISSIONS.ANDROID.RECORD_AUDIO]);

    if (permission['android.permission.CAMERA'] === 'granted' && permission['android.permission.RECORD_AUDIO'] === 'granted') {
      setPermissionModal(false);
    }
  }

  async function checkPermissionIos() {
    let permission = await checkMultiple([PERMISSIONS.IOS.CAMERA, PERMISSIONS.IOS.MICROPHONE]);

    if (permission['ios.permission.CAMERA'] === 'granted' && permission['ios.permission.MICROPHONE'] === 'granted') {
      setPermissionModal(false);
    }
  }

  const isPermissionFetching = useRef(false);

  const handlerAppStateChange = async nextAppState => {
    if (nextAppState === 'active' && !isPermissionFetching.current) {
      console.log('App has come to the foreground!');

      isPermissionFetching.current = true;

      if (Platform.OS === 'android') {
        await checkPermissionAndroid();
      } else {
        await checkPermissionIos();
      }

      isPermissionFetching.current = false;
    }
  };

  useEffect(() => {
    const subscription = AppState.addEventListener('change', handlerAppStateChange);

    return () => {
      subscription.remove();
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS === 'android') {
        console.log('refresh');

        checkMultiple([PERMISSIONS.ANDROID.CAMERA, PERMISSIONS.ANDROID.RECORD_AUDIO]).then(async statuses => {
          console.log('FaceID', statuses[PERMISSIONS.ANDROID.RECORD_AUDIO], statuses[PERMISSIONS.ANDROID.CAMERA]);

          if (statuses[PERMISSIONS.ANDROID.CAMERA] === 'denied' || statuses[PERMISSIONS.ANDROID.RECORD_AUDIO] === 'denied') {
            console.log('FaceID2', statuses[PERMISSIONS.ANDROID.RECORD_AUDIO], statuses[PERMISSIONS.ANDROID.CAMERA]);

            let getPermission = await PermissionsAndroid.requestMultiple([PermissionsAndroid.PERMISSIONS.RECORD_AUDIO, PermissionsAndroid.PERMISSIONS.CAMERA]);

            console.log(getPermission, '+++++++++++++++++++++++++++++++++++++++++++++++++++');

            if (getPermission['android.permission.CAMERA'] === 'never_ask_again' || getPermission['android.permission.RECORD_AUDIO'] === 'never_ask_again') {
              // let openSettings = await openSettings();
              setPermissionModal(true);
            }

            if (getPermission['android.permission.CAMERA'] === 'denied' || getPermission['android.permission.RECORD_AUDIO'] === 'denied') {
              // let openSettings = await openSettings();
              setPermissionModal(true);
            }
          }
        });
      } else {
        console.log('Permission');

        checkMultiple([PERMISSIONS.IOS.CAMERA, PERMISSIONS.IOS.MICROPHONE]).then(async statuses => {
          console.log('FaceID', statuses[PERMISSIONS.IOS.CAMERA], statuses[PERMISSIONS.IOS.MICROPHONE]);

          if (statuses[PERMISSIONS.IOS.MICROPHONE] === 'denied' || statuses[PERMISSIONS.IOS.CAMERA] === 'denied') {
            let getPermission = await requestMultiple([PERMISSIONS.IOS.CAMERA, PERMISSIONS.IOS.MICROPHONE]);

            console.log(getPermission, '+++++++++++++++++++++++++++++++++++++++++++++++++++');

            if (getPermission['ios.permission.CAMERA'] === 'blocked' || getPermission['ios.permission.MICROPHONE'] === 'blocked') {
              // let openSettings = await openSettings();
              setPermissionModal(true);
            }
          } else if (statuses[PERMISSIONS.IOS.MICROPHONE] === 'blocked' || statuses[PERMISSIONS.IOS.CAMERA] === 'blocked') {
            setPermissionModal(true);
          }
        });
      }
    }, []),
  );

  console.log(WIDTH_SIZES[2], ':::::');

  const EachAddedReward = ({item, index}) => {
    return (
      <View style={{alignItems: 'center', justifyContent: 'center'}}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderWidth: WIDTH_SIZES[2],
            borderColor: '#FF7819',
            backgroundColor: '#FFA86B',
            width: '100%',
            borderRadius: WIDTH_SIZES[14],
            paddingHorizontal: responsiveWidth(5),
            paddingVertical: responsiveWidth(2.8),
          }}>
          {/* Item Title */}
          <Text
            style={{
              color: '#1e1e1e',
              fontFamily: 'Rubik-Medium',
              fontSize: FONT_SIZES[16],
              maxWidth: responsiveWidth(50),
            }}
            numberOfLines={1}
            ellipsizeMode="tail">
            {item.title}
          </Text>

          {/* Amount & Currency Icon & Delete Button */}
          <View style={{flexDirection: 'row', alignItems: 'center', gap: responsiveWidth(3)}}>
            <Text
              style={{
                fontFamily: 'Rubik-Medium',
                fontSize: FONT_SIZES[16],
                color: '#1e1e1e',
              }}>
              {item.amount}
            </Text>

            {/* Currency Icon */}
            <View>
              <Paisa />
            </View>

            {/* Delete Button (Cross Icon) */}
            <Pressable onPress={() => removeAward(index)}>
              <MaterialCommunityIcons name="close-circle" size={responsiveWidth(7)} color="#1e1e1e" />
            </Pressable>
          </View>
        </View>
      </View>
    );
  };

  return (
    <ScrollView style={{paddingHorizontal: 24, backgroundColor: '#fff'}} keyboardDismissMode="on-drag">
      <View style={styles.container}>
        <Text style={{fontFamily: 'Rubik-SemiBold', fontSize: responsiveFontSize(2), color: '#1E1E1E', marginTop: responsiveWidth(2)}}>Livestream Fee</Text>

        {/* <View style={styles.liveStreamCharges}> */}
        {/* <Pressable style={styles.liveStreamChargesHead} onPress={() => navigation.navigate('mrFeeSetup', {from: 'livestream'})}>
            <Text style={styles.headingLive}>Your livestream charges</Text>
            <DIcon provider={'Feather'} name={'edit'} />
          </Pressable> */}

        {/* <View style={[styles.liveStreamChargeButtons]}>
            <View
              style={[
                styles.propertyTitle,
                {
                  justifyContent: 'space-between',
                  marginTop: responsiveWidth(3),
                },
              ]}>
              <View style={[styles.insideFee, {borderTopLeftRadius: responsiveWidth(3.5), borderBottomLeftRadius: responsiveWidth(3.5)}]}>
                <Text
                  style={[
                    styles.titleSetPrice,
                    {
                      fontFamily: 'Rubik-Medium',
                      color: '#1e1e1e',
                      fontSize: responsiveWidth(3.6),
                    },
                  ]}>
                  Followers
                </Text>
              </View>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: responsiveWidth(3),
                  marginRight: responsiveWidth(2),
                }}>
                <Text style={styles.inputNum}>{followersFee}</Text>
                <Paisa />
              </View>
            </View>
            <Text style={[styles.inputNum, {fontFamily: 'Rubik-Regular', fontSize: responsiveWidth(2.5), alignSelf: 'flex-end', right: responsiveWidth(3)}]}>*Live/Minute</Text>

            <View
              style={[
                styles.propertyTitle,
                {
                  justifyContent: 'space-between',
                },
              ]}>
              <View style={[styles.insideFee, {backgroundColor: '#C5FED2', borderTopLeftRadius: responsiveWidth(3.5), borderBottomLeftRadius: responsiveWidth(3.5)}]}>
                <Text
                  style={[
                    styles.titleSetPrice,
                    {
                      fontFamily: 'Rubik-Medium',
                      color: '#1e1e1e',
                      fontSize: responsiveWidth(3.6),
                    },
                  ]}>
                  Subscribers
                </Text>
              </View>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: responsiveWidth(3),

                  marginRight: responsiveWidth(2),
                }}>
                <Text style={styles.inputNum}> {subscriberFee}</Text>
                <Paisa />
              </View>
            </View>
            <Text style={[styles.inputNum, {fontFamily: 'Rubik-Regular', fontSize: responsiveWidth(2.5), alignSelf: 'flex-end', right: responsiveWidth(3)}]}>*Live/Minute</Text>
          </View> */}

        {/* <View style={[styles.amountInput, {alignSelf: 'center', width: '100%', backgroundColor: 'white'}]}>
            <View style={{flexDirection: 'row'}}>
              <View style={[styles.titleback, {backgroundColor: '#C5FFD2'}]}>
                <Text style={[styles.titleSetPrice]}>Subscribers</Text>
              </View>
            </View>
            <View style={{flexDirection: 'row', alignItems: 'center', marginRight: responsiveWidth(2), gap: Platform.OS == 'ios' ? responsiveWidth(2) : null}}>
              <TextInput
                selectionHandleColor={'#ffa86b'}
                selectionColor={selectionTwin()}
                cursorColor={'#1e1e1e'}
                maxLength={6}
                keyboardType="number-pad"
                style={[{padding: 0, color: '#1e1e1e', fontFamily: 'Rubik-Medium'}, styles.amountStyle]}
                value={String(subscriberFee)}
                // onChangeText={t => setDiscountSix(t)}
              />
              <Paisa />
            </View>
          </View> */}

        <View style={styles.containerSub}>
          <Text style={styles.text}>Followers Fee</Text>
          <View style={styles.rightSection}>
            <Text style={styles.amount}>{followersFee}</Text>
            <Paisa />
          </View>
        </View>

        <Text style={styles.liveMinute}>*Live/Minute</Text>

        {/* <View style={[styles.amountInput, {alignSelf: 'center', width: '100%', backgroundColor: 'white'}]}>
            <View style={{flexDirection: 'row'}}>
              <View style={[styles.titleback, {backgroundColor: '#FF8080'}]}>
                <Text style={[styles.titleSetPrice]}>Followers {'    '}</Text>
              </View>
            </View>
            <View style={{flexDirection: 'row', alignItems: 'center', marginRight: responsiveWidth(2), gap: Platform.OS == 'ios' ? responsiveWidth(2) : null}}>
              <TextInput
                selectionHandleColor={'#ffa86b'}
                selectionColor={selectionTwin()}
                cursorColor={'#1e1e1e'}
                maxLength={6}
                keyboardType="number-pad"
                style={[{padding: 0, color: '#1e1e1e', fontFamily: 'Rubik-Medium'}, styles.amountStyle]}
                value={String(followersFee)}
                // onChangeText={t => setDiscountSix(t)}
              />
              <Paisa />
            </View>
          </View>
          <Text style={styles.liveMinute}>*Live/Minute</Text> */}

        <View style={styles.containerSub}>
          <Text style={styles.text}>Subscriber Fee</Text>
          <View style={styles.rightSection}>
            <Text style={styles.amount}>{subscriberFee}</Text>
            <Paisa />
          </View>
        </View>

        <Text style={styles.liveMinute}>*Live/Minute</Text>

        <View style={{marginTop: responsiveWidth(8.53)}}>
          <Text style={[styles.heading, {fontSize: responsiveFontSize(2.4), marginTop: responsiveWidth(2)}]}>Get Tip For Goals</Text>
          <Text style={[styles.description]}>You can add your goals to your livestream, so that the audience can give you tips for your goal.</Text>
        </View>

        <View style={styles.rewardContainer}>
          <FlatList data={rewardArr} renderItem={EachAddedReward} scrollEnabled={false} ItemSeparatorComponent={() => <View style={{height: WIDTH_SIZES[16]}} />} />
        </View>
        <View style={[styles.propertyTitleTwo, {backgroundColor: 'white'}]}>
          {/* <Text style={styles.titleSetPrice}>Reward</Text> */}
          <TextInput selectionColor={selectionTwin()} selectionHandleColor={'#ffa86b'} cursorColor={'#1e1e1e'} placeholderTextColor={'#B2B2B2'} placeholder="Enter your goal for your audience..." value={title} style={[styles.inputStyle]} onChangeText={t => setTitle(t)} />
        </View>

        <View
          style={{
            flexDirection: 'column',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
          <View style={[styles.amountInput, {alignSelf: 'center', width: responsiveWidth(88), backgroundColor: 'white'}]}>
            <View style={{flexDirection: 'row'}}>
              <View style={[styles.titleback, {backgroundColor: '#FFE1CC'}]}>
                <Text style={[styles.titleSetPrice]}>Amount</Text>
              </View>
            </View>
            <View style={{flexDirection: 'row', alignItems: 'center', marginRight: responsiveWidth(2), gap: Platform.OS == 'ios' ? responsiveWidth(2) : null}}>
              <TextInput
                selectionHandleColor={'#ffa86b'}
                selectionColor={selectionTwin()}
                cursorColor={'#1e1e1e'}
                maxLength={6}
                keyboardType="number-pad"
                style={[{padding: 0, color: '#1e1e1e', fontFamily: 'Rubik-Medium', width: responsiveWidth(40), height: '100%', textAlign: 'right'}, styles.amountStyle]}
                value={String(amount)}
                onChangeText={t => setAmount(t.replace(/[^0-9]/g, ''))}
              />
              <Paisa />
            </View>
          </View>

          <Text style={{color: '#1e1e1e', fontFamily: 'Rubik-Regular', fontSize: responsiveWidth(3), left: responsiveWidth(9), marginTop: responsiveWidth(1)}}>*That you need for the completion of your goal</Text>

          <Pressable
            onPress={() => handleAddReward()}
            style={({pressed}) => [
              styles.containerSub,
              {
                width: '100%',
                height: responsiveWidth(12.98),
                marginTop: responsiveWidth(4.3),
                justifyContent: 'center',
                borderColor: '#1e1e1e',
                backgroundColor: pressed ? '#FFEDE0' : '#fff', // press effect
              },
            ]}>
            <Text style={styles.text}>{rewardArr?.length > 0 ? '+ Add more goals' : 'Add Goals'}</Text>
          </Pressable>
        </View>

        <View style={styles.note}>
          <Text
            style={{
              fontFamily: 'Rubik-Regular',
              color: '#1e1e1e',
              width: responsiveWidth(83),
              fontSize: responsiveWidth(3.4),
              paddingHorizontal: responsiveWidth(4),
              right: responsiveWidth(2),
            }}>
            <Text style={{fontFamily: 'Rubik-Bold', color: '#1e1e1e'}}>Note: </Text>
            You’ll be able to add more during stream, once any of the above goals are achieved.
          </Text>
        </View>

        <View style={{marginTop: responsiveWidth(8.53)}}>
          <Text style={[styles.heading, {fontSize: responsiveFontSize(2.4), marginTop: responsiveWidth(2)}]}>Select Your Audience</Text>
          <Text style={[styles.description]}>"Choose who you'd like to connect with — your followers, subscribers, or both."</Text>
        </View>

        <View style={{gap: 10, marginTop: responsiveWidth(4.27)}}>
          {/* Followers & Subscribers */}
          <TouchableOpacity
            onPress={() => setForSubscribers(!forSubscribers)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: WIDTH_SIZES[12],
              borderRadius: responsiveWidth(3.73),
              borderWidth: WIDTH_SIZES[2],
              borderColor: !forSubscribers ? '#FFA86B' : '#1e1e1e',
              backgroundColor: !forSubscribers ? '#FFF3EB' : 'transparent',
            }}>
            <MaterialCommunityIcons name={!forSubscribers ? 'checkbox-marked' : 'checkbox-blank-outline'} size={20} color={!forSubscribers ? '#FFA86B' : '#1e1e1e'} />
            <Text style={{marginLeft: WIDTH_SIZES[8], fontSize: FONT_SIZES[16], color: '#1e1e1e', fontFamily: 'Rubik-Medium'}}>Followers & Subscribers</Text>
          </TouchableOpacity>

          {/* Subscribers Only */}
          <TouchableOpacity
            onPress={() => setForSubscribers(!forSubscribers)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: WIDTH_SIZES[12],
              borderRadius: responsiveWidth(3.73),
              borderWidth: WIDTH_SIZES[2],
              borderColor: forSubscribers ? '#FFA86B' : '#1e1e1e',
              backgroundColor: forSubscribers ? '#FFF3EB' : 'transparent',
            }}>
            <MaterialCommunityIcons name={forSubscribers ? 'checkbox-marked' : 'checkbox-blank-outline'} size={20} color={forSubscribers ? '#FFA86B' : '#1e1e1e'} />
            <Text style={{marginLeft: WIDTH_SIZES[9], fontSize: FONT_SIZES[16], color: '#1e1e1e', fontFamily: 'Rubik-Medium'}}>Subscribers Only</Text>
          </TouchableOpacity>
        </View>

        <AnimatedButton title={'Go Live'} buttonMargin={WIDTH_SIZES[10]} onPress={handleStartLiveStream} />

        <View style={{marginBottom: WIDTH_SIZES[32]}} />

        <Dialog visible={permissionModal} dialogStyle={{borderRadius: responsiveWidth(1)}} onTouchOutside={() => console.log('fuck')}>
          <View style={{borderRadius: responsiveWidth(2)}}>
            <Text
              style={[
                styles.text,
                {
                  fontSize: responsiveFontSize(2),
                  alignSelf: 'center',
                  textAlign: 'center',
                },
              ]}>
              Please allow
              <Text style={{fontFamily: 'Rubik-Bold'}}> camera</Text> and <Text style={{fontFamily: 'MabryPro-Bold'}}>microphone</Text> permissions to livestream
            </Text>

            <TouchableOpacity
              onPress={() => {
                Linking.openSettings();
              }}>
              <Text
                style={[
                  styles.text,
                  {
                    fontFamily: 'MabryPro-Bold',
                    alignSelf: 'center',
                    marginTop: responsiveWidth(8),
                    fontSize: responsiveFontSize(2),
                    color: '#ffa07a',
                  },
                ]}>
                Open settings
              </Text>
            </TouchableOpacity>
          </View>
        </Dialog>
      </View>
    </ScrollView>
  );
};

export default BeforeStream;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopColor: '#1e1e1e',
  },
  liveStreamCharges: {
    // backgroundColor: 'red',
    marginTop: 16,
  },
  headingLive: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: responsiveWidth(4.6),
    color: '#1e1e1e',
    marginTop: responsiveWidth(3),
    left: responsiveWidth(3.5),
  },

  propertyTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    // borderLeftWidth: 1,
    padding: responsiveWidth(1),
    borderColor: '#1e1e1e',
    height: responsiveWidth(14),
    borderWidth: 1.5,
    alignSelf: 'center',
    marginTop: responsiveWidth(4),

    borderRadius: responsiveWidth(4),
    width: responsiveWidth(75),
    fontFamily: 'MabryPro-Regular',
  },
  propertyTitleTwo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    // borderLeftWidth: 1,
    padding: responsiveWidth(1),
    borderColor: '#1e1e1e',
    height: responsiveWidth(14),
    borderWidth: 1.5,
    alignSelf: 'center',
    marginVertical: responsiveWidth(4.27),
    borderRadius: responsiveWidth(3.7),
    width: responsiveWidth(88),
    fontFamily: 'MabryPro-Regular',
  },

  property: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    // borderLeftWidth: 1,
    padding: responsiveWidth(1),
    borderColor: '#1e1e1e',
    height: responsiveWidth(14),
    // borderWidth: 1.5,
    // alignSelf: "center",
    // marginTop: responsiveWidth(4),
    borderRadius: responsiveWidth(4),
    width: responsiveWidth(75),
    fontFamily: 'Rubik-Regular',
  },
  propAddmore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    // borderLeftWidth: 1,
    padding: responsiveWidth(1),
    borderColor: '#1e1e1e',
    height: responsiveWidth(14),
    borderWidth: 1.5,
    alignSelf: 'center',
    // marginTop: responsiveWidth(4),

    borderRadius: responsiveWidth(4),
    width: responsiveWidth(75),
    fontFamily: 'MabryPro-Regular',
  },
  titleSetPrice: {
    flexDirection: 'row',
    justifyContent: 'center',
    fontSize: nTwinsFont(1.6, 1.7),

    height: '118%',
    overflow: 'hidden',
    // borderRadius: responsiveWidth(2),
    right: 4,
    textAlign: 'center',
    textAlignVertical: 'center',
    paddingHorizontal: responsiveWidth(4),
    fontFamily: 'Rubik-Medium',
    alignItems: 'center',
    lineHeight: Platform.OS === 'ios' ? 50 : 25, //ios
  },

  inputStyle: {
    fontFamily: 'Rubik-Medium',
    paddingHorizontal: 20,
    fontSize: responsiveFontSize(1.8),
    color: '#1e1e1e',
    height: '100%',
  },
  inputS: {
    // flex: 1,
    padding: 0,
    paddingLeft: 2,
    fontFamily: 'Rubik-Medium',
    left: responsiveWidth(15),
    fontSize: responsiveFontSize(2),
    color: '#1e1e1e',
    height: '100%',
  },

  heading: {
    fontFamily: 'Rubik-SemiBold',
    color: '#1e1e1e',
    fontSize: responsiveFontSize(2),
    textAlign: 'left',
  },

  description: {
    fontFamily: 'Rubik-Regular',
    fontSize: responsiveFontSize(1.5),
    color: '#1e1e1e',
    textAlign: 'left',
    top: responsiveWidth(1.1),
    width: responsiveWidth(85),
    lineHeight: responsiveWidth(4.2),
  },
  FollowersSubScribersToggle: {
    alignSelf: 'center',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: responsiveWidth(2),
    // backgroundColor: "#f3f3f3",
    height: responsiveWidth(16),
    borderColor: '#1e1e1e',
    width: '90%',
    // height: 10,
    gap: responsiveWidth(4),
    marginTop: responsiveWidth(9),
  },
  Followers: {
    borderWidth: 1.5,
    // flexBasis: "50%",
    height: responsiveWidth(14),
    zIndex: 999,
    width: responsiveWidth(88),
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: responsiveWidth(4),
    backgroundColor: '#D0BEF3',
  },
  SubScribers: {
    borderWidth: 1.5,
    // flexBasis: "50%",
    height: responsiveWidth(14),
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: responsiveWidth(4),
    width: responsiveWidth(88),
    fontFamily: 'Rubik-Medium',
    backgroundColor: '#BBDBFE',
    zIndex: 999,
    // marginBottom: responsiveWidth()
  },

  liveStreamChargesHead: {
    width: '100%',
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  liveStreamChargeButtons: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rewardContainer: {
    maxHeight: responsiveWidth(70),
    // borderWidth: 1,
    marginTop: WIDTH_SIZES[16],
  },
  loginButton: {
    paddingHorizontal: responsiveWidth(2),
    backgroundColor: '#ffa07a',
    borderRadius: responsiveWidth(4),
    color: '#1e1e1e',
    textAlign: 'center',
    fontFamily: 'MabryPro-Bold',
    elevation: 1,
    fontWeight: '600',
    width: responsiveWidth(88),
    height: responsiveWidth(14),
    textAlignVertical: 'center',
    alignSelf: 'center',
    borderTopColor: '#1e1e1e',
    borderLeftColor: '#1e1e1e',
    elevation: 1,
    fontSize: responsiveFontSize(2.4),
    padding: padios(responsiveWidth(2.6)),
    overflow: 'hidden',
    marginTop: responsiveWidth(10),
    borderColor: '#1e1e1e',
    borderWidth: responsiveWidth(0.4),
  },
  text: {
    fontFamily: 'Rubik-Regular',
    color: '#1e1e1e',
    fontSize: nTwinsFont(1.5, 1.4),
  },
  note: {
    width: '100%',
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: responsiveWidth(4),
    padding: responsiveWidth(4),
    backgroundColor: '#FFF3EB',
    marginTop: responsiveWidth(4.3),
    borderColor: '#FF7819',
  },
  insideFee: {
    backgroundColor: '#FF8580',
    // borderBottomLeftRadius: responsiveWidth(3.6),
    // borderTopLeftRadius: responsiveWidth(3.7),
    // borderBottomLeftRadius: responsiveWidth(3.6),
    right: responsiveWidth(1),
    borderRightWidth: responsiveWidth(0.3),
    width: responsiveWidth(32),
  },
  inputNum: {
    color: '#1e1e1e',
    fontFamily: 'Rubik-Medium',
    fontSize: responsiveWidth(3.7),
  },

  //New

  amountStyle: {
    fontFamily: 'MabryPro-Bold',
    color: '#282828',
    marginRight: responsiveWidth(1),
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
    fontFamily: 'MabryPro-Regular',
    overflow: 'hidden',
    backgroundColor: 'red',
  },

  titleback: {
    backgroundColor: '#FF8080', // Just for visibility
    paddingHorizontal: 30,
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%', // Ensures full height
    alignSelf: 'stretch', // Makes it stretch fully,
    borderRightWidth: 2,
  },
  titleSetPrice: {
    fontSize: responsiveFontSize(1.8),
    fontFamily: 'Rubik-Medium',
    color: '#1e1e1e',
  },
  liveMinute: {
    fontFamily: 'Rubik-Regular',
    fontSize: responsiveFontSize(1.3),
    alignSelf: 'flex-end',
    marginTop: responsiveWidth(1.1),
  },

  //new

  containerSub: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#FF7819',
    borderRadius: responsiveWidth(3.7),
    borderStyle: 'dashed',
    backgroundColor: '#FFF9F5',
    marginTop: 16,
  },
  text: {
    fontSize: responsiveFontSize(1.8),
    fontFamily: 'Rubik-Medium',
    color: '#1e1e1e',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  amount: {
    fontSize: responsiveFontSize(1.8),
    fontFamily: 'Rubik-Medium',
    color: '#1e1e1e',
    marginRight: 6,
  },
});
