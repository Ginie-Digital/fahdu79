import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useAppTheme } from '../../Hook/useAppTheme';
import { responsiveWidth } from 'react-native-responsive-dimensions';
import { BlurView } from 'expo-blur';
import Cross from '../../../Assets/Images/cross.png';

const DenyConfirmationModal = ({ visible, onClose, onConfirm, loading }) => {
  const { colors, isDark } = useAppTheme();
  const styles = getStyles(colors, isDark);
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
          
          {/* Close Button */}
          <TouchableOpacity 
            style={styles.closeButtonWrapper} 
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Image source={Cross} style={styles.closeIcon} />
          </TouchableOpacity>

          <View style={styles.content}>
            <Text style={styles.title}>Are you sure you want to Deny?</Text>
            
            <Text style={styles.message}>
              The request will be cancelled and coins will be instantly refunded to the fan.
            </Text>

            <View style={styles.buttonContainer}>
              {/* Yes, Decline Button */}
              <TouchableOpacity 
                style={[styles.button, styles.denyButton, loading && { opacity: 0.7 }]}
                onPress={onConfirm}
                activeOpacity={0.8}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#1E1E1E" />
                ) : (
                  <Text style={styles.denyText}>Yes, Decline</Text>
                )}
              </TouchableOpacity>

               {/* Keep Request Button */}
               <TouchableOpacity 
                style={[styles.button, styles.keepButton]}
                onPress={onClose}
                activeOpacity={0.8}
              >
                <Text style={styles.keepText}>Keep Request</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default DenyConfirmationModal;

const getStyles = (colors, isDark) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Platform.OS === 'ios' ? 'transparent' : (isDark ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.5)'),
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  blurBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  dialog: {
    borderRadius: responsiveWidth(5.33), // ~20px
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: isDark ? '#292929' : '#1E1E1E',
    backgroundColor: isDark ? '#191919' : '#FFFFFF',
    width: responsiveWidth(88),
    paddingVertical: 32, 
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonWrapper: {
    alignItems: 'center',
    marginBottom: 20,
  },
  closeIcon: {
    width: 48,
    height: 48,
    resizeMode: 'contain',
    tintColor: colors.text,
  },
  content: {
    alignItems: 'center',
    width: '100%',
  },
  title: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: 22,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontFamily: 'Rubik-Regular',
    fontSize: 14,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 10,
    lineHeight: 20,
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
  denyButton: {
    backgroundColor: colors.accent,
    borderWidth: 1.5,
    borderColor: colors.accentBorder,
  },
  denyText: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: 16,
    color: '#1E1E1E',
  },
  keepButton: {
    backgroundColor: isDark ? '#191919' : '#FFFFFF',
    borderWidth: 1.5,
    borderColor: isDark ? '#292929' : '#1E1E1E',
  },
  keepText: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: 16,
    color: colors.text,
  },
});
