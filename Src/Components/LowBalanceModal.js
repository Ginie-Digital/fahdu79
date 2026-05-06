import React, {useEffect} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, Image} from 'react-native';
import {Dialog} from 'react-native-simple-dialogs';
import {responsiveWidth} from 'react-native-responsive-dimensions';
import {BlurView} from 'expo-blur';
import {useDispatch, useSelector} from 'react-redux';

import {navigate} from '../../Navigation/RootNavigation';
import {toggleAreYou, toggleShowRechargeModal} from '../../Redux/Slices/NormalSlices/HideShowSlice';

const LowBalanceModal = ({fromLiveStram, onPress}) => {
  const visible = useSelector(state => state.hideShow.visibility.showRechargeModal);
  const dispatch = useDispatch();

  const {role: currentUserRole} = useSelector(state => state.auth.user);
  const secondUserRole = useSelector(state => state.secondUser.screen.role);

  const isCreatorToCreator = currentUserRole === 'creator' && secondUserRole === 'creator';

  const handleClose = () => {
    if (fromLiveStram) {
      console.log("Can't close");
      return;
    }

    dispatch(toggleShowRechargeModal({show: false}));
  };

  const handleRecharge = () => {
    if (fromLiveStram) {
      onPress();
    } else {
      dispatch(toggleShowRechargeModal({show: false}));
      navigate('chooseWallet');
    }
  };

  return (
    visible && (
      <View style={styles.overlay}>
        <BlurView intensity={15} style={styles.blurBackground} />

        <Dialog visible={visible} dialogStyle={styles.dialog} contentStyle={{padding: 0}}>
          <View style={styles.content}>
            {/* ✅ Image instead of icon */}
            <Image source={require('../../Assets/Images/Container.png')} style={styles.image} resizeMode="contain" />

            <Text style={styles.heading}>Low Balance!</Text>

            {isCreatorToCreator && <Text style={styles.instructionText}>Kindly create new "user account" to chat with the creator</Text>}

            <View style={styles.buttonContainer}>
              {!isCreatorToCreator && (
                <TouchableOpacity activeOpacity={0.8} onPress={handleRecharge} style={[styles.button, styles.rechargeBtn]}>
                  <Text style={styles.rechargeText}>Recharge Now</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity activeOpacity={0.8} onPress={handleClose} style={[styles.button, styles.cancelBtn]}>
                <Text style={styles.cancelText}>{isCreatorToCreator ? 'Close' : 'Cancel'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Dialog>
      </View>
    )
  );
};

const styles = StyleSheet.create({
  dialog: {
    borderRadius: responsiveWidth(5.33),
    borderWidth: 2,
    borderStyle: 'dashed',
    alignSelf: 'center',
    padding: 24,
    backgroundColor: '#fff',
    width: responsiveWidth(88),
    borderColor: '#1e1e1e',
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
  content: {
    alignItems: 'center',
  },

  /* ✅ NEW IMAGE STYLE */
  image: {
    width: 60,
    height: 60,
    marginBottom: 14,
  },

  heading: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: 18,
    color: '#000',
    marginBottom: 6,
  },
  subText: {
    fontFamily: 'Rubik-Regular',
    fontSize: 14,
    color: '#000',
    marginBottom: 20,
  },
  boldText: {
    fontFamily: 'Rubik-Medium',
  },
  instructionText: {
    fontFamily: 'Rubik-Regular',
    fontSize: 14,
    color: '#000',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 10,
  },

  /* column layout */
  buttonContainer: {
    width: '100%',
    gap: 12,
  },

  button: {
    height: 48,
    width: '100%',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#1e1e1e',
  },
  rechargeBtn: {
    backgroundColor: '#ffa86b',
  },
  cancelBtn: {
    backgroundColor: '#fff',
  },

  rechargeText: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: 14,
    color: '#1e1e1e',
  },
  cancelText: {
    fontFamily: 'Rubik-Medium',
    fontSize: 14,
    color: '#1e1e1e',
  },
});

export default LowBalanceModal;
