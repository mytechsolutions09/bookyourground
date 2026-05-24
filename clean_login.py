import sys

def clean_login():
    with open('app/(auth)/login.tsx', 'r') as f:
        lines = f.readlines()

    replacements = [
        # Mobile signup button condition end
        (967, 967, []),
        # Mobile signup button condition start
        (956, 956, []),
        # Mobile email fields end wrapper
        (939, 940, []),
        # Mobile email fields start
        (743, 814, []),
        # Mobile toggle
        (682, 741, []),
        # Web sign up button condition end
        (692, 692, []),
        # Web sign up button condition start
        (685, 685, []),
        # Web forgot password
        (670, 674, []),
        # Web email fields end wrapper
        (665, 666, []),
        # Web email fields start
        (553, 577, []),
        # Web toggle
        (494, 551, []),
        # handleLogin
        (154, 223, ["""  const handleLogin = async () => {
    if (!phoneOtpSent) {
      await sendPhoneOtp();
      return;
    }

    if (!phone || !phoneOtpVal) {
      const msg = 'Please fill in all fields';
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

    setLoading(true);
    const cleaned = phone.replace(/[^0-9]/g, '');
    const tempPassword = 'BYGTempOTPAuthPass_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
    
    const { data: resolvedEmail, error: rpcError } = await supabase.rpc('login_with_otp_auth', {
      p_phone: cleaned,
      p_new_password: tempPassword,
    });

    if (rpcError || !resolvedEmail) {
      setLoading(false);
      const msg = 'Failed to authenticate phone login. Please try again.';
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert('Login Failed', msg);
      return;
    }

    // Pre-verify OTP to bypass 2FA modal
    setLoginOtpVerified(true);
    
    const { error } = await signIn(resolvedEmail, tempPassword);
    setLoading(false);

    if (error) {
      if (Platform.OS === 'web') alert('Login Failed: ' + error.message);
      else Alert.alert('Login Failed', error.message);
    }
  };\n"""]),
        # state
        (61, 61, [])
    ]

    # Sort descending by start to avoid shifting issues
    replacements.sort(key=lambda x: x[0], reverse=True)

    for start, end, repl in replacements:
        repl_lines = [r + '\n' if not r.endswith('\n') else r for r in repl] if isinstance(repl, list) else [repl]
        lines[start-1:end] = repl_lines

    with open('app/(auth)/login.tsx', 'w') as f:
        f.writelines(lines)

if __name__ == "__main__":
    clean_login()
