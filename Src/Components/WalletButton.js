import React from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import Animated, {useSharedValue, withSpring} from 'react-native-reanimated';
import {responsiveWidth} from 'react-native-responsive-dimensions';
import SmoothLoader from './SmootheLoader';
import {useSelector} from 'react-redux';
import AnimatedButton from './AnimatedButton';

const WalletButton = ({title, packId, onPress}) => {
  const shadowOpacity = useSharedValue(0.3);
  const translateY = useSharedValue(2);
  const translateX = useSharedValue(0);

  console.log('Is this function', onPress, packId);

  const currentButton = useSelector(state => state.hideShow.visibility.walletLoader);

  // const handlePressIn = () => {
  //   if (!loading) {
  //     shadowOpacity.value = withSpring(0, {damping: 10, stiffness: 100});
  //     translateY.value = withSpring(4);
  //     translateX.value = withSpring(3.5);
  //   }
  // };

  // const handlePressOut = () => {
  //   if (!loading) {
  //     shadowOpacity.value = withSpring(0.6, {damping: 10, stiffness: 100});
  //     translateY.value = withSpring(2);
  //     translateX.value = withSpring(0);
  //     onPress && onPress();
  //   }7
  // };

  return (
    // <Pressable style={{marginTop: responsiveWidth(2)}}  >
    //   <View style={styles.overlayButton} />
    //   <Animated.View style={[styles.buttonContainer, {transform: [{translateY}, {translateX}]}]}>
    //     <Animated.View style={[styles.button,]}>
    //       <SmoothLoader loading={packId === currentButton} title={title} />
    //     </Animated.View>
    //   </Animated.View>
    // </Pressable>

    <View style={styles.buttonContainer}>
      <AnimatedButton overlayStyle={{height: responsiveWidth(9), borderRadius: 12}} title={title} loading={packId != null && packId === currentButton} style={{height: responsiveWidth(9), borderRadius: 12}} buttonMargin={0} onPress={() => onPress(packId)} />
    </View>
  );
};

const styles = StyleSheet.create({
  overlayButton: {
    width: responsiveWidth(26),
    height: responsiveWidth(9),
    borderRadius: responsiveWidth(2),
    backgroundColor: 'black',
    position: 'absolute',
    transform: [
      {translateX: responsiveWidth(0.6)}, // Move along the X-axis
      {translateY: responsiveWidth(1)},
    ],
  },
  buttonContainer: {
    width: responsiveWidth(26),
    height: responsiveWidth(9),
    borderRadius: responsiveWidth(2),
    borderColor: 'black',
    alignSelf: 'flex-start',
    // backgroundColor : 'red',
    marginTop: responsiveWidth(2),
  },
  button: {
    width: '100%',
    height: '100%',
    borderRadius: responsiveWidth(2),
    backgroundColor: 'rgba(255, 168, 107, 1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
});

export default WalletButton;
