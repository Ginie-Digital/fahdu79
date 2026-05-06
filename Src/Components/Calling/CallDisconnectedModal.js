import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Dialog } from 'react-native-simple-dialogs';
import { BlurView } from 'expo-blur';
import { responsiveFontSize, responsiveHeight, responsiveWidth } from 'react-native-responsive-dimensions';
import { FONT_SIZES, WIDTH_SIZES } from '../../../DesiginData/Utility';
import AnimatedButton from '../../Components/AnimatedButton';

const CallDisconnectedModal = ({ visible, onPress, name = '' }) => {
  if (!visible) return null;

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <BlurView intensity={40} tint="dark" style={styles.blurBackground} />
      <View style={styles.cardWrapper}>
        <Dialog
          visible={visible}
          dialogStyle={styles.dialog}
          contentStyle={styles.dialogContent}
          onTouchOutside={() => {}}
        >
          <View style={styles.content}>
            <View style={styles.iconCircle}>
              <Image source={require('../../../Assets/Images/unlink.png')} style={{width: 30, height: 30}} resizeMode={'contain'} />
            </View>

            <Text style={styles.title}>Call Disconnected</Text>
            <Text style={styles.subtitle}>
              {name
                ? `${name} has left the call.`
                : 'The other participant has left the call.'}
            </Text>

            <View style={styles.divider} />

            <View style={{ width: '100%' }}>
              <AnimatedButton
                title={'Got it'}
                onPress={onPress}
                showOverlay={false}
                buttonMargin={0}
              />
            </View>
          </View>
        </Dialog>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  blurBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  cardWrapper: {
    width: '100%',
    alignItems: 'center',
  },
  dialog: {
    borderRadius: responsiveWidth(5),
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#1e1e1e',
    alignSelf: 'center',
    backgroundColor: '#fff',
    width: responsiveWidth(85),
    padding: 0,
  },
  dialogContent: {
    paddingVertical: 28,
    paddingHorizontal: 28,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFF0F0',
    borderWidth: 2,
    borderColor: '#FFD4D4',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontFamily: 'Rubik-Bold',
    fontSize: FONT_SIZES[18] || responsiveFontSize(2.3),
    color: '#1e1e1e',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'Rubik-Regular',
    fontSize: FONT_SIZES[14] || responsiveFontSize(1.8),
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  divider: {
    width: '80%',
    height: 1,
    backgroundColor: '#ECECEC',
    marginBottom: 20,
  },
});

export default React.memo(CallDisconnectedModal);
