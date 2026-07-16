import React from 'react';
import {TouchableOpacity, View, StyleSheet} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import {WIDTH_SIZES} from '../../DesiginData/Utility';
import {useAppTheme} from '../Hook/useAppTheme';

function CustomCheckbox({checked, onToggle, disabled}) {
  const {colors, isDark} = useAppTheme();

  console.log("Checked", checked)

  return (
    <TouchableOpacity onPress={disabled ? null : onToggle} activeOpacity={disabled ? 1 : 0.7} style={[styles.wrapper, isDark && {borderColor: colors.border}, disabled && styles.disabledWrapper]}>
      <View style={[styles.box, checked && styles.checked, isDark && {backgroundColor: colors.card}, checked && isDark && {backgroundColor: colors.accent}, disabled && styles.disabledBox]}>{checked && <Feather name="check" size={12} color="#1e1e1e" />}</View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: WIDTH_SIZES[16],
    height: WIDTH_SIZES[16],
    borderRadius: WIDTH_SIZES[4],
    borderWidth: WIDTH_SIZES[1.5],
    borderColor: '#1e1e1e',
  },
  disabledWrapper: {
    opacity: 0.4,
  },
  box: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checked: {
    backgroundColor: '#FFA86B',
  },
  disabledBox: {
    backgroundColor: '#f0f0f0',
  },
});

export default CustomCheckbox;
