// Redirect explore tab to keep router happy — this tab is hidden from layout
import { Redirect } from 'expo-router';
export default function ExploreRedirect() {
  return <Redirect href="/(tabs)" />;
}
