import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Image } from 'react-native';
import { responsiveFontSize, responsiveHeight, responsiveWidth } from 'react-native-responsive-dimensions';
import DIcon from '../../../DesiginData/DIcons';
import { useAppTheme } from '../../Hook/useAppTheme';

const SubscriptionCancelledModal = ({ visible, onClose, creatorName, expiryDate }) => {
  const { colors, isDark } = useAppTheme();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity 
          activeOpacity={1} 
          onPress={onClose} 
          style={styles.backdrop} 
        />
        <View style={[styles.container, { backgroundColor: isDark ? '#121212' : '#FFFFFF', borderColor: isDark ? '#1E1E1E' : '#E0E0E0' }]}>
          {/* Success Icon */}
          <Image 
            source={require('../../../Assets/Images/CheckSubscriptionCancelledModal.png')}
            style={styles.successIcon}
            resizeMode="contain"
          />

          {/* Text Content */}
          <View style={styles.textContainer}>
            <Text style={[styles.title, { color: isDark ? '#FFFFFF' : '#1E1E1E' }]}>Subscription Cancelled</Text>
            <Text style={[styles.subtitle, { color: isDark ? '#FFFFFF' : '#666666' }]}>
              Your subscription to <Text style={styles.boldText}>{creatorName || 'Rohan Fitness'}</Text> has been cancelled
            </Text>
          </View>

          {/* Access Box */}
          <View style={styles.accessBox}>
            <View style={styles.accessRow}>
              <DIcon provider="Feather" name="calendar" size={14} color="#FFA86B" />
              <Text style={[styles.accessText, { color: isDark ? '#FFFFFF' : '#1E1E1E' }]}>
                Access till: <Text style={styles.boldText}>{expiryDate || '28 Mar 2026'}</Text>
              </Text>
            </View>
          </View>

          {/* Footer Text */}
          <Text style={[styles.footerText, { color: isDark ? '#FFFFFF' : '#666666' }]}>
            You can re-subscribe anytime from their profile
          </Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  container: {
    width: 345,
    height: 314,
    backgroundColor: '#121212',
    borderWidth: 2,
    borderColor: '#1E1E1E',
    borderStyle: 'dashed',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    gap: 20,
    justifyContent: 'center',
  },
  successIcon: {
    width: 64,
    height: 64,
  },
  textContainer: {
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontFamily: 'Rubik-Bold',
    fontSize: 20,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 20,
  },
  subtitle: {
    fontFamily: 'Rubik-Regular',
    fontSize: 14,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 19,
    width: 278,
  },
  boldText: {
    fontFamily: 'Rubik-Bold',
  },
  accessBox: {
    backgroundColor: 'rgba(255, 168, 107, 0.2)',
    borderWidth: 1,
    borderColor: '#FFA86B',
    borderRadius: 56,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  accessText: {
    fontFamily: 'Rubik-Regular',
    fontSize: 12,
    color: '#FFFFFF',
  },
  footerText: {
    fontFamily: 'Rubik-Regular',
    fontSize: 12,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 12,
  },
});

export default SubscriptionCancelledModal;
