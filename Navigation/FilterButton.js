import React from 'react';
import {TouchableOpacity, StyleSheet} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {useDispatch} from 'react-redux';
import {setDiscoverFilter} from '../Redux/Slices/NormalSlices/HideShowSlice';

const FilterButton = () => {
  const dispatch = useDispatch();

  const handleShowModal = () => {
    dispatch(setDiscoverFilter({show: true}));
  };

  return (
    <TouchableOpacity style={styles.filterButton} onPress={handleShowModal}>
      <Ionicons name="options-outline" size={24} color="#000" />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#000',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
});

export default FilterButton;
