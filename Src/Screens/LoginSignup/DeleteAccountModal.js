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
              backgroundColor: isDark ? '#121212' : '#FFFFFF',
              borderWidth: isDark ? 0 : 2,
              borderColor: isDark ? 'transparent' : '#1E1E1E',
              borderStyle: isDark ? 'solid' : 'dashed',
            },
          ]}
          contentStyle={{padding: 0, paddingTop: 0}}>
          <View style={styles.content}>
            <View style={styles.yesNoContainer}>
              <Text style={[styles.textYesNo, {color: isDark ? '#FFFFFF' : '#1E1E1E'}]} numberOfLines={2}>
                Permanently delete my account ?
              </Text>

              <View style={styles.buttonContainer}>
                <Pressable
                  onPress={() => handleButtonPress(true)}
                  style={({pressed}) => [
                    styles.button,
                    styles.yesButton,
                    {
                      borderColor: isDark ? '#FF7819' : '#1E1E1E',
                    },
                    pressed && {backgroundColor: '#FFC399'},
                  ]}>
                  <Text style={[styles.buttonText, {color: '#1E1E1E'}]}>Delete</Text>
                </Pressable>

                <Pressable
                  onPress={() => handleButtonPress(false)}
                  style={({pressed}) => [
                    styles.button,
                    styles.noButton,
                    {
                      backgroundColor: isDark ? '#171717' : '#FFFFFF',
                      borderColor: isDark ? '#1F1F1F' : '#1E1E1E',
                    },
                    pressed && {backgroundColor: isDark ? '#2A2A2A' : '#FFF3EB'},
                  ]}>
                  <Text style={[styles.buttonText, {color: isDark ? '#FFFFFF' : '#1E1E1E'}]}>Cancel</Text>
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
    borderRadius: 24,
    alignSelf: 'center',
    padding: 32,
    width: 345,
    height: 188,
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
    fontSize: 20,
    lineHeight: 26,
    textAlign: 'center',
    width: 281,
    height: 52,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 16,
    width: 281,
    height: 48,
    marginTop: 24,
    justifyContent: 'space-between',
  },
  button: {
    width: 132.5,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
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
