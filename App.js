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
const NAV_BG = '#2c2c2e';

const INJECTED_JS = `
  (function() {
    var style = document.createElement('style');
    style.textContent = \`
      /* Hide ALL website chrome - navbar, footer, cookie banner, WhatsApp, scroll-to-top */
      .navbar-wrapper, nav.navbar, nav, header,
      footer, .footer, [class*="Footer"],
      .whatsapp-btn, [class*="WhatsApp"], a[href*="wa.me"],
      .bot-wrapper, [class*="BotWrapper"], [class*="chatbot"],
      button[aria-label="Return to top"], [class*="scroll-top"], [class*="ScrollTop"],
      [class*="cookie"], [class*="Cookie"], [class*="consent"], [class*="Consent"],
      .cc-window, .cc-banner, #cookie-notice, #gdpr,
      [class*="NavBar"], [class*="navbar"], [class*="Navbar"],
      [class*="TopBar"], [class*="topbar"],
      [class*="AppDownload"], [class*="app-download"],
      [class*="BreadCrumb"], [class*="breadcrumb"],
      .ReactModal__Overlay[class*="cookie"],
      div[role="banner"] {
        display: none !important;
        visibility: hidden !important;
        height: 0 !important;
        overflow: hidden !important;
        pointer-events: none !important;
      }

      /* Reset body spacing so content sits at top */
      body {
        padding-top: 0 !important;
        margin-top: 0 !important;
        overflow-x: hidden !important;
      }
      .container, .container-fluid {
        padding-top: 5px !important;
      }
      [class*="PageWrapper"], [class*="pageWrapper"], [class*="page-wrapper"] {
        margin-top: 0 !important;
        padding-top: 5px !important;
      }

      /* Make content full-width and app-like */
      * { -webkit-tap-highlight-color: transparent; }
      body { -webkit-text-size-adjust: 100%; }
      img { max-width: 100%; }
    \`;
    document.head.appendChild(style);

    /* Auto-accept cookie consent if it appears */
    var cookieCheck = setInterval(function() {
      var btns = document.querySelectorAll('button');
      for (var i = 0; i < btns.length; i++) {
        var txt = btns[i].textContent.toLowerCase().trim();
        if (txt === 'accept' || txt === 'accept all' || txt === 'accept cookies' || txt === 'i agree') {
          btns[i].click();
          clearInterval(cookieCheck);
          break;
        }
      }
    }, 500);
    setTimeout(function() { clearInterval(cookieCheck); }, 5000);

    /* Navigation tracking */
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

function BrowseScreen() {
  const ref = useRef(null);
  return <WebScreen url={BASE_URL} webViewRef={ref} />;
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
    Browse: focused ? 'search' : 'search-outline',
    'Place Ad': focused ? 'pricetag' : 'pricetag-outline',
    Messages: focused ? 'chatbubble' : 'chatbubble-outline',
    'My Profile': focused ? 'person' : 'person-outline',
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
      <StatusBar barStyle="light-content" backgroundColor={NAV_BG} />
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            headerShown: false,
            tabBarIcon: ({ focused, color, size }) => {
              const iconName = getTabIcon(route.name, focused);
              return <Ionicons name={iconName} size={24} color={color} />;
            },
            tabBarActiveTintColor: '#fff',
            tabBarInactiveTintColor: '#888',
            tabBarStyle: {
              backgroundColor: NAV_BG,
              borderTopWidth: 0,
              paddingBottom: Platform.OS === 'ios' ? 20 : 8,
              paddingTop: 8,
              height: Platform.OS === 'ios' ? 85 : 65,
              elevation: 0,
              shadowOpacity: 0,
            },
            tabBarLabelStyle: {
              fontSize: 11,
              fontWeight: '500',
            },
          })}
        >
          <Tab.Screen name="Browse" component={BrowseScreen} />
          <Tab.Screen name="Place Ad" component={PlaceAdScreen} />
          <Tab.Screen name="Messages" component={MessagesScreen} />
          <Tab.Screen name="My Profile" component={ProfileScreen} />
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
