import sys

def clean_signup():
    with open('app/(auth)/signup.tsx', 'r') as f:
        lines = f.readlines()

    replacements = [
        # Mobile email wrapper end
        (968, 969, []),
        # Mobile email fields
        (722, 899, []),
        # Mobile toggle
        (661, 720, []),
        # Web Turnstile block
        (734, 747, []),
        # Web email wrapper end
        (731, 732, []),
        # Web email fields
        (570, 661, []),
        # Web toggle
        (511, 568, []),
        # handleSignup
        (183, 304, ["""  const handleSignup = async () => {
    // Phone Sign Up Method (Passwordless & Frictionless)
    if (!phone) {
      const msg = 'Please enter your mobile number';
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert('Error', msg);
      return;
    }

    if (!phoneOtpSent) {
      await sendSignupPhoneOtp();
      return;
    }

    if (phoneOtpVal.length !== 6) {
      const msg = 'Please enter a 6-digit verification code';
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert('Error', msg);
      return;
    }

    if (phoneOtpVal !== phoneGeneratedOtp) {
      const msg = 'Incorrect OTP. Please check and try again.';
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert('Error', msg);
      return;
    }

    // Verified! Create Supabase player account with phone-linked credentials
    setLoading(true);
    const randomEmail = `${phone}@bookyourground.com`;
    const randomPassword = Math.random().toString(36).slice(-10) + 'A1!';
    
    const { error } = await signUp(
      randomEmail,
      randomPassword,
      'Player', // default generic display name for fast registration
      phone,
      'user',
      undefined,
      undefined, // address not required for phone flow
      undefined, // state not required for phone flow
      undefined,
      'Player',
      undefined, // bypass Turnstile for SMS verified phone flow
      false      // no email confirmation needed since phone is verified
    );
    setLoading(false);

    if (error) {
      if (Platform.OS === 'web') alert('Signup Failed: ' + error.message);
      else Alert.alert('Signup Failed', error.message);
    } else {
      setShowSuccessModal(true);
    }
  };\n"""]),
        # state
        (64, 64, [])
    ]

    replacements.sort(key=lambda x: x[0], reverse=True)

    for start, end, repl in replacements:
        repl_lines = [r + '\n' if not r.endswith('\n') else r for r in repl] if isinstance(repl, list) else [repl]
        lines[start-1:end] = repl_lines

    with open('app/(auth)/signup.tsx', 'w') as f:
        f.writelines(lines)

if __name__ == "__main__":
    clean_signup()
