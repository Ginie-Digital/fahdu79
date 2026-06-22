import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity, Platform, Pressable} from 'react-native';
import {Dialog} from 'react-native-simple-dialogs';
import {responsiveFontSize, responsiveWidth} from 'react-native-responsive-dimensions';
import {BlurView} from 'expo-blur';
import {navigate} from '../../../Navigation/RootNavigation';
import {useDispatch, useSelector} from 'react-redux';
import {toggleAreYou} from '../../../Redux/Slices/NormalSlices/HideShowSlice';
import {FONT_SIZES} from '../../../DesiginData/Utility';
import {useAreYouACreatorNotificationMutation} from '../../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';

const AreYou = () => {
  const visible = useSelector(state => state.hideShow.visibility.areYou);

  const dispatch = useDispatch();

  const token = useSelector(state => state.auth.user.token);

  const [areYouACreatorNotification] = useAreYouACreatorNotificationMutation();

  async function isCreator(is) {
    const {data, error} = await areYouACreatorNotification({
      token,
      data: {
        creator: is,
      },
    });

    if (data) {
      console.log(data);
    }

    if (error) {
      console.log(error);
    }
  }

  const handleButtonPress = async what => {
    if (what === 'verificationStepOne') {
      await isCreator('yes');

      navigate('verificationStepOne');
    }

    if (what === 'discover') {
      await isCreator('no');

      navigate('discover');
    }

    dispatch(toggleAreYou({show: false}));
  };

  return (
    visible && (
      <View style={styles.overlay}>
        <BlurView intensity={15} tint="dark" style={styles.blurBackground} />
        <Dialog visible={visible} dialogStyle={styles.dialog} contentStyle={{padding: 0, paddingTop: 0}}>
          <View style={styles.content}>
            <View style={styles.yesNoContainer}>
              <Text style={styles.textYesNo} numberOfLines={1}>
                Are you a "CREATOR" ?
              </Text>

              <View style={styles.buttonContainer}>
                <Pressable onPress={() => handleButtonPress('verificationStepOne')} style={({pressed}) => [styles.button, styles.yesButton, pressed && {backgroundColor: '#FFC399'}]}>
                  <Text style={styles.yesButtonText}>Yes</Text>
                </Pressable>

                <Pressable onPress={() => handleButtonPress('discover')} style={({pressed}) => [styles.button, styles.noButton, pressed && {backgroundColor: '#2A2A2A'}]}>
                  <Text style={styles.noButtonText}>No</Text>
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
    borderRadius: 20,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignSelf: 'center',
    padding: 32,
    backgroundColor: '#121212',
    width: responsiveWidth(88),
    height: responsiveWidth(44),
    borderColor: '#1E1E1E',
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
    fontSize: 22,
    lineHeight: 26,
    textAlign: 'center',
    color: '#FFFFFF',
    width: '100%',
    flexShrink: 1,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: Platform.OS === 'ios' ? 4 : 0,
    width: '100%',
    marginTop: Platform.OS === 'ios' ? 16 : 12,
  },
  button: {
    width: responsiveWidth(34.5),
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: Platform.OS === 'android' ? 6 : 8,
    borderWidth: 1.5,
  },
  yesButton: {
    backgroundColor: '#FFA86B',
    borderColor: '#FF7819',
  },
  noButton: {
    backgroundColor: '#1C1C1C',
    borderColor: '#212121',
  },
  yesButtonText: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: 16,
    lineHeight: 19,
    textAlign: 'center',
    color: '#1E1E1E',
  },
  noButtonText: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: 16,
    lineHeight: 19,
    textAlign: 'center',
    color: '#FFFFFF',
  },
});

export default AreYou;
