import React, {useEffect, useRef, useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  Animated,
  BackHandler,
  FlatList,
  Platform,
} from 'react-native';
import {responsiveFontSize, responsiveWidth} from 'react-native-responsive-dimensions';
import {useDispatch, useSelector} from 'react-redux';
import {BlurView} from 'expo-blur';
import {toggleHomeBottomSheet} from '../../../Redux/Slices/NormalSlices/HideShowSlice';
import {homeBottomSheetList, homeBottomSheetListRoleUser} from '../../../DesiginData/Data';
import AddSvg from '../../../AddSvg';
import { navigate } from '../../../Navigation/RootNavigation';

import {useLazyGetFSDQuery, useLazyGetFSQuery} from '../../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';

const WINDOW_HEIGHT = Dimensions.get('window').height;

const HomeBottomSheet = () => {
  const dispatch = useDispatch();


  const visible = useSelector(state => state.hideShow.visibility.homeBottomSheet === 1);
  const loggedInUserRole = useSelector(state => state.auth.user.role);
  const token = useSelector(state => state.auth.user.token);

  const slideAnim = useRef(new Animated.Value(WINDOW_HEIGHT)).current;
  const [followers, setFollowers] = useState(0);
  const [subscribers, setSubscribers] = useState(0);

  const [getFSD] = useLazyGetFSDQuery();
  const [getFS] = useLazyGetFSQuery();

  const [shouldRender, setShouldRender] = useState(visible);

  useEffect(() => {
    if (visible) {
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
  }, [visible]);

  const handleClose = () => {
    Animated.timing(slideAnim, {
      toValue: WINDOW_HEIGHT,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      dispatch(toggleHomeBottomSheet({show: -1}));
      requestAnimationFrame(() => {
        setShouldRender(false);
      });
    });
  };

  useEffect(() => {
    if (!token) return;

    const fetchData = async () => {
      try {
        if (loggedInUserRole === 'user') {
          const followed = await getFSD({token, listType: 'followed', active: true});
          const subscribed = await getFSD({token, listType: 'subscribed', active: true});
          setFollowers(followed?.data?.data?.metadata?.[0]?.total || 0);
          setSubscribers(subscribed?.data?.data?.metadata?.[0]?.total || 0);
        } else {
          const followersData = await getFS({token, listType: 'followers', active: true});
          const subscribersData = await getFS({token, listType: 'subscribers', active: true});
          setFollowers(followersData?.data?.data?.metadata?.[0]?.total || 0);
          setSubscribers(subscribersData?.data?.data?.metadata?.[0]?.total || 0);
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    fetchData();
  }, [token, loggedInUserRole]);

  const handleEachOptions = useCallback((id) => {
    handleClose();
    setTimeout(() => {
      switch (id) {
        case 99: navigate('feedback'); break;
        case 100: navigate('NetworkLogger'); break;
        case 6: navigate('About'); break;
        case 1:
        case 8: navigate('settingsPage'); break;
        case 10: navigate('verificationStepOne'); break;
        case 5: navigate('referral'); break;
        case 3: navigate('mrDashboard'); break;
        case 2: navigate('scheduled'); break;
        case 9: navigate('chooseWallet'); break;
        case 11: navigate('userInfoForm'); break;
        default: break;
      }
    }, 300);
  }, []);

  if (!shouldRender) return null;

  return (
    <View style={styles.overlay}>
      <BlurView intensity={15} style={styles.blurBackground} />
      <Pressable style={styles.touchOutside} onPress={handleClose} />
      <Animated.View 
        style={[
          styles.dialog, 
          {transform: [{translateY: slideAnim}]}
        ]}
      >
        <View style={styles.indicator} />
        <View style={styles.contentContainer}>
          <FlatList
            data={loggedInUserRole === 'creator' ? homeBottomSheetList : homeBottomSheetListRoleUser}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({item}) => (
              <Pressable 
                onPress={() => handleEachOptions(item.id)} 
                style={({pressed}) => [
                  styles.eachSortModalList, 
                  pressed && {backgroundColor: '#FFF3EB'}
                ]}
              >
                <AddSvg name={item.iconName} />
                <Text style={styles.eachSortByModalListText}>{item.name}</Text>
              </Pressable>
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{paddingBottom: 40}}
            scrollEnabled={false}
          />
        </View>
      </Animated.View>
    </View>
  );
};

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
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    backgroundColor: '#fffef9',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 20 : 0,
  },
  indicator: {
    width: 40,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  contentContainer: {
    flex: 1,
  },
  eachSortModalList: {
    flexDirection: 'row',
    gap: responsiveWidth(5),
    alignItems: 'center',
    paddingVertical: responsiveWidth(4),
    paddingLeft: responsiveWidth(7),
  },
  eachSortByModalListText: {
    fontSize: responsiveFontSize(2.17),
    color: '#282828',
    fontFamily: 'Rubik-Medium',
  },
  separator: {
    borderWidth: responsiveWidth(0.15),
    borderColor: '#EEEEEE',
  },
});

export default HomeBottomSheet;
