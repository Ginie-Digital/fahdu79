import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
  Image,
} from 'react-native';
import { responsiveWidth, responsiveFontSize } from 'react-native-responsive-dimensions';
import { BlurView } from 'expo-blur';
import IBtn from '../../../Assets/Images/ibtn.png';
import Coins2 from '../../../Assets/Images/Coins2.png';
import { useSelector } from 'react-redux';

const LowBalanceModal = ({ 
  visible, 
  onClose, 
  onRecharge, 
  currentBalance = 0, 
  requiredBalance = 0 
}) => {
  const { role: currentUserRole } = useSelector(state => state.auth.user);
  const secondUserRole = useSelector(state => state.secondUser.screen.role);

  const isCreatorToCreator = currentUserRole === 'creator' && secondUserRole === 'creator';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {Platform.OS === 'ios' && (
          <BlurView intensity={15} style={styles.blurBackground} />
        )}
        
        {/* Dashed Border Container */}
        <View style={styles.dialog}>
          
          {/* Icon */}
          <View style={styles.iconWrapper}>
             <Image source={IBtn} style={styles.icon} />
          </View>

          <View style={styles.content}>
            <Text style={styles.title}>Low Balance!</Text>
            
            <Text style={styles.message}>
              {isCreatorToCreator 
                ? 'Kindly create new "user account" to chat with the creator'
                : "You need more coins to start this call. Top up your wallet to continue."
              }
            </Text>

            {/* Balance Info Boxes */}
            <View style={styles.balanceContainer}>
              {/* Current Box */}
              <View style={styles.balanceBox}>
                <Text style={styles.boxLabel}>CURRENT</Text>
                <View style={styles.boxValueRow}>
                  <Text style={styles.boxValue}>{currentBalance}</Text>
                  <Image source={Coins2} style={styles.coinIcon} />
                </View>
              </View>

              {/* Required Box */}
              <View style={[styles.balanceBox, styles.requiredBox]}>
                <Text style={styles.boxLabel}>REQUIRED</Text>
                <View style={styles.boxValueRow}>
                  <Text style={styles.boxValue}>{requiredBalance}</Text>
                  <Image source={Coins2} style={styles.coinIcon} />
                </View>
              </View>
            </View>

            <View style={styles.buttonContainer}>
              {/* Recharge Button */}
              {!isCreatorToCreator && (
                <TouchableOpacity 
                  style={[styles.button, styles.rechargeButton]}
                  onPress={onRecharge}
                  activeOpacity={0.8}
                >
                  <Text style={styles.rechargeText}>Recharge Now</Text>
                </TouchableOpacity>
              )}

               {/* Cancel Button */}
               <TouchableOpacity 
                style={[styles.button, styles.cancelButton]}
                onPress={onClose}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelText}>{isCreatorToCreator ? 'Close' : 'Cancel'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default LowBalanceModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Platform.OS === 'ios' ? 'transparent' : 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  blurBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  dialog: {
    borderRadius: responsiveWidth(5.33),
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#1e1e1e',
    backgroundColor: '#fff',
    width: responsiveWidth(88),
    paddingVertical: 32, 
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapper: {
    marginBottom: 20,
  },
  icon: {
    width: 60, 
    height: 60,
    resizeMode: 'contain',
  },
  content: {
    alignItems: 'center',
    width: '100%',
  },
  title: {
    fontFamily: 'Rubik-Bold',
    fontSize: 22,
    color: '#1E1E1E',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontFamily: 'Rubik-Regular',
    fontSize: 14,
    color: '#1E1E1E',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 10,
    lineHeight: 20,
  },
  balanceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 24,
    gap: 12,
  },
  balanceBox: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#1E1E1E',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  requiredBox: {
    backgroundColor: '#FFF5EE', // Subtle orange tint for required? Or match image. Image shows light bg.
  },
  boxLabel: {
    fontFamily: 'Rubik-Medium',
    fontSize: 10,
    color: '#1E1E1E',
    letterSpacing: 1,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  boxValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  boxValue: {
    fontFamily: 'Rubik-Bold',
    fontSize: 24,
    color: '#1E1E1E',
  },
  coinIcon: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  button: {
    width: '100%',
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rechargeButton: {
    backgroundColor: '#FFA86B',
    borderWidth: 1.5,
    borderColor: '#1E1E1E',
  },
  rechargeText: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: 16,
    color: '#1E1E1E',
  },
  cancelButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#1E1E1E',
  },
  cancelText: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: 16,
    color: '#1E1E1E',
  },
});
