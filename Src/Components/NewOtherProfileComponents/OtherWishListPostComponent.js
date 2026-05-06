import {StyleSheet, Text, View, FlatList, Pressable, ActivityIndicator} from 'react-native';
import React, {useCallback, useRef, useState} from 'react';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import {useLazyGetWishListQuery, useLazyIsValidFollowQuery} from '../../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
import {useSelector, useDispatch} from 'react-redux';

import {responsiveFontSize, responsiveWidth} from 'react-native-responsive-dimensions';
import ProgressBar from 'react-native-progress/Bar';

import {setWishListDonationInfo} from '../../../Redux/Slices/NormalSlices/OtherProfile/WishListDonateSheetSlice';
import {Tabs} from 'react-native-collapsible-tab-view';

import {Image} from 'expo-image';
import WishlistShimmer from '../Shimmers/WishlistShimmer';

const OtherWishListPostComponent = ({toCallApiInfo}) => {
  const [getWishList] = useLazyGetWishListQuery({refetchOnFocus: true});

  const token = useSelector(state => state.auth.user.token);

  const [wishList, setWishList] = useState([]);
  const [loading, setLoading] = useState(false);
  const initialLoadDone = useRef(false);
  const userInformation = useSelector(state => state.auth.user);

  const refresh = useSelector(state => state.hideShow.visibility.refreshOtherProfile);
  const wishListBottomSheetVisibility = useSelector(state => state.hideShow.visibility.wishListSheet);

  const [isValidFollow] = useLazyIsValidFollowQuery();

  async function wishListCall() {
    const {data, error} = await isValidFollow({token, userName: toCallApiInfo?.userName}, false);

    if (data?.data?.follow) {
      let list = await getWishList({token, userId: toCallApiInfo?.userId}, false);
      setLoading(false);
      setWishList(list?.data?.data?.items);
    } else {
      setWishList([]);
      setLoading(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      if (!initialLoadDone.current) {
        setLoading(true);
        initialLoadDone.current = true;
      }
      wishListCall();
    }, [refresh, wishListBottomSheetVisibility]),
  );

  const dispatch = useDispatch();
  const navigation = useNavigation();

  const handleDonation = useCallback((item) => {
    dispatch(setWishListDonationInfo({donationInfo: item}));
    navigation.navigate('wishListDonateScreen');
  }, [dispatch, navigation]);

  const renderWishListCard = useCallback(({item}) => {
    return (
      <Pressable
        onPress={() => handleDonation(item)}
        android_ripple={{color: '#f3f3f3'}}
        style={({pressed}) => [
          styles.cardWrapper,
          {backgroundColor: pressed ? '#fff9f5' : '#ffffff'},
        ]}>
        <View style={styles.imageContainer}>
          <Image allowDownscaling placeholder={require('../../../Assets/Images/WishlistDefault.jpg')} source={{uri: item?.images[0]?.url}} contentFit="cover" placeholderContentFit="cover" style={styles.image} />
        </View>

        <Text style={styles.wishtitle}>{item?.title}</Text>

        <Text style={styles.description}>{item?.description}</Text>

        <View style={styles.cardBottomView}>
          <View style={styles.cardBottomViewUpper}>
            <Text style={styles.smallTexts}>Fund Raised</Text>
            <Text style={[styles.smallTexts, {flexDirection: 'row'}]}>
              {Number(item?.totalCollected).toLocaleString('en-IN')}/{Number(item?.listedCoinsRequired).toLocaleString('en-IN')}
              <Image
                source={require('../../../Assets/Images/Coin.png')}
                style={{
                  height: responsiveWidth(3.5),
                  width: responsiveWidth(3.5),
                  resizeMode: 'contain',
                  alignSelf: 'center',
                  marginRight: responsiveWidth(1),
                }}
              />
            </Text>
          </View>

          <View
            style={{
              width: '100%',
              paddingHorizontal: responsiveWidth(2),
              marginTop: responsiveWidth(4),
            }}>
            <ProgressBar borderWidth={0} height={responsiveWidth(3)} unfilledColor={'#f2f2f2'} width={responsiveWidth(91)} progress={item?.totalCollected / item?.listedCoinsRequired} color={'#e0383e'} />
          </View>
        </View>
      </Pressable>
    );
  }, [handleDonation]);

  if (loading) {
    return (
      <View style={{flex: 1, backgroundColor: '#fff', marginTop: responsiveWidth(10)}}>
        <WishlistShimmer />
      </View>
    );
  }

  return (
    <View style={{flex: 1, backgroundColor: '#fff'}}>
      <Tabs.FlatList data={wishList} renderItem={renderWishListCard} numColumns={1} keyExtractor={item => item?._id} showsVerticalScrollIndicator={false} contentContainerStyle={{paddingHorizontal: responsiveWidth(6), paddingBottom: responsiveWidth(20)}} />
    </View>
  );
};

export default OtherWishListPostComponent;

const styles = StyleSheet.create({
  cardWrapper: {
    borderWidth: 2,
    overflow: 'hidden',
    marginTop: responsiveWidth(6),
    borderRadius: responsiveWidth(2),
    backgroundColor: '#fff',
  },
  imageContainer: {
    width: '100%', // Ensure the container takes the full width
    height: responsiveWidth(60), // Fixed height for the container
    marginBottom: responsiveWidth(4),
    overflow: 'hidden', // Ensure the image doesn't overflow the container
  },

  image: {
    width: '100%',
    height: '100%',
    flex: 1,
    resizeMode: 'cover', // Ensure the image covers the entire container
  },
  wishtitle: {
    fontFamily: 'Rubik-Bold',
    color: '#282828',
    textAlign: 'left',
    fontSize: responsiveFontSize(2.2),
    marginTop: responsiveWidth(4),
    marginLeft: responsiveWidth(2),
  },
  description: {
    fontFamily: 'Rubik-Regular',
    fontSize: responsiveFontSize(1.8),
    marginLeft: responsiveWidth(2),
    marginTop: responsiveWidth(2),
    color: '#282828',
  },
  cardBottomView: {
    // borderWidth : 1,
    marginTop: responsiveWidth(4),
    height: responsiveWidth(16),
  },
  cardBottomViewUpper: {
    // borderWidth : 1,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: responsiveWidth(2),
  },
  smallTexts: {
    fontSize: responsiveFontSize(1.6),
    color: '#282828',
    fontFamily: 'Rubik-Bold',
  },
});
