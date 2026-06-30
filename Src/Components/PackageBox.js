import React from 'react';
import {View, Text, Pressable, StyleSheet, Image, Platform, ActivityIndicator} from 'react-native';
import {responsiveWidth} from 'react-native-responsive-dimensions';
import {useSelector} from 'react-redux';
import Svg, {Circle} from 'react-native-svg';

// Color config for each pack index
const PACK_COLORS = [
  { bg: '#EFFBF2', circle: '#D6F5DE', badgeBorder: '#CEF3D7' }, // Faltu - Green
  { bg: '#FFFEEB', circle: '#FFFDDB', badgeBorder: '#FFE899' }, // Farzi - Yellow
  { bg: '#FFE0F0', circle: '#FFCCE6', badgeBorder: '#FFBDDF' }, // Fukrey - Pink
  { bg: '#F2EBFF', circle: '#E4D6FF', badgeBorder: '#D7C2FF' }, // Funtoosh - Purple
  { bg: '#FFECE0', circle: '#FFDCC7', badgeBorder: '#FFD9C2' }, // Fahdu - Orange
  { bg: '#EBF7FF', circle: '#CCEBFF', badgeBorder: '#C2E7FF' }, // Fantom - Light Blue
  { bg: '#FCFFEB', circle: '#F4FFB8', badgeBorder: '#F0FF99' }, // Fataaka - Yellow/Green
  { bg: '#FEE2E2', circle: '#FDC4C4', badgeBorder: '#FDBFBF' }, // Fanatix - Rose
];

const BADGE_IMAGES = [
  require('../../Assets/Images/Badges/Bronze.png'),
  require('../../Assets/Images/Badges/Silver.png'),
  require('../../Assets/Images/Badges/Gold.png'),
  require('../../Assets/Images/Badges/Platinum.png'),
  require('../../Assets/Images/Badges/Diamond.png'),
  require('../../Assets/Images/Badges/Elite.png'),
  require('../../Assets/Images/Badges/Royal.png'),
  require('../../Assets/Images/Badges/Legend.png'),
];

const CircleDecoration = ({ color }) => (
  <View style={styles.circleContainer} pointerEvents="none">
    <Svg width={100} height={190} viewBox="0 0 100 190">
      <Circle cx={79} cy={22} r={38} stroke={color} strokeWidth={12} fill="none" />
      <Circle cx={91} cy={55} r={38} stroke={color} strokeWidth={12} fill="none" />
    </Svg>
  </View>
);

const CoinIcon = () => (
  <View style={styles.coinWrapper}>
    <View style={styles.coinShadow} />
    <View style={styles.coinFace}>
      <Text style={styles.coinSymbol}>₹</Text>
    </View>
  </View>
);

const PackageBox = ({item, index, isLastItem, handler, offerText}) => {
  const currentButton = useSelector(state => state.hideShow.visibility.walletLoader);
  const packId = item?.packId || item?.pack_id;
  const isCurrentLoading = packId != null && packId === currentButton;

  const colorConfig = PACK_COLORS[index % PACK_COLORS.length] || PACK_COLORS[0];
  const rawCost = item?.cost;
  const cost = Number(rawCost || item?.amount || 0).toLocaleString('en-IN');


  return (
    <View
      style={[
        styles.cardOuter,
        { backgroundColor: colorConfig.bg },
        isLastItem && styles.cardOuterLast,
      ]}
    >
      {/* Circle decoration */}
      <CircleDecoration color={colorConfig.circle} />

      {/* Badge Container */}
      <View style={[
        styles.badgeContainer,
        { borderColor: colorConfig.badgeBorder }
      ]}>
        <Image
          source={BADGE_IMAGES[index % BADGE_IMAGES.length]}
          style={styles.badgeIcon}
        />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.packName}>{item.name}</Text>
        <View style={styles.priceRow}>
          <Text style={styles.priceText}>{cost}</Text>
          <CoinIcon />
        </View>

        {/* Buy Now button with solid box-shadow */}
        <View style={styles.buyButtonWrapper}>
          <View style={styles.buyButtonShadow} />
          <Pressable
            style={({ pressed }) => [
              styles.buyButton,
              pressed && { transform: [{ translateX: 2 }, { translateY: 2 }] },
            ]}
            onPress={() => handler(packId)}
            disabled={isCurrentLoading}
          >
            {isCurrentLoading ? (
              <ActivityIndicator size="small" color="#000000" style={{ paddingHorizontal: 10 }} />
            ) : (
              <Text style={styles.buyButtonText}>Buy Now</Text>
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardOuter: {
    width: 163,
    marginHorizontal: responsiveWidth(2),
    overflow: 'hidden',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#000000',
    height: 176,
    position: 'relative',
  },
  circleContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 100,
    zIndex: 1,
  },
  content: {
    flexDirection: 'column',
    width: '100%',
    alignItems: 'flex-start',
    paddingTop: 62,
    paddingLeft: 20,
    paddingRight: 12,
    paddingBottom: 16,
    zIndex: 2,
  },
  packName: {
    fontFamily: 'Rubik-Medium',
    fontSize: 12,
    lineHeight: 14,
    color: '#000000',
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 10,
  },
  priceText: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: 24,
    lineHeight: 24,
    color: '#000000',
  },
  coinWrapper: {
    width: 21,
    height: 21,
    position: 'relative',
  },
  coinShadow: {
    position: 'absolute',
    width: 19,
    height: 19,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#000000',
    top: 2,
    left: 2,
  },
  coinFace: {
    position: 'absolute',
    width: 19,
    height: 19,
    borderRadius: 10,
    backgroundColor: '#FFE72D',
    borderWidth: 1.5,
    borderColor: '#000000',
    top: 0,
    left: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coinSymbol: {
    fontSize: 8,
    fontFamily: 'Rubik-Bold',
    color: '#000000',
    marginTop: -1,
  },
  buyButtonWrapper: {
    position: 'relative',
    alignSelf: 'flex-start',
  },
  buyButtonShadow: {
    position: 'absolute',
    top: 2,
    left: 2,
    right: -2,
    bottom: -2,
    backgroundColor: '#000000',
    borderRadius: 8,
  },
  buyButton: {
    backgroundColor: '#FFA86B',
    borderWidth: 1.5,
    borderColor: '#000000',
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 15,
  },
  buyButtonText: {
    fontFamily: 'Rubik-Medium',
    fontSize: 12,
    lineHeight: 14,
    color: '#000000',
  },
  badgeContainer: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 3,
  },
  badgeIcon: {
    width: 90,
    height: 90,
    resizeMode: 'contain',
  },
  cardOuterLast: {
    width: responsiveWidth(86),
  },
});

export default PackageBox;