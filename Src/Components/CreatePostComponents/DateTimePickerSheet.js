import {StyleSheet, View, TouchableOpacity, Text, Pressable, ActivityIndicator} from 'react-native';
import React, {useMemo, useCallback, useRef, useState} from 'react';
import {responsiveWidth, responsiveFontSize} from 'react-native-responsive-dimensions';
import BottomSheet, {BottomSheetBackdrop} from '@gorhom/bottom-sheet';
import DatePicker from 'react-native-date-picker';
import {useDispatch, useSelector} from 'react-redux';
import {confirmDateTimePicker, toggleDateTimePicker} from '../../../Redux/Slices/NormalSlices/HideShowSlice';
import {padios} from '../../../DesiginData/Utility';
import {Image} from 'expo-image';
import AnimatedButton from '../AnimatedButton';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import dayjs from 'dayjs';

const DateTimePickerSheet = () => {
  const bottomSheetRef = useRef(null);
  const insets = useSafeAreaInsets();

  const dispatch = useDispatch();

  const dateTimeVisibility = useSelector(state => state.hideShow.visibility.dateTimePicker);
  const {date: dateString, type} = useSelector(state => state.hideShow.visibility.dateTimePickerData);
  
  const [tempDate, setTempDate] = useState(new Date(Date.now() + 120000)); // Default to +2 mins

  const snapPoints = useMemo(() => ['25%', '50%'], []);

  // Stable limits
  const currentDate = useMemo(() => new Date(), []);
  const maxDate = useMemo(() => {
    return dayjs().subtract(13, 'year').endOf('day').toDate();
  }, []);

  // Update tempDate when sheet opens
  React.useEffect(() => {
    if (dateTimeVisibility === 1) {
      if (type === 'dob') {
        const existingDate = new Date(dateString);
        // If current date in Redux is valid (<= maxDate), use it. Otherwise, default to maxDate.
        if (existingDate && existingDate.getTime() <= maxDate.getTime()) {
          setTempDate(existingDate);
        } else {
          setTempDate(new Date(maxDate.getTime()));
        }
      } else {
        setTempDate(new Date(Date.now() + 120000));
      }
    }
  }, [dateTimeVisibility, type, dateString, maxDate]);

  const handleSheetChanges = useCallback(index => {
    if (index === -1) {
      dispatch(toggleDateTimePicker({show: -1}));
    } else if (index === 1) {
      dispatch(toggleDateTimePicker({show: 1}));
    }
  }, [dispatch]);

  const renderBackdrop = useCallback(
    props => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.1} />,
    [],
  );

  const handleProceed = useCallback(() => {
    if (type === 'datetime') {
      if (tempDate.getTime() < Date.now()) {
        const {LoginPageErrors} = require('../../../Src/Components/ErrorSnacks');
        LoginPageErrors('Please select a future time');
        return;
      }
    } else if (type === 'dob') {
      if (tempDate.getTime() > maxDate.getTime()) {
        const {LoginPageErrors} = require('../../../Src/Components/ErrorSnacks');
        LoginPageErrors('You must be at least 13 years old');
        return;
      }
    }
    dispatch(confirmDateTimePicker({date: tempDate.toISOString()}));
    bottomSheetRef.current.close();
  }, [tempDate, type, dispatch, maxDate]);

  const handleDateChange = useCallback((newDate) => {
    if (type === 'dob' && newDate.getTime() > maxDate.getTime()) {
      // Create a NEW Date reference to force UI update/snap-back
      setTempDate(new Date(maxDate.getTime()));
    } else {
      setTempDate(newDate);
    }
  }, [type, maxDate]);

  return (
    <BottomSheet
      handleIndicatorStyle={{display: 'none'}}
      snapPoints={snapPoints}
      ref={bottomSheetRef}
      index={dateTimeVisibility}
      onChange={handleSheetChanges}
      enablePanDownToClose={true}
      backdropComponent={renderBackdrop}
      backgroundStyle={{backgroundColor: '#fff'}}>
      <View style={[styles.contentContainer, {paddingBottom: insets.bottom || 20}]}>
        <View style={styles.mainContainer}>
          <View style={styles.textContainer}>
            <Text style={styles.heading}>{type === 'dob' ? 'Date of Birth' : 'Schedule your post'}</Text>

            <Text style={styles.description}>Choose the date below.</Text>
          </View>
          <TouchableOpacity style={{height: 12, width: 12}} onPress={() => bottomSheetRef.current.close()}>
            <Image source={require('../../../Assets/Images/Crosss.png')} contentFit="contain" style={{flex: 1}} />
          </TouchableOpacity>
        </View>

        <DatePicker
          date={tempDate}
          minimumDate={type === 'datetime' ? currentDate : null}
          maximumDate={type === 'dob' ? maxDate : null}
          onDateChange={handleDateChange}
          style={{alignSelf: 'center'}}
          mode={type === 'dob' ? 'date' : 'datetime'}
          textColor="#282828"
          theme="light"
          androidVariant="iosClone"
        />
        <View style={{width: responsiveWidth(87.5), alignSelf: 'center'}}>
          <AnimatedButton title={'Proceed'} showOverlay={true} buttonMargin={0} onPress={handleProceed} />
        </View>
      </View>
    </BottomSheet>
  );
};

export default DateTimePickerSheet;

const styles = StyleSheet.create({
  contentContainer: {
    paddingHorizontal: responsiveWidth(5),
    paddingTop: 10,
    backgroundColor: '#fff',
  },
  mainContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  textContainer: {},
  heading: {
    fontSize: responsiveFontSize(2),
    color: '#000',
    fontFamily: 'Outfit-Bold',
  },
  description: {
    fontSize: responsiveFontSize(1.5),
    color: '#7C7C7C',
    fontFamily: 'Outfit-Regular',
  },
});
