export const getLocalCallTerminationStatus = ({callAccepted}) => {
  if (callAccepted) return 'LEAVE';
  return 'REJECTED';
};

export const shouldRejectIncomingCall = ({isCallActive, hasActed}) => {
  if (hasActed) return false;
  return Boolean(isCallActive);
};
