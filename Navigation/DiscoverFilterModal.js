import React, {useState, useEffect} from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import Modal from 'react-native-modal';
import {useDispatch, useSelector} from 'react-redux';
import {WIDTH_SIZES} from '../DesiginData/Utility';
import {setDiscoverFilter} from '../Redux/Slices/NormalSlices/HideShowSlice';

const FILTERS = [
  {label: 'All', value: 'all'},
  {label: 'Online', value: 'online'},
];

export default function DiscoverFilterModal() {
  const dispatch = useDispatch();

  const {type, visible} = useSelector(state => state.hideShow.visibility.discoverFilter);

  // keep your console if you need it
  // console.log(visible);

  const [selected, setSelected] = useState('all');

  // Sync redux -> local (keeps behavior same)
  useEffect(() => {
    if (type) {
      setSelected(type);
    } else {
      setSelected('all');
    }
  }, [type]);

  const handleSelect = value => {
    dispatch(setDiscoverFilter({show: false, type: value}));
  };

  const handleCloseWithoutSave = () => {
    dispatch(setDiscoverFilter({show: false})); // won't touch type
  };

  if (!visible) return;

  return (
    <Modal isVisible={visible} onBackdropPress={handleCloseWithoutSave} backdropOpacity={0.2} style={styles.modal} useNativeDriver>
      <View style={styles.container}>
        {FILTERS.map((item, idx) => (
          <View key={item.value}>
            <TouchableOpacity activeOpacity={0.8} style={[styles.option, selected === item.value && styles.optionActive]} onPress={() => handleSelect(item.value)}>
              {/* Radio circle */}
              <View style={styles.radioOuter}>{selected === item.value && <View style={[styles.radioInner, item.value === 'online' ? styles.radioInnerOnline : styles.radioInnerAll]} />}</View>

              {/* Label */}
              <Text style={[styles.optionText, selected === item.value && styles.optionTextActive]}>{item.label}</Text>
            </TouchableOpacity>

            {/* Divider except after last item */}
            {idx < FILTERS.length - 1 && <View style={styles.divider} />}
          </View>
        ))}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: {
    // top-right popup like your screenshot
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    margin: 0,
    paddingTop: 70, // tweak to align under your header/button
    paddingRight: 16,
  },

  container: {
    width: 160,
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 10,
    // subtle border similar to screenshot
    borderWidth: 1,
    borderColor: '#e6e6e6',

    // shadow
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 6},
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 10,
  },

  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 6,
  },

  optionActive: {
    // keep background white — active visual is dot + bolder text; remove if you want colored background
    // backgroundColor: '#fff7f0',
  },

  radioOuter: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#3a3a3a',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  radioInnerOnline: {
    backgroundColor: '#2ecc71', // green
  },

  radioInnerAll: {
    backgroundColor: '#8F8F8F', // dark grey
  },

  optionText: {
    fontSize: 15,
    color: '#1e1e1e',
    fontFamily: 'Rubik-Medium',
  },

  optionTextActive: {
    fontFamily: 'Rubik-SemiBold',
  },

  divider: {
    height: 1,
    backgroundColor: '#ededed',
    marginHorizontal: 6,
  },
});
