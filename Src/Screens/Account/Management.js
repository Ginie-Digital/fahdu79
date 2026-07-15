import {StyleSheet, Text, View, Pressable} from 'react-native';
import React from 'react';
import {responsiveFontSize, responsiveWidth} from 'react-native-responsive-dimensions';
import {navigate} from '../../../Navigation/RootNavigation';
import DIcon from '../../../DesiginData/DIcons';
import {FONT_SIZES, WIDTH_SIZES} from '../../../DesiginData/Utility';
import {useAppTheme} from '../../Hook/useAppTheme';

const Management = () => {
  const {colors, isDark} = useAppTheme();

  return (
    <View style={[styles.container, {backgroundColor: colors.background}]}>
      <Pressable
        style={({pressed}) => [
          styles.cardWrapper,
          {
            borderColor: isDark ? colors.accent : '#1e1e1e',
            backgroundColor: pressed
              ? (isDark ? colors.pressed : '#FFE6D5')
              : (isDark ? 'rgba(255, 168, 107, 0.1)' : '#FFF9F5'),
          },
        ]}
        onPress={() => navigate('deleteaccount')}>
        <View style={styles.topRow}>
          <Text style={[styles.heading, {color: colors.text}]}>Permanently Remove Account</Text>
          <DIcon provider="Entypo" name="chevron-right" size={responsiveWidth(4.5)} color={colors.text} />
        </View>

        <Text style={[styles.description, {color: colors.textSecondary}]}>
          Erase your presence with <Text style={{color: isDark ? colors.accent : '#1e1e1e'}}>“Permanently Remove Account”.</Text> A one way journey to a clean state.
        </Text>
      </Pressable>
    </View>
  );
};

export default Management;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: responsiveWidth(10),
    paddingHorizontal: responsiveWidth(5),
    alignItems: 'center',
  },
  cardWrapper: {
    borderWidth: WIDTH_SIZES['1.5'],
    borderStyle: 'dashed',
    borderRadius: WIDTH_SIZES['14'],
    padding: responsiveWidth(4),
    width: responsiveWidth(85),
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: responsiveWidth(2.5),
  },
  heading: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: FONT_SIZES['16'],
    width: '85%',
  },
  description: {
    fontFamily: 'Rubik-Regular',
    fontSize: FONT_SIZES['12'],
    lineHeight: responsiveFontSize(2.3),
    width: '85%',
    textAlign: 'left',
  },
});
