import 'react-native-gesture-handler';
import { Slot } from 'expo-router';
import { useMetaFeatures } from '@/hooks/useMetaFeatures';

export default function App() {
  const { analytics, aiAssistant } = useMetaFeatures();
  return <Slot />;
}