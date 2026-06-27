import React from 'react';
import {View, Text, StyleSheet, Pressable, useColorScheme} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {Image} from 'expo-image';

export default function WalletRechargeScreen({navigation}) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const handleRecharge = method => {
    console.log('Selected:', method);
    navigation.navigate('wallet', {method});
  };
  return (
    <View style={[styles.container, isDark && { backgroundColor: '#0D0D0D' }]}>
      <Text style={[styles.subtitle, isDark && { color: '#9E9E9E' }]}>Choose a payment method to securely add money to your wallet.</Text>

      <View style={styles.optionContainer}>
        {/* <Pressable style={styles.card} onPress={() => handleRecharge('PhonePe')}>
          <View style={styles.cardContent}>
            <Image source={require('../Assets/Images/Wallet/Phonepe.png')} style={styles.icon} />
            <Text style={styles.label}>PhonePe</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#1e1e1e" />
        </Pressable> */}

        <Pressable style={[styles.card, isDark && { backgroundColor: '#1A1A1A', borderColor: '#FF7819' }]} onPress={() => handleRecharge('Cashfree')}>
          <View style={[styles.cardContent, isDark && { backgroundColor: '#1A1A1A' }]}>
            <Image source={require('../Assets/Images/Wallet/Cashfree.png')} style={styles.icon} />
            <Text style={[styles.label, isDark && { color: '#FFFFFF' }]}>Cashfree</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={isDark ? '#FFFFFF' : '#1e1e1e'} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 24,
    paddingTop: 20,
  },
  title: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: 24,
    color: '#1e1e1e',
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'Rubik-Regular',
    fontSize: 14,
    color: '#1e1e1e',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 32,
  },
  optionContainer: {
    gap: 16,
  },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderWidth: 1.5,
    borderColor: '#ffa86b',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
  },
  icon: {
    width: 36,
    height: 36,
    resizeMode: 'contain',
    marginRight: 16,
  },
  label: {
    fontFamily: 'Rubik-Medium',
    fontSize: 16,
    color: '#1e1e1e',
  },
});
