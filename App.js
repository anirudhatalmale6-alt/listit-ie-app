import React, { useRef, useState, useEffect, useCallback } from 'react';
import { StatusBar, BackHandler, Platform, View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import SwipeScreen from './screens/SwipeScreen';
import SavedScreen from './screens/SavedScreen';

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
  Discover: ['flame', 'flame-outline'],
  Saved: ['heart', 'heart-outline'],
  'Place Ad': ['pricetag', 'pricetag-outline'],
  'My Profile': ['person', 'person-outline'],
};

const WEB_TABS = new Set(['Browse', 'Place Ad', 'Messages', 'My Profile']);

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

function CustomTabBar({ activeTab, onTabPress, savedCount }) {
  const insets = useSafeAreaInsets();
  const tabs = ['Browse', 'Discover', 'Saved', 'Place Ad', 'My Profile'];
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
            <View>
              <Ionicons name={iconName} size={22} color={color} />
              {tab === 'Saved' && savedCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{savedCount > 99 ? '99+' : savedCount}</Text>
                </View>
              )}
            </View>
            <Text style={{ color, fontSize: 10, fontWeight: '500', marginTop: 3 }}>{tab}</Text>
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
  const [savedCount, setSavedCount] = useState(0);

  useEffect(() => {
    if (Platform.OS === 'android') {
      const handler = BackHandler.addEventListener('hardwareBackPress', () => {
        if (WEB_TABS.has(activeTab) && webViewRef.current) {
          webViewRef.current.goBack();
          return true;
        }
        if (!WEB_TABS.has(activeTab)) {
          setActiveTab('Browse');
          return true;
        }
        return false;
      });
      return () => handler.remove();
    }
  }, [activeTab]);

  const handleTabPress = useCallback((tab) => {
    setActiveTab(tab);
    if (WEB_TABS.has(tab) && TAB_URLS[tab] && webViewRef.current) {
      webViewRef.current.injectJavaScript(`window.location.href = '${TAB_URLS[tab]}'; true;`);
    }
  }, []);

  const handleOpenAd = useCallback((adUrl) => {
    setActiveTab('Browse');
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(`window.location.href = '${adUrl}'; true;`);
    }
  }, []);

  const isWebTab = WEB_TABS.has(activeTab);

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
        isWebTab={isWebTab}
        handleTabPress={handleTabPress}
        handleOpenAd={handleOpenAd}
        savedCount={savedCount}
        setSavedCount={setSavedCount}
      />
    </SafeAreaProvider>
  );
}

function MainContent({
  webViewRef, loading, setLoading, currentUrl, setCurrentUrl,
  activeTab, isWebTab, handleTabPress, handleOpenAd, savedCount, setSavedCount,
}) {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={{ flex: 1, paddingTop: insets.top }}>
        {/* WebView - always mounted but hidden when on native tabs */}
        <View style={{ flex: isWebTab ? 1 : 0, height: isWebTab ? undefined : 0, overflow: 'hidden' }}>
          {loading && isWebTab && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={LISTIT_BLUE} />
            </View>
          )}
          <WebView
            ref={webViewRef}
            source={{ uri: BASE_URL }}
            style={{ flex: 1, opacity: (loading && isWebTab) ? 0 : 1 }}
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

        {/* Native screens */}
        {activeTab === 'Discover' && (
          <SwipeScreen onSavedCountChange={setSavedCount} />
        )}
        {activeTab === 'Saved' && (
          <SavedScreen onOpenAd={handleOpenAd} onSavedCountChange={setSavedCount} />
        )}
      </View>
      <CustomTabBar activeTab={activeTab} onTabPress={handleTabPress} savedCount={savedCount} />
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
  badge: {
    position: 'absolute',
    top: -4,
    right: -10,
    backgroundColor: '#ff4458',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
});
