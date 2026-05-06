import React, { useCallback, useMemo, useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { responsiveFontSize, responsiveHeight, responsiveWidth } from 'react-native-responsive-dimensions';
import DIcon from '../../../DesiginData/DIcons';
import moment from 'moment';
import { useGetCreatorsPlanQuery, useUnSubscribeMutation, useLazyGetCashfreeSubscriptionQuery, useManageSubscriptionMutation } from '../../../Redux/Slices/QuerySlices/chatWindowAttachmentSliceApi';
import { useSelector } from 'react-redux';
import { triggerImpactLight, triggerImpactMedium, triggerSelection } from '../../Utils/Haptics';
import SubscriptionCancelledModal from './SubscriptionCancelledModal';

const REASONS = [
  'Too Expensive',
  'Content not worth it',
  'Taking a temporary break',
  'Want a cheaper plan',
  'Other',
];

const UnSubscribeModal = ({ visible, onClose, item, onSuccess, onUpdateList }) => {
  const bottomSheetModalRef = useRef(null);
  const token = useSelector(state => state.auth.user.token);
  const creatorId = item?.userDetails?._id || item?.creatorId;
  const creatorName = item?.userDetails?.name || item?.creatorName || 'the creator';

  const [step, setStep] = useState(1);
  const [selectedReason, setSelectedReason] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const isHandlingSuccess = useRef(false);

  const [getCashfreeSubscription, { data: subscriptionDetails, isFetching: isSubLoading }] = useLazyGetCashfreeSubscriptionQuery();
  const [unSubscribe, { isLoading: isUnsubscribing }] = useUnSubscribeMutation();
  const [manageSubscription, { isLoading: isManaging }] = useManageSubscriptionMutation();

  // Reset step when modal closes
  useEffect(() => {
    if (!visible) {
      setTimeout(() => {
        if (!isHandlingSuccess.current) {
          setStep(1);
          setSelectedReason(null);
          setShowSuccessModal(false);
        }
      }, 500);
    }
  }, [visible]);

  // Fetch subscription details when modal becomes visible
  useEffect(() => {
    if (visible && creatorId) {
      getCashfreeSubscription({ token, creatorId });
    }
  }, [visible, creatorId]);

  // Use data from the new API if available, otherwise fallback to item props
  const subData = subscriptionDetails?.data || {};
  const planName = subData.planName || item?.planName || 'Subscription';
  const planAmount = subData.amount || (item?.amount / 100) || 0;
  const expiryDate = subData.endDate || item?.subscriptionExpiryDate || item?.expiry_date;
  const daysRemaining = subData.daysRemaining !== undefined ? subData.daysRemaining : moment(expiryDate).diff(moment(), 'days');
  const formattedExpiry = expiryDate ? moment(expiryDate).format('DD MMM YYYY') : 'N/A';

  useEffect(() => {
    if (visible) {
      bottomSheetModalRef.current?.present();
    } else {
      bottomSheetModalRef.current?.dismiss();
    }
  }, [visible]);

  const renderBackdrop = useCallback(
    props => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />,
    []
  );

  const handleProceedUnsubscribe = () => {
    triggerImpactLight();
    setStep(2);
  };

  const handleClose = () => {
    triggerImpactLight();
    onClose();
  };

  const handleConfirmCancel = async () => {
    triggerImpactMedium();
    const subscriptionId = subData.subscriptionId || subData.subscription_id || item?.subscriptionId || item?.subscription_id;
    
    if (!subscriptionId) {
      console.error('No subscriptionId found for cancellation');
      return;
    }

    try {
      const payload = {
        subscription_id: subscriptionId,
        action: 'CANCEL',
        action_details: {},
        reason: selectedReason || 'No reason provided',
      };

      const response = await manageSubscription({ token, data: payload }).unwrap();
      
      // Sequence: Dismiss current bottom sheet first, then show success modal
      isHandlingSuccess.current = true;
      bottomSheetModalRef.current?.dismiss();
      
      setTimeout(() => {
        if (onUpdateList) {
          onUpdateList();
        }
        setShowSuccessModal(true);
      }, 300);
    } catch (error) {
      console.error('Manage subscription error:', error);
    }
  };

  const handleSuccessModalClose = () => {
    isHandlingSuccess.current = false;
    setShowSuccessModal(false);
    onClose();
    if (onSuccess) {
      onSuccess();
    }
  };

  const BenefitItem = ({ title, subtitle, bgColor, borderColor, iconColor, iconName = 'check' }) => (
    <View style={[styles.benefitContainer, { backgroundColor: bgColor, borderColor: borderColor }]}>
      <View style={styles.benefitIconBox}>
        <DIcon provider="Feather" name={iconName} size={14} color={iconColor} />
      </View>
      <View style={styles.benefitTextStack}>
        <Text style={styles.benefitTitle}>{title}</Text>
        <Text style={styles.benefitSubtitle}>{subtitle}</Text>
      </View>
    </View>
  );

  return (
    <>
      <BottomSheetModal
      ref={bottomSheetModalRef}
      index={visible ? 0 : -1}
      snapPoints={step === 1 ? ['80%'] : ['70%']}
      backdropComponent={renderBackdrop}
      onDismiss={() => {
        if (!isHandlingSuccess.current) {
          onClose();
        }
      }}
      enableDynamicSizing={false}
      backgroundStyle={{ borderRadius: 32 }}
      handleIndicatorStyle={{ backgroundColor: '#E0E0E0', width: 40 }}
    >
      <BottomSheetScrollView contentContainerStyle={styles.contentContainer}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{step === 1 ? 'Unsubscribe' : 'One last thing...'}</Text>
            <Text style={styles.subtitle}>
              {step === 1 
                ? 'Fill in your info to proceed' 
                : 'Tell us why you are cancelling — this helps creators improve (optional)'}
            </Text>
          </View>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <DIcon provider="Ionicons" name="close" size={20} color="#1E1E1E" />
          </TouchableOpacity>
        </View>

        {isSubLoading && !subscriptionDetails ? (
          <View style={{ justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
            <ActivityIndicator size="large" color="#FFA86B" />
            <Text style={[styles.subtitle, { marginTop: 12 }]}>Fetching subscription details...</Text>
          </View>
        ) : (
          <>
            {step === 1 ? (
              <>
                {/* Selected Plan Box */}
                <View style={styles.planBox}>
                  <Text style={styles.planLabel}>Selected Plan</Text>
                  <View style={styles.planMainRow}>
                    <Text style={styles.planName}>{planName}</Text>
                    <Text style={styles.planAmount}>
                      ₹{planAmount.toLocaleString()}
                    </Text>
                  </View>
                  <View style={styles.separator} />
                  <View style={styles.planDetailRow}>
                    <Text style={styles.planDetailLabel}>Subscription Ends</Text>
                    <Text style={styles.planDetailValue}>{formattedExpiry}</Text>
                  </View>
                  <View style={styles.planDetailRow}>
                    <Text style={styles.planDetailLabel}>Days Remaining</Text>
                    <Text style={styles.planDetailValue}>{daysRemaining > 0 ? `${daysRemaining} Days` : 'Expires today'}</Text>
                  </View>
                </View>

                {/* Benefit Section */}
                <View style={{ gap: responsiveHeight(2) }}>
                  <Text style={styles.benefitSectionTitle}>What happens when you cancel?</Text>
                  <View style={styles.benefitList}>
                    <BenefitItem
                      title="Auto-pay will be stopped"
                      subtitle="You will not be charged next month"
                      bgColor="#F0FDF4"
                      borderColor="#D2F9DE"
                      iconColor="#00A63E"
                    />
                    <BenefitItem
                      title="Access continues till period ends"
                      subtitle={`You can access everything until ${formattedExpiry}`}
                      bgColor="#EFF6FF"
                      borderColor="#DBEAFE"
                      iconColor="#155DFC"
                    />
                    <BenefitItem
                      title="No Exclusive access after period ends"
                      subtitle="Exclusive content, DMs, early access — all gone"
                      bgColor="#FEF2F2"
                      borderColor="#FFE2E2"
                      iconColor="#FB2C36"
                      iconName="x"
                    />
                  </View>
                </View>

                {/* Buttons */}
                <View style={styles.buttonRow}>
                  <TouchableOpacity 
                    style={styles.cancelButton} 
                    onPress={handleProceedUnsubscribe}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.keepButton} onPress={handleClose}>
                    <Text style={styles.keepButtonText}>Keep Subscription</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                {/* Reason Selection UI */}
                <View style={styles.reasonList}>
                  {REASONS.map((reason) => {
                    const isSelected = selectedReason === reason;
                    return (
                      <TouchableOpacity
                        key={reason}
                        style={[
                          styles.reasonItem,
                          isSelected && styles.reasonItemActive
                        ]}
                        onPress={() => {
                          triggerImpactLight();
                          setSelectedReason(reason);
                        }}
                      >
                        <Text style={[
                          styles.reasonText,
                          isSelected && styles.reasonTextActive
                        ]}>
                          {reason}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Confirm Cancel Button */}
                <TouchableOpacity 
                  style={styles.confirmButton} 
                  onPress={handleConfirmCancel}
                  disabled={isManaging}
                >
                  {isManaging ? (
                    <ActivityIndicator size="small" color="#1E1E1E" />
                  ) : (
                    <Text style={styles.confirmButtonText}>Confirm Cancel</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </>
        )}
      </BottomSheetScrollView>
    </BottomSheetModal>

      <SubscriptionCancelledModal
        visible={showSuccessModal}
        onClose={handleSuccessModalClose}
        creatorName={creatorName}
        expiryDate={formattedExpiry}
      />
    </>
  );
};

const styles = StyleSheet.create({
  contentContainer: {
    padding: responsiveWidth(8),
    gap: responsiveHeight(3.5),
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: responsiveFontSize(2.4),
    color: '#1E1E1E',
  },
  subtitle: {
    fontFamily: 'Rubik-Regular',
    fontSize: responsiveFontSize(1.5),
    color: '#1E1E1E',
    marginTop: responsiveHeight(1),
  },
  closeButton: {
    width: 32,
    height: 32,
    borderWidth: 1.06,
    borderColor: '#E0E0E0',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  planBox: {
    backgroundColor: 'rgba(255, 168, 107, 0.2)',
    borderWidth: 1,
    borderColor: '#FFDCC2',
    borderRadius: 14,
    padding: responsiveWidth(4.5),
    gap: responsiveHeight(1.5),
  },
  planLabel: {
    fontFamily: 'Rubik-Regular',
    fontSize: responsiveFontSize(1.2),
    color: '#1E1E1E',
    letterSpacing: 0.11,
  },
  planMainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planName: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: responsiveFontSize(2.2),
    color: '#1E1E1E',
  },
  planAmount: {
    fontFamily: 'Inter-Bold',
    fontSize: responsiveFontSize(2.4),
    color: '#1E1E1E',
    letterSpacing: -0.45,
  },
  separator: {
    height: 1,
    backgroundColor: '#FFDCC2',
  },
  planDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planDetailLabel: {
    fontFamily: 'Rubik-Regular',
    fontSize: responsiveFontSize(1.5),
    color: '#1E1E1E',
  },
  planDetailValue: {
    fontFamily: 'Rubik-Medium',
    fontSize: responsiveFontSize(1.5),
    color: '#1E1E1E',
    textAlign: 'right',
  },
  benefitSectionTitle: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: responsiveFontSize(1.8),
    color: '#1E1E1E',
  },
  benefitList: {
    gap: responsiveHeight(1.2),
  },
  benefitContainer: {
    flexDirection: 'row',
    paddingVertical: responsiveHeight(1.8),
    paddingHorizontal: responsiveWidth(4),
    borderRadius: 14,
    borderWidth: 1,
    gap: responsiveWidth(2.5),
    alignItems: 'flex-start',
  },
  benefitIconBox: {
    marginTop: responsiveHeight(0.2),
  },
  benefitTextStack: {
    flex: 1,
    gap: responsiveHeight(0.8),
  },
  benefitTitle: {
    fontFamily: 'Rubik-Medium',
    fontSize: responsiveFontSize(1.5),
    color: '#1E1E1E',
  },
  benefitSubtitle: {
    fontFamily: 'Rubik-Regular',
    fontSize: responsiveFontSize(1.3),
    color: '#1E1E1E',
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: responsiveWidth(3),
    marginTop: responsiveHeight(1),
  },
  cancelButton: {
    width: responsiveWidth(32),
    height: 48,
    borderWidth: 1.5,
    borderColor: '#1E1E1E',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  cancelButtonText: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: responsiveFontSize(1.8),
    color: '#1E1E1E',
    textAlign: 'center',
  },
  keepButton: {
    flex: 1,
    height: 48,
    backgroundColor: '#FFA86B',
    borderWidth: 1.5,
    borderColor: '#1E1E1E',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keepButtonText: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: responsiveFontSize(1.8),
    color: '#1E1E1E',
  },
  reasonList: {
    gap: responsiveHeight(1.2),
  },
  reasonItem: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#1E1E1E',
    borderRadius: 14,
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  reasonItemActive: {
    backgroundColor: '#1E1E1E',
  },
  reasonText: {
    fontFamily: 'Rubik-Medium',
    fontSize: responsiveFontSize(1.8),
    color: '#1E1E1E',
  },
  reasonTextActive: {
    color: '#FFFFFF',
  },
  confirmButton: {
    height: 48,
    backgroundColor: '#FFA86B',
    borderWidth: 1.5,
    borderColor: '#1E1E1E',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: responsiveHeight(2),
  },
  confirmButtonText: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: responsiveFontSize(1.8),
    color: '#1E1E1E',
  },
});

export default UnSubscribeModal;
