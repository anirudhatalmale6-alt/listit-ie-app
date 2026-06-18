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
      /* Hide ALL website chrome */
      .navbar-wrapper, nav.navbar, nav, header,
      footer, .footer, [class*="Footer"],
      .whatsapp-btn, [class*="WhatsApp"], a[href*="wa.me"],
      .bot-wrapper, [class*="BotWrapper"], [class*="chatbot"], [class*="Chatbot"],
      button[aria-label="Return to top"], [class*="scroll-top"], [class*="ScrollTop"],
      [class*="cookie"], [class*="Cookie"], [class*="consent"], [class*="Consent"],
      .cc-window, .cc-banner, #cookie-notice, #gdpr,
      [class*="NavBar"], [class*="navbar"], [class*="Navbar"],
      [class*="TopBar"], [class*="topbar"],
      [class*="AppDownload"], [class*="app-download"],
      [class*="BreadCrumb"], [class*="breadcrumb"], .breadcrumb,
      .ReactModal__Overlay[class*="cookie"],
      div[role="banner"],
      /* Feedback tab */
      [class*="feedback"], [class*="Feedback"], a[href*="feedback"],
      iframe[title*="feedback"], iframe[title*="Feedback"],
      div[id*="feedback"], div[id*="Feedback"],
      /* Chatbot / floating buttons */
      [class*="bot-icon"], [class*="BotIcon"], [class*="chat-widget"],
      [id*="chatbot"], [id*="chat-widget"], [class*="ChatWidget"],
      .fab, [class*="FloatingAction"], [class*="floating-action"],
      div[style*="position: fixed"][style*="bottom"][style*="right"][style*="border-radius: 50%"],
      /* Homepage marketing sections to hide in app */
      [class*="HeroBanner"], [class*="hero-banner"],
      [class*="SimpleAs"], [class*="simple-as"], [class*="AsSimple"],
      [class*="faq"], [class*="FAQ"], [class*="Faq"],
      [class*="blog"], [class*="Blog"], [class*="LatestBlog"], [class*="latest-blog"],
      [class*="popular-search"], [class*="PopularSearch"] {
        display: none !important;
        visibility: hidden !important;
        height: 0 !important;
        max-height: 0 !important;
        overflow: hidden !important;
        pointer-events: none !important;
        opacity: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
      }

      /* Reset body spacing */
      body {
        padding-top: 0 !important;
        margin-top: 0 !important;
        overflow-x: hidden !important;
      }
      .container, .container-fluid {
        padding-top: 2px !important;
      }
      [class*="PageWrapper"], [class*="pageWrapper"], [class*="page-wrapper"] {
        margin-top: 0 !important;
        padding-top: 2px !important;
      }

      /* Reduce whitespace on ad detail pages */
      [class*="ContactCard"], [class*="contactCard"] {
        margin-top: 5px !important;
        padding-top: 5px !important;
      }

      /* Make content full-width and app-like */
      * { -webkit-tap-highlight-color: transparent; }
      body { -webkit-text-size-adjust: 100%; }
      img { max-width: 100%; }
    \`;
    document.head.appendChild(style);

    /* Aggressively clean up the page for app view */
    function appCleanup() {
      /* Hide sections by text content */
      document.querySelectorAll('h1,h2,h3,h4,h5,h6,p,strong,b,div').forEach(function(el) {
        var t = (el.textContent || '').trim().toLowerCase();
        if (t === "it's as simple as list it" || t === 'simple, safe , secure' || t === 'simple , safe , secure' ||
            t.startsWith('faq') || t === 'read our latest blogs' ||
            t.includes("it's not a done deal until you list it")) {
          var target = el;
          for (var i = 0; i < 4; i++) {
            if (target.parentElement && target.parentElement.tagName !== 'BODY' && target.parentElement.tagName !== 'HTML' && target.parentElement.id !== 'root') {
              target = target.parentElement;
            }
          }
          target.style.cssText = 'display:none!important;height:0!important;overflow:hidden!important;';
        }
      });

      /* Remove ALL fixed-position floating widgets (chatbot, feedback, etc) */
      document.querySelectorAll('div,iframe,a').forEach(function(el) {
        var s = getComputedStyle(el);
        if (s.position === 'fixed') {
          var r = el.getBoundingClientRect();
          if (r.width < 120 && r.height < 120) {
            el.remove();
          }
        }
      });

      /* Remove iframes (feedback widgets, chat widgets) */
      document.querySelectorAll('iframe').forEach(function(el) {
        var src = el.src || el.title || '';
        if (src.toLowerCase().includes('feedback') || src.toLowerCase().includes('survey') || src.toLowerCase().includes('chat')) {
          el.remove();
        }
      });

      /* Remove elements with wrapper class pattern (chatbot) */
      document.querySelectorAll('[class*="_wrapper_"]').forEach(function(el) {
        var r = el.getBoundingClientRect();
        if (r.width < 80 && r.height < 80) { el.remove(); }
      });

      /* Hide social media icons row at top of page */
      document.querySelectorAll('a[href*="facebook.com"],a[href*="twitter.com"],a[href*="instagram.com"]').forEach(function(el) {
        var row = el.parentElement;
        if (row && row.children.length <= 6) {
          var r = row.getBoundingClientRect();
          if (r.top < 50 && r.height < 40) { row.style.display = 'none'; }
        }
      });
    }

    /* Run cleanup multiple times to catch dynamically loaded elements */
    setTimeout(appCleanup, 800);
    setTimeout(appCleanup, 2000);
    setTimeout(appCleanup, 4000);
    var cleanupInterval = setInterval(appCleanup, 3000);
    setTimeout(function() { clearInterval(cleanupInterval); }, 20000);

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
              paddingBottom: Platform.OS === 'ios' ? 24 : 12,
              paddingTop: 10,
              height: Platform.OS === 'ios' ? 88 : 72,
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
