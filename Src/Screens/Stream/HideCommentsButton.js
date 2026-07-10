import React from 'react';
import {View, Pressable, Text, StyleSheet} from 'react-native';
import {responsiveWidth} from 'react-native-responsive-dimensions';
import DIcon from '../../../DesiginData/DIcons';
import {WIDTH_SIZES} from '../../../DesiginData/Utility';
import {useAppTheme} from '../../Hook/useAppTheme';

const HideCommentsButton = ({isHidden, toggleComments}) => {
  const {isDark} = useAppTheme();

  return (
    <View style={styles.container}>
      <Pressable
        onPress={toggleComments}
        style={({pressed}) => [
          styles.button,
          {
            backgroundColor: isDark
              ? (pressed ? 'rgba(30, 30, 30, 0.75)' : 'rgba(30, 30, 30, 0.54)')
              : (pressed ? '#1E1E1E55' : '#1E1E1E33'),
          },
        ]}>
        <Text style={styles.text}>
          {isHidden ? 'Show' : 'Hide'} Comments
        </Text>
        <DIcon
          provider="AntDesign"
          name={isHidden ? 'down' : 'up'}
          color="#fff"
          size={responsiveWidth(3)}
        />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
    marginLeft: WIDTH_SIZES[2],
    bottom: 0,
  },
  button: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: responsiveWidth(2),
    paddingVertical: responsiveWidth(1),
    paddingHorizontal: responsiveWidth(2),
    borderRadius: WIDTH_SIZES[20] + WIDTH_SIZES[2],
    width: WIDTH_SIZES[150],
    height: WIDTH_SIZES[32],
  },
  text: {
    color: '#fff',
    fontSize: responsiveWidth(3.5),
    fontFamily: 'Rubik-Medium',
  },
});

export default HideCommentsButton;
