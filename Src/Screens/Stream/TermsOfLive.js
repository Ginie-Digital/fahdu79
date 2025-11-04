import {
  StyleSheet,
  View,
  TouchableOpacity,
  Text,
  Image,
  Pressable,
  BackHandler,
  Platform,
  useWindowDimensions,
} from 'react-native';
import React, {
  useMemo,
  useCallback,
  useRef,
  useState,
  useEffect,
  memo,
} from 'react';
import {
  responsiveWidth,
  responsiveFontSize,
} from 'react-native-responsive-dimensions';
import {BottomSheetBackdrop, BottomSheetModal} from '@gorhom/bottom-sheet';
import {useDispatch, useSelector} from 'react-redux';
import {toggleHideShowLiveTerms} from '../../../Redux/Slices/NormalSlices/HideShowSlice';
import {
  useFocusEffect,
  useNavigation,
  useNavigationState,
} from '@react-navigation/native';
import Tik from '../../../Assets/svg/tiklive.svg';
import Kanta from '../../../Assets/svg/kant.svg';
import AnimatedButton from '../../Components/AnimatedButton';
import {LoginPageErrors} from '../../Components/ErrorSnacks';
import {SafeAreaView} from 'react-native-safe-area-context'; // Import SafeAreaView
import {WIDTH_SIZES} from '../../../DesiginData/Utility';

const TermsOfLive = () => {
  const navigation = useNavigation();
  const [isChecked, setIsChecked] = useState(false);
  const [contentHeight, setContentHeight] = useState(0);

  const screenName = useNavigationState(
    state => state.routes[state.index].name,
  );
  const bottomSheetModalRef = useRef(null);
  const liveTermsHideShow = useSelector(
    state => state.hideShow.visibility.hideShowLiveTerms,
  );
  const dispatch = useDispatch();
  const {height} = useWindowDimensions();

  const snapPoints = useMemo(() => ['62%', '65%', '65%'], []);

  const handleSheetChanges = useCallback(index => {
    if (index === -1) {
      dispatch(toggleHideShowLiveTerms({show: -1}));
    }
  }, []);

  const handlePresentModalPress = useCallback(() => {
    bottomSheetModalRef.current?.present();
  }, []);

  const onBackPress = () => {
    if (bottomSheetModalRef.current) {
      bottomSheetModalRef.current?.close();
      return true;
    }
  };

  const handleButtonPress = () => {
    if (isChecked) {
      dispatch(toggleHideShowLiveTerms({show: -1}));

      // Add delay before navigating (e.g., 1 second)
      setTimeout(() => {
        navigation.navigate('beforeStreamScreen');
      }, 1000); // 1000ms = 1s delay
    } else {
      LoginPageErrors('Kindly accept the terms');
    }
  };

  useEffect(() => {
    setIsChecked(false);
    if (bottomSheetModalRef.current && liveTermsHideShow === -1) {
      bottomSheetModalRef.current.close();
    } else {
      const backHandler = BackHandler.addEventListener(
        'hardwareBackPress',
        onBackPress,
      );

      return () => {
        backHandler.remove();
      };
    }
  }, [liveTermsHideShow]);

  const renderBackdrop = useCallback(
    props => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={1}
      />
    ),
    [],
  );

  useEffect(() => {
    if (liveTermsHideShow === 1) {
      handlePresentModalPress();
    }
  }, [liveTermsHideShow]);

  const onContentLayout = event => {
    const {height} = event.nativeEvent.layout;
    setContentHeight(height);
  };

  const TermItem = ({index, title, description}) => (
    <View
      style={{
        flexDirection: 'row',
        marginTop:
          Platform.OS === 'ios' ? responsiveWidth(4) : responsiveWidth(2),
      }}>
      <Text
        style={{
          color: '#1e1e1e',
          fontFamily: 'Rubik-SemiBold',
          fontSize: responsiveWidth(3.4),
        }}>
        {index}.{' '}
      </Text>
      <Text
        style={{
          color: '#1e1e1e',
          fontFamily: 'Rubik-Regular',
          fontSize: responsiveWidth(3.4),
        }}>
        <Text
          style={{
            color: '#1e1e1e',
            fontFamily: 'Rubik-SemiBold',
            fontSize: responsiveWidth(3.4),
          }}>
          {title}:{' '}
        </Text>
        {description}
      </Text>
    </View>
  );

  if (liveTermsHideShow === 1) {
    return (
      <BottomSheetModal
        keyboardBehavior="interactive"
        backdropComponent={renderBackdrop}
        ref={bottomSheetModalRef}
        index={liveTermsHideShow}
        snapPoints={snapPoints}
        onChange={handleSheetChanges}
        enablePanDownToClose={true}
        backgroundStyle={{backgroundColor: '#fffef9'}}
        style={{
          borderWidth: responsiveWidth(0.7),
          borderRadius: responsiveWidth(4.7),
        }}>
        <SafeAreaView edges={['bottom']} style={{flex: 1}}>
          <View
            style={[
              styles.contentContainer,
              {height: contentHeight + WIDTH_SIZES[136]},
            ]}
            onLayout={onContentLayout}>
            <View
              style={{
                flexDirection: 'row',
                width: responsiveWidth(85),
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
              <Text style={styles.text}>Start Livestream</Text>
              <TouchableOpacity
                onPress={() => bottomSheetModalRef.current?.close()}>
                <Kanta />
              </TouchableOpacity>
            </View>

            <Text
              style={[
                styles.heading,
                {
                  marginTop:
                    Platform.OS === 'ios'
                      ? responsiveWidth(4)
                      : responsiveWidth(2),
                },
              ]}>
              Before you begin your broadcast, we want to remind you of our
              Terms of Service.
            </Text>

            <Text
              style={[
                styles.headingTwo,
                {
                  marginTop:
                    Platform.OS === 'ios'
                      ? responsiveWidth(2)
                      : responsiveWidth(3),
                  lineHeight: 20,
                },
              ]}>
              These guidelines ensure that all users can enjoy the app in a safe
              and respectful environment.
            </Text>

            <TermItem
              index={1}
              title="Respect Others"
              description="Do not engage in hate speech, nudity, bullying, or harassment of any kind."
            />
            <TermItem
              index={2}
              title="Be Authentic"
              description="Do not misrepresent yourself or your content."
            />
            <TermItem
              index={3}
              title="Respect Intellectual Property"
              description="Do not use copyrighted material without permission."
            />

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginTop: responsiveWidth(4),
              }}>
              {/* <Checkbox checked={isChecked} onPress={() => console.log('h')} /> */}

              <TouchableOpacity
                style={[styles.checkbox, isChecked && styles.checkedCheckbox]}
                onPress={() => setIsChecked(!isChecked)}>
                {isChecked && <Tik />}
              </TouchableOpacity>

              <Text
                onPress={() => setIsChecked(!isChecked)}
                style={{
                  color: '#1e1e1e',
                  fontFamily: 'Rubik-SemiBold',
                  top: responsiveWidth(1),
                  fontSize: responsiveWidth(3.4),
                }}>
                Accept All.
              </Text>
            </View>

            <AnimatedButton title={'I Agree'} onPress={handleButtonPress} />
          </View>
        </SafeAreaView>
      </BottomSheetModal>
    );
  }
};

export default memo(TermsOfLive);

const styles = StyleSheet.create({
  contentContainer: {
    backgroundColor: '#fffef9',
    paddingHorizontal: responsiveWidth(4),
    paddingBottom: responsiveWidth(4),
    marginBottom: responsiveWidth(6),
    marginTop: Platform.OS === 'ios' ? responsiveWidth(4) : null,
  },
  text: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: responsiveFontSize(2.5),
    color: '#1e1e1e',
  },
  checkbox: {
    width: 17,
    height: 17,
    borderWidth: 1.5,
    borderRadius: responsiveWidth(1.1),
    borderColor: '#1e1e1e',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginTop: responsiveWidth(2),
  },
  checkedCheckbox: {
    backgroundColor: '#FFA86B',
    height: 17,
    width: 17,
  },
  heading: {
    fontFamily: 'Rubik-SemiBold',
    color: '#282828',
    fontSize: responsiveFontSize(1.8),
    textAlign: 'left',
  },
  headingTwo: {
    fontFamily: 'Rubik-Medium',
    color: '#282828',
    fontSize: responsiveFontSize(1.7),
    textAlign: 'left',
    marginTop: responsiveWidth(2),
  },
});
