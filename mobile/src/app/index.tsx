import { Redirect } from 'expo-router';
import { ActivityIndicator } from 'react-native';
import { useCare } from '../lib/care-store';
export default function Index() { const { state, ready } = useCare(); if (!ready) return <ActivityIndicator style={{ flex: 1 }} />; return <Redirect href={state.recipients.length ? '/home' : '/setup/care-recipient'} />; }
