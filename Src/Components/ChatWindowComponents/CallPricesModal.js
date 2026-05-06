import {StyleSheet, Text, View, TouchableOpacity, Image, Platform, Pressable} from 'react-native';
import React, {useEffect, useState} from 'react';
import {responsiveFontSize, responsiveHeight, responsiveWidth} from 'react-native-responsive-dimensions';
import {useSelector, useDispatch} from 'react-redux';
import {toggleCallMethodSelector, toggleCallPriceModal, toggleChatWindowInformationModal, toggleTimeRequestModal} from '../../../Redux/Slices/NormalSlices/HideShowSlice';
import Modal from 'react-native-modal';
import {token as memoizedToken} from '../../../Redux/Slices/NormalSlices/AuthSlice';
import DIcon from '../../../DesiginData/DIcons';
import axios from 'axios';
import {ChatWindowError, LoginPageErrors, chatRoomSuccess} from '../ErrorSnacks';
import {FONT_SIZES, nTwins, WIDTH_SIZES} from '../../../DesiginData/Utility';
import Paisa from '../../../Assets/svg/paisa.svg';
import Wallet from '../../../Assets/svg/wall.svg';
import {navigate} from '../../../Navigation/RootNavigation';
import {useCallRequestMutation, useLazyOthersCallingFeeDetailQuery} from '../../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
import AnimatedButton from '../AnimatedButton';

const CallPricesModal = ({userId, roomId}) => {
  console.log(userId, 'userId');

  const dispatcher = useDispatch();

  const token = useSelector(state => state.auth.user.token);

  const {show: modalVisibility, type} = useSelector(state => state.hideShow.visibility.callPriceModal);

  const [othersCallingFeeDetail] = useLazyOthersCallingFeeDetailQuery();

  const [detailsLayout, setDetailsLayout] = useState({width: 0, height: 0});

  const [fee, setFee] = useState({});

  const handleCallRequest = async type => {
    dispatcher(toggleCallPriceModal({show: false, type}));
    navigate('SelectDuration', { callType: type === 'audio' ? 'Audio' : 'Video', userId, roomId });
  };

  useEffect(() => {
    async function getFeeDeatil(userId) {
      console.log('User id from inid', userId);

      const {data, error} = await othersCallingFeeDetail({token, userId});

      if (data) {
        console.log(data);
        setFee(data?.data);
      }

      if (error) {
        console.log(error);
      }
    }

    getFeeDeatil(userId);
  }, [modalVisibility, userId]);

  return (
    <Modal isVisible={modalVisibility} animationIn={'slideInUp'} animationOut={'slideOutDown'} onBackdropPress={() => dispatcher(toggleCallPriceModal({show: false, type: 'audio'}))} style={styles.modalStyle}>
      <View style={styles.modalContent}>
        <Text style={styles.headingTitleTow}>Do You want to send {type === 'audio' ? 'Audio' : 'Video'} Call request?</Text>

        {/* Fee Details Section */}
        {type === 'video' && (
          <View style={{position: 'relative'}}>
            <View style={[styles.overlayTwo, {width: detailsLayout.width, height: detailsLayout.height}]} />
            <View style={styles.detailsContainer} onLayout={event => setDetailsLayout(event.nativeEvent.layout)}>
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>For Subscribers</Text>
                <Text style={styles.feeText}>
                  <Text style={styles.feeNumber}>{fee?.VideoFee?.subsAmount} Coins/</Text>
                  min
                </Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>For Followers</Text>
                <Text style={styles.feeText}>
                  <Text style={styles.feeNumber}>{fee?.VideoFee?.followAmount} Coins/</Text>
                  min
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Fee Details Section */}
        {type === 'audio' && (
          <View style={{position: 'relative'}}>
            {/* <View style={[styles.overlayTwo, {width: detailsLayout.width, height: detailsLayout.height}]} /> */}
            <View style={styles.detailsContainer} onLayout={event => setDetailsLayout(event.nativeEvent.layout)}>
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>For Subscribers</Text>
                <Text style={styles.feeText}>
                  <Text style={styles.feeNumber}> {fee?.AudioFee?.subsAmount} Coins/</Text>
                  min
                </Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>For Followers</Text>
                <Text style={styles.feeText}>
                  <Text style={styles.feeNumber}>{fee?.AudioFee?.followAmount} Coins/</Text>
                  min
                </Text>
              </View>
            </View>
          </View>
        )}

        <View style={{flexDirection: 'row', gap: 8, marginTop: 16}}>
          <View style={{flexBasis: '48%'}}>
            <AnimatedButton showOverlay={false} style={{backgroundColor: '#fff'}} title={'No'} onPress={() => dispatcher(toggleCallPriceModal({show: false, type: 'audio'}))} />
          </View>

          <View style={{flexBasis: '48%'}}>
            <AnimatedButton showOverlay={false} title={'Yes'} onPress={() => handleCallRequest(type === 'audio' ? 'Audio' : 'Video')} />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalStyle: {
    justifyContent: 'flex-end',
    margin: 0,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: '#282828',
    padding: 20,
    paddingBottom: 30,
    borderBottomWidth: 0,
  },
  walletSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderWidth: 1,
    borderColor: '#282828',
    borderRadius: 10,
    marginBottom: 20,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  detailsContainer: {
    borderWidth: 1,
    borderColor: '#282828',
    borderRadius: 10,
    paddingHorizontal: WIDTH_SIZES[24],
    paddingVertical: WIDTH_SIZES[24] + WIDTH_SIZES[2],
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#fff',
    flexDirection: 'column',
    gap: WIDTH_SIZES[19],
  },
  overlay: {
    position: 'absolute',
    top: '7%',
    left: '1.4%',
    // backgroundColor: 'red',
    borderRadius: 14,
    zIndex: -1,
    borderWidth: WIDTH_SIZES[1.5],
  },
  walletText: {
    fontFamily: 'Rubik-Medium',
    fontSize: FONT_SIZES[16],
    color: '#282828',
    textAlignVertical: 'center',
    marginLeft: 10,
    textAlign: 'left',
    includeFontPadding: false,
    marginTop: WIDTH_SIZES[4],
  },
  coinsWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  coinsText: {
    fontFamily: 'Rubik-SemiBold',
    // includeFontPadding : false,
    color: '#282828',
    fontSize: FONT_SIZES[14],
    marginTop: WIDTH_SIZES[4],
    marginRight: 5,
    ...Platform.select({
      ios: {
        marginTop: 2,
      },
    }),
  },
  detailSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontFamily: 'Rubik-Regular',
    fontSize: 14,
    color: '#000000',
    marginBottom: 5,
  },
  feeText: {
    fontFamily: 'Rubik-Regular',
    fontSize: 14,
    color: '#282828',
    marginLeft: 20,
  },
  feeNumber: {
    fontFamily: 'Rubik-Medium',
    fontSize: 16,
    color: '#000000',
  },
  overlayTwo: {
    position: 'absolute',
    top: '5%',
    left: '1.4%',
    backgroundColor: '#1e1e1e',
    borderRadius: 14,
    zIndex: -1,
    borderWidth: WIDTH_SIZES[1.5],
  },
  headingTitle: {
    marginBottom: 8,
    fontFamily: 'Rubik-SemiBold',
    fontSize: FONT_SIZES[16],
    color: '#1e1e1e',
  },
  headingTitleTow: {
    marginTop: 32,

    marginBottom: 32,
    fontFamily: 'Rubik-Medium',
    fontSize: FONT_SIZES['18'],
    color: '#1e1e1e',
    textAlign: 'center',
  },
});

export default CallPricesModal;
