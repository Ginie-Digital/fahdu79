import React from 'react';
import {View, Text, StyleSheet, Modal, Pressable, useColorScheme} from 'react-native';
import {BlurView} from 'expo-blur';
import {useSelector} from 'react-redux';
import {responsiveFontSize, responsiveWidth} from 'react-native-responsive-dimensions';
import {logoutExplicit} from '../../../AutoLogout';
import {Image} from 'expo-image';
import {WIDTH_SIZES, FONT_SIZES} from '../../../DesiginData/Utility';

const ReLoginModal = () => {
  const visible = useSelector(state => state.hideShow.visibility.relogin);
  const colorScheme = useColorScheme();
  const isDark = false; // colorScheme === 'dark';

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <BlurView intensity={30} tint={isDark ? 'dark' : 'light'} style={styles.blurBackground} />
        <View style={[styles.card, {
          backgroundColor: isDark ? '#121212' : '#FFFFFF',
          borderWidth: isDark ? 0 : 2,
          borderStyle: isDark ? undefined : 'dashed',
          borderColor: isDark ? undefined : '#1E1E1E',
        }]}>
          <View style={styles.content}>
            {/* Icon Container */}
            <View style={styles.iconContainer}>
              <Image
                source={
                  isDark
                    ? require('../../../Assets/Images/session_expired_logo_black.png')
                    : require('../../../Assets/Images/session_expired_logo.png')
                }
                contentFit="contain"
                style={styles.iconImage}
              />
            </View>

            {/* Text Section */}
            <View style={styles.textSection}>
              <Text style={[styles.title, {color: isDark ? '#FFFFFF' : '#121212'}]}>
                Session Ended
              </Text>
              <Text style={[styles.description, {color: isDark ? '#999999' : '#666666'}]}>
                Your account has been logged in on another device. For security reasons, you have
                been logged out from this session.
              </Text>
            </View>

            {/* Button */}
            <Pressable
              onPress={() => logoutExplicit()}
              style={({pressed}) => [
                styles.button,
                {
                  backgroundColor: isDark ? '#FFFFFF' : '#121212',
                  opacity: pressed ? 0.85 : 1,
                },
              ]}>
              <Text style={[styles.buttonText, {color: isDark ? '#121212' : '#FFFFFF'}]}>
                Log In Again
              </Text>
            </Pressable>
          </View>
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
  },
  blurBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    width: WIDTH_SIZES[345] || responsiveWidth(92),
    borderRadius: 24,
    overflow: 'hidden',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 32,
    gap: 24,
  },
  iconContainer: {
    width: 51,
    height: 51,
  },
  iconImage: {
    width: '100%',
    height: '100%',
  },
  textSection: {
    alignItems: 'center',
    gap: 14,
    width: '100%',
  },
  title: {
    fontFamily: 'Rubik-Bold',
    fontSize: FONT_SIZES[22] || responsiveFontSize(2.75),
    lineHeight: 28,
    textAlign: 'center',
  },
  description: {
    fontFamily: 'Rubik-Regular',
    fontSize: FONT_SIZES[14] || responsiveFontSize(1.75),
    lineHeight: 19,
    textAlign: 'center',
  },
  button: {
    width: '100%',
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: FONT_SIZES[14] || responsiveFontSize(1.75),
    lineHeight: 14,
  },
});

export default ReLoginModal;
