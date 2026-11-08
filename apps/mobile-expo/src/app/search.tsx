import { Redirect } from 'expo-router';

/** Search now lives on the home screen (#58); this keeps old links and deep links working. */
export default function SearchRedirect() {
  return <Redirect href="/home" />;
}
