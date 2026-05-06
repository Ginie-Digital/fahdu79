import React, { useState, useEffect, useCallback } from 'react';
import { View, Image, Modal, Platform, NativeModules, NativeEventEmitter, StyleSheet, Text, Pressable } from 'react-native';
const CaptureProtection = require('react-native-capture-protection').CaptureProtection;
import { useFocusEffect } from '@react-navigation/native';
import { responsiveFontSize, responsiveHeight, responsiveWidth } from 'react-native-responsive-dimensions';
import { BlurView } from 'expo-blur';

const { ScreenshotDetectionModule } = NativeModules;

const ScreenshotPrevention = () => {
  const [showScreenshotModal, setShowScreenshotModal] = useState(false);

  // ScreenShot Detection
  useEffect(() => {
    let iosSubscription;
    let androidSubscription;

    const handleScreenshot = () => {
      setShowScreenshotModal(true);
      // Removed automatic dismissal to match "App Store/Play Store" style
    };

    // Detection using CaptureProtection for both platforms
    try {
      if (CaptureProtection) {
        // eventType 3 is CAPTURED (Screenshot)
        iosSubscription = CaptureProtection.addListener((eventType) => {
          if (eventType === 3) {
            handleScreenshot();
          }
        });
        console.log('CaptureProtection listener added');
      }
    } catch (error) {
      console.warn('CaptureProtection listener failed:', error);
    }

    // Android: use custom native module as backup/high-reliability listener for Android 14+
    if (Platform.OS === 'android') {
      try {
        if (ScreenshotDetectionModule) {
          const eventEmitter = new NativeEventEmitter(ScreenshotDetectionModule);
          androidSubscription = eventEmitter.addListener('onScreenshotTaken', handleScreenshot);
          console.log('Android Custom Screenshot listener added (Backup)');
        }
      } catch (error) {
        console.warn('Android Custom Screenshot listener failed:', error);
      }
    }

    return () => {
      if (iosSubscription && typeof iosSubscription.remove === 'function') {
        iosSubscription.remove();
      }
      if (androidSubscription && typeof androidSubscription.remove === 'function') {
        androidSubscription.remove();
      }
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (CaptureProtection) {
        // Enable protection for both platforms using the new library
        CaptureProtection.prevent({
          screenshot: true,
          record: true,
          appSwitcher: Platform.OS === 'ios', 
        });
        console.log('CaptureProtection Enabled');
      }

      return () => {
        if (CaptureProtection) {
          // Add catch to prevent crash if Activity is null during unmount/focus loss
          CaptureProtection.allow().catch(err => {
            console.log('CaptureProtection.allow() failed (expected during Activity transition):', err);
          });
          console.log('CaptureProtection Disabled');
        }
      };
    }, []),
  );

  return (
    <Modal visible={showScreenshotModal} transparent animationType="fade">
      <View style={styles.container}>
        <Image 
          source={require('../../Assets/Images/screenshot.png')} 
          style={styles.backgroundImage} 
        />
        
        {/* Close Button - Positioned like App Store / Play Store overlays */}
        <View style={styles.buttonContainer}>
          <Pressable 
            style={({ pressed }) => [
              styles.closeButton,
              { opacity: pressed ? 0.7 : 1 }
            ]} 
            onPress={() => setShowScreenshotModal(false)}
          >
            <BlurView intensity={30} style={StyleSheet.absoluteFill} />
            <Text style={styles.closeText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  buttonContainer: {
    position: 'absolute',
    bottom: responsiveHeight(8), // Bottom-center pill button
    alignSelf: 'center',
  },
  closeButton: {
    paddingHorizontal: responsiveWidth(8),
    paddingVertical: responsiveHeight(1.5),
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: responsiveWidth(30),
  },
  closeText: {
    color: 'white',
    fontSize: responsiveFontSize(2),
    fontFamily: 'Rubik-Medium',
  },
});

export default ScreenshotPrevention;
