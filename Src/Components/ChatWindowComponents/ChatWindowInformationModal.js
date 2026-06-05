import { StyleSheet, Text, View, TouchableOpacity, Image, Platform, Pressable } from 'react-native';
import React, { useEffect, useState } from 'react';
import { responsiveFontSize, responsiveHeight, responsiveWidth } from 'react-native-responsive-dimensions';
import { useSelector, useDispatch } from 'react-redux';
import { toggleChatWindowInformationModal } from '../../../Redux/Slices/NormalSlices/HideShowSlice';
import Modal from 'react-native-modal';
import { token as memoizedToken } from '../../../Redux/Slices/NormalSlices/AuthSlice';
import DIcon from '../../../DesiginData/DIcons';
import axios from 'axios';
import { LoginPageErrors, chatRoomSuccess } from '../ErrorSnacks';
import { FONT_SIZES, formatIndianNumber, nTwins, WIDTH_SIZES } from '../../../DesiginData/Utility';
import Paisa from '../../../Assets/svg/paisa.svg';
import Wallet from '../../../Assets/svg/wall.svg';
import { navigate } from '../../../Navigation/RootNavigation';

const ChatWindowInformationModal = ({ chatRoomId, followUser, unFollowUser, role }) => {
  const dispatcher = useDispatch();
  const senderBioDetail = useSelector(state => state.senderDetail.bio);
  const feeDetails = useSelector(state => state.chatWindowFeeDetails.data[chatRoomId]);

  const token = useSelector(state => state.auth.user.token);
  const [coins, setCoins] = useState('0');
  const [following, setFollowing] = useState(false);
  const [fetchingCoins, setFetchingCoins] = useState(false);
  const modalVisibility = useSelector(state => state.hideShow.visibility.chatWindowInformationModal);

  const [walletLayout, setWalletLayout] = useState({ width: 0, height: 0 });
  const [detailsLayout, setDetailsLayout] = useState({ width: 0, height: 0 });

  useEffect(() => {
    fetchCoins();
    fetchIsFollowing();
  }, [modalVisibility]);

  const fetchCoins = async () => {
    try {
      setFetchingCoins(true);
      let { data } = await axios.get('https://api.fahdu.in/api/wallet/get-coins', { headers: { Authorization: `Bearer ${token}` } });
      setCoins(data?.data);
      setFetchingCoins(false);
    } catch (e) {
      console.log('Get Coin Error ', e);
    }
  };

  const fetchIsFollowing = async () => {
    try {
      setFetchingCoins(true);
      let { data } = await axios.get(`https://api.fahdu.in/api/user/valid-follow-check?id=${senderBioDetail?.name}`, { headers: { Authorization: `Bearer ${token}` } });
      setFollowing(data?.data?.follow);
    } catch (e) {
      console.log('Get Coin Error ', e);
    }
  };

  const handleWalletPress = () => {
    dispatcher(toggleChatWindowInformationModal());
    setTimeout(() => {
      navigate('wallet');
    }, 650);
  };

  return (
    <Modal isVisible={modalVisibility} animationIn={'slideInUp'} animationOut={'slideOutDown'} onBackdropPress={() => dispatcher(toggleChatWindowInformationModal())} style={styles.modalStyle}>
      <View style={styles.modalContent}>
        {/* Wallet Balance Section */}
        <View style={{ position: 'relative' }}>
          <View style={[styles.overlay, { width: walletLayout.width, height: walletLayout.height }, { backgroundColor: coins <= 10 ? '#FF8080' : '#A4FFB8' }]} />
          <Pressable style={styles.walletSection} onLayout={event => setWalletLayout(event.nativeEvent.layout)} onPress={handleWalletPress}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
              <Wallet />

              <Text style={styles.walletText}>Wallet balance</Text>
            </View>

            <View style={styles.coinsWrapper}>
              <Text style={styles.coinsText}>{formatIndianNumber(coins)}</Text>
              <Paisa />
            </View>
          </Pressable>
        </View>

        <Text style={styles.headingTitle}>Chat Fee</Text>

        {/* Fee Details Section */}
        <View style={{ position: 'relative' }}>
          {/* <View style={[styles.overlayTwo, {width: detailsLayout.width, height: detailsLayout.height}]} /> */}
          <View style={styles.detailsContainer} onLayout={event => setDetailsLayout(event.nativeEvent.layout)}>
            <View style={styles.detailSection}>
              <Text style={styles.sectionTitle}>For Subscribers</Text>
              <Text style={styles.feeText}>
                <Text style={styles.feeNumber}>{feeDetails?.subscribers?.message} Coins/</Text>
                Message
              </Text>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.sectionTitle}>For Followers</Text>
              <Text style={styles.feeText}>
                <Text style={styles.feeNumber}>{feeDetails?.followers?.message} Coins/</Text>
                Message
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.headingTitleTow}>Video Call Fee</Text>

        {/* Fee Details Section */}
        <View style={{ position: 'relative' }}>
          {/* <View style={[styles.overlayTwo, {width: detailsLayout.width, height: detailsLayout.height}]} /> */}
          <View style={styles.detailsContainer} onLayout={event => setDetailsLayout(event.nativeEvent.layout)}>
            <View style={styles.detailSection}>
              <Text style={styles.sectionTitle}>For Subscribers</Text>
              <Text style={styles.feeText}>
                <Text style={styles.feeNumber}>{feeDetails?.subscribers?.videoCall} Coins/</Text>
                Min.
              </Text>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.sectionTitle}>For Followers</Text>
              <Text style={styles.feeText}>
                <Text style={styles.feeNumber}>{feeDetails?.followers?.videoCall} Coins/</Text>
                Min.
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.headingTitleTow}>Audio Call Fee</Text>

        {/* Fee Details Section */}
        <View style={{ position: 'relative' }}>
          {/* <View style={[styles.overlayTwo, {width: detailsLayout.width, height: detailsLayout.height}]} /> */}
          <View style={styles.detailsContainer} onLayout={event => setDetailsLayout(event.nativeEvent.layout)}>
            <View style={styles.detailSection}>
              <Text style={styles.sectionTitle}>For Subscribers</Text>
              <Text style={styles.feeText}>
                <Text style={styles.feeNumber}>{feeDetails?.subscribers?.audioCall} Coins/</Text>
                Min.
              </Text>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.sectionTitle}>For Followers</Text>
              <Text style={styles.feeText}>
                <Text style={styles.feeNumber}>{feeDetails?.followers?.audioCall} Coins/</Text>
                Min.
              </Text>
            </View>
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
    marginBottom: 8,
    fontFamily: 'Rubik-SemiBold',
    fontSize: FONT_SIZES[16],
    color: '#1e1e1e',
  },
});

export default ChatWindowInformationModal;
