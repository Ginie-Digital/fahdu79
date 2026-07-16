import React from 'react';
import {View, Text, StyleSheet, Linking, Alert, Platform} from 'react-native';
import {Dialog} from 'react-native-simple-dialogs';
import AnimatedButton from '../../Components/AnimatedButton';
import {responsiveFontSize, responsiveHeight, responsiveWidth} from 'react-native-responsive-dimensions';
import {BlurView} from 'expo-blur';
import {Image} from 'expo-image';
import {navigate} from '../../../Navigation/RootNavigation';
import {nTwins} from '../../../DesiginData/Utility';
import { useDispatch } from 'react-redux';
import { toggleAppliedVerify } from '../../../Redux/Slices/NormalSlices/HideShowSlice';
import {useAppTheme} from '../../Hook/useAppTheme';

const VerifiedModal = ({visible, type = undefined, onClose}) => {
  const {colors, isDark} = useAppTheme();
  console.log(visible, 'VERIFIED MODAL');

  const dispatch = useDispatch()

  const handleClose = () => {
    if(type === "dashboard") {
      dispatch(toggleAppliedVerify({show: false}));
    }
    if (onClose) {
      onClose();
    }
    navigate('home');
  }

  return (
    visible && (
      <View style={styles.overlay}>
        <BlurView experimentalBlurMethod intensity={15} style={styles.blurBackground} />
        <Dialog visible={visible} dialogStyle={[styles.dialog, isDark && {backgroundColor: colors.card, borderColor: colors.border}]} contentStyle={{padding: 0, paddingTop: 0}} onTouchOutside={handleClose}>
          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <Image source={require('../../../Assets/Images/fahduLogoNew.png')} contentFit="contain" style={{flex: 1}} />
            </View>
            <Text style={{fontFamily: 'Rubik-Bold', fontSize: 22, color: isDark ? colors.text : '#1e1e1e', marginTop: responsiveWidth(3.8)}}>Congratulations!</Text>
            <Text style={{fontFamily: 'Rubik-Regular ', fontSize: 14, color: isDark ? colors.textSecondary : '#1e1e1e', marginTop: responsiveWidth(2), textAlign: 'center'}}>
              {type === 'dashboard' ? "Your Bank details are updated \nsuccessfully. You will recieve a \nconfirmation email within 24-48 hours." : "Your application has been submitted successfully.You will receive a \n confirmation email within 24-48 hours."}
            </Text>
            <View style={{width: '100%', alignSelf: 'center'}}>
              <AnimatedButton title={'Back to Home'} buttonMargin={Platform.OS === 'android' ? 5 : 3} onPress={handleClose} showOverlay={false} isDark={isDark} />
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
    backgroundColor: '#fff',
    width: responsiveWidth(92),
    // height: nTwins(77, 71.85),
    borderColor: '#1e1e1e',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: responsiveFontSize(2.46),
    textAlign: 'center',
    lineHeight: responsiveWidth(6.93),
    marginVertical: 16,
    textTransform: 'capitalize',
    color: '#1e1e1e',
    width: responsiveWidth(75),
  },
  iconContainer: {
    height: 45,
    width: 40,
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

export default VerifiedModal;
