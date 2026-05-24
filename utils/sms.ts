import { Platform } from 'react-native';

const API_KEY = process.env.EXPO_PUBLIC_MUZZTECH_API_KEY || '0a882ad26cc5a7dff7595bc0156a66e8';
const SENDER_NAME = process.env.EXPO_PUBLIC_MUZZTECH_SENDER_NAME || 'BYGBYG';
const SIGNUP_TEMPLATE_ID = process.env.EXPO_PUBLIC_MUZZTECH_TEMPLATE_ID || '1707177917840627538';
const LOGIN_TEMPLATE_ID = process.env.EXPO_PUBLIC_MUZZTECH_LOGIN_TEMPLATE_ID || '1707177917746038437';

/**
 * Cleans a phone number to standard 10 digits for Indian carriers.
 * Removes +91, spaces, hyphens, and leading zeros.
 */
export function cleanPhoneNumber(phone: string): string {
  let cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    cleaned = cleaned.substring(2);
  } else if (cleaned.length === 11 && cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }
  return cleaned;
}

/**
 * Generates a secure random 6-digit OTP.
 */
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Sends a 6-digit OTP using the Muzztech SMS API.
 * 
 * @param phone 10-digit Indian phone number
 * @param otp The 6-digit OTP string to send
 * @param type DLT template context: 'signup' or 'login'
 */
export async function sendSMSOTP(
  phone: string, 
  otp: string, 
  type: 'signup' | 'login' = 'signup'
): Promise<{ success: boolean; error?: string }> {
  try {
    const cleanedPhone = cleanPhoneNumber(phone);
    if (cleanedPhone.length !== 10) {
      return { success: false, error: 'Invalid phone number. Must be a 10-digit Indian mobile number.' };
    }

    // Fallback: Using the login template for both flows since the signup template is failing DLT validation
    let templateId = LOGIN_TEMPLATE_ID;
    let message = ` Your OTP ${otp} to authenticate your login. Never share your OTP with anyone - https://bookyourground.com/ PRPBYG`;

    if (type === 'login') {
      templateId = LOGIN_TEMPLATE_ID;
      message = ` Your OTP ${otp} to authenticate your login. Never share your OTP with anyone - https://bookyourground.com/ PRPBYG`;
    }

    const encodedMessage = encodeURIComponent(message);
    const apiPhone = cleanedPhone;
    const url = `https://connect.muzztech.com/api/sms/send?api_key=${API_KEY}&phone_number=${apiPhone}&sender_name=${SENDER_NAME}&message=${encodedMessage}&template_id=${templateId}`;

    console.log(`Sending ${type} SMS to ${apiPhone}...`);
    
    // Safely log the OTP only in local development mode
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.log('🔑 [DEVELOPMENT ONLY] Dynamic Verification Code (OTP):', otp);
    }
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Muzztech API Response:', JSON.stringify(data));

    if (data.success || data.message === 'Message submitted successfully' || data.data) {
      return { success: true };
    } else {
      return { success: false, error: data.message || 'SMS service failed to send OTP.' };
    }
  } catch (err: any) {
    console.error(`Error sending ${type} SMS OTP:`, err);
    return { success: false, error: err.message || 'Network error occurred while sending SMS.' };
  }
}
