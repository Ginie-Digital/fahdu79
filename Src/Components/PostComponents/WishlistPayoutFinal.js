import {StyleSheet, Text, View, TouchableOpacity, ScrollView} from 'react-native';
import React, {useState} from 'react';
import {responsiveFontSize, responsiveWidth} from 'react-native-responsive-dimensions';
import {useWishlistPayoutMutation} from '../../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
import {useSelector} from 'react-redux';
import {CommonSuccess, LoginPageErrors} from '../ErrorSnacks';
import {navigate} from '../../../Navigation/RootNavigation';

const WishlistPayoutFinal = ({route, navigation}) => {
  const {wishlistItem, bankDetails} = route.params;
  const token = useSelector(state => state.auth.user.token);
  const [isProcessing, setIsProcessing] = useState(false);

  const [wishlistPayout, {isLoading}] = useWishlistPayoutMutation();

  const handleConfirm = async () => {
    try {
      setIsProcessing(true);

      const payoutData = {
        fahduFees: wishlistItem.fahduFees,
        amount: wishlistItem.payoutAmount,
        source: 'WISHLIST',
        wishlistId: wishlistItem?.wishlistId,
      };

      console.log('Payout Data:', payoutData);

      const response = await wishlistPayout({
        token,
        data: payoutData,
      }).unwrap();

      console.log('Payout Response:', response);

      CommonSuccess('Payout request submitted successfully!');

      // Navigate back after showing success message
      setTimeout(() => {
        navigate('wishlistSuccessPayout');
      }, 2000);
    } catch (error) {
      console.error('Payout Error:', error);
      LoginPageErrors(error?.data?.message || 'Failed to process payout. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Wishlist Item Card */}
        <View style={styles.wishlistCard}>
          <Text style={styles.cardLabel}>Wishlist Item</Text>
          <Text style={styles.wishlistTitle} numberOfLines={2} ellipsizeMode="tail">
            {wishlistItem.title}
          </Text>

          <View style={styles.row}>
            <Text style={styles.label}>Fund Raised</Text>
            <Text style={styles.value}>₹{Math.floor(wishlistItem.fundRaised).toLocaleString('en-IN', {maximumFractionDigits: 0})}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>10% Fahdu fees</Text>
            <Text style={styles.value}>₹{Math.floor(wishlistItem.fahduFees).toLocaleString('en-IN', {maximumFractionDigits: 0})}</Text>
          </View>

          <View style={[styles.row, {marginBottom: 0}]}>
            <Text style={styles.labelBold}>Payout Amount</Text>
            <Text style={styles.valueBold}>₹{Math.floor(wishlistItem.payoutAmount).toLocaleString('en-IN', {maximumFractionDigits: 0})}</Text>
          </View>
        </View>

        {/* Bank Details Card */}
        <View style={styles.bankCard}>
          <Text style={styles.bankTitle}>Bank Details</Text>

          <View style={styles.bankRow}>
            <Text style={styles.bankLabel}>Beneficiary Name</Text>
            <Text style={styles.bankValue} numberOfLines={1} ellipsizeMode="tail">
              {bankDetails.beneficiaryName}
            </Text>
          </View>

          <View style={styles.bankRow}>
            <Text style={styles.bankLabel}>Account Number</Text>
            <Text style={styles.bankValue} numberOfLines={1} ellipsizeMode="tail">
              {bankDetails.accountNo}
            </Text>
          </View>

          <View style={styles.bankRow}>
            <Text style={styles.bankLabel}>IFSC Code</Text>
            <Text style={styles.bankValue} numberOfLines={1} ellipsizeMode="tail">
              {bankDetails.IFSC}
            </Text>
          </View>

          <View style={styles.bankRow}>
            <Text style={styles.bankLabel}>PAN</Text>
            <Text style={styles.bankValue} numberOfLines={1} ellipsizeMode="tail">
              {bankDetails.PAN}
            </Text>
          </View>

          <View style={styles.noteContainer}>
            <Text style={styles.noteLabel}>Note: </Text>
            <Text style={styles.noteText}>Please verify your bank details carefully. Incorrect details may delay the payout process.</Text>
          </View>

          <Text style={styles.contactText}>
            For further enquiry email at {'\n'}
            <Text style={styles.emailText}>contact@fahdu.com</Text>
          </Text>
        </View>
      </ScrollView>

      {/* Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.cancelButton} onPress={handleCancel} activeOpacity={0.7}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.confirmButton, (isLoading || isProcessing) && styles.confirmButtonDisabled]} onPress={handleConfirm} activeOpacity={0.8} disabled={isLoading || isProcessing}>
          <Text style={styles.confirmButtonText}>{isLoading || isProcessing ? 'Processing...' : 'Confirm'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default WishlistPayoutFinal;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: responsiveWidth(5),
    paddingTop: responsiveWidth(5),
    paddingBottom: responsiveWidth(4),
  },

  // Wishlist Card
  wishlistCard: {
    borderStyle: 'dashed',
    borderWidth: 2,
    borderColor: '#1e1e1e',
    borderRadius: responsiveWidth(4),
    padding: responsiveWidth(5),
    marginBottom: responsiveWidth(5),
    backgroundColor: '#fff',
  },
  cardLabel: {
    fontFamily: 'Rubik-Regular',
    fontSize: responsiveFontSize(1.7),
    color: '#1e1e1e',
    marginBottom: responsiveWidth(1.5),
  },
  wishlistTitle: {
    fontFamily: 'Rubik-Bold',
    fontSize: responsiveFontSize(2.4),
    color: '#1e1e1e',
    marginBottom: responsiveWidth(4),
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: responsiveWidth(3),
  },
  label: {
    fontFamily: 'Rubik-Regular',
    fontSize: responsiveFontSize(1.9),
    color: '#1e1e1e',
  },
  value: {
    fontFamily: 'Rubik-Regular',
    fontSize: responsiveFontSize(1.9),
    color: '#1e1e1e',
  },
  labelBold: {
    fontFamily: 'Rubik-Bold',
    fontSize: responsiveFontSize(2),
    color: '#1e1e1e',
  },
  valueBold: {
    fontFamily: 'Rubik-Bold',
    fontSize: responsiveFontSize(2.2),
    color: '#1e1e1e',
  },

  // Bank Card
  bankCard: {
    borderWidth: 2,
    borderColor: '#1e1e1e',
    borderRadius: responsiveWidth(4),
    padding: responsiveWidth(5),
    marginBottom: responsiveWidth(4),
    backgroundColor: '#fff',
  },
  bankTitle: {
    fontFamily: 'Rubik-Bold',
    fontSize: responsiveFontSize(2.2),
    color: '#1e1e1e',
    marginBottom: responsiveWidth(4),
  },
  bankRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: responsiveWidth(3.5),
  },
  bankLabel: {
    fontFamily: 'Rubik-Regular',
    fontSize: responsiveFontSize(1.7),
    color: '#1e1e1e',
    flexShrink: 0,
    marginRight: responsiveWidth(2),
  },
  bankValue: {
    fontFamily: 'Rubik-Bold',
    fontSize: responsiveFontSize(1.8),
    color: '#1e1e1e',
    flex: 1,
    textAlign: 'right',
  },
  noteContainer: {
    marginTop: responsiveWidth(3),
    marginBottom: responsiveWidth(3),
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  noteLabel: {
    fontFamily: 'Rubik-Bold',
    fontSize: responsiveFontSize(1.6),
    color: '#1e1e1e',
  },
  noteText: {
    fontFamily: 'Rubik-Regular',
    fontSize: responsiveFontSize(1.6),
    color: '#1e1e1e',
    flex: 1,
    lineHeight: responsiveFontSize(2.2),
  },
  contactText: {
    fontFamily: 'Rubik-Regular',
    fontSize: responsiveFontSize(1.6),
    color: '#1e1e1e',
    lineHeight: responsiveFontSize(2.2),
  },
  emailText: {
    fontFamily: 'Rubik-SemiBold',
    color: '#FFA86B',
  },

  // Buttons
  buttonContainer: {
    flexDirection: 'row',
    paddingHorizontal: responsiveWidth(5),
    paddingVertical: responsiveWidth(4),
    paddingBottom: responsiveWidth(6),
    gap: responsiveWidth(4),
    backgroundColor: '#fff',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#1e1e1e',
    borderRadius: responsiveWidth(3),
    paddingVertical: responsiveWidth(4),
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontFamily: 'Rubik-Bold',
    fontSize: responsiveFontSize(2),
    color: '#1e1e1e',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#FFA86B',
    borderRadius: responsiveWidth(3),
    paddingVertical: responsiveWidth(4),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#1e1e1e',
  },
  confirmButtonDisabled: {
    backgroundColor: '#FFD4B3',
    opacity: 0.7,
  },
  confirmButtonText: {
    fontFamily: 'Rubik-Bold',
    fontSize: responsiveFontSize(2),
    color: '#1e1e1e',
  },
});
