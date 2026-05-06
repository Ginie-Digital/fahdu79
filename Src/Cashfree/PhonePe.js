import {StyleSheet, Button, View, Platform} from 'react-native';
import React, {useState} from 'react';
import {TextInput} from 'react-native-gesture-handler';

// const PAY = Platform.OS === 'android' ? require('react-native-phonepe-pg').default : {
//     init: () => Promise.reject('PhonePe not supported on this platform'),
//     startTransaction: () => Promise.reject('PhonePe not supported on this platform'),
// };

const PAY = {
    init: () => Promise.reject('PhonePe not supported on this platform'),
    startTransaction: () => Promise.reject('PhonePe not supported on this platform'),
};

import {usePhonePePayLoadMutation} from '../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
import {useSelector} from 'react-redux';

const PhonePe = () => {
  const [environment, setEnvironment] = useState('PRODUCTION');
  const [merchantId, setMerchantID] = useState('GINIEONLINE');
  const [appId, setAppID] = useState('HULARA');
  const [enableLogging, setEnableLogging] = useState(true);

  const [phonePePayLoad] = usePhonePePayLoadMutation();

  const token = useSelector(state => state.auth.user.token);

  const getPayLoad = async () => {
    const {data, error} = await phonePePayLoad({
      token,
      data: {
        packId: '686786b33874aa6052c1c18c',
      },
    });

    if (data) {
      console.log(data?.data?.encodedPayload,);
      return data?.data?.encodedPayload
    }

    if (error) {
      console.log(error);
    }
  };

  const handlePayment = async () => {
    PAY.init('PRODUCTION', merchantId, appId, enableLogging)
      .then(async res => {
        console.log('SDK Response', res);
             let payload_main  = await getPayLoad();
          console.log("Payload main", payload_main)
          if(payload_main) {
            PAY.startTransaction(payload_main, "checksum", "com.fahdu", "fahdu") 
            .then(e => {
              console.log("hello", e)
            })
          }
      })
      .catch(e => {
        console.log('there was error in intializing the sdk', e);
      });
  };

  return (
    <View>
      <Button title="Press me" onPress={() => handlePayment()} />
    </View>
  );
};

export default PhonePe;

const styles = StyleSheet.create({});
