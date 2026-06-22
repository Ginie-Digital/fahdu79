import React from 'react';
import {View, TextInput, StyleSheet, Dimensions, Platform} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {WIDTH_SIZES} from '../DesiginData/Utility';
import {navigate} from './RootNavigation';

const {width: screenWidth} = Dimensions.get('window');

const DiscoverHeader = () => {
  return (
    <View style={styles.headerWrapper}>
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color="#666666" style={styles.searchIcon} />
        <TextInput onPress={() => navigate('creatorSearch')} keyboardAppearance="dark" style={styles.input} placeholder="Discover here..." placeholderTextColor="#666666" />
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
    backgroundColor: '#1A1A1A',
    borderRadius: WIDTH_SIZES['14'],
    borderWidth: 1.5,
    borderColor: '#2A2A2A',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
    padding: 0,
    fontFamily: 'Rubik-Regular',
  },
});

export default DiscoverHeader;
