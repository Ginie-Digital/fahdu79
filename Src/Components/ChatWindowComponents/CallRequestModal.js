import React, {useState} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator} from 'react-native';
import {Dialog} from 'react-native-simple-dialogs';
import {useDispatch, useSelector} from 'react-redux';
import {BlurView} from 'expo-blur';
import {Image} from 'expo-image';
import {toggleCallAccepted, toggleCallRequestModal} from '../../../Redux/Slices/NormalSlices/HideShowSlice';
import {FONT_SIZES, WIDTH_SIZES} from '../../../DesiginData/Utility';
import {navigate} from '../../../Navigation/RootNavigation';
import {useAcceptCallRequestMutation, useDeclineCallRequestMutation} from '../../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
import { AppLog } from '../../Utils/Logger';
import {LoginPageErrors} from '../ErrorSnacks';
import dayjs from 'dayjs';
import {setCallRejected} from '../../../Redux/Slices/NormalSlices/Call/CallSlice';

const CallRequestModal = ({doRaisedRequest, roomId, name, profileImageUrl, targetUserId = undefined}) => {
  const dispatch = useDispatch();
  const visibility = useSelector(state => state.hideShow.visibility.callRequestModal);
  const {token, currentUserId} = useSelector(state => state.auth.user);

  const [acceptCallRequest] = useAcceptCallRequestMutation();

  const [declineCallRequest] = useDeclineCallRequestMutation();

  const [loading, setLoading] = useState(false);

  const handleClose = () => dispatch(toggleCallRequestModal({show: false}));

  const handleAcceptCallRequest = async () => {
    setLoading(true);
    console.log(doRaisedRequest?.initiator, String(doRaisedRequest?.type).toLowerCase());
    AppLog('CALL', 'User clicked Accept on call request modal', { roomId, initiator: doRaisedRequest?.initiator, type: doRaisedRequest?.type });
    
    const {data, error} = await acceptCallRequest({
      token,
      data: {
        roomId,
        userId: doRaisedRequest?.initiator,
        callType: String(doRaisedRequest?.type).toLowerCase(),
        callerId: currentUserId,
      },
    });

    console.log(data, 'CALLREQUESTx');

    if (data?.data) {
      AppLog('CALL', 'Call request accepted successfully via API', { roomId, data: data?.data });
      setLoading(false);
      dispatch(setCallRejected(false));
      dispatch(toggleCallAccepted({status: false}));
      const resolvedCallType = String(doRaisedRequest?.type).toLowerCase();
      navigate(resolvedCallType === 'video' ? 'videoCallScreen' : 'callScreen', {roomId, name, profileImageUrl, callerId: currentUserId, targetUserId, callType: resolvedCallType});
    } else {
      handleClose();
      LoginPageErrors('User not available for call.');
    }

    if (error) {
      setLoading(false);
      handleClose();
      LoginPageErrors(error?.data?.message);
    }
    handleClose();
  };

  const handleDeclineRequest = async () => {
    setLoading(true);
    console.log(doRaisedRequest?.initiator, String(doRaisedRequest?.type).toLowerCase());

    const {data, error} = await declineCallRequest({
      token,
      data: {
        roomId,
        userId: doRaisedRequest?.initiator,
        callType: String(doRaisedRequest?.type).toLowerCase(),
        callerId: currentUserId,
      },
    });

    if (error) {
      console.log('error', error);
    }

    if (data) {
      console.log('data', data);
    }

    handleClose();
  };

  return (
    visibility && (
      <View style={styles.overlay}>
        <BlurView intensity={15} style={styles.blurBackground} />

        <Dialog visible={visibility} dialogStyle={styles.dialog} contentStyle={styles.dialogPadding} onTouchOutside={handleClose}>
          <View style={styles.innerRow}>
            <View style={styles.iconBox}>
              <Image source={require('../../../Assets/Images/callIncoming.png')} style={styles.iconImage} contentFit="contain" />
            </View>

            <View style={styles.textSection}>
              <Text style={styles.title}>Call Request</Text>
              <Text style={styles.subtitle}>Now ({doRaisedRequest?.callTries}/3)</Text>
            </View>

            <View style={styles.buttonGroup}>
              <TouchableOpacity style={[styles.acceptBtn, {alignItems: 'center', justifyContent: 'center', opacity: loading ? 0.8 : 1}]} onPress={handleAcceptCallRequest} disabled={loading}>
                <View style={{width: 60, alignItems: 'center'}}>{loading ? <ActivityIndicator size="small" color="#1e1e1e" /> : <Text style={styles.btnText}>call</Text>}</View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.denyBtn} onPress={handleDeclineRequest}>
                <Text style={styles.btnText}>Deny</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={{width: '100%', height: WIDTH_SIZES['1.5'], backgroundColor: '#1e1e1e', marginTop: 8}} />
          <View style={styles.bottomRow}>
            <Text style={styles.availabilityText}>
              <Text style={{fontFamily: 'Rubik-Regular', fontSize: FONT_SIZES['12'], color: '#1e1e1e'}}>
                Available for {doRaisedRequest?.type?.toLowerCase()} call on {dayjs(doRaisedRequest?.availability).format('D MMM [at] h:mm A')}
              </Text>
            </Text>
          </View>
        </Dialog>
      </View>
    )
  );
};

export default CallRequestModal;

const styles = StyleSheet.create({
  overlay: {
    zIndex: 1,
  },
  blurBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  dialog: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: WIDTH_SIZES['1.5'],
    borderColor: '#1e1e1e',
    overflow: 'hidden',
    position: 'absolute',
    top: 40,
    width: '100%',
    alignSelf: 'center',
  },

  innerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 10,
    paddingRight: 10,
  },
  iconBox: {
    width: 41,
    height: 41,
    borderRadius: 8,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  iconImage: {
    width: 22,
    height: 22,
    tintColor: '#fff',
  },
  textSection: {
    flex: 1,
  },
  title: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: FONT_SIZES['14'],
    color: '#1e1e1e',
  },
  subtitle: {
    fontFamily: 'Rubik-Regular',
    fontSize: FONT_SIZES['12'],
    color: '#1e1e1e',
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  acceptBtn: {
    backgroundColor: '#C5FFD2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: WIDTH_SIZES['8'],
    borderWidth: WIDTH_SIZES[1.5],
    borderColor: '#1e1e1e',
  },
  denyBtn: {
    backgroundColor: '#FF8580',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: WIDTH_SIZES['8'],
    borderWidth: WIDTH_SIZES[1.5],
    borderColor: '#1e1e1e',
  },
  btnText: {
    fontFamily: 'Rubik-SemiBold',
    color: '#1e1e1e',
    fontSize: FONT_SIZES['12'],
  },
  bottomRow: {
    marginTop: 10,
    paddingLeft: 10,
    paddingRight: 10,
  },
  availabilityText: {
    fontFamily: 'Rubik-Regular',
    fontSize: FONT_SIZES['14'],
    color: '#1e1e1e',
    textAlign: 'center',
  },
  dialogPadding: {
    paddingTop: 10,
    paddingBottom: 10,
    paddingLeft: 0,
    paddingRight: 0,
  },
});
