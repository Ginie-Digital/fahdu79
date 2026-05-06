import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Platform,
} from 'react-native';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';
import {Image} from 'expo-image';
import AnimatedButton from '../Components/AnimatedButton';
import {useSelector} from 'react-redux';
import {
  useLazyGetOwnPackageQuery,
  useAddPackageSubscriptionMutation,
} from '../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
import {LoginPageErrors, chatRoomSuccess} from '../Components/ErrorSnacks';
import {autoLogout} from '../../AutoLogout';
import Loader from '../Components/Loader';

const ManageRevenueSubscriptionFeeSetup = () => {
  const token = useSelector(state => state.auth.user.token);

  const [getOwnPackage] = useLazyGetOwnPackageQuery();
  const [addPackageSubscription] = useAddPackageSubscriptionMutation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [basePrice, setBasePrice] = useState('999');
  const [discounts, setDiscounts] = useState({
    1: '0',
    2: '10',
    3: '20',
    4: '30',
  });


  const plans = [
    {id: 1, duration: '1 Month Plan', months: 1, code: 11},
    {id: 2, duration: '3 Month Plan', months: 3, code: 33},
    {id: 3, duration: '6 Month Plan', months: 6, code: 66},
    {id: 4, duration: '12 Month Plan', months: 12, code: 1212},
  ];

  // Fetch existing subscription data from server
  useEffect(() => {
    const fetchSubscriptionData = async () => {
      try {
        const {data, error} = await getOwnPackage({token});

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

  const getPlanPrice = months => {
    const numPrice = parseFloat(basePrice.replace(/,/g, '')) || 0;
    return Math.round(numPrice * months).toLocaleString('en-IN');
  };

  const updateDiscount = (planId, value) => {
    // Allow empty string for typing, but validate the value
    let sanitizedValue = value.replace(/[^0-9]/g, ''); // Only allow digits

    // Cap discount at 98%
    if (sanitizedValue !== '' && parseInt(sanitizedValue, 10) > 98) {
      sanitizedValue = '98';
    }

    setDiscounts(prev => ({...prev, [planId]: sanitizedValue}));
  };



  // Check if the after-discount price is positive
  const isAfterDiscountPositive = (price, planId) => {
    const numPrice = parseFloat(price.replace(/,/g, '')) || 0;
    const numDiscount = parseFloat(discounts[planId]) || 0;
    const result = numPrice - (numPrice * numDiscount) / 100;
    return result > 0;
  };

  const calculateAfterDiscount = (price, planId) => {
    const numPrice = parseFloat(price.replace(/,/g, '')) || 0;
    const numDiscount = parseFloat(discounts[planId]) || 0;
    const result = numPrice - (numPrice * numDiscount) / 100;
    return Math.round(result).toLocaleString('en-IN');
  };

  const handleSave = async () => {
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
      LoginPageErrors(
        `Discount too high for ${invalidPlanName}. Price after discount must be positive.`,
      );
      return;
    }

    setSaving(true);

    // Prepare subscription data for API
    const subscriptions = plans.map(plan => {
      const price = getPlanPrice(plan.months);
      const afterDiscount = parseFloat(
        calculateAfterDiscount(price, plan.id).replace(/,/g, ''),
      );

      return {
        code: plan.code,
        amount: afterDiscount, // Final amount after discount
        discount: parseFloat(discounts[plan.id]) || 0,
        active: true,
      };
    });

    const {data, error} = await addPackageSubscription({
      token,
      data: {subscriptions},
    });

    if (error) {
      LoginPageErrors(error?.data?.message);
      setSaving(false);
      if (error?.data?.status_code === 2044) {
        autoLogout();
      }
    }

    if (data) {
      chatRoomSuccess(data?.message);
      setSaving(false);
    }
  };

  if (loading) {
    return <Loader />;
  }

  return (
    <View style={styles.container}>
      <KeyboardAwareScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{paddingBottom: 40}}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid={true}
        extraScrollHeight={Platform.OS === 'ios' ? 120 : 80}
        enableAutomaticScroll={Platform.OS === 'ios'}>
        <View style={styles.plansContainer}>
          {plans.map(plan => (
            <View
              key={plan.id}
              style={[
                styles.planCard,
                plan.id === 1 && styles.planCardActive,
              ]}>
              <View style={styles.planHeader}>
                <View style={styles.planBadgeContainer}>
                  <Text style={styles.planBadgeText}>{plan.duration}</Text>
                </View>
              </View>

              <View style={styles.planInputRow}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Set Price (₹)</Text>
                  <View
                    style={[
                      styles.inputContainer,
                      plan.id !== 1 && styles.inputContainerDisabled,
                    ]}>
                    <TextInput
                      style={[
                        styles.input,
                        plan.id !== 1 && styles.inputDisabled,
                      ]}
                      value={
                        plan.id === 1 ? basePrice : getPlanPrice(plan.months)
                      }
                      onChangeText={plan.id === 1 ? setBasePrice : undefined}
                      keyboardType="numeric"
                      editable={plan.id === 1}
                    />
                    <Image
                      source={require('../../Assets/Images/Coins2.png')}
                      style={styles.coinIcon}
                      contentFit="contain"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Discount (%)</Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.input}
                      value={discounts[plan.id]}
                      onChangeText={text => updateDiscount(plan.id, text)}
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

              <View
                style={[
                  styles.afterDiscountRow,
                  !isAfterDiscountPositive(getPlanPrice(plan.months), plan.id) &&
                    styles.afterDiscountRowInvalid,
                ]}>
                <Text style={styles.afterDiscountLabel}>After Discount</Text>
                <Text
                  style={[
                    styles.afterDiscountValue,
                    !isAfterDiscountPositive(
                      getPlanPrice(plan.months),
                      plan.id,
                    ) && styles.afterDiscountValueInvalid,
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

        <View style={styles.saveButtonWrapper}>
          <AnimatedButton title="Save" onPress={handleSave} loading={saving} />
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
};

export default ManageRevenueSubscriptionFeeSetup;

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
  coinIcon: {
    width: 20,
    height: 20,
  },
  percentageIcon: {
    width: 20,
    height: 20,
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
  saveButtonWrapper: {
    marginBottom: 20,
  },
});
