import { useEffect, useState } from 'react';
import { Image } from 'expo-image';
import { Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
import { dependencies } from './package.json';

const SERVER = 'http://127.0.0.1:4317';

export default function App() {
  const [run, setRun] = useState(null);
  const [error, setError] = useState('');

  async function start() {
    setError('');
    setRun(null);
    try {
      const id = String(Date.now());
      await fetch(`${SERVER}/session?run=${id}`, { method: 'POST', credentials: 'include' });
      const response = await fetch(`${SERVER}/verify?run=${id}`, { credentials: 'include' });
      const verification = await response.json();
      if (!response.ok) throw new Error(`Fetch control failed (HTTP ${response.status})`);
      setRun({ id, fetchStatus: response.status, fetchCookie: verification.cookie });
    } catch (error) {
      setError(error.message);
    }
  }

  async function finish(loaded) {
    try {
      const response = await fetch(`${SERVER}/events?run=${run.id}`, { credentials: 'include' });
      const event = await response.json();
      if (event.imageStatus === undefined) throw new Error('Image request did not reach the fixture server');
      setRun((current) => ({ ...current, loaded, ...event }));
    } catch (error) {
      setError(error.message);
    }
  }

  useEffect(() => { start(); }, []);
  const completed = run?.imageStatus !== undefined;

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#f4f6f8" />
      <View style={styles.content}>
        <Text style={styles.eyebrow}>EXPO IMAGE / ANDROID</Text>
        <Text style={styles.title}>Cookie sharing repro</Text>
        <Text style={styles.versions}>Expo {dependencies.expo} · Image {dependencies['expo-image']}</Text>
        <Text style={styles.subtitle}>One session cookie. Two HTTP clients.</Text>
        <View style={styles.card}>
          <Text style={styles.step}>1. React Native fetch</Text>
          <Text style={[styles.result, styles.success]}>{run ? `HTTP ${run.fetchStatus} · Cookie received` : 'Setting session cookie…'}</Text>
          <Text style={styles.code}>{run?.fetchCookie || 'Waiting for server'}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.step}>2. expo-image</Text>
          <Text testID="image-result" style={[styles.result, completed && (run.loaded ? styles.success : styles.failure)]}>
            {completed ? `HTTP ${run.imageStatus} · ${run.loaded ? 'Image loaded' : 'Image failed'}` : 'Requesting protected image…'}
          </Text>
          <Text style={styles.code}>Cookie: {completed ? run.imageCookie || '(none)' : 'waiting'}</Text>
          <View style={styles.imageFrame}>
            {run && <Image
              key={run.id}
              source={{ uri: `${SERVER}/protected.svg?run=${run.id}` }}
              cachePolicy="none"
              style={styles.image}
              contentFit="contain"
              onLoad={() => finish(true)}
              onError={() => finish(false)}
            />}
            {completed && !run.loaded && <Text style={styles.placeholder}>401 Unauthorized</Text>}
          </View>
        </View>
        <Text testID="repro-verdict" style={[styles.verdict, completed && (run.loaded ? styles.success : styles.failure)]}>
          {error || (completed ? run.loaded ? 'PASS: cookie shared with image' : 'FAIL: image request omitted cookie' : 'Running…')}
        </Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Run repro" style={styles.button} onPress={start} disabled={!completed && !error}>
          <Text style={styles.buttonText}>Run repro</Text>
        </Pressable>
        <Text style={styles.note}>Cookie set by the server with HttpOnly; Path=/.
          {'\n'}Image cache disabled. No manual Cookie header.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f4f6f8' },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 48, gap: 16 },
  eyebrow: { color: '#526174', fontWeight: '700', fontSize: 12, letterSpacing: 2 },
  title: { color: '#172433', fontSize: 28, fontWeight: '700' },
  versions: { color: '#526174', fontSize: 13, marginTop: -8 },
  subtitle: { color: '#526174', fontSize: 15, marginBottom: 4 },
  card: { padding: 18, borderRadius: 14, backgroundColor: '#fff', gap: 10 },
  step: { color: '#172433', fontSize: 17, fontWeight: '700' },
  result: { fontSize: 17, fontWeight: '600', color: '#526174' },
  success: { color: '#087744' },
  failure: { color: '#ba3035' },
  code: { color: '#526174', fontFamily: 'monospace', fontSize: 12 },
  imageFrame: { height: 128, backgroundColor: '#eef1f4', borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  image: { width: '100%', height: '100%', position: 'absolute' },
  placeholder: { color: '#8a4650', fontSize: 18 },
  verdict: { fontSize: 16, fontWeight: '700', minHeight: 24 },
  button: { backgroundColor: '#263e55', borderRadius: 10, padding: 15, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  note: { color: '#647184', fontSize: 12, lineHeight: 19 },
});
