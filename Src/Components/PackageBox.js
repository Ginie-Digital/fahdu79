import React from 'react';
import {View, Text, Pressable, StyleSheet, Image, Platform} from 'react-native';
import {responsiveFontSize, responsiveWidth} from 'react-native-responsive-dimensions';
import WalletButton from './WalletButton';
import {ImageBackground} from 'expo-image';
import {walletBackground} from '../../DesiginData/Data';
import Svg, {Circle} from 'react-native-svg';

// Color config for each pack index (Android new design)
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
  <View style={androidStyles.circleContainer} pointerEvents="none">
    <Svg width={100} height={190} viewBox="0 0 100 190">
      <Circle cx={79} cy={22} r={38} stroke={color} strokeWidth={12} fill="none" />
      <Circle cx={91} cy={55} r={38} stroke={color} strokeWidth={12} fill="none" />
    </Svg>
  </View>
);

const CoinIcon = () => (
  <View style={androidStyles.coinWrapper}>
    <View style={androidStyles.coinShadow} />
    <View style={androidStyles.coinFace}>
      <Text style={androidStyles.coinSymbol}>₹</Text>
    </View>
  </View>
);

const AndroidPackageBox = ({ item, index, isLastItem, handler, offerText }) => {
  const colorConfig = PACK_COLORS[index] || PACK_COLORS[0];
  const cost = Number(item?.cost || item?.amount || 0).toLocaleString('en-IN');
  const hasBadge = !!offerText;

  return (
    <Pressable
      style={[
        androidStyles.cardOuter,
        { backgroundColor: colorConfig.bg },
        isLastItem && { width: responsiveWidth(88), marginHorizontal: responsiveWidth(2) },
      ]}
      onPress={() => handler(item?.packId || item?.pack_id)}
    >
      {/* Circle decoration */}
      <CircleDecoration color={colorConfig.circle} />

      {/* Badge Container */}
      <View style={[
        androidStyles.badgeContainer,
        { borderColor: colorConfig.badgeBorder }
      ]}>
        <Image
          source={BADGE_IMAGES[index % BADGE_IMAGES.length]}
          style={androidStyles.badgeIcon}
        />
      </View>

      {/* Content */}
      <View style={[
        androidStyles.content,
        { paddingBottom: hasBadge ? 42 : 16 }
      ]}>
        <Text style={androidStyles.packName}>{item.name}</Text>
        <View style={androidStyles.priceRow}>
          <Text style={androidStyles.priceText}>{cost}</Text>
          <CoinIcon />
        </View>

        {/* Buy Now button with solid box-shadow */}
        <View style={androidStyles.buyButtonWrapper}>
          <View style={androidStyles.buyButtonShadow} />
          <Pressable
            style={({ pressed }) => [
              androidStyles.buyButton,
              pressed && { transform: [{ translateX: 2 }, { translateY: 2 }] },
            ]}
            onPress={() => handler(item?.packId || item?.pack_id)}
          >
            <Text style={androidStyles.buyButtonText}>Buy Now</Text>
          </Pressable>
        </View>
      </View>

      {/* Discount badge - absolute overlay at bottom */}
      {hasBadge ? (
        <View style={androidStyles.badgeBar}>
          <Text style={androidStyles.badgeText}>{offerText}</Text>
        </View>
      ) : null}
    </Pressable>
  );
};

const PackageBox = ({item, index, isLastItem, loading, handler, offerText, isFahdu}) => {
  console.log(item?.cost);
  console.log(isLastItem, '++++++');

  const Badge = () => (
    offerText ? (
      <View style={[styles.badge, isFahdu ? styles.badgeFahdu : styles.badgeFull]}>
        <Text style={styles.badgeText}>{offerText}</Text>
      </View>
    ) : null
  );

  if (Platform.OS === 'android') {
    return (
      <AndroidPackageBox
        item={item}
        index={index}
        isLastItem={isLastItem}
        handler={handler}
        offerText={offerText}
      />
    );
  } else {
    if (isLastItem) {
      return (
        <Pressable>
          <ImageBackground
            source={require('../../Assets/Images/LastWalletCard.png')}
            style={[styles.card, {backgroundColor: '#fffeeb', borderWidth: responsiveWidth(0.4), width: responsiveWidth(88), paddingBottom: responsiveWidth(4)}]}
            imageStyle={styles.backgroundImage}
            contentFit="contain">
            <Badge />
            <View style={styles.content}>
              <Text style={styles.title}>{item.name}</Text>
              <View style={styles.priceContainer}>
                <Text style={styles.price}> {Number(Platform.OS === 'android' ? item?.amount : item.cost).toLocaleString('en-IN')}</Text>
                <Image source={require('../../Assets/Images/Coins2.png')} style={styles.coinIcon} />
              </View>

              <WalletButton title={'Buy Now'} packId={item?.pack_id} onPress={handler} />
            </View>
          </ImageBackground>
        </Pressable>
      );
    } else {
      return (
        <Pressable>
          <ImageBackground source={walletBackground[index]?.uri} style={styles.card} imageStyle={styles.backgroundImage} contentFit="contain">
            <Badge />
            <View style={styles.content}>
              <Text style={styles.title}>{item.name}</Text>
              <View style={styles.priceContainer}>
                <Text style={styles.price}> {Number(Platform.OS === 'android' ? item?.amount : item.cost).toLocaleString('en-IN')}</Text>
                <Image source={require('../../Assets/Images/Coins2.png')} style={styles.coinIcon} />
              </View>

              <WalletButton title={'Buy Now'} packId={item?.pack_id} onPress={handler} />
            </View>
          </ImageBackground>
        </Pressable>
      );
    }
  }
};

// Android new design styles
const androidStyles = StyleSheet.create({
  cardOuter: {
    width: responsiveWidth(42),
    marginHorizontal: responsiveWidth(2),
    overflow: 'hidden',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#000000',
    height: 188,
    position: 'relative',
  },
  badgeBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1E1E1E',
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    borderBottomLeftRadius: 14.5,
    borderBottomRightRadius: 14.5,
  },
  badgeText: {
    color: '#FFFFFF',
    fontFamily: 'Rubik-Medium',
    fontSize: 12,
    lineHeight: 12,
    textAlign: 'center',
    letterSpacing: 0.48,
    textTransform: 'uppercase',
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
    paddingTop: 58,
    paddingLeft: 20,
    paddingRight: 12,
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
});

// iOS / legacy styles
const styles = StyleSheet.create({
  card: {
    borderRadius: 15,
    paddingTop: responsiveWidth(9),
    paddingBottom: responsiveWidth(6),
    paddingLeft: responsiveWidth(4),
    maxWidth: '100%',
    width: responsiveWidth(42),
    marginHorizontal: responsiveWidth(2),
    overflow: 'hidden',
  },
  backgroundImage: {
    borderRadius: 15,
    resizeMode: 'cover',
  },
  title: {
    fontSize: responsiveFontSize(1.5),
    fontFamily: 'Rubik-Medium',
    color: '#000',
    marginBottom: 5,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  price: {
    fontSize: responsiveFontSize(3),
    fontWeight: 'bold',
    color: '#000',
    fontFamily: 'Rubik-Bold',
  },
  coinIcon: {
    width: 22,
    height: 22,
    marginLeft: 5,
  },
  content: {
    flexDirection: 'column',
    width: '100%',
    alignItems: 'flex-start',
  },
  badge: {
    position: 'absolute',
    top: 0,
    backgroundColor: '#1e1e1e',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    zIndex: 100,
  },
  badgeFull: {
    left: 0,
    right: 0,
  },
  badgeFahdu: {
    right: 0,
    width: 128,
    borderBottomLeftRadius: 16,
  },
  badgeText: {
    color: '#fff',
    fontFamily: 'Rubik-Medium',
    fontSize: 12,
  },
});

export default PackageBox;