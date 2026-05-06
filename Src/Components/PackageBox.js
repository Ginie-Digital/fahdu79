import React from 'react';
import {View, Text, Pressable, StyleSheet, Image, Platform} from 'react-native';
import {responsiveFontSize, responsiveWidth} from 'react-native-responsive-dimensions';
import WalletButton from './WalletButton';
import {ImageBackground} from 'expo-image';
import {walletBackground} from '../../DesiginData/Data';

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
                <Text style={styles.price}> {Number(Platform.OS === 'android' ? item?.cost : item.cost).toLocaleString('en-IN')}</Text>
                <Image source={require('../../Assets/Images/Coins2.png')} style={styles.coinIcon} />
              </View>

              <WalletButton title={'Buy Now'} packId={item?.packId} onPress={handler} />
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
                <Text style={styles.price}> {Number(Platform.OS === 'android' ? item?.cost : item.cost).toLocaleString('en-IN')}</Text>
                <Image source={require('../../Assets/Images/Coins2.png')} style={styles.coinIcon} />
              </View>

              <WalletButton title={'Buy Now'} packId={item?.packId} onPress={handler} />
            </View>
          </ImageBackground>
        </Pressable>
      );
    }
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

const styles = StyleSheet.create({
  card: {
    borderRadius: 15,
    paddingTop: responsiveWidth(9),
    paddingBottom: responsiveWidth(6),
    paddingLeft: responsiveWidth(4),
    maxWidth: '100%',
    width: responsiveWidth(42),
    // borderWidth: responsiveWidth(0.4),
    marginHorizontal: responsiveWidth(2),
    overflow: 'hidden',
  },
  backgroundImage: {
    borderRadius: 15, // Match the card's border radius
    resizeMode: 'cover', // Adjust the image to cover the entire container
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