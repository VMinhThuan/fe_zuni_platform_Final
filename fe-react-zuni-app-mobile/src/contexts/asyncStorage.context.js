import React, { createContext, useContext, useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AsyncStorageContext = createContext();

export const AsyncStorageProvider = ({ children }) => {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const initializeStorage = async () => {
      try {
        // Thử test AsyncStorage
        await AsyncStorage.setItem('@storage_test', 'test');
        const value = await AsyncStorage.getItem('@storage_test');
        await AsyncStorage.removeItem('@storage_test');
        
        if (value === 'test') {
          setIsReady(true);
        }
      } catch (e) {
        console.error('Error initializing AsyncStorage:', e);
      }
    };

    initializeStorage();
  }, []);

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <AsyncStorageContext.Provider value={AsyncStorage}>
      {children}
    </AsyncStorageContext.Provider>
  );
};

export const useAsyncStorage = () => {
  const context = useContext(AsyncStorageContext);
  if (context === undefined) {
    throw new Error('useAsyncStorage must be used within an AsyncStorageProvider');
  }
  return context;
};
