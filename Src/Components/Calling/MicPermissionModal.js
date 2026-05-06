import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { responsiveFontSize } from 'react-native-responsive-dimensions';
import Feather from 'react-native-vector-icons/Feather';

/**
 * MicPermissionModal — Shown when microphone permission is denied/blocked.
 *
 * Caller mode: "Open Settings" button (black) to go to device settings
 * Receiver mode: Single "Give Permission & End Call" button (black)
 *   → shows loader → calls disconnect API → on success opens settings
 *
 * Props:
 *  - visible (bool)
 *  - mode ('caller' | 'receiver')
 *  - isLoading (bool) — shows spinner on the button
 *  - onGivePermission () => void — receiver taps the button (calls API, then opens settings)
 *  - onCancel () => void — dismiss / go back
 */
const MicPermissionModal = ({
  visible,
  mode = 'caller',
  callType = 'audio',
  isLoading = false,
  onGivePermission,
  onCancel,
}) => {
  const handleOpenSettings = () => {
    console.log('🎤 [MicPermissionModal] Opening device settings');
    Linking.openSettings();
    onCancel?.();
  };

  const isVideo = callType === 'video';
  const getIconName = () => isVideo ? 'video-off' : 'mic-off';
  const getTitle = () => isVideo ? 'Camera & Mic Access Required' : 'Microphone Access Required';
  const getDescription = () => {
    if (mode === 'receiver') {
      return isVideo 
        ? "Camera and microphone permissions are denied. Tap below to notify the caller and enable them from settings."
        : "Microphone permission is denied. Tap below to notify the caller and enable it from settings.";
    }
    return isVideo 
      ? 'Camera and microphone permissions are required to make a video call. Please enable them in your device settings.'
      : 'Microphone permission is required to make a call. Please enable it in your device settings.';
  };

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Icon */}
          <View style={styles.iconCircle}>
            <Feather name={getIconName()} size={32} color="#EF4444" />
          </View>

          {/* Title */}
          <Text style={styles.title}>{getTitle()}</Text>

          {/* Description */}
          <Text style={styles.description}>
            {getDescription()}
          </Text>

          {/* Single Button */}
          {mode === 'caller' ? (
            <TouchableOpacity
              style={styles.blackButton}
              onPress={handleOpenSettings}
              activeOpacity={0.8}>
              <Feather name="settings" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.buttonText}>Open Settings</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.blackButton, isLoading && styles.buttonDisabled]}
              onPress={() => {
                console.log('🎤 [MicPermissionModal] "Open Settings" tapped for receiver');
                onGivePermission?.();
              }}
              disabled={isLoading}
              activeOpacity={0.8}>
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Feather name="settings" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.buttonText}>Open Settings</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};

export default MicPermissionModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 32,
    paddingHorizontal: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FECACA',
    marginBottom: 20,
  },
  title: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: responsiveFontSize(2.2),
    color: '#1E1E1E',
    textAlign: 'center',
    marginBottom: 10,
  },
  description: {
    fontFamily: 'Rubik-Regular',
    fontSize: responsiveFontSize(1.7),
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  blackButton: {
    backgroundColor: '#1E1E1E',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    fontFamily: 'Rubik-Medium',
    fontSize: responsiveFontSize(1.8),
    color: '#FFFFFF',
  },
});
