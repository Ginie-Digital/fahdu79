import { Image, PermissionsAndroid, Platform, Pressable, StyleSheet, Text, View, findNodeHandle, TouchableOpacity, KeyboardAvoidingView, Keyboard, Alert, BackHandler, Animated } from 'react-native';
import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import ZegoExpressEngine, { ZegoRoomConfig, ZegoScenario, ZegoTextureView, ZegoViewMode } from 'zego-express-engine-reactnative';
import DIcon from '../../../DesiginData/DIcons';
import { responsiveFontSize, responsiveWidth } from 'react-native-responsive-dimensions';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { FONT_SIZES, formatIndianNumber, nTwins, nTwinsFont, WIDTH_SIZES } from '../../../DesiginData/Utility';
import { FlatList, ScrollView, TextInput, TouchableWithoutFeedback } from 'react-native-gesture-handler';
import AddGoalsSheet from './AddGoalsSheet';
import { useDispatch, useSelector } from 'react-redux';
import Loader from '../../Components/Loader';
import { useKeepAwake } from '@sayem314/react-native-keep-awake';

import {
  useCreateLiveStreamMutation,
  useLazyCreditDebitQuery,
  useEndLiveStreamMutation,
  useLazyGetStreamTokenToJoinQuery,
  useLazyUserRenewTokenQuery,
  useLeaveLiveStreamMutation,
  useMuteLiveStreamMutation,
  useReJoinMutation,
  useSendMessageLiveStreamMutation,
} from '../../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
import { token as memoizedToken } from '../../../Redux/Slices/NormalSlices/AuthSlice';
import axios from 'axios';
import { toggleAddGoals, toggleLiveStreamTipModal, toggleSendPostTipModal, toggleShowRechargeModal } from '../../../Redux/Slices/NormalSlices/HideShowSlice';
import LiveStreamTip from './LiveStreamTip';
import { navigate, navigationRef } from '../../../Navigation/RootNavigation';
import LiveStreamTextInput from './LiveStreamTextInput';
import GoalsComponent from './GoalsComponent';
import { addGoalsBeforeStream, pushGoals, resetStreamStates, setSocketConnect, setToAnimate } from '../../../Redux/Slices/NormalSlices/LiveStream/LiveChats';
import Timer from './Timer';
import { ConfirmDialog, Dialog } from 'react-native-simple-dialogs';
import { updateWallet } from '../../../Redux/Slices/NormalSlices/Wallet/WalletSlice';
import LottieView from 'lottie-react-native';
import { autoLogout } from '../../../AutoLogout';
import { LoginPageErrors } from '../../Components/ErrorSnacks';
import w from '../../../Engine';
import Svgcam from '../../../Assets/svg/cam.svg';
import Mike from '../../../Assets/svg/mik.svg';
import Mute from '../../../Assets/svg/mute.svg';
import Cross from '../../../Assets/svg/cross.svg';
import Drop from '../../../Assets/svg/arrow.svg';
import Ddown from '../../../Assets/svg/drop.svg';
import Comm from '../../../Assets/svg/comment.svg';
import Add from '../../../Assets/svg/Add.svg';
import Dropd from '../../../Assets/svg/ddup.svg';
import Speak from '../../../Assets/svg/speaker.svg';
import Vol from '../../../Assets/svg/volume.svg';
import Wall from '../../../Assets/svg/wall.svg';
import Verify from '../../../Assets/svg/vvv.svg';
import Share from '../../../Assets/svg/shh.svg';
import Pay from '../../../Assets/svg/pay.svg';
import Down from '../../../Assets/svg/carterup.svg';
import { BlurView } from 'expo-blur';
import ViewContainer from './ViewContainer';
import LiveStreamComment from './LiveStreamComment';
import StreamEndModl from './StreamEndModl';
import MaskedView from '@react-native-masked-view/masked-view';
import StreamEndedUserModal from './StreamEndedUserModal';
import HideCommentsButton from './HideCommentsButton';
import AnimatedButton from '../../Components/AnimatedButton';
import MuteComponent from './MuteComponent';
import LowBalanceModal from '../../Components/LowBalanceModal';
import socketServices from '../../../SocketServices';
import { AppLog } from '../../../Src/Utils/Logger';

// let isCameraFront = true;

let tokenTimeOut;

const LiveStream = ({ route }) => {
  const previewViewRef = useRef(null);

  const lottieRef = useRef(null);

  useKeepAwake();

  console.log(`${Platform.OS} IS STARTING ${route.params?.data?.isStarting}`);

  const [loading, setLoading] = useState(true);

  const [isCommentsHidden, setIsCommentsHidden] = useState(false);

  const [toggle, setToggle] = useState(false);

  const [show, setShow] = useState(false);

  const [streamDetails, setStreamDetails] = useState({});

  const [modalVisible, setModalVisible] = useState(false);

  const [isCameraFront, setIsCameraFront] = useState(true);

  const [isAnimating, setIsAnimating] = useState(false);

  const [showRechargeModal, setShowRechargeModal] = useState(false);

  const [borderAnimation] = useState(new Animated.Value(0));

  const [didMount, setDidMount] = useState(false);

  const [liveStreamEndModal, setLiveStreamEndModal] = useState(false);

  const [isInMute, setIsInMute] = useState(false);

  const [isSpeakerInMute, setIsSpeakerInMute] = useState(false);

  const [drop, setDrop] = useState(false);

  const [leaveLiveStream] = useLeaveLiveStreamMutation();

  const [endLiveStream] = useEndLiveStreamMutation();

  const [reJoin] = useReJoinMutation();

  const { chats: falshChats, viewers, toAnimate, socketConnect } = useSelector(state => state.livechats.data);

  const [muteLiveStream] = useMuteLiveStreamMutation();

  const [lottieFileUrl, setLottieFileUrl] = useState(require('../../../Assets/Animation/Animation2.json'));

  const handlePlayAnotherAnimation = () => {
    setLottieFileUrl(require('../../../Assets/Animation/Animation3.json'));

    lottieRef.current.play();
  };

  const muteLiveStreamBroadCast = async mute => {
    const { data, error } = await muteLiveStream({
      token,
      data: {
        roomId: streamDetails?.roomId,
        mute,
      },
    });

    if (data) {
      console.log(data, '::::::::::++++::::::::}}}}}}:::::::{{{{{{');
    }

    if (error) {
      console.log(error, ':::::');
    }
  };

  const toggleDrop = () => {
    setToggle(previousState => !previousState);
    setDrop(previousState => !previousState);
  };
  const toggleMike = () => {
    setShow(previousState => !previousState);
  };

  const reJoinOnDisconnect = async () => {
    const { error, data } = await reJoin({ token, data: { roomId: route?.params?.data?.isStarting ? streamDetails?.roomId : route?.params?.data?.roomId } });
    if (data) {
      return true;
    }

    if (error) {
      console.log('Errorr::::::::::::::RE_JOIN________:::::::::', error, data);
    }
  };

  useEffect(() => {
    if (socketConnect === true) {
      // Alert.alert("You");

      reJoinOnDisconnect();
      dispatch(setSocketConnect({ socketConnect: false }));
    }

    console.log(didMount, socketConnect, '****');
  }, [socketConnect, didMount]);

  useEffect(() => {
    let timeOut;
    if (lottieFileUrl === require('../../../Assets/Animation/Animation3.json')) {
      timeOut = setTimeout(() => {
        lottieRef.current.pause();
        setIsAnimating(false);
        dispatch(setToAnimate({ toAnimate: false }));
        setLottieFileUrl(require('../../../Assets/Animation/Animation2.json'));
      }, 3000);
    }

    () => clearTimeout(timeOut);
  }, [lottieFileUrl]);

  const dispatch = useDispatch();

  const handleStartStream = async () => {
    // Generate unique streamId
    const publishStreamId = `${streamDetails?.roomId}_${currentUserId}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

    console.log('Generated publishStreamId:', publishStreamId);

    if (route?.params?.data?.isStarting) {
      // no need for await here, startPublishingStream doesn’t return anything meaningful
      ZegoExpressEngine.instance().startPublishingStream(publishStreamId);

      console.log('Publishing started with streamId:', publishStreamId);
    }
  };

  const handleEndStream = async () => {
    if (route?.params?.data?.isStarting) {
      console.log('End Stream');
      let x = await ZegoExpressEngine.instance().stopPublishingStream();
    } else {
      console.log('User side ending...');
    }
  };

  const handleCamera = async () => {
    console.log(isCameraFront);

    if (isCameraFront) {
      await ZegoExpressEngine.instance().useFrontCamera(false);
      setIsCameraFront(false);
    } else {
      await ZegoExpressEngine.instance().useFrontCamera(true);
      setIsCameraFront(true);
    }
  };

  const handleMic = async () => {
    setShow(previousState => !previousState);

    let x = await ZegoExpressEngine.instance().isMicrophoneMuted();

    console.log(x, ':::::::');

    if (!x) {
      await ZegoExpressEngine.instance().muteMicrophone(true);
      muteLiveStreamBroadCast(true);
      setIsInMute(true);
    } else {
      await ZegoExpressEngine.instance().muteMicrophone(false);
      muteLiveStreamBroadCast(false);
      setIsInMute(false);
    }
  };

  const handleSpeaker = async () => {
    let x = await ZegoExpressEngine.instance().isSpeakerMuted();

    if (!x) {
      await ZegoExpressEngine.instance().muteSpeaker(true);
      setIsSpeakerInMute(true);
    } else {
      await ZegoExpressEngine.instance().muteSpeaker(false);
      setIsSpeakerInMute(false);
    }
  };

  const token = useSelector(state => state.auth.user.token);

  const [showCommentArea, setShowCommentArea] = useState(false);

  const { currentUserId, currentUserDisplayName, currentUserProfilePicture } = useSelector(state => state.auth.user);

  const coins = useSelector(state => state.wallet.data.coins);

  const [createLiveStream] = useCreateLiveStreamMutation();

  const [getStreamTokenToJoin] = useLazyGetStreamTokenToJoinQuery();

  const [userRenewToken] = useLazyUserRenewTokenQuery();

  const [creditDebit] = useLazyCreditDebitQuery();

  const handleCreditDebitPerMinute = async (token, roomId) => {
    console.log(':::::::::::::::::::::CREDIT:::::::::DEBIT:::::::::::::::');

    const { data, error } = await creditDebit({ token, roomId });

    if (data) {
      console.log(data, 'datacredit');
      AppLog('STREAM', 'Credit/Debit per minute success', { roomId, balance: data?.data?.balance?.$numberDecimal });
      dispatch(updateWallet({ coins: data?.data?.balance?.$numberDecimal }));
    }

    if (error?.data?.message?.includes('insufficient balance')) {
      ZegoExpressEngine.instance().logoutRoom(route?.params?.data?.roomId);
      dispatch(resetStreamStates());
      dispatch(toggleShowRechargeModal({ show: true }));
    }
  };

  useEffect(() => {
    const isStarting = route.params?.data?.isStarting;
    const roomId = route?.params?.data?.roomId;

    // if starting OR roomId missing, do nothing
    if (isStarting || !roomId) {
      console.log(isStarting, roomId);
      return; // exit effect early
    }

    // Call immediately on mount
    handleCreditDebitPerMinute(token, roomId);

    // Set up interval to call every 60s
    const intervalId = setInterval(() => {
      handleCreditDebitPerMinute(token, roomId);
    }, 60 * 1000);

    // Cleanup on unmount or deps change
    return () => clearInterval(intervalId);
  }, [token, route.params?.data?.isStarting, route?.params?.data?.roomId]);

  const fethStreamDetails = async () => {
    if (route?.params?.data?.isStarting) {
      const { data, error } = await createLiveStream({
        token,
        data: {
          all: route?.params?.data?.all,
          goals: route?.params?.data?.goals,
        },
      });

      if (error?.status === 'FETCH_ERROR') {
        LoginPageErrors('Please check your network');
        navigate('home');
      }

      if (error) {
        console.log(error?.data, '::::::::::ERRROR:::::::', error);

        if (error?.data?.status_code === 401) {
          autoLogout();
        }
      }

      //Since on pre built goals I'm not getting any events hence I've to manually add into array

      console.log(route?.params?.data?.goals, '+++++++++++++');

      dispatch(addGoalsBeforeStream({ preStremGoalsArr: route?.params?.data?.goals }));

      if (data) {
        AppLog('STREAM', 'Livestream created and started by creator', { roomId: data?.data?.roomId });
        setStreamDetails({ token: data?.data?.TOKEN, roomId: data?.data?.roomId });

        // Emit start stream to notify other users
        socketServices.emitStartStream(
          data?.data?.roomId,
          currentUserId,
          currentUserDisplayName
        );

        setLoading(false);
      }
    } else {
      //Jo join karega wo params mein room Id leke aayega idhar keval token fetch karan hai basss

      const { data, error } = await getStreamTokenToJoin({ token, roomId: route?.params?.data?.roomId });

      if (error?.status === 'FETCH_ERROR') {
        LoginPageErrors('Please check your network');
      }

      console.log('eRror 246', error);

      if (error) {
        if (error) {
          console.log(error?.data, '::::::::::ERRROR:::::::', error);

          if (error?.data?.status_code === 401) {
            autoLogout();
          } else {
            LoginPageErrors(error?.data?.message);
            navigate('home');
          }
        }
        console.log(error, ':::::::::::::::::USER_JOIN_ERROR::::::::::::::::');
      }

      if (data) {
        AppLog('STREAM', 'User joined livestream successfully', { roomId: route?.params?.data?.roomId });
        setStreamDetails({ token: data?.data?.TOKEN, roomId: route?.params?.data?.roomId });
        setLoading(false);
        dispatch(addGoalsBeforeStream({ preStremGoalsArr: data?.data?.goals }));
      }
    }
  };
  const handleTerminateLiveStream = async type => {
    if (route?.params?.data?.isStarting) {
      console.log(streamDetails?.roomId);

      const { error, data } = await endLiveStream({ token, data: { roomId: streamDetails?.roomId } });

      if (data?.statusCode === 200) {
        console.log('Closing creator livestream:::::{{{{{{{{{{');

        // Emit end stream to notify other users
        socketServices.emitEndStream(streamDetails?.roomId, currentUserId);

        await ZegoExpressEngine.instance().stopPreview();
        await ZegoExpressEngine.instance().logoutRoom(streamDetails.roomId);
        await ZegoExpressEngine.instance().stopPublishingStream();
        dispatch(resetStreamStates());
        clearTimeout(tokenTimeOut);
        setLoading(false);
        // Reset navigation state: go to home with the report screen on top,
        // so swiping back from report goes to home, not back to livestream
        navigationRef.reset({
          index: 1,
          routes: [
            { name: 'chatRoomTab' },
            { name: 'afterlivestreamend', params: { data: data?.data } },
          ],
        });
      }
    } else {
      const { error, data } = await leaveLiveStream({
        token,
        data: {
          roomId: route?.params?.data?.roomId,
        },
      });

      console.log(error, data, ':::::::::ENDSTREAM ERROR::::::::::');

      if (data?.statusCode === 200) {
        await ZegoExpressEngine.instance().stopPlayingStream();
        await ZegoExpressEngine.instance().logoutRoom(route?.params?.data?.roomId);
        dispatch(resetStreamStates());
        clearTimeout(tokenTimeOut);
        setLoading(false);
        navigate('home');
      }
    }
    AppLog('STREAM', 'Exiting livestream', { roomId: route?.params?.data?.isStarting ? streamDetails?.roomId : route?.params?.data?.roomId, isStarting: route?.params?.data?.isStarting });
  };

  const handleRenewToken = async () => {
    console.log('RENEW 🥳');

    const { data, error } = await userRenewToken({ token, roomId: route?.params?.data?.roomId });

    console.log(error, ':::BALANCE:::::::');

    // if (error?.data.statusCode === 400) {
    //   setShowRechargeModal(true);
    //   return false;
    // }

    if (data?.statusCode === 200) {
      console.log('RENEW_TOKEN_:::::::::::::::::::RENEW_TPPEN:::::::::::::::::', data?.data);

      console.log(data?.data?.TOKEN);

      return data?.data?.TOKEN;
    }
  };

  const fetchCoins = async () => {
    try {
      console.log('Fetching coiun,.....');

      let { data } = await axios.get('https://api.fahdu.in/api/wallet/get-coins', { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, timeout: 10000 });

      dispatch(updateWallet({ coins: data?.data }));
    } catch (e) {
      console.log('Get Coin Error ', e);
    }
  };

  useEffect(() => {
    fetchCoins();
    fethStreamDetails();
  }, []);

  useEffect(() => {
    let x = BackHandler.addEventListener('hardwareBackPress', () => {
      setModalVisible(true);
      return true;
    });

    return () => x.remove();
  }, []);

  const streamEndModalHandleEndStream = () => {
    setModalVisible(false);
    setLoading(true);
    handleTerminateLiveStream();
  };

  const streamHasEndedModalOkay = () => {
    setLiveStreamEndModal(false);
    ZegoExpressEngine.instance().logoutRoom(route?.params?.data?.roomId);
    dispatch(resetStreamStates());
    clearTimeout(tokenTimeOut);
    navigate('home');
    return;
  };

  useEffect(() => {
    console.log('componentDidMount', '::::::::::::::::::::');

    let profile = {
      appID: 1996434501,
      appSign: '5b8d13eb6cc351e379ca6da233a9884a6a109ce87b64bdb22ee9e0245df19c16',
      scenario: ZegoScenario.Broadcast,
    };

    ZegoExpressEngine.createEngineWithProfile(profile).then(engine => {
      engine.on('roomStateUpdate', (roomID, state, errorCode, extendedData) => {
        // Room connection status callback. After a user logs in to a room, when the room connection status changes (for example, the room is disconnected or login authentication fails), the SDK triggers this callback to send a notification.
        console.log(roomID, state, errorCode, extendedData, `roomStateUpdate* ${Platform.OS}`);
        if (errorCode !== 0) {
          AppLog('ZEGO_ERROR', 'Room state update error', { roomID, state, errorCode, extendedData });
        }
      });

      engine.on('roomUserUpdate', (roomID, updateType, userList) => {
        // User status update callback. After a user logs in to a room, when another user joins or leaves the room, the SDK triggers this callback to send a notification.
        console.log(roomID, updateType, userList, `roomUserUpdate** ${Platform.OS}`);
      });

      engine.on('publisherStreamEvent', (streamId, extra) => {
        console.log('PPPPPPPPPPP', streamId, extra);
      });

      engine.on('roomStreamUpdate', (roomID, updateType, streamList) => {
        // Stream status update callback. After a user logs in to a room, when another user in the room publishes or deletes an audio or video stream, the SDK triggers this callback to send a notification.
        console.log(roomID, updateType, streamList, `roomStreamUpdate***** ${Platform.OS}`);

        if (updateType === 1) {
          setLiveStreamEndModal(true);
          if (streamList && streamList.length > 0) {
            engine.stopPlayingStream(streamList[0].streamID);
          }
        }

        engine.on('roomTokenWillExpire', async x => {
          console.log('Token will expire', x, Platform.OS);

          tokenTimeOut = setTimeout(async () => {
            try {
              let token = await handleRenewToken();

              console.log({ token });

              // Check if token is null or undefined before proceeding
              if (!token) {
                console.log('Renew token failed: No token received');
                LoginPageErrors('Renew token failed: No token received');
                return; // Exit the function early
              }

              await engine.renewToken(route?.params?.data?.roomId, token);
              // await fetchCoins();
              console.log('Token renewed successfully');
            } catch (e) {
              console.log('Error in token renewal process:', e);
            }
          }, 2670000);
        });

        engine.on('publisherStateUpdate', (state, errorCode, data) => {
          console.log('Publisher state upate', state, errorCode, data);
        });

        engine.on('debugError', (errorCode, x) => {
          console.log('XXXXXXx', x, errorCode);
        });

        if (streamList?.length > 0) {
          engine.stopPreview().then(() => {
            engine
              .startPlayingStream(streamList[0]?.streamID, {
                reactTag: findNodeHandle(previewViewRef.current),
                viewMode: ZegoViewMode.AspectFill,
                backgroundColor: 0,
              })
              .then(e => console.log('starting playing video', e));
          });
        }
      });

      engine.on('publisherStateUpdate', (streamID, state, errorCode, extendedData) => {
        console.log('Publishing stream', streamID, state, errorCode, extendedData);
      });

      if (Object.keys(streamDetails).length > 0) {
        console.log('Login...');

        let roomConfig = new ZegoRoomConfig();

        roomConfig.isUserStatusNotify = true;

        roomConfig.token = streamDetails?.token;

        engine.loginRoom(
          streamDetails?.roomId,
          {
            userID: currentUserId,
            userName: currentUserDisplayName,
          },
          roomConfig,
        );
        AppLog('STREAM', 'Logging into ZEGO room for stream', { roomId: streamDetails?.roomId });
      }

      if (previewViewRef.current) {
        try {
          if (route?.params?.data?.isStarting) {
            ZegoExpressEngine.instance().startPreview({
              reactTag: findNodeHandle(previewViewRef.current),
              viewMode: ZegoViewMode.AspectFill,
              backgroundColor: 0,
            });
          }
        } catch (error) {
          console.error('Error starting preview:', error);
        }
      }

      engine.getVersion().then(ver => {
        console.log('Express SDK Version: ' + ver);
      });

      handleStartStream();
    });

    return () => {
      console.log('componentWillUnmount');
      if (ZegoExpressEngine.instance()) {
        console.log('[LZP] destroyEngine');
        ZegoExpressEngine.destroyEngine();
        clearTimeout(tokenTimeOut);
      }
    };
  }, [streamDetails]);

  if (loading) {
    return <Loader />;
  }

  console.log('MUTEEEEE', route?.params?.data?.isStarting, isInMute);

  const handleClick = () => {
    console.log('hjello');
    ZegoExpressEngine.instance().logoutRoom(route?.params?.data?.roomId);
    dispatch(toggleShowRechargeModal({ show: false }));
    dispatch(resetStreamStates());
    clearTimeout(tokenTimeOut);
    navigate('chooseWallet');
    return;
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, position: 'relative' }}>
        <View style={styles.contianer}>
          {showCommentArea && <LiveStreamTextInput roomId={route?.params?.data?.isStarting ? streamDetails?.roomId : route?.params?.data?.roomId} setShowCommentArea={setShowCommentArea} />}

          {toAnimate && (
            <>
              <LottieView
                source={lottieFileUrl}
                hardwareAccelerationAndroid
                autoPlay
                imageAssetsFolder=""
                speed={1.5}
                loop={false}
                resizeMode="cover"
                style={{
                  height: '100%',
                  width: '100%',
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  right: 0,
                  bottom: 0,
                  zIndex: 3,
                  // backgroundColor : 'red'
                }}
                ref={lottieRef}
                onAnimationFinish={t => handlePlayAnotherAnimation()}
              />

              <View style={[styles.boxGoal]}>
                <Text style={{ color: '#00000090', fontFamily: 'Rubik-Bold', fontSize: responsiveFontSize(4) }}>Goal Completed</Text>
              </View>
            </>
          )}

          <ZegoTextureView ref={previewViewRef} style={{ flex: 1 }} />

          {!route?.params?.data?.isStarting && <MuteComponent />}

          <LinearGradient colors={['transparent', 'transparent', 'transparent', 'transparent', 'transparent', 'transparent', '#00000040', '#00000040']} style={styles.overLayContainer}>
            <View style={styles.streamControllerContainer}>
              <View style={styles.upperCC}>
                <View style={styles.upperInformation}>
                  <View style={{ width: responsiveWidth(40), flexDirection: 'row' }}>
                    <Pressable style={[styles.profileImageContainer, { position: 'relative' }]}>
                      <Image source={{ uri: route?.params?.data?.isStarting ? currentUserProfilePicture : route?.params?.data?.creatorInfo?.profile_image?.url }} resizeMethod="resize" style={styles.profileImage} />

                      {/* Verification Badge */}
                      <View
                        style={{
                          width: responsiveWidth(4.7),
                          height: responsiveWidth(4.5),
                          position: 'absolute',
                          bottom: responsiveWidth(7.6),
                          right: 0,
                        }}>
                        <Image source={require('../../../Assets/Images/verify.png')} resizeMode="contain" style={{ width: '100%', height: '100%' }} />
                      </View>
                    </Pressable>

                    <View style={{ flexDirection: 'column', marginLeft: responsiveWidth(3.2), marginTop: responsiveWidth(3.4), gap: 3 }}>
                      <View style={styles.headerInformation}>
                        <Text style={styles.userName} numberOfLines={1} ellipsizeMode="tail">
                          {route?.params?.data?.isStarting ? currentUserDisplayName : route?.params?.data?.creatorInfo?.displayName}
                        </Text>
                      </View>

                      <View style={{ flexDirection: 'row', width: responsiveWidth(39), justifyContent: 'space-between' }}>
                        <ViewContainer views={viewers} />
                        <Timer />
                      </View>
                    </View>
                  </View>

                  <View
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      gap: responsiveWidth(1.8),
                      marginTop: responsiveWidth(6),
                    }}>
                    {route?.params?.data?.isStarting ? (
                      <Pressable onPress={() => setModalVisible(true)} style={styles.button}>
                        {({ pressed }) => <Image source={pressed ? require('../../../Assets/Images/greyCross.png') : require('../../../Assets/Images/liveCross.png')} style={styles.crossIcon} resizeMode="contain" />}
                      </Pressable>
                    ) : (
                      <View style={[styles.button, { backgroundColor: '#FFE1CC' }]}>
                        <Pressable style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' }} onPress={() => handleSpeaker()}>
                          {!isSpeakerInMute ? (
                            <Image source={require('../../../Assets/Images/unMutedSpeaker.png')} style={styles.crossIcon} resizeMode="contain" />
                          ) : (
                            <Image source={require('../../../Assets/Images/mutedSpeaker.png')} style={styles.crossIcon} resizeMode="contain" />
                          )}
                        </Pressable>
                      </View>
                    )}

                    {route?.params?.data?.isStarting ? (
                      <Pressable onPress={toggleDrop}>
                        {drop ? (
                          <View style={[styles.button, { backgroundColor: '#FFE1CC' }]}>
                            <Image
                              source={require('../../../Assets/Images/liveUp.png')} // Update with your actual path
                              style={styles.crossIcon}
                              resizeMode="contain"
                            />
                          </View>
                        ) : (
                          <View style={[styles.button, { backgroundColor: '#FFE1CC' }]}>
                            <Image
                              source={require('../../../Assets/Images/liveDown.png')} // Update with your actual path
                              style={styles.crossIcon}
                              resizeMode="contain"
                            />
                          </View>
                        )}
                      </Pressable>
                    ) : (
                      <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.button}>
                        <Image
                          source={require('../../../Assets/Images/liveCross.png')} // Update with your actual path
                          style={styles.crossIcon}
                          resizeMode="contain"
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                  {toggle && (
                    <View style={[styles.verticalCC, { marginLeft: Platform.OS === 'ios' ? responsiveWidth(84) : responsiveWidth(83) }]}>
                      {route?.params?.data?.isStarting && (
                        // <Pressable style={[styles.box, {backgroundColor: 'transparent', height: responsiveWidth(12)}]} onPress={() => handleCamera()}>
                        //   {/* <DIcon provider={"FontAwesome6"} name={"camera-rotate"} size={nTwins(5.5, 5.5)} color={isCameraFront ? "#fff" : "#ffa07a"} /> */}
                        //   <Svgcam />
                        //   {/* <Image source={require("../../../Assets/Images/camlive.png")} style={{ resizeMode: "contain", alignSelf: "center", marginLeft: responsiveWidth(1) }} /> */}
                        // </Pressable>

                        <TouchableOpacity onPress={() => handleCamera()} style={styles.verticalContainer}>
                          <BlurView intensity={30} tint="light" style={styles.blurBackground}>
                            <Image
                              source={require('../../../Assets/Images/swap_camera.png')} // Update path as needed
                              style={styles.iconImage}
                              resizeMode="contain"
                            />
                          </BlurView>
                        </TouchableOpacity>
                      )}

                      {/* <Animated.View style = {[styles.box, {height : 100, width : 100}, { backgroundColor: borderAnimation.interpolate({ inputRange: [0, 1], outputRange: ['white', '#FAF444'] }) }]}>

                    </Animated.View> */}

                      {route?.params?.data?.isStarting ? (
                        <>
                          {/* <Image source={require("../../../Assets/Images/miklive.png")} style={{ resizeMode: "contain", alignSelf: "center", marginLeft: responsiveWidth(1) }} /> */}
                          {!show ? (
                            <Pressable style={styles.verticalContainer} onPress={() => handleMic()}>
                              <BlurView intensity={30} tint="light" style={styles.blurBackground}>
                                <Image
                                  source={require('../../../Assets/Images/liveMicUnmute.png')} // Update path as needed
                                  style={styles.iconImage}
                                  resizeMode="contain"
                                />
                              </BlurView>
                            </Pressable>
                          ) : (
                            <Pressable style={styles.verticalContainer} onPress={() => handleMic()}>
                              <BlurView intensity={30} tint="light" style={styles.blurBackground}>
                                <Image
                                  source={require('../../../Assets/Images/liveMic.png')} // Update path as needed
                                  style={styles.iconImage}
                                  resizeMode="contain"
                                />
                              </BlurView>
                            </Pressable>

                            // <Image source={require("../../../Assets/Images/mutelive.png")} style={{ resizeMode: "contain", alignSelf: "center", marginLeft: responsiveWidth(1) }} />
                          )}
                        </>
                      ) : (
                        <Pressable style={[styles.box, { backgroundColor: 'transparent', height: responsiveWidth(12), marginTop: responsiveWidth(2) }]} onPress={() => handleSpeaker()}>
                          <DIcon provider={'Octicons'} name={!isSpeakerInMute ? 'unmute' : 'mute'} size={nTwins(6, 6)} color={isSpeakerInMute ? '#ffa07a' : '#fff'} />
                        </Pressable>
                      )}
                    </View>
                  )}
                </View>
              </View>
              <View style={[styles.lowerCC]}>
                {!showCommentArea && (
                  <>
                    <View
                      style={{
                        maxHeight: responsiveWidth(50),
                        marginTop: responsiveWidth(6),
                        display: isCommentsHidden ? 'none' : 'flex',
                      }}>
                      <MaskedView
                        style={{ height: '100%' }}
                        maskElement={
                          <LinearGradient
                            style={{ flex: 1 }}
                            colors={['transparent', 'black']}
                            locations={[0, 0.2]}
                          />
                        }
                      >
                        <FlatList
                          data={[...falshChats].reverse()}
                          renderItem={({ item }) => <LiveStreamComment isStarting={route?.params?.data?.isStarting} item={item} currentUserDisplayName={currentUserDisplayName} />}
                          contentContainerStyle={{ gap: WIDTH_SIZES[8], paddingHorizontal: 0 }}
                          showsVerticalScrollIndicator={false}
                          inverted
                        // style={{ alignSelf: 'flex-start'}}
                        />
                      </MaskedView>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                      <View style={{ marginTop: responsiveWidth(4) }}>
                        <HideCommentsButton isHidden={isCommentsHidden} toggleComments={() => setIsCommentsHidden(!isCommentsHidden)} />
                      </View>

                      <View style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', alignSelf: 'flex-end' }}>
                        {/* WALLET — ALWAYS SHOW */}
                        {!route?.params?.data?.isStarting && (
                          <View style={{ marginBottom: responsiveWidth(2) }}>
                            <View
                              style={{
                                gap: responsiveWidth(3),
                                borderWidth: responsiveWidth(0.5),
                                flexDirection: 'row',
                                backgroundColor: 'white',
                                paddingVertical: responsiveWidth(1),
                                paddingHorizontal: responsiveWidth(4),
                                borderRadius: responsiveWidth(5),
                                alignItems: 'center',
                              }}>
                              <Wall />
                              <Text
                                style={[
                                  styles.text,
                                  {
                                    color: '#1e1e1e',
                                    fontSize: FONT_SIZES[14],
                                    fontFamily: 'Rubk-Medium',
                                  },
                                ]}>
                                {formatIndianNumber(coins)}
                              </Text>
                            </View>
                          </View>
                        )}

                        {/* SUBSCRIBE — CONDITIONAL */}
                        {!route?.params?.data?.doUserSubscribed && !route?.params?.data?.isStarting && (
                          <Pressable
                            style={[styles.box, styles.subscribe]}
                            onPress={() => {
                              handleTerminateLiveStream().then(() => {
                                navigate('subscribeCreator', {
                                  name: route?.params?.data?.creatorInfo?.displayName,
                                  profileImageUrl: route?.params?.data?.creatorInfo?.profile_image?.url,
                                  role: 'creator',
                                  id: route?.params?.data?.creatorInfo?._id,
                                });
                              });
                            }}>
                            <Text
                              style={[
                                styles.text,
                                {
                                  color: '#000',
                                  fontFamily: 'Rubik-Medium',
                                  fontSize: responsiveFontSize(1.7),
                                },
                              ]}>
                              Subscribe
                            </Text>
                          </Pressable>
                        )}
                      </View>
                    </View>
                  </>
                )}

                {!showCommentArea && <GoalsComponent isStarting={route?.params?.data?.isStarting} />}

                {!showCommentArea && (
                  <View
                    style={{
                      flexDirection: 'row',
                      backgroundColor: '#fff',
                      borderRadius: WIDTH_SIZES[14],
                      marginTop: responsiveWidth(4),
                      alignSelf: 'center',
                      width: WIDTH_SIZES[345],
                      overflow: 'hidden',
                      borderWidth: WIDTH_SIZES[2],
                    }}>
                    <View
                      style={{
                        backgroundColor: '#fff',
                        width: '100%',
                        height: responsiveWidth(14),
                        flexDirection: 'row',
                        justifyContent: 'flex-start',
                        alignItems: 'center',
                        overflow: 'hidden',
                        paddingHorizontal: WIDTH_SIZES[20],
                        paddingVertical: WIDTH_SIZES[10],
                      }}>
                      {/* Input Container */}
                      <Pressable
                        onPress={() => setShowCommentArea(true)}
                        style={{
                          flex: 1,
                          height: '100%',
                          justifyContent: 'center',
                        }}>
                        <TextInput
                          placeholder="Type Something..."
                          style={{
                            fontFamily: 'Rubik-Regular',
                            fontSize: FONT_SIZES[14],
                            color: '#1e1e1e',
                            textAlignVertical: 'center', // Ensure vertical alignment
                            padding: 0, // Remove default padding
                            margin: 0, // Remove default margin
                            flex: 1, // Ensure it fills the Pressable container
                          }}
                          onFocus={() => console.log('Focus')}
                          pointerEvents="none"
                          showSoftInputOnFocus={false}
                          onTouchStart={() => setShowCommentArea(true)}
                        />
                      </Pressable>
                      <View>
                        {!route?.params?.data?.isStarting ? (
                          <Pressable style={styles.sendCoinBottm} onPress={() => dispatch(toggleLiveStreamTipModal({ info: { show: true, roomId: route?.params?.data?.roomId } }))}>
                            {/* <Ionicons name="wallet-outline" size={responsiveWidth(6)} color="black" /> */}

                            <Image
                              source={require('../../../Assets/Images/Coins2.png')}
                              style={{
                                height: WIDTH_SIZES[18],
                                width: WIDTH_SIZES[18],
                                resizeMode: 'contain',
                                alignSelf: 'center',
                                marginLeft: responsiveWidth(1),
                              }}
                            />
                          </Pressable>
                        ) : (
                          <Pressable style={styles.sendCoinBottm} onPress={() => dispatch(toggleAddGoals({ show: 1 }))}>
                            <Image
                              source={require('../../../Assets/Images/Goals.png')}
                              style={{
                                height: WIDTH_SIZES[18],
                                width: WIDTH_SIZES[18],
                                resizeMode: 'contain',
                                alignSelf: 'center',
                                marginLeft: responsiveWidth(1),
                              }}
                            />
                          </Pressable>
                        )}
                      </View>
                    </View>

                    {/* Right Button (Pay/Add) */}
                  </View>
                )}
              </View>
            </View>
          </LinearGradient>
        </View>
        <AddGoalsSheet />
        <LiveStreamTip roomId={route?.params?.data?.roomId} />
      </SafeAreaView>
      <StreamEndModl visible={modalVisible} onYesPress={streamEndModalHandleEndStream} onNoPress={() => setModalVisible(false)} />
      <StreamEndedUserModal visible={liveStreamEndModal} onPress={streamHasEndedModalOkay} />
      <LowBalanceModal fromLiveStram={true} onPress={handleClick} />
    </SafeAreaProvider>
  );
};

export default LiveStream;

const styles = StyleSheet.create({
  contianer: {
    flex: 1,
    position: 'relative',
  },
  overLayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    display: 'flex',
    opacity: 0.9,
  },
  streamControllerContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },

  upperCC: {
    flex: 4,
    // backgroundColor: "red",
  },

  lowerCC: {
    // flex: 5,
    flexBasis: 'auto',
    // backgroundColor: "blue",
    flexDirection: 'column',
    paddingHorizontal: responsiveWidth(2),
    // alignItems : 'flex-end'
    justifyContent: 'flex-end',
    paddingVertical: responsiveWidth(4),
  },
  upperInformation: {
    height: responsiveWidth(16),
    // backgroundColor: "green",
    // borderWidth: 1,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: responsiveWidth(2),
  },
  profileImageContainer: {
    width: responsiveWidth(12.2),
    height: responsiveWidth(12.2),
    top: responsiveWidth(4),
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',

    // borderWidth: 1,
    // borderRadius: responsiveWidth(10),
  },
  profileImage: {
    resizeMode: 'cover',
    width: '100%',
    height: '100%',
    borderWidth: 1.5,
    borderColor: '#1e1e1e',
    borderRadius: responsiveWidth(50),
    // borderRadius: responsiveWidth(4),
  },
  profile: {
    width: '100%',
    resizeMode: 'cover',
    height: '100%',
    borderRadius: responsiveWidth(25),
  },
  headerInformation: {
    width: responsiveWidth(25),
    justifyContent: 'center',
  },
  userName: {
    fontFamily: 'Rubik-Bold',
    color: '#fff',
    fontSize: responsiveFontSize(2),
    width: responsiveWidth(20),
    // borderWidth : 1,
    lineHeight: responsiveFontSize(2.6),
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  box: {
    // padding: responsiveWidth(1),
    backgroundColor: '#fff',
    // justifyContent: "center",
    alignItems: 'center',
    flexDirection: 'row',

    borderRadius: responsiveWidth(2),
    gap: responsiveWidth(2),
    paddingHorizontal: responsiveWidth(2),
  },

  text: {
    fontFamily: 'Rubik-Regular',
    color: '#282828',
    fontSize: nTwinsFont(1.5, 1.4),
  },

  verticalCC: {
    // borderWidth: 1,
    flexDirection: 'column',
    gap: responsiveWidth(2),
    height: responsiveWidth(25),
    alignSelf: 'flex-start',
    marginRight: responsiveWidth(2),
    padding: responsiveWidth(1),
    justifyContent: 'space-around',
  },

  imageContainer: {
    borderColor: 'purple',
    borderRadius: responsiveWidth(12),
    position: 'relative',
    borderColor: '#282828',
    resizeMode: 'cover',
    height: responsiveWidth(8),
    width: responsiveWidth(8),
    justifyContent: 'center',
  },

  name: {
    fontFamily: 'Rubik-Medium',
    fontSize: responsiveFontSize(1.8),
    color: '#fff',
  },

  commentText: {
    fontFamily: 'Rubik-Regular',
    fontSize: responsiveFontSize(1.6),
    color: '#fff',
    maxWidth: responsiveWidth(50),
  },

  detailContainer: {
    flexDirection: 'column',
    justifyContent: 'center',
  },

  textInputDummy: {
    fontFamily: 'Rubik-Medium',
    backgroundColor: '#fff',
    borderTopLeftRadius: responsiveWidth(2),
    borderBottomLeftRadius: responsiveWidth(2),

    flex: 1,
    paddingVertical: responsiveWidth(1),
    paddingHorizontal: responsiveWidth(2),
  },

  keyboardContainer: {
    width: '100%',
    padding: responsiveWidth(1),
    // backgroundColor: "red",
    height: responsiveWidth(20),
    justifyContent: 'center',
    // alignItems : 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
  },

  sendCoinBottm: {
    // height: responsiveWidth(10),
    // width: responsiveWidth(10),
    justifyContent: 'center',
    alignItems: 'center',
    // backgroundColor: "#FFA86B",
    borderRadius: responsiveWidth(2),
  },

  subscribe: {
    justifyContent: 'center',
    alignSelf: 'flex-start',
    // marginLeft: responsiveWidth(1),
    backgroundColor: '#FFA86B',
    height: responsiveWidth(9),
    borderRadius: responsiveWidth(3),
    borderWidth: responsiveWidth(0.5),
    width: responsiveWidth(28),
  },

  boxGoal: {
    marginTop: '30%',
    position: 'absolute',
    zIndex: 3,
    width: responsiveWidth(70),
    alignSelf: 'center',
    backgroundColor: '#f7f70199',
    borderRadius: responsiveWidth(2),
    justifyContent: 'center',
    alignItems: 'center',
    // borderWidth : 2,
    // borderColor : "#00000099"
  },
  button: {
    width: responsiveWidth(10.7), // Adjust as needed
    height: responsiveWidth(10.7),
    borderRadius: responsiveWidth(2.5), // Rounded corners
    backgroundColor: '#FF9D67', // Orange color
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: responsiveWidth(0.4),
    borderColor: '#1e1e1e', // Black border
  },
  crossIcon: {
    width: responsiveWidth(5), // Adjust size as needed
    height: responsiveWidth(5),
  },

  verticalContainer: {
    width: responsiveWidth(10.7),
    height: responsiveWidth(10.7),
    borderRadius: responsiveWidth(2.5),
    overflow: 'hidden', // Ensures BlurView stays inside rounded corners
    borderWidth: responsiveWidth(0.4),
    borderColor: '#E0E0E0',
    left: 10,
  },
  blurBackground: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: responsiveWidth(2.5),
  },
  iconImage: {
    width: responsiveWidth(5.5),
    height: responsiveWidth(5.5),
  },
});
