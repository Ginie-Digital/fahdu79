import { getLocalCallTerminationStatus, shouldRejectIncomingCall } from '../Src/Components/Calling/callFlow';

describe('call flow helpers', () => {
  it('uses leave when the call was already accepted', () => {
    expect(getLocalCallTerminationStatus({callAccepted: true})).toBe('LEAVE');
  });

  it('uses reject when the call was never accepted', () => {
    expect(getLocalCallTerminationStatus({callAccepted: false})).toBe('REJECTED');
  });

  it('rejects new incoming calls while an active call is already in progress', () => {
    expect(shouldRejectIncomingCall({isCallActive: true, hasActed: false})).toBe(true);
  });
});
