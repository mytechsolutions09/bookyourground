import re

def clean_login():
    with open('app/(auth)/login.tsx', 'r') as f:
        text = f.read()
    
    # 1. Remove handleLogin email branch
    handle_login_pattern = re.compile(r'if \(loginMethod === \'phone\'\) \{(.*?)\} else \{.*?\}', re.DOTALL)
    text = handle_login_pattern.sub(r'\1', text)
    
    # 2. Remove web toggle
    text = re.sub(r'\{\/\* Toggle Selector \*\/\}\s*<View style=\{\{\s*flexDirection: \'row\',[^{}]*\}\}>\s*<TouchableOpacity.*?<\/View>', '', text, flags=re.DOTALL)
    
    # 3. Remove web email fields
    text = re.sub(r'\{loginMethod === \'email\' \? \(\s*<>\s*<WebInput[^>]*label="Email Address".*?<\/WebInput>\s*<WebInput[^>]*label="Password".*?<\/WebInput>\s*<\/>\s*\) : \(\s*<>', '<>', text, flags=re.DOTALL)
    
    # 4. Remove web trailing )\}
    text = re.sub(r'\{otpSuccessMessage \? \((.*?)\) : null\}(.*?)<\/View>\s*<\/>\s*\)\s*\}', r'{otpSuccessMessage ? (\1) : null}\2</View>', text, flags=re.DOTALL)

    with open('app/(auth)/login.tsx', 'w') as f:
        f.write(text)

clean_login()
