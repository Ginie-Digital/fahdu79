import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    StatusBar,
} from 'react-native';
import { Image } from 'expo-image';
import { CustomHeader } from './CustomHeader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AnimatedButton from '../Components/AnimatedButton';
import { responsiveWidth } from 'react-native-responsive-dimensions';
import { useNavigation } from '@react-navigation/native';

export const WelcomeScreen = () => {
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();

    const handleContinue = () => {
        navigation.navigate('SubscriptionFeeScreen');
    };

    return (
        <View style={styles.wrapper}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
            <View style={{ backgroundColor: '#FFF', paddingTop: insets.top + 20 }}>
                <CustomHeader currentStep={1} totalSteps={5} />
            </View>

            <View style={styles.content}>
                <Text style={styles.title}>Welcome Creator!</Text>
                <Text style={styles.subtitle}>
                    Let's set up your profile to start earning from your content
                </Text>

                <View style={styles.optionsContainer}>
                    <View style={styles.optionCard}>
                        <View style={styles.iconContainer}>
                            <Image
                                source={require('../../Assets/Images/OnboardingIcon/welcome/1.png')}
                                style={styles.iconImage}
                                contentFit="contain"
                            />
                        </View>
                        <View style={styles.optionTextContainer}>
                            <Text style={styles.optionTitle}>Subscription Fee</Text>
                            <Text style={styles.optionSubtitle}>Create subscription tiers</Text>
                        </View>
                    </View>

                    <View style={styles.optionCard}>
                        <View style={styles.iconContainer}>
                            <Image
                                source={require('../../Assets/Images/OnboardingIcon/welcome/2.png')}
                                style={styles.iconImage}
                                contentFit="contain"
                            />
                        </View>
                        <View style={styles.optionTextContainer}>
                            <Text style={styles.optionTitle}>Auto Messages</Text>
                            <Text style={styles.optionSubtitle}>Welcome your new fans</Text>
                        </View>
                    </View>

                    <View style={styles.optionCard}>
                        <View style={styles.iconContainer}>
                            <Image
                                source={require('../../Assets/Images/OnboardingIcon/welcome/3.png')}
                                style={styles.iconImage}
                                contentFit="contain"
                            />
                        </View>
                        <View style={styles.optionTextContainer}>
                            <Text style={styles.optionTitle}>Fee Setup</Text>
                            <Text style={styles.optionSubtitle}>Set fees for chats & calls</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.infoBox}>
                    <View style={styles.infoIconCircle}>
                        <Image
                            source={require('../../Assets/Images/OnboardingIcon/welcome/i.png')}
                            style={styles.infoIconImage}
                            contentFit="contain"
                        />
                    </View>
                    <Text style={styles.infoText}>
                        You can update these anytime{'\n'}from your Settings.
                    </Text>
                </View>

                <View style={{ paddingBottom: insets.bottom + 20 }}>
                    <AnimatedButton title="Continue" onPress={handleContinue} buttonMargin={0} />
                </View>
            </View>

        </View>
    );
};

const styles = StyleSheet.create({
    wrapper: {
        flex: 1,
        backgroundColor: '#FFF9F5',

    },
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',

    },
    content: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 8,
        marginTop: 75
    },
    title: {
        fontSize: 24,
        fontFamily: 'Rubik-Bold',
        color: '#1E1E1E',
        marginBottom: 10,
        letterSpacing: 0,
    },
    subtitle: {
        fontSize: 13,
        fontFamily: 'Rubik-Medium',
        color: '#1e1e1e',
        marginBottom: 24,
        lineHeight: 19,
    },
    optionsContainer: {
        gap: 12,
        marginBottom: 24,
    },
    optionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderWidth: 2,
        borderColor: '#1E1E1E',
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
    },
    optionCardSelected: {
        borderColor: '#FFA86B',
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 10,
        backgroundColor: '#1E1E1E',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    iconImage: {
        width: 34,
        height: 34,
    },
    optionTextContainer: {
        flex: 1,
    },
    optionTitle: {
        fontSize: 15,
        fontFamily: 'Rubik-SemiBold',
        color: '#1E1E1E',
        marginBottom: 2,
        letterSpacing: 0,
    },
    optionSubtitle: {
        fontSize: 12,
        fontFamily: 'Rubik-Medium',
        color: '#1e1e1e',
        lineHeight: 16,
    },
    infoBox: {
        marginTop: 'auto',
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#FFF3EB',
        borderRadius: 16,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#FFE7D6'
    },
    infoIconCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#FFF',
        borderWidth: 1.5,
        borderColor: '#FFE7D6',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    infoIconImage: {
        width: 16,
        height: 16,
    },
    infoText: {
        flex: 1,
        fontSize: 16,
        fontFamily: 'Rubik-Medium',
        color: '#1e1e1e',
        lineHeight: 18,
    },
    continueButton: {
        backgroundColor: '#fff',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 20,
    },
    continueButtonText: {
        fontSize: 15,
        fontFamily: 'Rubik-SemiBold',
        color: '#1E1E1E',
        letterSpacing: 0,
    },
});