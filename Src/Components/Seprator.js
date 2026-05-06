import {Platform, StyleSheet, Text, View} from 'react-native';
import React from 'react';
import {responsiveWidth, responsiveFontSize} from 'react-native-responsive-dimensions';
import { LinearGradient } from 'expo-linear-gradient';
import {nTwins} from '../../DesiginData/Utility';
const Seprator = () => {
  return (
    <View style={styles.sepratorContainer}>
      <LinearGradient colors={['#FFFDF650', '#282828', '#282828', '#FFFDF650']} style={styles.linearGradient}>
        <View style={{height: 2}} />
      </LinearGradient>

      <Text style={styles.connectWith}>Or</Text>
    </View>
  );
};

export default Seprator;

const styles = StyleSheet.create({
  sepratorContainer: {
    // borderWidth: 1,
    width: nTwins(86, 92),

    // justifyContent: "center",

    marginTop: Platform.OS === 'android' ? 16 : null,
    alignSelf: 'center',
    // paddingVertical: responsiveWidth(1),
    borderColor: '#1e1e1e',
    // marginVertical : responsiveWidth(16),
    // backgroundColor :" red"
  },
  connectWith: {
    fontFamily: 'Rubik-Medium',
    color: '#1e1e1e',
    backgroundColor: 'white',
    alignSelf: 'center',
    textAlign: 'center',
    flex: 0,
    position: 'absolute',
    bottom: -8,
    paddingHorizontal: responsiveWidth(2),
  },
});
