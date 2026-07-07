import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Platform } from 'react-native';

import Ionicons from 'react-native-vector-icons/Ionicons';
import WalletSVG from '../../../Assets/svg/WalletIcon.svg';
import { useLazyRecommendedCreatorsQuery } from '../../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
import { useSelector } from 'react-redux';
import { Image } from 'expo-image';
import UserProfileTrendingShimmer from '../Shimmers/UserProfileTrendingShimmer';
import { navigate } from '../../../Navigation/RootNavigation';
import axios from 'axios';
import AnimatedNumber from '../AnimatedNumber';

import { LoginPageErrors } from '../ErrorSnacks';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { BASE_URL } from '../../Configs/ApiConfig';
import { useAppTheme } from '../../Hook/useAppTheme';

const ProfileUser = () => {
  const token = useSelector(state => state.auth.user.token);
  const userRole = useSelector(state => state.auth.user.role);
  const [creatorsList, setCreatorsList] = useState([]);
  const [trendingCreators] = useLazyRecommendedCreatorsQuery({ refetchOnFocus: true });
  const [loading, setLoading] = useState(false);
  const [coins, setCoins] = useState(0);
  const [walletBadges, setWalletBadges] = useState([]);

  const [totalPage, setTotalPages] = useState(0);

  const [currentPage, setCurrentPage] = useState(1);

  const [buttonClickRecharge, setButtonClickRecharge] = useState(false);

  const [clickRecommendation, setClickRecommendation] = useState({ click: false, id: 0 });

  const [firstLoading, setFirstLoading] = useState(true);

  const { colors, isDark } = useAppTheme();

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

  const fetchWalletBadges = useCallback(async () => {
    try {
      const { data } = await axios.get(`${BASE_URL}/api/wallet/latest/recharge`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        timeout: 10000,
      });
      if (data?.statusCode === 200 && data?.data) {
        setWalletBadges(data.data);
      }
    } catch (e) {
      console.log('Error fetching wallet badges in ProfileUser:', e?.message);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      // This code will run every time the screen is focused
      getUserCoins();
      if (userRole !== 'creator' && userRole !== 'admin') {
        fetchWalletBadges();
      }
      return () => {
        // (Optional) cleanup code runs when screen loses focus
      };
    }, [fetchWalletBadges, userRole]),
  );

  const handleFetchNext = () => {
    if (currentPage < totalPage) {
      setCurrentPage(currentPage + 1);
    }

    return;
  };

  const renderItem = ({ index, item }) => (
    <Pressable
      style={[styles.recCard, { borderColor: colors.border }, clickRecommendation.id === index && clickRecommendation.click && { opacity: 0.8 }]}
      onPressIn={() => setClickRecommendation({ click: true, id: index })}
      onPressOut={() => setClickRecommendation({ click: false, id: index })}
      onPress={() => handleGoToOthersProfile(item?.displayName, item?._id)}>
      <Image style={styles.recImage} placeholderContentFit="cover" contentFit="cover" placeholder={require('../../../Assets/Images/DefaultProfile.jpg')} source={{ uri: item?.profile_image?.url }} />
      {/* Gradient overlay matching Figma: transparent → 0.2 → 0.8 */}
      <LinearGradient
        colors={['rgba(30,30,30,0)', 'rgba(30,30,30,0.2)', 'rgba(30,30,30,0.8)']}
        locations={[0, 0.5, 1]}
        style={styles.recGradient}
      />
      <View style={styles.recInfoContainer}>
        <View style={styles.recNameRow}>
          <Text style={styles.recName} numberOfLines={1}>
            {item?.displayName && item.displayName.length > 9 
              ? `${item.displayName.slice(0, 9)}...` 
              : item?.displayName}
          </Text>
          <View style={styles.recOnlineDot} />
        </View>
      </View>
    </Pressable>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.walletCard}>
        <View style={styles.walletInner}>
          <View style={styles.walletLeft}>
            <Text style={styles.walletLabel}>Wallet Balance</Text>
            <Text style={styles.balance}>
              ₹ <AnimatedNumber target={coins} style={styles.balance} />
            </Text>
          </View>
          <WalletSVG width={24} height={24} />
        </View>

        <Pressable
          style={[
            styles.addCoinsButton,
            {
              backgroundColor: isDark 
                ? (buttonClickRecharge ? '#FFA86B' : '#1C1C1C') 
                : (buttonClickRecharge ? '#EBEBEB' : '#FFFFFF'),
              borderColor: isDark ? '#212121' : '#1E1E1E',
            }
          ]}
          onPressIn={() => setButtonClickRecharge(true)}
          onPressOut={() => setButtonClickRecharge(false)}
          onPress={() => {
            if (suspended) {
              LoginPageErrors('Your account is suspended');
              return;
            }
            navigate('wallet');
          }}>
          <View style={styles.addCoinsRow}>
            <Image source={require('../../../Assets/Images/PlusMyProfileUserIconWallet.png')} style={{width: 16, height: 16}} contentFit="contain" tintColor={isDark ? (buttonClickRecharge ? '#1E1E1E' : '#FFFFFF') : '#1E1E1E'} />
            <Text style={[styles.addCoinsText, { color: isDark ? (buttonClickRecharge ? '#1E1E1E' : '#FFFFFF') : '#1E1E1E' }]}>Add Coins</Text>
          </View>
        </Pressable>
      </View>

      <Text style={[styles.recommendationTitle, { color: colors.text }]}>Recommendations</Text>
      {!loading && (
        <FlatList
          data={creatorsList}
          renderItem={renderItem}
          keyExtractor={(item, index) => item?._id || index.toString()}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.recListContainer}
          ListEmptyComponent={<Text style={styles.noDataText}>No recommendations available</Text>}
          onEndReached={handleFetchNext}
          onEndReachedThreshold={0.5}
        />
      )}

      {loading && (
        <FlatList
          data={[1, 2, 3, 4]}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.recListContainer}
          renderItem={() => <UserProfileTrendingShimmer />}
          keyExtractor={(item) => item.toString()}
        />
      )}
      {walletBadges && walletBadges.length > 0 ? (
        <View style={{ height: 80 }} />
      ) : (
        <View style={{ height: 70 }} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D0D',
    paddingHorizontal: 24,
    paddingTop: 24,
  },

  // Wallet Card — Figma specs
  walletCard: {
    backgroundColor: '#FFA86B',
    borderRadius: 16,
    padding: 24,
    gap: 16,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#FF7819',
  },
  walletInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  walletLeft: {
    gap: 14,
  },
  walletLabel: {
    fontSize: 12,
    lineHeight: 12,
    color: '#000000',
    fontFamily: 'Rubik-Medium',
  },
  balance: {
    fontSize: 32,
    lineHeight: 32,
    fontFamily: 'Rubik-Bold',
    color: '#000000',
  },
  addCoinsButton: {
    backgroundColor: '#1C1C1C',
    height: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#212121',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addCoinsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  addCoinsText: {
    fontFamily: 'Rubik-Bold',
    color: '#FFFFFF',
    fontSize: 13,
    lineHeight: 13,
    textAlign: 'center',
  },

  // Recommendations — Figma specs
  recommendationTitle: {
    fontSize: 20,
    lineHeight: 24,
    fontFamily: 'Rubik-SemiBold',
    marginBottom: 16,
    color: '#FFFFFF',
  },
  recListContainer: {
    gap: 16,
    paddingRight: 24,
  },
  recCard: {
    width: 163,
    height: 163,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  recImage: {
    width: '100%',
    height: '100%',
  },
  recGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
    borderRadius: 15,
  },
  recInfoContainer: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
  },
  recNameRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 7,
  },
  recName: {
    fontSize: 14,
    lineHeight: 14,
    color: '#FFFFFF',
    fontFamily: 'Rubik-Medium',
    flexShrink: 1,
  },
  recOnlineDot: {
    width: 8,
    height: 8,
    borderRadius: 9999,
    backgroundColor: '#00C950',
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(34, 197, 94, 0.6)',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },

  noDataText: {
    textAlign: 'center',
    fontFamily: 'Rubik-Regular',
    fontSize: 14,
    color: '#888',
    marginTop: 20,
    width: 200,
  },
});

export default ProfileUser;
