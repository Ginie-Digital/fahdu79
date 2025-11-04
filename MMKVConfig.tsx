import { Storage } from "redux-persist";
import { createMMKV } from "react-native-mmkv";

const mmkv = createMMKV({
  id: 'redux-persist-storage',
});

const reduxStorage: Storage = {
  setItem: (key: string, value: string): Promise<void> => {
    mmkv.set(key, value);
    return Promise.resolve();
  },
  getItem: (key: string): Promise<string | null> => {
    const value = mmkv.getString(key);
    return Promise.resolve(value ?? null);
  },
  removeItem: (key: string): Promise<void> => {
    // Note: use remove(), not deleteItem or delete
    mmkv.remove(key);
    return Promise.resolve();
  },
};

export default reduxStorage;
