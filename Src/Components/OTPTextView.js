import React, { useRef, useState, useEffect } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';

const OTPTextView = ({
  defaultValue = '',
  inputCount = 4,
  containerStyle = {},
  textInputStyle = {},
  tintColor = '#3CB371',
  offTintColor = '#DCDCDC',
  handleTextChange = () => {},
  keyboardType = 'numeric',
  disabled = false,
  testID,
  testIDPrefix = 'otp_input_',
  ...textInputProps
}) => {
  const [values, setValues] = useState(() => {
    const initial = Array(inputCount).fill(' ');
    for (let i = 0; i < Math.min(defaultValue.length, inputCount); i++) {
      initial[i] = defaultValue[i] || ' ';
    }
    return initial;
  });

  const [focusedIndex, setFocusedIndex] = useState(0);
  const inputsRef = useRef([]);

  useEffect(() => {
    const realOtp = values.map(v => (v === ' ' ? '' : v)).join('');
    handleTextChange(realOtp);
  }, [values]);

  const handleChangeText = (text, index) => {
    let newValues = [...values];

    if (text === '') {
      newValues[index] = ' ';
      setValues(newValues);
      
      if (index > 0) {
        newValues[index - 1] = ' ';
        setValues(newValues);
        inputsRef.current[index - 1]?.focus();
      }
      return;
    }

    const cleanText = text.replace(' ', '');
    if (cleanText.length > 0) {
      const char = cleanText[cleanText.length - 1];
      newValues[index] = char;
      setValues(newValues);

      if (index < inputCount - 1) {
        inputsRef.current[index + 1]?.focus();
      }
    } else {
      newValues[index] = ' ';
      setValues(newValues);
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace') {
      if (values[index] === ' ' && index > 0) {
        let newValues = [...values];
        newValues[index - 1] = ' ';
        setValues(newValues);
        inputsRef.current[index - 1]?.focus();
      }
    }
  };

  const textInputs = [];
  for (let i = 0; i < inputCount; i++) {
    const isFocused = focusedIndex === i;
    const currentTintColor = Array.isArray(tintColor) ? tintColor[i] : tintColor;
    const currentOffTintColor = Array.isArray(offTintColor) ? offTintColor[i] : offTintColor;

    const borderStyle = {
      borderColor: isFocused ? currentTintColor : currentOffTintColor,
    };

    textInputs.push(
      <TextInput
        key={i}
        ref={el => (inputsRef.current[i] = el)}
        style={[styles.textInput, textInputStyle, borderStyle]}
        value={values[i]}
        onChangeText={text => handleChangeText(text, i)}
        onKeyPress={e => handleKeyPress(e, i)}
        keyboardType={keyboardType}
        maxLength={2}
        selectTextOnFocus={true}
        onFocus={() => setFocusedIndex(i)}
        onBlur={() => {
          if (focusedIndex === i) {
            setFocusedIndex(-1);
          }
        }}
        editable={!disabled}
        autoCorrect={false}
        autoCapitalize="none"
        testID={`${testID || testIDPrefix}${i}`}
        {...textInputProps}
      />
    );
  }

  return (
    <View style={[styles.container, containerStyle]}>
      {textInputs}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  textInput: {
    borderBottomWidth: 4,
    color: '#000000',
    fontSize: 22,
    fontWeight: '500',
    height: 50,
    margin: 5,
    textAlign: 'center',
    width: 50,
  },
});

export default OTPTextView;
