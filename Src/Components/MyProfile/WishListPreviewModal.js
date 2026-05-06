import {StyleSheet, Text, View, TextInput, Pressable, ToastAndroid, TouchableOpacity, InputAccessoryView, Button, Touchable, Keyboard, Platform} from 'react-native';

import React, {useCallback, useEffect, useState} from 'react';

import {responsiveFontSize, responsiveWidth} from 'react-native-responsive-dimensions';

import Modal from 'react-native-modal';

import DIcon from '../../../DesiginData/DIcons';
import Paisa from '../../../Assets/svg/paisa.svg';

import {useSelector, useDispatch} from 'react-redux';

import {toggleWishListPreviewModal} from '../../../Redux/Slices/NormalSlices/HideShowSlice';

import {token as memoizedToken} from '../../../Redux/Slices/NormalSlices/AuthSlice';

import {dismissProgressNotification, displayNotificationProgressIndicator} from '../../../Notificaton';

import {useUploadAttachmentMutation, useUploadWishListMutation} from '../../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';

import LinearGradient from 'react-native-linear-gradient';
import {autoLogout} from '../../../AutoLogout';
import {ChatWindowError, CommonSuccess, LoginPageErrors} from '../ErrorSnacks';
import {useKeyboard} from '@react-native-community/hooks';
import {FONT_SIZES, padios, selectionTwin, WIDTH_SIZES} from '../../../DesiginData/Utility';

import {Image} from 'expo-image';
import AnimatedButton from '../AnimatedButton';
import {launchImageLibrary} from 'react-native-image-picker';
import {setWishListMediaInfo} from '../../../Redux/Slices/NormalSlices/ProfileSlices/WishListUploadMediaInfo';

const WishListPreviewModal = () => {
  //!<---------------------Refs--------->

  //!<---------------------States--------->
  const dispatcher = useDispatch();

  const keyboard = useKeyboard();

  const inputAccessoryViewID = 'uniqueID';

  const [uploadAttachment] = useUploadAttachmentMutation();

  const [uploadWishList] = useUploadWishListMutation();

  const [title, setTitle] = useState('');

  const [titleCount, setTitleCount] = useState(0);

  const [description, setDescription] = useState('');

  const [descriptionCount, setDescriptionCount] = React.useState(0);

  const [disableSendBtton, setDisableSendButton] = useState(false);

  const [next, setNext] = useState(false);

  const [amount, setAmount] = useState(0);

  const [amountTwo, setAmountTwo] = useState('');

  const [disableUpload, setDisableUpload] = useState(true);

  // const wishlistMediaInfo = useSelector((state) => state.createwishlistmediainfo)
  // console.log(wishlistMediaInfo, ":::::,")

  //!<---------------------Selectors--------->

  const token = useSelector(state => state.auth.user.token);

  const previewModalShow = useSelector(state => state.hideShow.visibility.wishListPreviewModal);

  const wishlistMediaInfo = useSelector(state => state?.createWishListMediaInfo?.data);

  //!<---------------------Handlers--------->

  const handlePreviewModalClose = () => {
    try {
      dispatcher(toggleWishListPreviewModal());
      setNext(false);
      setTitle('');
      setDescription('');
      setTitleCount(0);
      setAmount('');
      setAmountTwo('');
      setDescriptionCount(0);
    } catch (e) {
      console.log('handlePreviewModalClose', e.message);
    }
  };

  useEffect(() => {
    if (amountTwo >= 25000 && amountTwo <= 500000) {
      setDisableUpload(false);
    } else {
      setDisableUpload(true);
    }
  }, [amountTwo]);

  // console.log(amount)

  const handleTitleInput = x => {
    setTitleCount(x?.length);
    setTitle(x);
  };

  const handleDescriptionInput = x => {
    setDescriptionCount(x?.length);
    setDescription(x);
  };

  const inputOne = x => {
    setAmount(x);
    setAmountTwo((Number(x) * (4 / 5)) / 1);
  };

  const inputTwo = x => {
    setAmountTwo(x);
    setAmount(Number(x) * (5 / 4) * 1);

    //0.9
  };

  const handleUploadAttachment = useCallback(() => {
    console.log('🚀 Handle upload');

    // displayNotificationProgressIndicator();

    setDisableSendButton(true);

    const formData = new FormData();
    formData.append('keyName', 'wishlist'); //Will bind with every attachemnt upload
    formData.append('file', wishlistMediaInfo?.mediaImageInfo);

    uploadAttachment({token, formData}).then(e => {
      if (e?.error?.status === 'FETCH_ERROR') {
        LoginPageErrors('Please check your network');

        setDisableSendButton(false);
        dismissProgressNotification();
        return 0;
      }

      if (e?.error?.data?.status_code === 2044) {
        autoLogout();
      }

      console.log(e?.error, 'DET');

      if (e?.error?.data?.status_code === 400) {
        autoLogout();
      }

      if (e?.data?.statusCode === 200) {
        const data = {
          title,
          description,
          images: {
            url: e?.data?.data?.url,
            type: 'wishlist',
          },
          listedCoinsRequired: Number(amountTwo),
        };

        uploadWishList({token, data}).then(e => {
          if (e?.error?.data?.statusCode) {
            setDisableSendButton(false);
            LoginPageErrors(e?.error?.data?.data?.message);
            return;
          }

          if (e?.error?.status === 'FETCH_ERROR') {
            LoginPageErrors('Please check your network');
            setDisableSendButton(false);
            dismissProgressNotification();
          } else {
            if (e?.error?.data?.status_code === 400) {
              ChatWindowError(e?.error?.data?.message);
              dismissProgressNotification();
              setDisableSendButton(false);
              setAmount(0);
              setAmountTwo(0);
              setTitle('');
              setDescription('');
              setNext(false);
              dispatcher(toggleWishListPreviewModal());
            }

            if (e?.data?.statusCode === 200) {
              dismissProgressNotification();
              setAmount(0);
              setAmountTwo(0);
              setTitle('');
              setDescription('');
              setNext(false);
              dispatcher(toggleWishListPreviewModal());
              CommonSuccess('WishList Uploaded SuccessFully');
              setDisableSendButton(false);
            }
          }
        });
      } else {
        console.log('There was some problem while uploading media');
      }
    });
  }, [wishlistMediaInfo, amount, amountTwo]);

  const handleGoNext = useCallback(() => {
    if (title?.length === 0 || description?.length === 0) {
      ChatWindowError("Description or title can't be empty");
    } else if (title?.length > 20) {
      ChatWindowError('Please write short title');
    } else if (description?.length > 200) {
      ChatWindowError('Please write short description');
    } else {
      setNext(true);
    }
  }, [title, description]);

  const formatWithCommas = num => {
    if (!num) return '';
    return Number(num).toLocaleString('en-IN');
  };

  const handleAmountInput = text => {
    // remove commas
    const raw = text.replace(/,/g, '');

    // allow only digits
    if (!/^\d*$/.test(raw)) return;

    setAmountTwo(raw);
  };

  const formattedValue = formatWithCommas(amountTwo);

  const handleImageChange = async () => {
    try {
      const mediaImageInfo = await launchImageLibrary({mediaType: 'photo', quality: 0.5});

      if (mediaImageInfo?.didCancel !== true) {
        if (mediaImageInfo?.assets[0]?.fileSize > 20000000) {
          ToastAndroid.show('Image Size must be lower than 20 MB', ToastAndroid.SHORT);

          return {didCancel: true};
        } else {
          if (mediaImageInfo?.didCancel !== true) {
            dispatcher(setWishListMediaInfo({mediaImageInfo: {uri: mediaImageInfo?.assets[0].uri, name: mediaImageInfo?.assets[0].fileName, type: mediaImageInfo?.assets[0].type}}));
          } else {
            return {didCancel: true};
          }
        }
      } else {
        console.log('Media Selection Cancelled');
      }
    } catch (e) {
      console.log(e);
    }
  };

  const handleUpload = () => {
    if (disableUpload) {
      ChatWindowError('Amount should be ₹25,000 or more.');
      handlePreviewModalClose();
    } else {
      handleUploadAttachment();
    }
  };

  return (
    <Modal
      animationIn={'slideInUp'}
      animationOut={'slideOutDown'}
      animationInTiming={150}
      animationOutTiming={150}
      onRequestClose={() => (disableSendBtton ? console.log('Still uploading') : handlePreviewModalClose())}
      transparent={true}
      isVisible={previewModalShow}
      backdropColor="black"
      onBackButtonPress={() => (disableSendBtton ? console.log('Still uploading') : handlePreviewModalClose())}
      onBackdropPress={() => (disableSendBtton ? console.log('Still uploading') : handlePreviewModalClose())}
      useNativeDriver
      style={{
        flex: 1,
      }}
      avoidKeyboard>
      <View
        style={[
          styles.modalInnerWrapper,
          keyboard.keyboardShown
            ? {
                height: Platform.OS === 'ios' ? responsiveWidth(120) + keyboard.keyboardHeight : responsiveWidth(95) + keyboard.keyboardHeight,
              }
            : {},
        ]}>
        {Platform.OS === 'ios' && (
          <InputAccessoryView nativeID={inputAccessoryViewID}>
            <Pressable onPress={() => Keyboard.dismiss()} style={{alignSelf: 'center', borderRadius: responsiveWidth(2)}}>
              <Text
                style={{
                  textAlign: 'center',
                  backgroundColor: '#f2f2f2',
                  alignSelf: 'flex-end',
                  padding: responsiveWidth(2),
                  overflow: 'hidden',
                }}>
                Dismis keyboard
              </Text>
            </Pressable>
          </InputAccessoryView>
        )}

        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>{next ? 'Add Amount' : 'Attach WishList'}</Text>
            <TouchableOpacity style={styles.closeButton} onPress={handlePreviewModalClose}>
              <DIcon provider={'Entypo'} name={'cross'} size={responsiveWidth(4)} color={'#000'} />
            </TouchableOpacity>
          </View>
        </View>

        {!next ? (
          <>
            <View style={styles.inputAndImage}>
              <View style={[styles.textInputContainer, {width: responsiveWidth(55), height: '100%', marginTop: 0}]}>
                <TextInput
                  placeholderTextColor="#B2B2B2"
                  selectionColor={selectionTwin()}
                  cursorColor={'#1e1e1e'}
                  inputAccessoryViewID={inputAccessoryViewID}
                  value={title}
                  maxLength={20}
                  style={[styles.textInputStyle]}
                  placeholder="Add title"
                  multiline
                  onChangeText={x => handleTitleInput(x)}
                  autoCorrect={false}
                />
                <Text style={styles.charCount}>{`${titleCount}/20`}</Text>
              </View>
              <View style={styles.previewModalImageWrapper}>
                <Image source={wishlistMediaInfo?.mediaImageInfo?.uri} style={{flex: 1, resizeMode: 'contain'}} resizeMethod="resize" contentFit="cover" />
                <TouchableOpacity style={{position: 'absolute', zIndex: 4, transform: [{translateX: responsiveWidth(20)}, {translateY: responsiveWidth(9)}]}} onPress={handleImageChange}>
                  <Image source={require('../../../Assets/Images/ChangeProfile.png')} style={{height: responsiveWidth(7), width: responsiveWidth(7), resizeMode: 'contain', zIndex: 8, alignSelf: 'center', marginRight: responsiveWidth(1)}} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.modalSendContainer}>
              <View style={[styles.textInputContainer]}>
                <TextInput
                  placeholderTextColor="#B2B2B2"
                  selectionColor={selectionTwin()}
                  cursorColor={'#1e1e1e'}
                  value={description}
                  inputAccessoryViewID={inputAccessoryViewID}
                  maxLength={200}
                  style={styles.textInputStyle}
                  placeholder="Add description"
                  multiline
                  onChangeText={x => handleDescriptionInput(x)}
                  autoCorrect={false}
                />
                <Text style={styles.charCount}>{`${descriptionCount}/200`}</Text>
              </View>

              <View style={{position: 'relative', alignSelf: 'center', width: responsiveWidth(89)}}>
                <AnimatedButton title={'Next'} onPress={() => handleGoNext()} />
              </View>
            </View>
          </>
        ) : (
          <>
            {/* <View style={styles.amountInput}>
              <Text style={styles.titleSetPrice}>Set Price</Text>
              <TextInput maxLength={6} inputAccessoryViewID={inputAccessoryViewID} keyboardType="number-pad" style={[{borderBottomWidth: 1, padding: 0, width: responsiveWidth(16), paddingLeft: 2}, styles.amountStyle]} value={String(amountTwo)} onChangeText={handleAmountInput} />
              <Image
                source={require('../../../Assets/Images/Coin.png')}
                resizeMethod="resize"
                contentFit="contain"
                style={{
                  height: responsiveWidth(5),
                  width: responsiveWidth(5),
                  resizeMode: 'contain',
                  alignSelf: 'center',
                  marginRight: responsiveWidth(1),
                }}
              />
            </View> */}

            <View style={[styles.amountInput]}>
              <View style={{flexDirection: 'row', backgroundColor: 'red'}}>
                <View style={[styles.titleback]}>
                  <Text style={[styles.titleSetPrice]}>Set Price</Text>
                </View>
              </View>
              <View style={{flexDirection: 'row', alignItems: 'center', marginRight: responsiveWidth(2), gap: Platform.OS == 'ios' ? responsiveWidth(2) : null}}>
                <TextInput
                  maxLength={8}
                  keyboardType="number-pad"
                  style={[{padding: 0, color: '#1e1e1e', fontFamily: 'Rubik-Medium', width: responsiveWidth(45), height: '100%'}, styles.amountStyle]}
                  placeholderTextColor="#B2B2B2"
                  selectionColor={selectionTwin()}
                  cursorColor={'#1e1e1e'}
                  placeholder="₹25,000 - ₹5,00,000"
                  // value={!forSubscribers ? String(amount) : String(amountSub)}
                  // onChangeText={t => handleAmount(t.replace(/[^0-9]/g, ''), 1, forSubscribers)}
                  // value={String(amountTwo)}
                  value={formattedValue}
                  onChangeText={handleAmountInput}
                />
                <Paisa />
              </View>
            </View>

            <View style={styles.setAmountBox}>
              <View style={styles.eachDescriptionContainer}>
                <Text style={styles.descriptionTitle}>Total coins you'll raise</Text>
                <View style={{flexDirection: 'row'}}>
                  <Text style={styles.amountStyle}>
                    {amountTwo
                      ? Math.floor(Number(amountTwo) * 1.1).toLocaleString('en-IN', {
                          maximumFractionDigits: 0,
                        })
                      : '0'}
                  </Text>

                  <Image
                    source={require('../../../Assets/Images/Coins2.png')}
                    style={{
                      height: responsiveWidth(5),
                      width: responsiveWidth(5),
                      resizeMode: 'contain',
                      alignSelf: 'center',
                      marginRight: responsiveWidth(1),
                      marginBottom: WIDTH_SIZES[4],
                    }}
                  />
                </View>
              </View>

              <View style={styles.eachDescriptionContainer}>
                <Text style={styles.descriptionTitle}>10% Fahdu fees</Text>

                <View style={{flexDirection: 'row'}}>
                  <Text style={styles.amountStyle}>
                    {amountTwo
                      ? Math.floor((10 / 100) * Number(amountTwo)).toLocaleString('en-IN', {
                          maximumFractionDigits: 0,
                        })
                      : '0'}
                  </Text>

                  <Image
                    source={require('../../../Assets/Images/Coins2.png')}
                    style={{
                      height: responsiveWidth(5),
                      width: responsiveWidth(5),
                      resizeMode: 'contain',
                      alignSelf: 'center',
                      marginRight: responsiveWidth(1),
                      marginBottom: WIDTH_SIZES[4],
                    }}
                  />
                </View>
              </View>

              <View style={styles.eachDescriptionContainer}>
                <Text style={styles.descriptionTitle}>On payout you receive</Text>

                <View style={{flexDirection: 'row'}}>
                  <Text style={styles.amountStyle}>
                    {amountTwo
                      ? Math.floor(Number(amountTwo)).toLocaleString('en-IN', {
                          maximumFractionDigits: 0,
                        })
                      : '0'}
                  </Text>
                  <Image
                    source={require('../../../Assets/Images/Coins2.png')}
                    style={{
                      height: responsiveWidth(5),
                      width: responsiveWidth(5),
                      resizeMode: 'contain',
                      alignSelf: 'center',
                      marginRight: responsiveWidth(1),
                      marginBottom: WIDTH_SIZES[4],
                    }}
                  />
                </View>
              </View>
            </View>

            <View
              style={{
                width: '100%',
                flexDirection: 'row',
                justifyContent: 'space-around',
              }}>
              <View style={{position: 'relative', alignSelf: 'center', flexBasis: '30%'}}>
                <AnimatedButton title={<DIcon provider={'Ionicons'} name={'chevron-back'} size={WIDTH_SIZES[24]} />} onPress={() => setNext(false)} showOverlay={false} style={{backgroundColor: '#fff'}} />
              </View>

              <View style={{position: 'relative', alignSelf: 'center', flexBasis: '60%'}}>
                <AnimatedButton onPress={() => handleUpload()} title={'Upload'} showOverlay={false} loading={disableSendBtton} />
              </View>
            </View>
          </>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalInnerWrapper: {
    height: responsiveWidth(200),
    width: responsiveWidth(99),
    backgroundColor: '#fff',
    alignSelf: 'center',
    borderTopLeftRadius: responsiveWidth(3),
    borderTopRightRadius: responsiveWidth(3),
    padding: responsiveWidth(4),
    paddingTop: responsiveWidth(1),
    paddingHorizontal: responsiveWidth(4),
    alignItems: 'center',
    marginLeft: responsiveWidth(1),
    marginTop: responsiveWidth(100),
  },

  previewModalImageWrapper: {
    // flex : 1,
    width: responsiveWidth(28),
    height: responsiveWidth(28),
    justifyContent: 'center',
    borderRadius: responsiveWidth(2),
    overflow: 'hidden',
  },

  previewModalSendButton: {
    fontSize: responsiveFontSize(2.2),
    fontWeight: '400',
    color: '#205cd4',
    textAlign: 'right',
    marginLeft: responsiveWidth(10),
  },

  modalSendContainer: {
    flexDirection: 'column',
    alignItems: 'space-around',
    gap: 5,
  },

  freePaidToggleText: {
    fontSize: responsiveFontSize(2.2),
    textAlignVertical: 'center',
  },

  freePaidToggle: {
    width: responsiveWidth(70),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: responsiveWidth(2),
    backgroundColor: '#f3f3f3',
    height: responsiveWidth(12),
    borderColor: '#1e1e1e',
  },

  attachFileText: {
    textAlign: 'center',
    fontFamily: 'Lexend-Bold',
    color: '#ffa07a',
    fontSize: responsiveFontSize(2.2),
    marginVertical: responsiveWidth(2),
  },
  free: {
    borderWidth: 1,
    flexBasis: '50%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopLeftRadius: responsiveWidth(2),
    borderBottomLeftRadius: responsiveWidth(2),
    backgroundColor: '#fffdf6',
  },

  paid: {
    borderWidth: 1,
    flexBasis: '50%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopRightRadius: responsiveWidth(2),
    borderBottomRightRadius: responsiveWidth(2),
    backgroundColor: '#fffdf6',
  },

  loginButton: {
    paddingHorizontal: responsiveWidth(2),
    backgroundColor: '#ffa07a',
    borderRadius: responsiveWidth(2),
    color: '#1e1e1e',
    textAlign: 'center',
    fontFamily: 'Rubik-Bold',
    elevation: 1,
    fontWeight: '600',
    width: responsiveWidth(32),
    height: responsiveWidth(10),
    textAlignVertical: 'center',
    alignSelf: 'center',
    borderTopColor: '#1e1e1e',
    borderLeftColor: '#1e1e1e',
    elevation: 1,
    fontSize: responsiveFontSize(2.2),
    padding: padios(responsiveWidth(2.6)),
    overflow: 'hidden',
    marginTop: responsiveWidth(8),
  },

  confirmationView: {
    flexDirection: 'column',
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: responsiveWidth(2),
  },

  confirmationViewTextTitle: {
    fontFamily: 'Rubik-Bold',
  },

  userWarning: {
    width: responsiveWidth(90),
    padding: responsiveWidth(2),
    flexDirection: 'column',
  },

  textInputContainer: {
    borderWidth: WIDTH_SIZES[1.5],
    marginTop: responsiveWidth(4),
    overflow: 'hidden',
    backgroundColor: '#fff',
    borderRadius: WIDTH_SIZES[14],
    width: responsiveWidth(90),
    borderColor: '#1e1e1e',
  },
  textInputStyle: {
    backgroundColor: '#fff',
    paddingLeft: responsiveWidth(2),
    fontFamily: 'Rubik-Regular',
    borderColor: 'red',
    height: responsiveWidth(22),
    textAlignVertical: 'top',
    width: '100%',
    color: '#1e1e1e',
    fontSize: FONT_SIZES[14],
  },

  charCount: {
    fontFamily: 'Rubik-Medium',
    fontSize: responsiveFontSize(1.5),
    textAlign: 'right',
    color: '#1e1e1e',
    marginRight: responsiveWidth(2),
    // paddingBottom : responsiveWidth(1),
    // borderWidth : 1,
    marginBottom: responsiveWidth(1),
    width: responsiveWidth(20),
    alignSelf: 'flex-end',
  },

  amountInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderColor: '#1e1e1e',
    borderWidth: 1,
    alignSelf: 'center',
    marginTop: responsiveWidth(2),
    borderRadius: responsiveWidth(2),
    width: responsiveWidth(62),
    fontFamily: 'Rubik-Regular',
    overflow: 'hidden',
  },

  titleSetPrice: {
    fontSize: responsiveFontSize(2),
    backgroundColor: '#FFE1CC',
    height: '100%',
    borderRightWidth: 1,
    // borderRightColor : 'red',
    textAlign: 'center',
    textAlignVertical: 'center',
    flexBasis: '50%',
    fontFamily: 'Rubik-Medium',
    color: '#1e1e1e',
    overflow: 'hidden',
    lineHeight: Platform.OS === 'ios' ? 48 : 20,
  },

  setAmountBox: {
    borderWidth: WIDTH_SIZES[2],
    borderStyle: 'dashed',
    width: '100%',
    padding: responsiveWidth(4),
    borderRadius: WIDTH_SIZES[14],
    marginVertical: responsiveWidth(8),
  },

  eachDescriptionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: responsiveWidth(4),
  },

  descriptionTitle: {
    fontFamily: 'Rubik-Medium',
    color: '#1e1e1e',
    fontSize: FONT_SIZES[14],
  },

  loginButtonSelect: {
    backgroundColor: 'gray',
    paddingHorizontal: responsiveWidth(2),
    borderRadius: responsiveWidth(2),
    color: '#1e1e1e',
    textAlign: 'center',
    fontFamily: 'Rubik-Bold',
    elevation: 1,
    fontWeight: '600',
    width: responsiveWidth(32),
    height: responsiveWidth(10),
    textAlignVertical: 'center',
    alignSelf: 'center',
    borderTopColor: '#1e1e1e',
    borderLeftColor: '#1e1e1e',
    elevation: 1,
    fontSize: responsiveFontSize(2.2),
    padding: padios(responsiveWidth(2.6)),
    overflow: 'hidden',
    marginTop: responsiveWidth(8),
  },

  amountStyle: {
    fontFamily: 'Rubik-Regular',
    color: '#1e1e1e',
    marginRight: responsiveWidth(1),
    fontSize: FONT_SIZES[14],
    textAlign: 'right',
  },
  container: {
    padding: 8,
    // backgroundColor: 'red',
    marginVertical: responsiveWidth(4),
    borderRadius: 8,
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontFamily: 'Rubik-Medium',
  },
  title: {
    fontSize: 16,
    // fontWeight: '600',
    color: '#000',
    fontFamily: 'Rubik-Medium',
  },
  closeButton: {
    // padding: 8,
  },
  inputAndImage: {
    // backgroundColor : 'blue',
    width: '100%',
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    // alignContent : 'center'
    alignItems: 'center',
    paddingHorizontal: responsiveWidth(1),
  },

  amountInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderLeftWidth: 1,
    borderColor: '#1e1e1e',
    height: responsiveWidth(12),
    borderWidth: 1,
    alignSelf: 'center',
    marginTop: responsiveWidth(4.3),
    borderRadius: responsiveWidth(3.14),
    width: '100%',
    fontFamily: 'MabryPro-Regular',
    overflow: 'hidden',
  },

  titleback: {
    backgroundColor: '#FFE1CC', // Just for visibility
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
});

export default WishListPreviewModal;
