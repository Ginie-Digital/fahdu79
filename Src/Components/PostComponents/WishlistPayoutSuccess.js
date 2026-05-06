import {StyleSheet, Text, View} from 'react-native';
import React from 'react';
import {responsiveWidth, responsiveFontSize} from 'react-native-responsive-dimensions';
import {Image} from 'expo-image';
import AnimatedButton from '../AnimatedButton';
import {navigate} from '../../../Navigation/RootNavigation';

const WishlistPayoutSuccess = () => {
  const handleOkay = () => {
    navigate('home');
  };

  return (
    <View style={styles.container}>
      <View style={styles.contentContainer}>
        {/* Success Icon - You can add your image here */}
        <View style={styles.iconContainer}>
          <Image source={require('../../../Assets/Images/WishlistPayoutSuccess.png')} style={styles.icon} contentFit="contain" />
        </View>

        {/* Title */}
        <Text style={styles.title}>Payout Requested!</Text>

        {/* Description */}
        <Text style={styles.description}>
          Your payout will be processed within <Text style={styles.boldText}>3-5 business days</Text>. You will receive updates via notifications.
        </Text>

        {/* Button - You can add your button component here */}
        <View style={styles.buttonContainer}>
          <AnimatedButton onPress={() => handleOkay()} title={'Okay, Got it!'} showOverlay={true} overlayStyle={{backgroundColor: '#FF7819'}} />
        </View>
      </View>
    </View>
  );
};

export default WishlistPayoutSuccess;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: responsiveWidth(5),
  },
  contentContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginBottom: responsiveWidth(8),
  },
  icon: {
    width: responsiveWidth(20),
    height: responsiveWidth(20),
  },
  title: {
    fontFamily: 'Rubik-Bold',
    fontSize: responsiveFontSize(3.2),
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: responsiveWidth(4),
  },
  description: {
    fontFamily: 'Rubik-Regular',
    fontSize: responsiveFontSize(2),
    color: '#d1d1d1',
    textAlign: 'center',
    lineHeight: responsiveFontSize(2.8),
    paddingHorizontal: responsiveWidth(2),
    marginBottom: responsiveWidth(10),
  },
  boldText: {
    fontFamily: 'Rubik-Bold',
    color: '#ffffff',
  },
  buttonContainer: {
    width: '100%',
    marginTop: responsiveWidth(4),
  },
});
