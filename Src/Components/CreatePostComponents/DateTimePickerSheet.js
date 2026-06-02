import {StyleSheet, View, TouchableOpacity, Text, Pressable, Dimensions, Animated, BackHandler, Platform} from 'react-native';
import React, {useMemo, useCallback, useRef, useState, useEffect} from 'react';
import {responsiveWidth, responsiveFontSize} from 'react-native-responsive-dimensions';
import DatePicker from 'react-native-date-picker';
import {useDispatch, useSelector} from 'react-redux';
import {confirmDateTimePicker, toggleDateTimePicker} from '../../../Redux/Slices/NormalSlices/HideShowSlice';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import dayjs from 'dayjs';
import {BlurView} from 'expo-blur';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import Ionicons from 'react-native-vector-icons/Ionicons';

const WINDOW_HEIGHT = Dimensions.get('window').height;

const DateTimePickerSheet = () => {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();

  const dateTimeVisibility = useSelector(state => state.hideShow.visibility.dateTimePicker);
  const {date: dateString, type} = useSelector(state => state.hideShow.visibility.dateTimePickerData);

  const [tempDate, setTempDate] = useState(new Date(Date.now() + 120000));
  const [shouldRender, setShouldRender] = useState(false);
  const [error, setError] = useState(null);
  const slideAnim = useRef(new Animated.Value(WINDOW_HEIGHT)).current;

  // Stable limits
  const currentDate = useMemo(() => new Date(), []);
  const maxDate = useMemo(() => {
    return dayjs().subtract(16, 'year').endOf('day').toDate();
  }, []);

  useEffect(() => {
    if (dateTimeVisibility === 1) {
      if (type === 'dob') {
        const existingDate = new Date(dateString);
        if (existingDate && existingDate.getTime() <= maxDate.getTime()) {
          setTempDate(existingDate);
        } else {
          setTempDate(new Date(maxDate.getTime()));
        }
      } else {
        setTempDate(new Date(Date.now() + 120000));
      }

      setError(null);
      setShouldRender(true);
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }).start();

      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        handleClose();
        return true;
      });
      return () => backHandler.remove();
    } else {
      Animated.timing(slideAnim, {
        toValue: WINDOW_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }).start(() => {
        requestAnimationFrame(() => {
          setShouldRender(false);
        });
      });
    }
  }, [dateTimeVisibility]);

  const handleClose = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: WINDOW_HEIGHT,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      dispatch(toggleDateTimePicker({show: -1}));
      requestAnimationFrame(() => {
        setShouldRender(false);
      });
    });
  }, [dispatch, slideAnim]);

  const handleProceed = useCallback(() => {
    if (type === 'datetime') {
      const minRequiredTime = Date.now() + 120000;
      if (tempDate.getTime() < minRequiredTime) {
        setError('Post must be scheduled at least 2 minutes in advance');
        return;
      }
    } else if (type === 'dob') {
      const calculatedAge = dayjs().diff(tempDate, 'year');
      if (calculatedAge < 16) {
        setError('You must be at least 16 years old');
        return;
      }
    }
    setError(null);
    dispatch(confirmDateTimePicker({date: tempDate.toISOString()}));
    handleClose();
  }, [tempDate, type, dispatch, maxDate, handleClose]);

  const handleDateChange = useCallback((newDate) => {
    setTempDate(newDate);
    if (type === 'datetime') {
      const minRequiredTime = Date.now() + 120000;
      if (newDate.getTime() < minRequiredTime) {
        setError('Minimum 2 minutes gap required');
      } else {
        setError(null);
      }
    } else {
      setError(null);
    }
  }, [type]);

  // Formatted preview of selected date + age calculation
  const {formattedDate, age} = useMemo(() => {
    if (type === 'dob') {
      const calculatedAge = dayjs().diff(tempDate, 'year');
      return {
        formattedDate: dayjs(tempDate).format('MMM D, YYYY'),
        age: calculatedAge > 0 ? calculatedAge : null
      };
    }
    return {
      formattedDate: dayjs(tempDate).format('MMM D, YYYY  •  h:mm A'),
      age: null
    };
  }, [tempDate, type]);

  const isAgeInvalid = type === 'dob' && (!age || age < 16);

  if (!shouldRender) return null;

  return (
    <View style={styles.overlay}>
      <BlurView intensity={15} style={styles.blurBackground} />
      <Pressable style={styles.touchOutside} onPress={handleClose} />
      <Animated.View
        style={[
          styles.dialog,
          {
            transform: [{translateY: slideAnim}],
          },
        ]}>
        
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View style={styles.titleContainer}>
              <Text style={styles.title}>
                {type === 'dob' ? 'Date of Birth' : 'Schedule Post'}
              </Text>
              <Text style={styles.subtitle}>
                {type === 'dob' ? 'Verify your age to continue' : 'Pick a date & time to publish'}
              </Text>
            </View>
            <View style={[styles.iconCircle, { backgroundColor: '#F5F2ED' }]}>
              <Ionicons 
                name={type === 'dob' ? 'person-outline' : 'calendar'} 
                size={24} 
                color="#1e1e1e" 
              />
            </View>
          </View>
        </View>

        {/* Selected date preview with Age/Context */}
        <View style={styles.datePreview}>
          <Text style={styles.datePreviewText}>
            {type === 'datetime' ? (
              <>
                <Text style={styles.schedulingLabel}>Scheduling for: </Text>
                <Text style={styles.highlightedValue}>{dayjs(tempDate).format('MMM D, YYYY')}</Text>
                <Text style={styles.separatorText}>  •  </Text>
                <Text style={styles.highlightedValue}>{dayjs(tempDate).format('h:mm A')}</Text>
              </>
            ) : (
              <>
                {dayjs(tempDate).format('MMM D, YYYY')}
                {age && (
                  <Text style={styles.ageText}>  •  {age} years old</Text>
                )}
              </>
            )}
          </Text>
        </View>

        {/* Date Picker */}
        <View style={styles.pickerContainer}>
          <DatePicker
            date={tempDate}
            minimumDate={type === 'datetime' ? new Date(Date.now() + 120000) : null}
            maximumDate={type === 'dob' ? currentDate : null}
            onDateChange={handleDateChange}
            style={{alignSelf: 'center'}}
            mode={type === 'dob' ? 'date' : 'datetime'}
            textColor="#282828"
            theme="light"
            androidVariant="iosClone"
          />
        </View>

        {/* Footer Actions (matching chatroom modal style) */}
        <View style={[styles.footer, {paddingBottom: (insets.bottom || 20) + 10}]}>
          <TouchableOpacity onPress={handleClose} style={styles.cancelButton}>
             <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={handleProceed} 
            disabled={isAgeInvalid}
            style={[
              styles.doneButton, 
              error && styles.errorButton,
              isAgeInvalid && { backgroundColor: '#CBCBCB' }
            ]}
            activeOpacity={0.8}
          >
            <Text style={[
              styles.doneText,
              error && styles.errorText,
              isAgeInvalid && { color: '#8E8E8E' }
            ]}>
              {error ? error : (type === 'dob' ? 'Confirm' : 'Apply')}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
};

export default DateTimePickerSheet;

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 9999,
  },
  blurBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  touchOutside: {
    flex: 1,
  },
  dialog: {
    borderTopLeftRadius: responsiveWidth(8),
    borderTopRightRadius: responsiveWidth(8),
    backgroundColor: '#fffef9',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 24,
  },
  header: {
    paddingHorizontal: responsiveWidth(8),
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleContainer: {
    flex: 1,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  title: {
    fontSize: responsiveFontSize(2.2),
    color: '#1e1e1e',
    fontFamily: 'Rubik-SemiBold',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: responsiveFontSize(1.6),
    color: '#9E9E9E',
    fontFamily: 'Rubik-Regular',
    marginTop: 4,
  },
  errorWrapper: {
    paddingHorizontal: responsiveWidth(8),
    marginBottom: 8,
  },
  errorText: {
    fontSize: responsiveFontSize(1.4),
    color: '#FF3B30',
    fontFamily: 'Rubik-Medium',
  },
  datePreview: {
    alignSelf: 'center',
    backgroundColor: '#F5F2ED',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 30,
    marginBottom: 8,
  },
  datePreviewText: {
    fontSize: responsiveFontSize(1.7),
    color: '#1e1e1e',
    fontFamily: 'Rubik-Medium',
  },
  schedulingLabel: {
    color: '#9E9E9E',
    fontFamily: 'Rubik-Medium',
  },
  ageText: {
    color: '#FF7A00',
    fontFamily: 'Rubik-Bold',
  },
  highlightedValue: {
    color: '#FF7A00',
    fontFamily: 'Rubik-Bold',
  },
  separatorText: {
    color: '#1e1e1e',
    fontFamily: 'Rubik-Medium',
  },
  pickerContainer: {
    marginVertical: 10,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: responsiveWidth(8),
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  cancelButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelText: {
    fontFamily: 'Rubik-Medium',
    color: '#1e1e1e',
    fontSize: responsiveFontSize(1.9),
  },
  doneButton: {
    backgroundColor: '#1E1E1E',
    borderRadius: 66,
    paddingHorizontal: 24,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 80,
  },
  errorButton: {
    backgroundColor: '#F5F2ED',
    borderColor: '#F5F2ED',
    minWidth: 140, 
  },
  errorText: {
    color: '#FF6B6B',
  },
  doneText: {
    fontFamily: 'Rubik-SemiBold',
    color: '#FFFFFF',
    fontSize: responsiveFontSize(1.6),
    textAlign: 'center',
  },
});
