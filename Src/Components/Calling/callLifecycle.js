export const shouldTreatBlurAsCallEnd = ({ appState, isCallEnded }) => {
  if (isCallEnded) return false;
  return appState === 'active';
};
