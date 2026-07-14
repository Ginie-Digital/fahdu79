import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity, Pressable} from 'react-native';
import {Dialog} from 'react-native-simple-dialogs';
import {BlurView} from 'expo-blur';
import {useDispatch} from 'react-redux';
import {responsiveFontSize, responsiveHeight, responsiveWidth} from 'react-native-responsive-dimensions';
import {toggleEmailVerificationModal} from '../../../Redux/Slices/NormalSlices/HideShowSlice';
import {FONT_SIZES, WIDTH_SIZES} from '../../../DesiginData/Utility';
import { useAppTheme } from '../../Hook/useAppTheme';

const StreamEndModl = ({visible, onYesPress, onNoPress}) => {
  const { colors, isDark } = useAppTheme();
  const dispatch = useDispatch();

  return (
    visible && (
      <View style={styles.overlay}>
        <BlurView intensity={20} style={styles.blurBackground} />
        <Dialog visible={visible} dialogStyle={[styles.dialog, {backgroundColor: isDark ? colors.card : '#fff', borderColor: isDark ? colors.border : '#1e1e1e'}]} contentStyle={{paddingVertical: 32, paddingHorizontal: 32}} onTouchOutside={() => dispatch(toggleEmailVerificationModal({show: false}))}>
          <View style={styles.content}>
            <Text style={[styles.text, isDark && {color: colors.text}]}>Do you want to end the Livestream right now?</Text>

            <View style={styles.buttonContainer}>
              <Pressable
                onPress={onYesPress}
                style={({pressed}) => [
                  styles.button,
                  styles.yesButton,
                  {
                    backgroundColor: pressed ? (isDark ? '#FF7819' : '#FFC399') : (isDark ? colors.accent : '#FFA86B'),
                    borderColor: isDark ? colors.border : '#1E1E1E',
                  },
                ]}>
                <Text style={[styles.buttonText, {color: '#000'}]}>Yes</Text>
              </Pressable>

              <Pressable
                onPress={onNoPress}
                style={({pressed}) => [
                  styles.button,
                  styles.noButton,
                  {
                    backgroundColor: pressed ? (isDark ? colors.pressed : '#FFF3EB') : (isDark ? colors.inputBg : '#fff'),
                    borderColor: isDark ? colors.border : '#1E1E1E',
                  },
                ]}>
                <Text style={[styles.buttonText, {color: isDark ? colors.text : '#000'}]}>No</Text>
              </Pressable>
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
    backgroundColor: '#FFA86B',
    borderColor: '#1E1E1E',
    borderWidth: WIDTH_SIZES[2],
  },
  noButton: {
    backgroundColor: '#fff',
    borderColor: '#1E1E1E',
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

export default StreamEndModl;
