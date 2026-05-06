import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    StatusBar,
    Platform,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Image } from 'expo-image';
import { CustomHeader } from './CustomHeader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AnimatedButton from '../Components/AnimatedButton';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { useLazyGetOwnPackageQuery } from '../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
import { LoginPageErrors } from '../Components/ErrorSnacks';
import { autoLogout } from '../../AutoLogout';
import Loader from '../Components/Loader';


const SubscriptionFeeScreen = () => {
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const token = useSelector(state => state.auth.user.token);

    const [getOwnPackage] = useLazyGetOwnPackageQuery();
    const [loading, setLoading] = useState(true);

    const [basePrice, setBasePrice] = useState('999');
    const [priceError, setPriceError] = useState(false);
    const [discounts, setDiscounts] = useState({
        1: '0',
        2: '10',
        3: '20',
        4: '30',
    });

    const plans = [
        { id: 1, duration: '1 Month Plan', months: 1 },
        { id: 2, duration: '3 Month Plan', months: 3 },
        { id: 3, duration: '6 Month Plan', months: 6 },
        { id: 4, duration: '12 Month Plan', months: 12 },
    ];

    // Fetch existing subscription data from server
    useEffect(() => {
        const fetchSubscriptionData = async () => {
            try {
                const { data, error } = await getOwnPackage({ token });

                if (error) {
                    if (error?.status === 'FETCH_ERROR') {
                        LoginPageErrors('Please check your network');
                    }
                    if (error?.data?.status_code === 2044) {
                        autoLogout();
                    }
                }

                if (data?.data?.subscriptions) {
                    const subs = data.data.subscriptions;

                    // Set base price from 1 month plan
                    if (subs[0]?.amount) {
                        setBasePrice(String(subs[0].amount));
                    }

                    // Set discounts for all plans
                    setDiscounts({
                        1: String(subs[0]?.discount || 0),
                        2: String(subs[1]?.discount || 10),
                        3: String(subs[2]?.discount || 20),
                        4: String(subs[3]?.discount || 30),
                    });

                    console.log('Loaded subscription data from server:', subs);
                }
            } catch (err) {
                console.log('Error fetching subscription data:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchSubscriptionData();
    }, [token]);

    const getPlanPrice = (months) => {
        const numPrice = parseFloat(basePrice.replace(/,/g, '')) || 0;
        return Math.round(numPrice * months).toLocaleString('en-IN');
    };

    const handleBasePriceChange = (text) => {
        const sanitized = text.replace(/[^0-9]/g, '');
        setBasePrice(sanitized);

        const numPrice = parseFloat(sanitized) || 0;
        if (numPrice > 10000) {
            setPriceError(true);
        } else {
            setPriceError(false);
        }
    };

    const updateDiscount = (planId, value) => {
        // Allow empty string for typing, but validate the value
        let sanitizedValue = value.replace(/[^0-9]/g, ''); // Only allow digits

        // Cap discount at 98%
        if (sanitizedValue !== '' && parseInt(sanitizedValue, 10) > 98) {
            sanitizedValue = '98';
        }

        setDiscounts(prev => ({ ...prev, [planId]: sanitizedValue }));
    };

    // Check if a discount value would result in negative or zero pricing
    const isDiscountValid = (planId) => {
        const discount = parseFloat(discounts[planId]) || 0;
        return discount >= 0 && discount <= 100;
    };


    // Check if the after-discount price is positive
    const isAfterDiscountPositive = (price, planId) => {
        const numPrice = parseFloat(price.replace(/,/g, '')) || 0;
        const numDiscount = parseFloat(discounts[planId]) || 0;
        const result = numPrice - (numPrice * numDiscount / 100);
        return result > 0;
    };

    const calculateAfterDiscount = (price, planId) => {
        const numPrice = parseFloat(price.replace(/,/g, '')) || 0;
        const numDiscount = parseFloat(discounts[planId]) || 0;
        const result = numPrice - (numPrice * numDiscount / 100);
        return Math.round(result).toLocaleString('en-IN');
    };

    const handleContinue = () => {
        // Validate base price limit (Max ₹10,000)
        const numBasePrice = parseFloat(basePrice.replace(/,/g, '')) || 0;
        if (numBasePrice > 10000) {
            LoginPageErrors('Maximum price limit is ₹10,000');
            return;
        }

        // Validate all discount values
        let hasInvalidDiscount = false;
        let invalidPlanName = '';

        for (const plan of plans) {
            const price = getPlanPrice(plan.months);
            if (!isAfterDiscountPositive(price, plan.id)) {
                hasInvalidDiscount = true;
                invalidPlanName = plan.duration;
                break;
            }
        }

        if (hasInvalidDiscount) {
            LoginPageErrors(`Discount too high for ${invalidPlanName}. Price after discount must be positive.`);
            return;
        }

        // Prepare subscription data to pass forward
        const subscriptionData = {
            basePrice: parseFloat(basePrice.replace(/,/g, '')) || 0,
            plans: plans.map(plan => {
                const price = plan.id === 1 ? parseFloat(basePrice.replace(/,/g, '')) : parseFloat(getPlanPrice(plan.months).replace(/,/g, ''));
                const discount = parseFloat(discounts[plan.id]) || 0;
                const afterDiscount = parseFloat(calculateAfterDiscount(getPlanPrice(plan.months), plan.id).replace(/,/g, ''));

                return {
                    id: plan.id,
                    months: plan.months,
                    code: plan.id === 1 ? 11 : plan.id === 2 ? 33 : plan.id === 3 ? 66 : 1212,
                    amount: afterDiscount, // Final amount after discount
                    discount: discount,
                    active: true, // All plans are active by default in onboarding
                };
            })
        };

        navigation.navigate('AutoMessageScreen', { subscriptionData });
    };

    if (loading) {
        return <Loader />;
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
            <View style={{ backgroundColor: '#FFF', paddingTop: insets.top + 20 }}>
                <CustomHeader currentStep={2} totalSteps={5} />
            </View>

            <KeyboardAwareScrollView
                style={styles.content}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 20 }}
                keyboardShouldPersistTaps="handled"
                enableOnAndroid={true}
                extraScrollHeight={Platform.OS === 'ios' ? 120 : 80}
                enableAutomaticScroll={Platform.OS === 'ios'}
            >
                <Text style={styles.title}>Set Subscription Fee</Text>
                <Text style={styles.subtitle}>
                    Create subscription plans for your fans
                </Text>

                <View style={styles.plansContainer}>
                    {plans.map((plan) => (
                        <View
                            key={plan.id}
                            style={[
                                styles.planCard,
                                plan.id === 1 && styles.planCardActive,
                            ]}
                        >
                            <View style={styles.planHeader}>
                                <View style={styles.planBadgeContainer}>
                                    <Text style={styles.planBadgeText}>{plan.duration}</Text>
                                </View>
                            </View>

                            <View style={styles.planInputRow}>
                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>Set Price (₹)</Text>
                                    <View style={[styles.inputContainer, plan.id !== 1 && styles.inputContainerDisabled, plan.id === 1 && priceError && styles.inputContainerError]}>
                                        <TextInput
                                            style={[styles.input, plan.id !== 1 && styles.inputDisabled]}
                                            value={plan.id === 1 ? basePrice : getPlanPrice(plan.months)}
                                            onChangeText={plan.id === 1 ? handleBasePriceChange : undefined}
                                            keyboardType="numeric"
                                            editable={plan.id === 1}
                                        />
                                        <Image
                                            source={require('../../Assets/Images/Coins2.png')}
                                            style={styles.coinIcon}
                                            contentFit="contain"
                                        />
                                    </View>
                                    {plan.id === 1 && priceError && (
                                        <Text style={styles.errorText}>Maximum price limit is ₹10,000</Text>
                                    )}
                                </View>

                                {/* hello there this is me */}

                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>Discount (%)</Text>
                                    <View style={styles.inputContainer}>
                                        <TextInput
                                            style={styles.input}
                                            value={discounts[plan.id]}
                                            onChangeText={(text) => updateDiscount(plan.id, text)}
                                            keyboardType="numeric"
                                            editable={true}
                                        />
                                        <Image
                                            source={require('../../Assets/Images/OnboardingIcon/welcome/percentage.png')}
                                            style={styles.percentageIcon}
                                            contentFit="contain"
                                        />
                                    </View>
                                </View>
                            </View>

                            <View style={[
                                styles.afterDiscountRow,
                                !isAfterDiscountPositive(getPlanPrice(plan.months), plan.id) && styles.afterDiscountRowInvalid
                            ]}>
                                <Text style={styles.afterDiscountLabel}>After Discount</Text>
                                <Text style={[
                                    styles.afterDiscountValue,
                                    !isAfterDiscountPositive(getPlanPrice(plan.months), plan.id) && styles.afterDiscountValueInvalid
                                ]}>
                                    {calculateAfterDiscount(getPlanPrice(plan.months), plan.id)}
                                </Text>
                                <Image
                                    source={require('../../Assets/Images/Coins2.png')}
                                    style={styles.coinIcon}
                                    contentFit="contain"
                                />
                            </View>
                        </View>
                    ))}
                </View>

                <View style={styles.navigationButtons}>
                    <View style={styles.buttonWrapper}>
                        <AnimatedButton title="< Back" onPress={() => navigation.goBack()} showOverlay={false} buttonMargin={0} style={{ backgroundColor: '#FFF' }} />
                    </View>
                    <View style={styles.buttonWrapper}>
                        <AnimatedButton title="Continue >" onPress={handleContinue} showOverlay={false} buttonMargin={0} />
                    </View>
                </View>
            </KeyboardAwareScrollView>
        </View>
    );
};

export default SubscriptionFeeScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFF9F5',
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
        marginTop: 20,
    },
    title: {
        fontSize: 24,
        fontFamily: 'Rubik-Bold',
        color: '#1E1E1E',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 13,
        fontFamily: 'Rubik-Medium',
        color: '#1E1E1E',
        marginBottom: 24,
    },
    plansContainer: {
        gap: 24,
        marginBottom: 24,
    },
    planCard: {
        padding: 16,
        borderWidth: 2,
        borderColor: '#1E1E1E',
        borderRadius: 20,
        backgroundColor: '#FFF',
    },
    planCardActive: {
        borderColor: '#FFA86B',
        backgroundColor: '#FFF',
        borderStyle: 'dashed',
    },
    planHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    planBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    planBadgeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1E1E1E',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
    },
    planBadgeText: {
        fontSize: 12,
        fontFamily: 'Rubik-SemiBold',
        color: '#FFF',
    },
    activeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    activeBadgeText: {
        fontSize: 12,
        fontFamily: 'Rubik-Medium',
        color: '#FFF',
        marginLeft: 4,
    },
    planInputRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    inputGroup: {
        flex: 1,
    },
    inputLabel: {
        fontSize: 12,
        fontFamily: 'Rubik-Medium',
        color: '#1E1E1E',
        marginBottom: 8,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#1E1E1E',
        borderRadius: 10,
        paddingHorizontal: 12,
        backgroundColor: '#FFF',
    },
    input: {
        flex: 1,
        paddingVertical: 12,
        fontSize: 14,
        fontFamily: 'Rubik-SemiBold',
        color: '#1E1E1E',
    },
    inputContainerDisabled: {
        backgroundColor: '#FFF9F5',
        borderWidth: 1.5,
        borderColor: '#FFE0CC',
    },
    inputDisabled: {
        color: '#1E1E1E',
    },
    currencyIcon: {
        fontSize: 16,
    },
    coinIcon: {
        width: 20,
        height: 20,
    },
    percentageIcon: {
        width: 20,
        height: 20,
    },
    infoButton: {
        marginLeft: 8,
    },
    infoButtonText: {
        fontSize: 16,
        color: '#666',
    },
    afterDiscountRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 12,
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderWidth: 1.5,
        borderColor: '#FFE0CC',
        borderRadius: 14,
        backgroundColor: '#FFF9F5',
    },
    afterDiscountLabel: {
        flex: 1,
        fontSize: 14,
        fontFamily: 'Rubik-Medium',
        color: '#1E1E1E',
    },
    afterDiscountValue: {
        fontSize: 14,
        fontFamily: 'Rubik-SemiBold',
        color: '#1E1E1E',
        marginRight: 8,
    },
    afterDiscountRowInvalid: {
        borderColor: '#E74C3C',
        backgroundColor: '#FDE8E8',
    },
    afterDiscountValueInvalid: {
        color: '#E74C3C',
    },
    navigationButtons: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 10,
        marginTop: 10,
    },
    backButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#1E1E1E',
        alignItems: 'center',
        backgroundColor: '#FFF',
    },
    backButtonText: {
        fontSize: 14,
        fontFamily: 'Rubik-SemiBold',
        color: '#1E1E1E',
    },
    buttonWrapper: {
        flex: 1,
    },
    continueButton: {
        flex: 1,
        backgroundColor: '#FFA86B',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    continueButtonText: {
        fontSize: 14,
        fontFamily: 'Rubik-SemiBold',
        color: '#1E1E1E',
    },
    inputContainerError: {
        borderColor: '#E74C3C',
    },
    errorText: {
        fontSize: 10,
        fontFamily: 'Rubik-Regular',
        color: '#E74C3C',
        marginTop: 4,
    },
});