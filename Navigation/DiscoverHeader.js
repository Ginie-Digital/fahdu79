import React from 'react';
import {View, TextInput, StyleSheet, Dimensions, Platform} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {WIDTH_SIZES} from '../DesiginData/Utility';
import {navigate} from './RootNavigation';
import { useAppTheme } from '../Src/Hook/useAppTheme';

const {width: screenWidth} = Dimensions.get('window');

const DiscoverHeader = () => {
  const { colors, isDark } = useAppTheme();

  return (
    <View style={styles.headerWrapper}>
      <View style={[styles.searchContainer, { backgroundColor: isDark ? colors.card : '#fff', borderColor: isDark ? colors.border : '#000' }]}>
        <Ionicons name="search-outline" size={20} color="#666666" style={styles.searchIcon} />
        <TextInput
          onPress={() => navigate('creatorSearch')}
          keyboardAppearance={isDark ? 'dark' : 'default'}
          style={[styles.input, { color: isDark ? colors.text : '#000' }]}
          placeholder="Discover here..."
          placeholderTextColor={isDark ? '#666666' : '#999'}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerWrapper: {
    width: screenWidth - 100,
    marginLeft: Platform.OS === 'ios' ? 16 : 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: WIDTH_SIZES['14'],
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    padding: 0,
    fontFamily: 'Rubik-Regular',
  },
});

export default DiscoverHeader;
