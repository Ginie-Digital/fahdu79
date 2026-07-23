import { shouldTreatBlurAsCallEnd } from '../callLifecycle';

describe('shouldTreatBlurAsCallEnd', () => {
  it('keeps the call alive when the app moves to the background', () => {
    expect(shouldTreatBlurAsCallEnd({ appState: 'background', isCallEnded: false })).toBe(false);
  });

  it('ends the call when the app is active and the screen loses focus', () => {
    expect(shouldTreatBlurAsCallEnd({ appState: 'active', isCallEnded: false })).toBe(true);
  });

  it('does not end an already-ended call', () => {
    expect(shouldTreatBlurAsCallEnd({ appState: 'active', isCallEnded: true })).toBe(false);
  });
});
