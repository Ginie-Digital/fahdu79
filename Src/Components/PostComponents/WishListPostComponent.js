import {StyleSheet, Text, View, FlatList, Pressable, ActivityIndicator, TouchableOpacity} from 'react-native';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import {useLazyGetShowBankDetailsQuery, useLazyGetWishListQuery, useWishlistPayoutMutation} from '../../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
import {useSelector} from 'react-redux';
import {token as memoizedToken} from '../../../Redux/Slices/NormalSlices/AuthSlice';
import {responsiveFontSize, responsiveWidth} from 'react-native-responsive-dimensions';
import ProgressBar from 'react-native-progress/Bar';
import {useDispatch} from 'react-redux';
import AddWishListButton from '../MyProfile/AddWishListButton';
import EmptyComponent from './EmptyComponent';
import {Tabs} from 'react-native-collapsible-tab-view';

import {Image} from 'expo-image';
import AnimatedButton from '../AnimatedButton';
import {LoginPageErrors} from '../ErrorSnacks';

const WishListPostComponent = ({wishlistId}) => {
  const flatListRef = useRef(null);
  const navigation = useNavigation();

  const [getWishList] = useLazyGetWishListQuery({refetchOnFocus: true});
  const [getShowBankDetails] = useLazyGetShowBankDetailsQuery();
  const [wishlistPayout] = useWishlistPayoutMutation();
  const token = useSelector(state => state.auth.user.token);
  const [wishList, setWishList] = useState([]);
  const [loading, setLoading] = useState(false);
  const userInformation = useSelector(state => state.auth.user);
  const previewModalShow = useSelector(state => state.hideShow.visibility.wishListPreviewModal);
  const wishListBottomSheetVisibility = useSelector(state => state.hideShow.visibility.wishListSheet);

  const suspended = useSelector(state => state.auth.user.suspended);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      async function wishListCall() {
        let list = await getWishList({token, userId: userInformation?.currentUserId}, false);
        setWishList(list?.data?.data?.items);
        setLoading(false);
      }

      if (!previewModalShow) {
        wishListCall();
      }
    }, [previewModalShow]),
  );

  const scrollToWishlist = urlOrId => {
    console.log(urlOrId, '9090');

    const index = wishList.findIndex(item => item._id === urlOrId);
    if (index !== -1 && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current.scrollToIndex({index, animated: true});
      }, 1000);
    }
  };

  useEffect(() => {
    if (wishList?.length > 0) {
      scrollToWishlist(wishlistId);
    }
  }, [wishlistId, wishList]);

  const handleRequestPayout = async item => {
    try {
      console.log('Request payout for:', item._id);

      // Check if bank details exist
      const {data, error} = await getShowBankDetails({token});

      if (error) {
        console.log('Error fetching bank details:', error);
        // Handle error - show error message
        return;
      }

      if (data?.statusCode === 200 && data?.data) {
        // Bank details exist, navigate to payout screen
        console.log('Bank details found:', data.data);

        // Calculate amount and fahduFees
        const totalAmount = item.totalCollected;
        const payoutAmount = Math.round(totalAmount / 1.1); // Round to nearest integer
        const fahduFees = totalAmount - payoutAmount; // The 10% fee

        // Navigate to payout final screen with all data
        navigation.navigate('wishlistpayoutfinal', {
          wishlistItem: {
            wishlistId: item._id,
            title: item.title,
            fundRaised: totalAmount,
            fahduFees: fahduFees,
            payoutAmount: payoutAmount,
          },
          bankDetails: {
            beneficiaryName: data.data.beneficiaryName,
            accountNo: data.data.accountNo,
            IFSC: data.data.IFSC,
            PAN: data.data.PAN || 'Not Available',
          },
        });
      } else {
        // No bank details found, redirect user to add bank details
        console.log('No bank details found. Please add bank details first.');
        // Navigate to add bank details screen or show modal

        LoginPageErrors('No Bank Details found, add in dashboard');

        setTimeout(() => {
          navigation.navigate('mrDashboard');
        }, 1000);
      }
    } catch (err) {
      console.log('Error in handleRequestPayout:', err);
    }
  };

  const WishListCard = useCallback(({item, setDonateData, pressDisabled}) => {
    console.log(item?.withdrawable, 'olol');

    return (
      <Pressable disabled={true} style={styles.cardWrapper} android_ripple={{color: '#f3f3f3'}}>
        <View style={styles.imageContainer}>
          <Image allowDownscaling placeholder={require('../../../Assets/Images/WishlistDefault.jpg')} source={{uri: item?.images[0]?.url}} resizeMethod="resize" style={styles.image} placeholderContentFit="cover" />
        </View>
        <Text style={styles.wishtitle}>{item?.title}</Text>

        <Text style={styles.description}>{item?.description}</Text>

        <View style={styles.cardBottomView}>
          <View style={styles.cardBottomViewUpper}>
            <Text style={styles.smallTexts}>Fund Raised</Text>
            <Text style={[styles.smallTexts, {flexDirection: 'row'}]}>
              {item?.totalCollected}/{item?.listedCoinsRequired}
              <Image source={require('../../../Assets/Images/Coin.png')} style={{height: responsiveWidth(3.5), width: responsiveWidth(3.5), resizeMode: 'contain', alignSelf: 'center', marginLeft: responsiveWidth(1)}} />
            </Text>
          </View>

          <View style={{width: '100%', paddingHorizontal: responsiveWidth(2), marginTop: responsiveWidth(4)}}>
            <ProgressBar borderWidth={0} height={responsiveWidth(3)} unfilledColor={'#f2f2f2'} width={responsiveWidth(82)} progress={item?.totalCollected / item?.listedCoinsRequired} color={'#e0383e'} />
          </View>

          {item?.withdrawable && (
            <TouchableOpacity style={styles.payoutButton} onPress={() => handleRequestPayout(item)} activeOpacity={0.7}>
              <Text style={styles.payoutButtonText}>Request Payout</Text>
            </TouchableOpacity>
          )}
        </View>
      </Pressable>
    );
  }, []);

  if (loading) {
    return (
      <View style={[{backgroundColor: '#fff', paddingTop: responsiveWidth(1), flex: 1}]}>
        <ActivityIndicator size={'small'} color={'#ffa07a'} style={{alignSelf: 'center', marginTop: responsiveWidth(2)}} />
      </View>
    );
  }

  return (
    <View style={{flex: 1, backgroundColor: '#fff'}}>
      <Tabs.FlatList
        ref={flatListRef}
        ListHeaderComponent={() => !suspended && <AddWishListButton />}
        data={wishList}
        renderItem={({item, index}) => <WishListCard item={item} pressDisabled={true} />}
        numColumns={1}
        keyExtractor={item => item?._id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{paddingHorizontal: responsiveWidth(6)}}
      />
    </View>
  );
};

export default WishListPostComponent;

const styles = StyleSheet.create({
  cardWrapper: {
    borderWidth: 2,
    overflow: 'hidden',
    marginTop: responsiveWidth(4),
    borderRadius: responsiveWidth(2),
    backgroundColor: '#fff',
  },
  imageContainer: {
    width: '100%',
    height: responsiveWidth(60),
    marginBottom: responsiveWidth(4),
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
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
    marginTop: responsiveWidth(4),
    paddingBottom: responsiveWidth(4),
  },
  cardBottomViewUpper: {
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
  payoutButton: {
    marginHorizontal: responsiveWidth(2),
    marginTop: responsiveWidth(4),
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#282828',
    borderRadius: 14,
    paddingVertical: responsiveWidth(3),
    alignItems: 'center',
    justifyContent: 'center',
  },
  payoutButtonText: {
    fontFamily: 'Rubik-Bold',
    fontSize: responsiveFontSize(1.8),
    color: '#282828',
  },
});
