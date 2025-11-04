import {
  StyleSheet,
  View,
  TouchableOpacity,
  Text,
  Image,
  Pressable,
  BackHandler,
} from 'react-native';
import React, {useMemo, useCallback, useRef, useState, useEffect} from 'react';
import {
  responsiveWidth,
  responsiveFontSize,
} from 'react-native-responsive-dimensions';
import {BottomSheetBackdrop, BottomSheetModal} from '@gorhom/bottom-sheet';

import {useDispatch, useSelector} from 'react-redux';
import {
  toggleCreatePostBottomSheet,
  toggleHideShowLiveTerms,
} from '../../../Redux/Slices/NormalSlices/HideShowSlice';
import DIcon from '../../../DesiginData/DIcons';
import {useNavigation} from '@react-navigation/native';
import {LoginPageErrors} from '../ErrorSnacks';

const CreatePostBottomSheet = ({}) => {
  const navigation = useNavigation();
  const bottomSheetRef = useRef(null);

  const createPostBottomSheetVisibility = useSelector(
    state => state.hideShow.visibility.createPostSheet,
  );

  const {role} = useSelector(state => state.auth.user);

  const dispatch = useDispatch();

  const snapPoints = useMemo(() => ['24%', '25%', '28'], []);

  const handleSheetChanges = useCallback(index => {
    if (index === -1) {
      dispatch(toggleCreatePostBottomSheet({show: -1}));
    }
  }, []);

  const onBackPress = () => {
    if (bottomSheetRef !== null) {
      bottomSheetRef.current?.close();
      return true;
    }
  };

  const handlePresentModalPress = useCallback(() => {
    if (bottomSheetRef.current) {
      bottomSheetRef.current?.present();
    }
  }, []);

  useEffect(() => {
    if (!bottomSheetRef.current) return;

    if (createPostBottomSheetVisibility === -1) {
      bottomSheetRef.current.close();
      return;
    }

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      onBackPress,
    );

    return () => backHandler.remove();
  }, [createPostBottomSheetVisibility]);

  useEffect(() => {
    if (createPostBottomSheetVisibility === 1) {
      handlePresentModalPress();
    }
  }, [createPostBottomSheetVisibility]);

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

  const handleGoToItem = index => {
    if (index === 1) {
      bottomSheetRef.current.close();

      setTimeout(() => {
        navigation.navigate('createpostpage');
      }, 500);
    }

    if (index === 2) {
      bottomSheetRef.current.close();

      setTimeout(() => {
        dispatch(toggleHideShowLiveTerms({show: 1}));
      }, 500);
    }

    if (index === 3) {
      LoginPageErrors('Feature launching soon!');
    }
  };

  if (createPostBottomSheetVisibility === 1) {
    return (
      <BottomSheetModal
        name="createpost"
        backdropComponent={renderBackdrop}
        ref={bottomSheetRef}
        index={createPostBottomSheetVisibility}
        snapPoints={snapPoints}
        onChange={handleSheetChanges}
        enablePanDownToClose={true}
        backgroundStyle={{backgroundColor: '#fff'}}>
        <View style={styles.contentContainer}>
          <View style={styles.createPostListContainer}>
            <Pressable
              style={({pressed}) => [
                styles.eachlist,
                {
                  backgroundColor: pressed ? '#FFA86B1C' : '#fff', // pressed background
                  height: responsiveWidth(14), // adjustable height
                  borderRadius: responsiveWidth(2),
                },
              ]}
              onPress={() => handleGoToItem(1)}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingLeft: 24,
                }}>
                <Image
                  source={require('../../../Assets/Images/AddPosts.png')}
                  style={{
                    height: responsiveWidth(8),
                    width: responsiveWidth(8),
                    resizeMode: 'contain',
                    alignSelf: 'center',
                    marginRight: responsiveWidth(2),
                  }}
                />
                <Text
                  style={{
                    fontFamily: 'Rubik-Regular',
                    color: '#282818',
                    fontSize: responsiveFontSize(2.3),
                  }}>
                  Create Post
                </Text>
              </View>
            </Pressable>

            <Pressable
              style={({pressed}) => [
                styles.eachlist,
                {
                  backgroundColor: pressed ? '#FFA86B1C' : '#fff', // pressed background
                  height: responsiveWidth(14), // adjustable height
                  borderRadius: responsiveWidth(2),
                },
              ]}
              onPress={() => handleGoToItem(2)}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingLeft: 24,
                }}>
                <Image
                  source={require('../../../Assets/Images/AddStories.png')}
                  style={{
                    height: responsiveWidth(9),
                    width: responsiveWidth(9),
                    resizeMode: 'contain',
                    alignSelf: 'center',
                    marginRight: responsiveWidth(2),
                  }}
                />
                <Text
                  style={{
                    fontFamily: 'Rubik-Regular',
                    color: '#282818',
                    fontSize: responsiveFontSize(2.3),
                  }}>
                  Go Live
                </Text>
              </View>
            </Pressable>
          </View>
        </View>
      </BottomSheetModal>
    );
  }
};

export default CreatePostBottomSheet;

const styles = StyleSheet.create({
  contentContainer: {
    backgroundColor: '#fff',
    height: '100%',
    // paddingHorizontal: responsiveWidth(4),
    // paddingLeft: responsiveWidth(9.5),
  },

  createPostListContainer: {
    paddingVertical: responsiveWidth(6),
    // padding: responsiveWidth(2),
    flexDirection: 'column',
    gap: responsiveWidth(5),
  },

  eachlist: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: responsiveWidth(4),
    // backgroundColor : 'red'
  },

  headerLeftWrapper: {
    height: responsiveWidth(12),
    justifyContent: 'center',
    // borderWidth : 1,
    flexBasis: '50%',
  },
  headerLeftContentContainer: {
    height: '100%',
    borderColor: 'blue',
    flexDirection: 'row',
    alignItems: 'center',
    gap: responsiveWidth(4),
  },
  profileImageContainer: {
    borderColor: '#282828',
    height: responsiveWidth(9),
    width: responsiveWidth(9),
    borderRadius: responsiveWidth(10),
    overflow: 'hidden',
    borderWidth: 1,
    borderRadius: responsiveWidth(10),
    position: 'relative',
  },
  profileImage: {
    width: '100%',
    resizeMode: 'cover',
    height: '100%',
  },
  userName: {
    fontFamily: 'Lexend-Bold',
    color: '#282828',
    fontSize: responsiveFontSize(1.9),
  },
  status: {
    fontSize: responsiveFontSize(1.6),
    letterSpacing: 0.5,
    color: '#282828',
    fontFamily: 'Rubik-Regular',
  },
  cardHeaderWrapper: {
    justifyContent: 'space-between',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#282828',
    paddingVertical: responsiveWidth(3),
    paddingHorizontal: responsiveWidth(4),
    borderRadius: responsiveWidth(2),
  },
  likeCommentText: {
    fontFamily: 'Rubik-Medium',
    marginLeft: responsiveWidth(1),
    color: '#282828',
  },
  eachSortByModalListText: {
    fontSize: responsiveFontSize(2),
    color: '#282828',

    fontFamily: 'Rubik-Bold',
  },
  eachSortModalList: {
    flexDirection: 'row',
    gap: responsiveWidth(5),
    alignItems: 'center',
    marginVertical: responsiveWidth(3),
  },
  profileImage: {
    width: '100%',
    resizeMode: 'cover',
    height: '100%',
    borderRadius: responsiveWidth(10),
  },
});
