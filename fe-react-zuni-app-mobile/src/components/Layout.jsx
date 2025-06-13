import React from 'react';
import { View, StyleSheet } from 'react-native';
import BottomTabNavigator from './BottomTabNavigator';
import { useRoute, useNavigationState } from '@react-navigation/native';

const Layout = ({ children }) => {
  const route = useRoute();

  // Trong 1 số trường hợp route.params có thể undefined, nên fallback từ state
  const navigationState = useNavigationState((state) => state);
  const currentRoute = navigationState.routes[navigationState.index];
  const chatList =
    route?.params?.chatList || currentRoute?.params?.chatList || [];

  return (
    <View style={styles.container}>
      <View style={styles.content}>{children}</View>
      <BottomTabNavigator chatList={chatList} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    flex: 1,
  },
});

export default Layout;
