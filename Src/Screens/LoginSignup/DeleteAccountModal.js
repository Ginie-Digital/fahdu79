import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity, Platform, Pressable} from 'react-native';
import {Dialog} from 'react-native-simple-dialogs';
import {responsiveFontSize, responsiveWidth} from 'react-native-responsive-dimensions';
import {BlurView} from 'expo-blur';
import {navigate} from '../../../Navigation/RootNavigation';
import {useDispatch, useSelector} from 'react-redux';
import {toggleAccountDeleteModal, toggleAreYou} from '../../../Redux/Slices/NormalSlices/HideShowSlice';
import {FONT_SIZES} from '../../../DesiginData/Utility';
import {useAreYouACreatorNotificationMutation} from '../../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
import {useAppTheme} from '../../Hook/useAppTheme';

const DeleteAccountModal = ({deleteAccountApi}) => {
  const {colors, isDark} = useAppTheme();
  const visible = useSelector(state => state.hideShow.visibility.accountDeleteModal);

  const dispatch = useDispatch();

  const handleButtonPress = async what => {
    if (what) {
      deleteAccountApi();
    }

    dispatch(toggleAccountDeleteModal({show: false}));
  };

  return (
    visible && (
      <View style={styles.overlay}>
        <BlurView intensity={15} tint={isDark ? 'dark' : 'light'} style={styles.blurBackground} />
        <Dialog
          visible={visible}
          dialogStyle={[
            styles.dialog,
            {
              backgroundColor: colors.background,
              borderColor: isDark ? colors.accent : '#1E1E1E',
            },
          ]}
          contentStyle={{padding: 0, paddingTop: 0}}>
          <View style={styles.content}>
            <View style={styles.yesNoContainer}>
              <Text style={[styles.textYesNo, {color: colors.text}]} numberOfLines={1}>
                Permanently delete my account ?
              </Text>

              <View style={styles.buttonContainer}>
                <Pressable
                  onPress={() => handleButtonPress(true)}
                  style={({pressed}) => [
                    styles.button,
                    styles.yesButton,
                    {borderColor: isDark ? colors.accentBorder : '#1E1E1E'},
                    pressed && {backgroundColor: isDark ? '#E5975F' : '#FFC399'},
                  ]}>
                  <Text style={[styles.buttonText, {color: '#1E1E1E'}]}>Delete</Text>
                </Pressable>

                <Pressable
                  onPress={() => handleButtonPress(false)}
                  style={({pressed}) => [
                    styles.button,
                    styles.noButton,
                    {
                      backgroundColor: isDark ? colors.card : '#fff',
                      borderColor: isDark ? colors.border : '#1E1E1E',
                    },
                    pressed && {backgroundColor: isDark ? colors.pressed : '#FFF3EB'},
                  ]}>
                  <Text style={[styles.buttonText, {color: colors.text}]}>Cancel</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Dialog>
      </View>
    )
  );
};

const styles = StyleSheet.create({
  dialog: {
    borderRadius: responsiveWidth(5.33),
    borderWidth: 2,
    borderStyle: 'dashed',
    alignSelf: 'center',
    padding: 32,
    width: responsiveWidth(88), // Adjusted for consistency
    height: responsiveWidth(44), // Adjusted for consistency
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
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
  yesNoContainer: {
    alignItems: 'center',
    alignSelf: 'center',
  },
  textYesNo: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: FONT_SIZES['16'], // Adjust font size if needed
    textAlign: 'center',
    width: '100%', // Ensure the text container takes full width
    flexShrink: 1, // Prevent text from wrapping
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: Platform.OS === 'ios' ? 4 : 0,
    width: '100%',
    marginTop: Platform.OS === 'ios' ? 16 : 12,
  },
  button: {
    width: responsiveWidth(34.5), // Adjusted for consistency
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: Platform.OS === 'android' ? 6 : 8,
    borderWidth: 1.5,
  },
  yesButton: {
    backgroundColor: '#ffa86b',
  },
  noButton: {
  },
  buttonText: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: 14,
  },
});

export default DeleteAccountModal;
