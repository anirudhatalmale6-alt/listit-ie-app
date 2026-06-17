import React, { useRef, useState, useEffect } from 'react';
import { StatusBar, BackHandler, Platform, View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { WebView } from 'react-native-webview';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const BASE_URL = 'https://listit.ie';
const Tab = createBottomTabNavigator();
const LISTIT_BLUE = '#1b87f4';

const INJECTED_JS = `
  (function() {
    var style = document.createElement('style');
    style.textContent = \`
      .navbar-wrapper, nav.navbar, footer, .whatsapp-btn, [class*="WhatsApp"],
      a[href*="wa.me"], .bot-wrapper, [class*="BotWrapper"],
      button[aria-label="Return to top"] {
        display: none !important;
      }
      body { padding-top: 0 !important; margin-top: 0 !important; }
      .container { padding-top: 10px !important; }
      [class*="PageWrapper"] { margin-top: 10px !important; }
    \`;
    document.head.appendChild(style);

    var pushState = history.pushState;
    history.pushState = function() {
      pushState.apply(history, arguments);
      window.ReactNativeWebView.postMessage(JSON.stringify({type: 'nav', url: location.href}));
    };
    window.addEventListener('popstate', function() {
      window.ReactNativeWebView.postMessage(JSON.stringify({type: 'nav', url: location.href}));
    });
    true;
  })();
`;

function WebScreen({ url, webViewRef }) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);

  return (
    <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: '#fff' }}>
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={LISTIT_BLUE} />
        </View>
      )}
      <WebView
        ref={webViewRef}
        source={{ uri: url }}
        style={{ flex: 1, opacity: loading ? 0 : 1 }}
        injectedJavaScript={INJECTED_JS}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={false}
        allowsBackForwardNavigationGestures={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        sharedCookiesEnabled={true}
        thirdPartyCookiesEnabled={true}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        userAgent={Platform.select({
          ios: 'ListitApp/1.0 iOS Safari/605',
          android: 'ListitApp/1.0 Android Chrome/120',
        })}
      />
    </View>
  );
}

function HomeScreen() {
  const ref = useRef(null);
  return <WebScreen url={BASE_URL} webViewRef={ref} />;
}

function SearchScreen() {
  const ref = useRef(null);
  return <WebScreen url={`${BASE_URL}/search`} webViewRef={ref} />;
}

function PlaceAdScreen() {
  const ref = useRef(null);
  return <WebScreen url={`${BASE_URL}/user/ads/create`} webViewRef={ref} />;
}

function MessagesScreen() {
  const ref = useRef(null);
  return <WebScreen url={`${BASE_URL}/user/messages`} webViewRef={ref} />;
}

function ProfileScreen() {
  const ref = useRef(null);
  return <WebScreen url={`${BASE_URL}/user/profile`} webViewRef={ref} />;
}

function getTabIcon(routeName, focused) {
  const icons = {
    Home: focused ? 'home' : 'home-outline',
    Search: focused ? 'search' : 'search-outline',
    Sell: focused ? 'add-circle' : 'add-circle-outline',
    Messages: focused ? 'chatbubbles' : 'chatbubbles-outline',
    Profile: focused ? 'person' : 'person-outline',
  };
  return icons[routeName] || 'ellipse';
}

export default function App() {
  useEffect(() => {
    if (Platform.OS === 'android') {
      const handler = BackHandler.addEventListener('hardwareBackPress', () => false);
      return () => handler.remove();
    }
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor={LISTIT_BLUE} />
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            headerShown: false,
            tabBarIcon: ({ focused, color, size }) => {
              const iconName = getTabIcon(route.name, focused);
              const iconSize = route.name === 'Sell' ? 32 : size;
              return <Ionicons name={iconName} size={iconSize} color={color} />;
            },
            tabBarActiveTintColor: LISTIT_BLUE,
            tabBarInactiveTintColor: '#999',
            tabBarStyle: {
              backgroundColor: '#fff',
              borderTopWidth: 1,
              borderTopColor: '#eee',
              paddingBottom: Platform.OS === 'ios' ? 20 : 8,
              paddingTop: 8,
              height: Platform.OS === 'ios' ? 85 : 65,
              elevation: 8,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
            },
            tabBarLabelStyle: {
              fontSize: 11,
              fontWeight: '600',
            },
          })}
        >
          <Tab.Screen name="Home" component={HomeScreen} />
          <Tab.Screen name="Search" component={SearchScreen} />
          <Tab.Screen name="Sell" component={PlaceAdScreen} />
          <Tab.Screen name="Messages" component={MessagesScreen} />
          <Tab.Screen name="Profile" component={ProfileScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    zIndex: 10,
  },
});
