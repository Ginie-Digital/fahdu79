import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

const options = {
    enableVibrateFallback: true,
    ignoreAndroidSystemSettings: false,
};

const trigger = (type) => {
    try {
        if (ReactNativeHapticFeedback && ReactNativeHapticFeedback.trigger) {
            ReactNativeHapticFeedback.trigger(type, options);
        }
    } catch (error) {
        console.warn('Haptic trigger failed:', error);
    }
};

export const triggerSelection = () => trigger('selection');
export const triggerImpactHeavy = () => trigger('impactHeavy');
export const triggerImpactMedium = () => trigger('impactMedium');
export const triggerImpactLight = () => trigger('impactLight');
export const triggerSuccess = () => trigger('notificationSuccess');
export const triggerWarning = () => trigger('notificationWarning');
export const triggerError = () => trigger('notificationError');
