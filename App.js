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
      /* Hide website chrome - be specific, avoid broad selectors */
      .navbar-wrapper, nav.navbar, header,
      footer, .footer,
      .whatsapp-btn, a[href*="wa.me"],
      button[aria-label="Return to top"],
      .cc-window, .cc-banner, #cookie-notice, #gdpr,
      .breadcrumb {
        display: none !important;
        height: 0 !important;
        overflow: hidden !important;
      }

      body {
        padding-top: 0 !important;
        margin-top: 0 !important;
        overflow-x: hidden !important;
      }
      * { -webkit-tap-highlight-color: transparent; }
      body { -webkit-text-size-adjust: 100%; }
    \`;
    document.head.appendChild(style);

    function appCleanup() {
      /* Hide sections by EXACT heading text - only target h1-h6, not divs */
      var headings = document.querySelectorAll('h1,h2,h3,h4,h5,h6');
      for (var i = 0; i < headings.length; i++) {
        var t = headings[i].textContent.trim();
        if (t === "It's As Simple As List It" ||
            t === 'FAQ' ||
            t === 'Read our latest blogs') {
          /* Go up max 2 levels to find the section wrapper */
          var target = headings[i].parentElement;
          if (target && target.parentElement && target.parentElement.id !== 'root') {
            target = target.parentElement;
          }
          if (target && target.id !== 'root') {
            target.style.display = 'none';
          }
        }
      }

      /* Hide footer area (the one with social icons + links) */
      var allEls = document.querySelectorAll('div');
      for (var j = 0; j < allEls.length; j++) {
        var fc = allEls[j].firstElementChild;
        if (fc && fc.textContent && fc.textContent.trim() === "It's not a done deal until you List It! Simple, Safe, Secure.") {
          allEls[j].style.display = 'none';
        }
      }

      /* Remove small fixed widgets (chatbot, feedback) */
      var allDivs = document.querySelectorAll('div,iframe');
      for (var k = 0; k < allDivs.length; k++) {
        try {
          var cs = getComputedStyle(allDivs[k]);
          if (cs.position === 'fixed') {
            var rect = allDivs[k].getBoundingClientRect();
            if (rect.width > 0 && rect.width < 100 && rect.height > 0 && rect.height < 100) {
              allDivs[k].style.display = 'none';
            }
          }
        } catch(e) {}
      }

      /* Remove feedback iframes */
      document.querySelectorAll('iframe').forEach(function(el) {
        if ((el.src || '').includes('feedback') || (el.title || '').includes('feedback')) {
          el.style.display = 'none';
        }
      });

      /* Remove chatbot wrapper */
      document.querySelectorAll('[class*="_wrapper_"]').forEach(function(el) {
        var r = el.getBoundingClientRect();
        if (r.width > 0 && r.width < 80 && r.height > 0 && r.height < 80) {
          el.style.display = 'none';
        }
      });
    }

    /* Auto-accept cookie consent */
    var cookieCheck = setInterval(function() {
      var btns = document.querySelectorAll('button');
      for (var i = 0; i < btns.length; i++) {
        var txt = btns[i].textContent.toLowerCase().trim();
        if (txt === 'accept' || txt === 'accept all' || txt === 'i agree') {
          btns[i].click();
          clearInterval(cookieCheck);
          break;
        }
      }
    }, 500);
    setTimeout(function() { clearInterval(cookieCheck); }, 5000);

    /* Run cleanup after page loads */
    setTimeout(appCleanup, 1000);
    setTimeout(appCleanup, 2500);
    setTimeout(appCleanup, 5000);

    /* Navigation tracking */
    var pushState = history.pushState;
    history.pushState = function() {
      pushState.apply(history, arguments);
      window.ReactNativeWebView.postMessage(JSON.stringify({type: 'nav', url: location.href}));
      setTimeout(appCleanup, 1000);
    };
    window.addEventListener('popstate', function() {
      window.ReactNativeWebView.postMessage(JSON.stringify({type: 'nav', url: location.href}));
      setTimeout(appCleanup, 1000);
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
              paddingBottom: Platform.OS === 'ios' ? 24 : 14,
              paddingTop: 10,
              height: Platform.OS === 'ios' ? 88 : 74,
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
