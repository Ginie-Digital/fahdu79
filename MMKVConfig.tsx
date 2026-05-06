import { Storage } from "redux-persist";
import { createMMKV } from "react-native-mmkv";

const storage = createMMKV({ id: "default" });

const reduxStorage: Storage = {
  setItem: (key, value) => {
    storage.set(key, value);
    return Promise.resolve(true);
  },
  getItem: (key) => {
    const value = storage.getString(key);
    return Promise.resolve(value);
  },
  removeItem: (key) => {
    storage.delete(key);
    return Promise.resolve();
  },
};

export default reduxStorage;