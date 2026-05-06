import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Image } from 'react-native';
import { responsiveFontSize, responsiveHeight, responsiveWidth } from 'react-native-responsive-dimensions';
import DIcon from '../../../DesiginData/DIcons';

const SubscriptionCancelledModal = ({ visible, onClose, creatorName, expiryDate }) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity 
          activeOpacity={1} 
          onPress={onClose} 
          style={styles.backdrop} 
        />
        <View style={styles.container}>
          {/* Success Icon */}
          <Image 
            source={require('../../../Assets/Images/paysuccess.png')}
            style={styles.successIcon}
            resizeMode="contain"
          />

          {/* Text Content */}
          <View style={styles.textContainer}>
            <Text style={styles.title}>Subscription Cancelled</Text>
            <Text style={styles.subtitle}>
              Your subscription to <Text style={styles.boldText}>{creatorName || 'Rohan Fitness'}</Text> has been cancelled
            </Text>
          </View>

          {/* Access Box */}
          <View style={styles.accessBox}>
            <View style={styles.accessRow}>
              <DIcon provider="Feather" name="calendar" size={14} color="#FFA86B" />
              <Text style={styles.accessText}>
                Access till: <Text style={styles.boldText}>{expiryDate || '28 Mar 2026'}</Text>
              </Text>
            </View>
          </View>

          {/* Footer Text */}
          <Text style={styles.footerText}>
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
    backgroundColor: '#FFFFFF',
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
    color: '#1E1E1E',
    textAlign: 'center',
    lineHeight: 20,
  },
  subtitle: {
    fontFamily: 'Rubik-Regular',
    fontSize: 14,
    color: '#1E1E1E',
    textAlign: 'center',
    lineHeight: 19,
    width: 278,
  },
  boldText: {
    fontFamily: 'Rubik-Bold',
  },
  accessBox: {
    backgroundColor: '#FFF3EB',
    borderWidth: 1,
    borderColor: '#1E1E1E',
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
    color: '#1E1E1E',
  },
  footerText: {
    fontFamily: 'Rubik-Regular',
    fontSize: 12,
    color: '#1E1E1E',
    textAlign: 'center',
    lineHeight: 12,
  },
});

export default SubscriptionCancelledModal;
