/**
 * ZEGO Cloud Configuration
 * Switches between Dev and Prod credentials based on the environment.
 */

import { IS_DEV } from './ApiConfig';

const DEV_CONFIG = {
  appID: 127117205,
  appSign: 'eed4d724b80c0d18df83dade010858a7d24c4b5a2667b0f150d56966e6957020',
};

const PROD_CONFIG = {
  appID: 1996434501,
  appSign: '5b8d13eb6cc351e379ca6da233a9884a6a109ce87b64bdb22ee9e0245df19c16',
};

export const ZEGO_APP_ID = IS_DEV ? DEV_CONFIG.appID : PROD_CONFIG.appID;
export const ZEGO_APP_SIGN = IS_DEV ? DEV_CONFIG.appSign : PROD_CONFIG.appSign;

console.log(`[ZEGO_CONFIG] Initialized with ${IS_DEV ? 'DEV' : 'PROD'} credentials (AppID: ${ZEGO_APP_ID})`);

