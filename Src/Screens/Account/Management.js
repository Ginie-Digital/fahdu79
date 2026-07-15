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
    <View style={[styles.container, {backgroundColor: isDark ? '#121212' : '#FFFFFF'}]}>
      <Pressable
        style={({pressed}) => [
          styles.cardWrapper,
          {
            backgroundColor: isDark
              ? '#171717'
              : (pressed ? '#FFE6D5' : '#FFF9F5'),
            borderColor: isDark ? '#1F1F1F' : '#1e1e1e',
            borderWidth: isDark ? 1.5 : WIDTH_SIZES['1.5'],
          }
        ]}
        onPress={() => navigate('deleteaccount')}>
        <View style={styles.topRow}>
          <Text style={[styles.heading, {color: isDark ? '#FFFFFF' : '#1e1e1e'}]}>Permanently Remove Account</Text>
          <DIcon provider="Entypo" name="chevron-right" size={responsiveWidth(4.5)} color={isDark ? '#FFFFFF' : '#1e1e1e'} />
        </View>

        <Text style={[styles.description, {color: isDark ? '#FFFFFF' : '#1e1e1e'}]}>
          Erase your presence with “Permanently Remove Account”. A one way journey to a clean state.
        </Text>
      </Pressable>
    </View>
  );
};

export default Management;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 16,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  cardWrapper: {
    borderStyle: 'dashed',
    borderRadius: 14,
    padding: 20,
    width: '100%',
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
