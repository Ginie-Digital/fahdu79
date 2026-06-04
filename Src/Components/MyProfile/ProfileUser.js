import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Pressable } from 'react-native';
import { responsiveFontSize, responsiveWidth } from 'react-native-responsive-dimensions';
import Ionicons from 'react-native-vector-icons/Ionicons';
import WalletSVG from '../../../Assets/svg/WalletIcon.svg';
import { useLazyRecommendedCreatorsQuery, useLazyTrendingCreatorsQuery } from '../../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
import { useSelector } from 'react-redux';
import { Image } from 'expo-image';
import UserProfileTrendingShimmer from '../Shimmers/UserProfileTrendingShimmer';
import { navigate } from '../../../Navigation/RootNavigation';
import axios from 'axios';
import AnimatedNumber from '../AnimatedNumber';
import {formatNiche, nTwins, WIDTH_SIZES} from '../../../DesiginData/Utility';
import { LoginPageErrors } from '../ErrorSnacks';
import { useFocusEffect } from '@react-navigation/native';

const ProfileUser = () => {
  const token = useSelector(state => state.auth.user.token);
  const [creatorsList, setCreatorsList] = useState([]);
  const [trendingCreators] = useLazyRecommendedCreatorsQuery({ refetchOnFocus: true });
  const [loading, setLoading] = useState(false);
  const [coins, setCoins] = useState(0);

  const [totalPage, setTotalPages] = useState(0);

  const [currentPage, setCurrentPage] = useState(1);

  const [buttonClickRecharge, setButtonClickRecharge] = useState(false);

  const [clickRecommendation, setClickRecommendation] = useState({ click: false, id: 0 });

  const [firstLoading, setFirstLoading] = useState(true);

  const handleGoToOthersProfile = useCallback(async (userName, userId) => {
    navigate('othersProfile', { userName, userId, role: 'creator' });
  }, []);

  const suspended = useSelector(state => state.auth.user.suspended);

  async function getUserCoins() {
    let { data } = await axios.get('https://api.fahdu.com/api/wallet/get-coins', {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      timeout: 10000,
    });

    setCoins(data?.data);
  }

  async function getTrendingCreatorsList(currentPage) {
    console.log(currentPage, 'currentPage');

    if (firstLoading) {
      setLoading(true);
      setFirstLoading(false);
    }

    let trendingCreatorsList = await trendingCreators({ token, page: currentPage }, false);
    if (trendingCreatorsList?.data?.statusCode === 200) {
      const totalPage = Math.ceil(trendingCreatorsList?.data?.data?.metadata?.[0]?.total / trendingCreatorsList?.data?.data?.metadata?.[0]?.limit);

      setTotalPages(totalPage);

      setCreatorsList([...creatorsList, ...trendingCreatorsList?.data?.data?.users]);
    }
    setLoading(false);
  }

  useEffect(() => {
    getTrendingCreatorsList(currentPage);
  }, [currentPage]);

  useFocusEffect(
    useCallback(() => {
      // This code will run every time the screen is focused
      getUserCoins();
      return () => {
        // (Optional) cleanup code runs when screen loses focus
      };
    }, []),
  );

  const handleFetchNext = () => {
    if (currentPage < totalPage) {
      setCurrentPage(currentPage + 1);
    }

    return;
  };

  const renderItem = ({ index, item }) => (
    <Pressable
      style={[styles.recommendationCard, clickRecommendation.id === index && clickRecommendation.click && { backgroundColor: '#FFF3EB' }]}
      onPressIn={() => setClickRecommendation({ click: true, id: index })}
      onPressOut={() => setClickRecommendation({ click: false, id: index })}
      onPress={() => handleGoToOthersProfile(item?.displayName, item?._id)}>
      <View style={styles.profileImage}>
        <Image style={{ flex: 1, width: '100%' }} placeholderContentFit="cover" contentFit="cover" placeholder={require('../../../Assets/Images/DefaultProfile.jpg')} source={{ uri: item?.profile_image?.url }} />
      </View>
      <View style={styles.profileInfo}>
        <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
          <Text style={styles.profileName}>{item?.displayName}</Text>

          <View style={styles.verifyContainer}>
            <Image cachePolicy="memory-disk" source={require('../../../Assets/Images/verify.png')} contentFit="contain" style={{ flex: 1 }} />
          </View>
        </View>

        <Text style={styles.profileCategory}>{formatNiche(item?.niche?.[0])}</Text>
      </View>
      <Ionicons name="arrow-forward" size={24} color="black" />
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <View style={styles.walletCard}>
        <View style={styles.walletHeader}>
          <Text style={styles.walletText}>Wallet Balance</Text>
        </View>

        <View style={styles.priceWallet}>
          <Text style={styles.balance}>
            ₹
            <AnimatedNumber target={coins} style={styles.balance} />
          </Text>

          <WalletSVG />
        </View>

        <Pressable
          style={[styles.rechargeButton, buttonClickRecharge && { backgroundColor: '#1e1e1e' }]}
          onPressIn={() => setButtonClickRecharge(true)}
          onPressOut={() => setButtonClickRecharge(false)}
          onPress={() => {
            if (suspended) {
              LoginPageErrors('Your account is suspended');
              return;
            }

            navigate('wallet');
          }}>
          <Text style={[styles.rechargeText, buttonClickRecharge && { color: '#fff' }]}>Recharge Now</Text>
        </Pressable>
      </View>
      <Text style={styles.recommendationText}>Recommendations</Text>
      {!loading && (
        <FlatList
          data={creatorsList}
          renderItem={renderItem}
          scrollEnabled={false}
          // keyExtractor={item => item?.id.toString()}
          ListEmptyComponent={<Text style={styles.noDataText}>No recommendations available</Text>}
          showsVerticalScrollIndicator={false}
          onEndReached={handleFetchNext}

        // style = {{flex : 1}}
        />
      )}

      {loading && <FlatList data={[1, 2, 3, 4, 5]} renderItem={() => <UserProfileTrendingShimmer />} />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },

  walletCard: {
    backgroundColor: '#FFA86B',
    borderRadius: 15,
    paddingHorizontal: responsiveWidth(5),
    paddingVertical: nTwins(4, 5),
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: responsiveWidth(0.4),
    borderColor: '#282828',
  },
  walletHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  walletText: {
    fontSize: responsiveFontSize(1.6),
    color: '#000',
    fontFamily: 'Rubik-Medium',
  },
  balance: {
    fontSize: 32,
    marginVertical: 10,
    fontFamily: 'Rubik-Bold',
    color: '#000',
  },
  rechargeButton: {
    backgroundColor: '#fff',
    paddingVertical: nTwins(2.8, 4),
    width: responsiveWidth(80),
    borderRadius: responsiveWidth(4),
    borderWidth: responsiveWidth(0.6),
    borderColor: '#282828',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rechargeText: {
    fontFamily: 'Rubik-Bold',
    color: '#000',
    fontSize: responsiveFontSize(2),
  },
  recommendationText: {
    fontSize: responsiveFontSize(2.1),
    fontFamily: 'Rubik-Medium',
    marginBottom: 16,
    color: '#000',
  },
  recommendationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    borderWidth: responsiveWidth(0.4),
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: responsiveWidth(2),
    marginRight: 10,
    borderWidth: responsiveWidth(0.4),
    overflow: 'hidden',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: responsiveFontSize(1.97),
    color: '#282828',
    fontFamily: 'Rubik-Medium',
  },
  profileCategory: {
    color: '#1E1E1E',
    fontFamily: 'Rubik-Regular',
    fontSize: responsiveFontSize(1.23),
    marginTop: nTwins(0, 1),
  },
  priceWallet: {
    flexDirection: 'row',
    alignItems: 'center',
    width: responsiveWidth(82),
    justifyContent: 'space-between',
    paddingHorizontal: responsiveWidth(2),
  },

  noDataText: {
    textAlign: 'center',
    fontFamily: 'Rubik-Regular',
    fontSize: responsiveFontSize(2),
    color: '#888',
    marginTop: 20,
  },
  verifyContainer: {
    width: 15,
    height: 14.32,
    marginLeft: WIDTH_SIZES[4],
  },
});

export default ProfileUser;
