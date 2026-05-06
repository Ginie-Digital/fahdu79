import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import {Dialog} from 'react-native-simple-dialogs';
import {BlurView} from 'expo-blur';
import {useDispatch} from 'react-redux';
import {responsiveFontSize, responsiveHeight, responsiveWidth} from 'react-native-responsive-dimensions';
import {toggleEmailVerificationModal} from '../../../Redux/Slices/NormalSlices/HideShowSlice';
import {FONT_SIZES, WIDTH_SIZES} from '../../../DesiginData/Utility';
import AnimatedButton from '../../Components/AnimatedButton';

const StreamEndedUserModal = ({visible, onPress, title = 'Livestream has ended...'}) => {
  const dispatch = useDispatch();

  return (
    visible && (
      <View style={styles.overlay}>
        <BlurView intensity={20} style={styles.blurBackground} />
        <Dialog visible={visible} dialogStyle={styles.dialog} contentStyle={{paddingVertical: 32, paddingHorizontal: 32}} onTouchOutside={() => dispatch(toggleEmailVerificationModal({show: false}))}>
          <View style={styles.content}>
            <Text style={styles.text}>{title}</Text>

            <View style={{width: '100%'}}>
              <AnimatedButton title={'Ok'} onPress={onPress} showOverlay={false} />
            </View>
          </View>
        </Dialog>
      </View>
    )
  );
};

const styles = StyleSheet.create({
  dialog: {
    borderRadius: responsiveWidth(5),
    borderWidth: 2,
    borderStyle: 'dashed',
    alignSelf: 'center',
    backgroundColor: '#fff',
    width: responsiveWidth(90),
    // paddingVertical: responsiveHeight(3),
    borderColor: '#1e1e1e',
    padding: 0,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: FONT_SIZES[16],
    textAlign: 'center',
    color: '#1e1e1e',
    width: responsiveWidth(75),
    marginTop: responsiveWidth(2.2),
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: responsiveWidth(70),
    marginTop: responsiveHeight(3),
  },
  button: {
    width: responsiveWidth(32.5),
    height: responsiveHeight(5.35),
    borderRadius: responsiveWidth(3),
    justifyContent: 'center',
    alignItems: 'center',
  },
  yesButton: {
    backgroundColor: '#90EE90',
    borderColor: '#1AFF4C',
    borderWidth: WIDTH_SIZES[2],
  },
  noButton: {
    backgroundColor: '#FF8080',
    borderColor: '#FF4D4D',
    borderWidth: WIDTH_SIZES[2],
  },
  buttonText: {
    fontSize: FONT_SIZES[14],
    fontFamily: 'Rubik-SemiBold',
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
});

export default React.memo(StreamEndedUserModal);
