import React, { useRef, useState, useEffect, useCallback } from 'react';
import { StatusBar, BackHandler, Platform, View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const BASE_URL = 'https://listit.ie';
const LISTIT_BLUE = '#1b87f4';
const NAV_BG = '#2c2c2e';

const TAB_URLS = {
  Browse: BASE_URL,
  'Place Ad': `${BASE_URL}/user/ads/create`,
  Messages: `${BASE_URL}/user/messages`,
  'My Profile': `${BASE_URL}/user/profile`,
};

const TAB_ICONS = {
  Browse: ['search', 'search-outline'],
  'Place Ad': ['pricetag', 'pricetag-outline'],
  Messages: ['chatbubble', 'chatbubble-outline'],
  'My Profile': ['person', 'person-outline'],
};

const INJECTED_JS = `
  (function() {
    var style = document.createElement('style');
    style.textContent = \`
      body {
        overflow-x: hidden !important;
      }
      * { -webkit-tap-highlight-color: transparent; }
    \`;
    document.head.appendChild(style);

    var cookieCheck = setInterval(function() {
      var btns = document.querySelectorAll('button');
      for (var i = 0; i < btns.length; i++) {
        var txt = btns[i].textContent.toLowerCase().trim();
        if (txt === 'accept' || txt === 'accept all' || txt === 'i agree') {
          btns[i].click(); clearInterval(cookieCheck); break;
        }
      }
    }, 500);
    setTimeout(function() { clearInterval(cookieCheck); }, 5000);

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

function CustomTabBar({ activeTab, onTabPress }) {
  const insets = useSafeAreaInsets();
  const tabs = ['Browse', 'Place Ad', 'Messages', 'My Profile'];
  return (
    <View style={{
      flexDirection: 'row',
      backgroundColor: NAV_BG,
      paddingTop: 10,
      paddingBottom: Math.max(insets.bottom, 16),
    }}>
      {tabs.map((tab) => {
        const isFocused = activeTab === tab;
        const color = isFocused ? '#fff' : '#888';
        const [iconFocused, iconDefault] = TAB_ICONS[tab];
        const iconName = isFocused ? iconFocused : iconDefault;
        return (
          <TouchableOpacity
            key={tab}
            onPress={() => onTabPress(tab)}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
            activeOpacity={0.7}
          >
            <Ionicons name={iconName} size={24} color={color} />
            <Text style={{ color, fontSize: 11, fontWeight: '500', marginTop: 3 }}>{tab}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function App() {
  const webViewRef = useRef(null);
  const [activeTab, setActiveTab] = useState('Browse');
  const [loading, setLoading] = useState(true);
  const [currentUrl, setCurrentUrl] = useState(BASE_URL);
  const insets = useSafeAreaInsets ? null : null;

  useEffect(() => {
    if (Platform.OS === 'android') {
      const handler = BackHandler.addEventListener('hardwareBackPress', () => {
        if (webViewRef.current) {
          webViewRef.current.goBack();
          return true;
        }
        return false;
      });
      return () => handler.remove();
    }
  }, []);

  const handleTabPress = useCallback((tab) => {
    setActiveTab(tab);
    const url = TAB_URLS[tab];
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(`window.location.href = '${url}'; true;`);
    }
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor={NAV_BG} />
      <MainContent
        webViewRef={webViewRef}
        loading={loading}
        setLoading={setLoading}
        currentUrl={currentUrl}
        setCurrentUrl={setCurrentUrl}
        activeTab={activeTab}
        handleTabPress={handleTabPress}
      />
    </SafeAreaProvider>
  );
}

function MainContent({ webViewRef, loading, setLoading, currentUrl, setCurrentUrl, activeTab, handleTabPress }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={{ flex: 1, paddingTop: insets.top }}>
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={LISTIT_BLUE} />
          </View>
        )}
        <WebView
          ref={webViewRef}
          source={{ uri: BASE_URL }}
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
          onNavigationStateChange={(navState) => {
            setCurrentUrl(navState.url);
          }}
          userAgent={Platform.select({
            ios: 'ListitApp/1.0 iOS Safari/605',
            android: 'ListitApp/1.0 Android Chrome/120',
          })}
        />
      </View>
      <CustomTabBar activeTab={activeTab} onTabPress={handleTabPress} />
    </View>
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
