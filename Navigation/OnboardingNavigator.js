import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { WelcomeScreen } from '../Src/Onbarding/WelcomeScreen';
import SubscribeScreen from '../Src/Screens/SubscribeScreen';
import SubscriptionFeeScreen from '../Src/Onbarding/SubscriptionFeeScreen';
import AutoMessagesScreen from '../Src/Onbarding/AutoMessagesScreen';
import FeeSetupScreen from '../Src/Onbarding/FeeSetupScreen';
import AllSetScreen from '../Src/Onbarding/AllSetScreen';




const Stack = createNativeStackNavigator();

export const OnboardingNavigator = () => {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="SubscriptionFee" component={SubscribeScreen} />
            <Stack.Screen name="SubscriptionFeeScreen" component={SubscriptionFeeScreen} />
            <Stack.Screen name='AutoMessageScreen' component={AutoMessagesScreen} />
            <Stack.Screen name='FeeSetupScreen' component={FeeSetupScreen} />
            <Stack.Screen name='AllSetScreen' component={AllSetScreen} />
        </Stack.Navigator>
    );
};