import { StyleSheet, Text, View, Button, Alert, ActivityIndicator, Platform } from 'react-native';
import React, { useState, useEffect } from 'react';
import { useGetPaymentTokenMutation } from '../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
import { useSelector } from 'react-redux';
import {
  CFEnvironment,
  CFSession,
  CFPaymentModes,
  CFThemeBuilder,
  CFPaymentComponentBuilder,
  CFDropCheckoutPayment
} from 'cashfree-pg-api-contract';


const CFPaymentGatewayService = Platform.OS === 'android' ? require('react-native-cashfree-pg-sdk').CFPaymentGatewayService : null;


const CFPayments = () => {

  const [getPaymentToken] = useGetPaymentTokenMutation();

  const token = useSelector(state => state.auth.user.token);

  const [loading, setLoading] = useState(false);
  
  const [responseText, setResponseText] = useState('');

  useEffect(() => {
    if (CFPaymentGatewayService) {
      CFPaymentGatewayService.setCallback({
        onVerify: (orderID) => {
          setResponseText('orderId is :' + orderID);
          setLoading(false)
        },
        onError: (error, orderID) => {
          setResponseText(
            'exception is : ' + JSON.stringify(error) + '\norderId is :' + orderID
          );
          setLoading(false)
        },
      });
    }

    return () => {
      if (CFPaymentGatewayService) {
        CFPaymentGatewayService.removeCallback();
      }
    };
  }, []);


  const handlePayment = async () => {
    setLoading(true);
    try {
      const response = await getPaymentToken({
        token,
        data: { packId: '685e7f1a7914a61ce8c1c18e' }
      });

      console.log(response)


      if (!response?.data?.data?.sessionId || !response?.data?.data?.orderId) {
        throw new Error('Invalid payment session response');
      }


      const session = new CFSession(
        response?.data?.data?.sessionId ,
        response?.data?.data?.orderId,
        CFEnvironment.PRODUCTION
      );


      const paymentModes = new CFPaymentComponentBuilder()
        .add(CFPaymentModes.CARD)
        .add(CFPaymentModes.UPI)
        .add(CFPaymentModes.NB)
        .add(CFPaymentModes.WALLET)
        .add(CFPaymentModes.PAY_LATER)
        .build();


      const theme = new CFThemeBuilder()
      .setNavigationBarBackgroundColor('#E64A19')
      .setNavigationBarTextColor('#FFFFFF')
      .setButtonBackgroundColor('#FFC107')
      .setButtonTextColor('#FFFFFF')
      .setPrimaryTextColor('#212121')
      .setSecondaryTextColor('#757575')
      .build();

      const dropPayment = new CFDropCheckoutPayment(
        session,
        paymentModes,
        theme
      );
      
      if (CFPaymentGatewayService) {
        CFPaymentGatewayService.doPayment(dropPayment);
      } else {
        console.warn('Cashfree Payment Gateway Service not available');
      }

    } catch (error) {
      setLoading(false);
      console.error('Payment Error:', error);
    }
  };



  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#3d84b8" />
        <Text style={styles.loadingText}>Processing payment...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Complete Payment</Text>
      <View style={styles.buttonWrapper}>
        <Button
          title="Pay Securely"
          onPress={handlePayment}
          color="#3d84b8"
          disabled={loading}
        />

              <Text>{responseText}</Text>

      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  center: {
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  buttonWrapper: {
    marginHorizontal: 50,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  }
});

export default CFPayments;
