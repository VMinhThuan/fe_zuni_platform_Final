import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Text } from 'react-native';
import MainScreen from './src/screens/client/MainScreen';
import RegisterScreen from './src/screens/client/auth/RegisterScreen';
import LoginScreen from './src/screens/client/auth/LoginScreen';
import HomeScreen from './src/screens/client/HomeScreen';
import SetupAvatarScreen from './src/screens/client/SetupAvatarScreen';
import { AppProvider } from './src/contexts/app.context';
import { SocketProvider, useSocket } from './src/contexts/socket.context';
import Layout from './src/components/Layout';
import ChatDetailScreen from './src/screens/client/ChatDetailScreen';
import FriendPageScreen from './src/screens/client/FriendPageScreen';
import ImagePickerScreen from './src/screens/client/ImagePickerScreen';
import FilePickerScreen from './src/screens/client/FilePickerScreen';
import ChatInfoScreen from './src/screens/client/ChatInfoScreen';
import MediaGalleryScreen from './src/screens/client/MediaGalleryScreen';
import GroupMembersScreen from './src/screens/client/GroupMembersScreen';
import AddGroupMembersScreen from './src/screens/client/AddGroupMembersScreen';
import CreateGroupScreen from './src/components/CreateGroupScreen';
import ForgotPasswordScreen from './src/screens/client/auth/ForgotPasswordScreen';

const Stack = createStackNavigator();

const withLayout = <P extends object>(WrappedComponent: React.ComponentType<P>) => {
  return (props: P) => (
    <Layout>
      <WrappedComponent {...props} />
    </Layout>
  );
};

const AppNavigator = () => {
  const { isConnected } = useSocket();
  const [isReady, setIsReady] = useState(false);
  const [connectionFailed, setConnectionFailed] = useState(false);

  useEffect(() => {
    if (isConnected) {
      setIsReady(true);
      return;
    }

    const timeout = setTimeout(() => {
      if (!isConnected) {
        console.log('Socket connection timed out after 3 seconds.');
        setConnectionFailed(true);
        setIsReady(true);
      }
    }, 3000);

    return () => clearTimeout(timeout);
  }, [isConnected]);

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Đang kết nối socket...</Text>
      </View>
    );
  }

  if (connectionFailed) {
    return (
      <NavigationContainer>
        <Stack.Navigator initialRouteName="MainScreen">
          <Stack.Screen
            name="MainScreen"
            component={MainScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="RegisterScreen"
            component={RegisterScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="LoginScreen"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="HomeScreen"
            component={withLayout(HomeScreen)}
            options={{ headerShown: false }}
            initialParams={{ isOffline: true }}
          />
          <Stack.Screen
            name="ChatDetail"
            component={withLayout(ChatDetailScreen)}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="FriendPageScreen"
            component={withLayout(FriendPageScreen)}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="SetupAvatarScreen"
            component={SetupAvatarScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="ImagePickerScreen"
            component={ImagePickerScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="FilePickerScreen"
            component={FilePickerScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="ChatInfoScreen"
            component={ChatInfoScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="MediaGalleryScreen"
            component={MediaGalleryScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="GroupMembersScreen"
            component={GroupMembersScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="AddGroupMembersScreen"
            component={AddGroupMembersScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="CreateGroupScreen"
            component={CreateGroupScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="ForgotPasswordScreen"
            component={ForgotPasswordScreen}
            options={{ headerShown: false }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="MainScreen">
        <Stack.Screen
          name="MainScreen"
          component={MainScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="RegisterScreen"
          component={RegisterScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="LoginScreen"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="HomeScreen"
          component={withLayout(HomeScreen)}
          options={{ headerShown: false }}
          initialParams={{ isOffline: false }}
        />
        <Stack.Screen
          name="ChatDetail"
          component={withLayout(ChatDetailScreen)}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="FriendPageScreen"
          component={withLayout(FriendPageScreen)}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="SetupAvatarScreen"
          component={SetupAvatarScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ImagePickerScreen"
          component={ImagePickerScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="FilePickerScreen"
          component={FilePickerScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ChatInfoScreen"
          component={ChatInfoScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="MediaGalleryScreen"
          component={MediaGalleryScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="GroupMembersScreen"
          component={GroupMembersScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="AddGroupMembersScreen"
          component={AddGroupMembersScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="CreateGroupScreen"
          component={CreateGroupScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ForgotPasswordScreen"
          component={ForgotPasswordScreen}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const App = () => {
  return (
    <AppProvider>
      <SocketProvider>
        <AppNavigator />
      </SocketProvider>
    </AppProvider>
  );
};
export default App;