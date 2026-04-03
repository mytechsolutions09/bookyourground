import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform, TouchableOpacity, Image, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

export default function SignupScreen() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [stateName, setStateName] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const { width } = useWindowDimensions();
  const showHeroImage = Platform.OS === 'web' && width >= 900;

  const handleSignup = async () => {
    if (!firstName || !lastName || !phone || !stateName || !email || !password) {
      if (Platform.OS === 'web') {
        alert('Please fill in all required fields');
      } else {
        Alert.alert('Error', 'Please fill in all required fields');
      }
      return;
    }

    if (password.length < 6) {
      if (Platform.OS === 'web') {
        alert('Password must be at least 6 characters');
      } else {
        Alert.alert('Error', 'Password must be at least 6 characters');
      }
      return;
    }

    setLoading(true);
    const fullName = `${firstName} ${lastName}`.trim();
    const { error } = await signUp(email, password, fullName);
    setLoading(false);

    if (error) {
      if (Platform.OS === 'web') {
        alert('Signup Failed: ' + error.message);
      } else {
        Alert.alert('Signup Failed', error.message);
      }
    } else {
      if (Platform.OS === 'web') {
        alert('Account created successfully!');
        router.replace('/(tabs)/dashboard');
      } else {
        Alert.alert('Success', 'Account created successfully!', [
          { text: 'OK', onPress: () => router.replace('/(tabs)/dashboard') }
        ]);
      }
    }
  };

  const contentInner = (
    <>
      <View style={styles.heroColumn}>
        <View style={styles.formContainer}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.replace('/')}>
              <Text style={styles.logoText}>Book my ground</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.form}>
          <View style={styles.row}>
            <View style={styles.col}>
              <Input
                label="First Name"
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Enter your first name"
                autoComplete="name"
              />
            </View>

            <View style={styles.col}>
              <Input
                label="Last Name"
                value={lastName}
                onChangeText={setLastName}
                placeholder="Enter your last name"
                autoComplete="name-family"
              />
            </View>
          </View>

          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="Enter your email"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />

          <View style={styles.row}>
            <View style={styles.col}>
              <Input
                label="Mobile Number"
                value={phone}
                onChangeText={setPhone}
                placeholder="Enter your mobile number"
                keyboardType="phone-pad"
                autoComplete="tel"
              />
            </View>

            <View style={styles.col}>
              <Input
                label="State"
                value={stateName}
                onChangeText={setStateName}
                placeholder="Select your state"
              />
            </View>
          </View>

          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password (min 6 characters)"
            secureTextEntry
            autoComplete="password"
          />

            <Button
              title="Sign Up"
              onPress={handleSignup}
              loading={loading}
              fullWidth
              style={styles.button}
            />

            <Button
              title="Already have an account? Sign In"
              onPress={() => router.back()}
              variant="outline"
              fullWidth
            />
          </View>
        </View>
      </View>

      {showHeroImage && (
        <View style={styles.heroImage}>
          <Image
            source={require('../../assets/signup-stadium.png')}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        </View>
      )}
    </>
  );

  const formBody =
    Platform.OS === 'web' ? (
      <View style={styles.scrollContent}>{contentInner}</View>
    ) : (
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {contentInner}
      </ScrollView>
    );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      {formBody}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#043529',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    ...Platform.select({
      web: {
        flexDirection: 'row-reverse',
        alignItems: 'stretch',
        width: '100%',
        gap: 0,
        padding: 0,
      },
    }),
  },
  header: {
    marginBottom: 24,
    alignItems: 'center',
  },
  logoText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#02c259',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
  },
  heroImage: {
    display: 'none',
    ...Platform.select({
      web: {
        display: 'flex',
        flex: 1,
        width: '50%',
        borderRadius: 0,
        overflow: 'hidden',
      },
    }),
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#212121',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  form: {
    gap: 16,
    ...Platform.select({
      web: {
        flex: 1,
      },
    }),
  },
  heroColumn: {
    flex: 1,
    width: '100%',
    paddingVertical: 0,
    ...Platform.select({
      web: {
        width: '50%',
      },
    }),
  },
  formContainer: {
    flex: 1,
    width: '100%',
    backgroundColor: '#043529',
    borderRadius: 0,
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  row: {
    flexDirection: 'column',
    gap: 12,
    ...Platform.select({
      web: {
        flexDirection: 'row',
      },
    }),
  },
  col: {
    flex: 1,
  },
  button: {
    marginTop: 8,
  },
});
