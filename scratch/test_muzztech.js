
const API_KEY = '0a882ad26cc5a7dff7595bc0156a66e8';
const SENDER_NAME = 'BYGBYG';
const SIGNUP_TEMPLATE_ID = '1707177917840627538';
const otp = '123456';
const phone = '9625788455';

const message = ` Your OTP ${otp} to authenticate your signup. Never share your OTP with anyone - https://bookyourground.com/ PRPBYG`;
const encodedMessage = encodeURIComponent(message);
const url = `https://connect.muzztech.com/api/sms/send?api_key=${API_KEY}&phone_number=${phone}&sender_name=${SENDER_NAME}&message=${encodedMessage}&template_id=${SIGNUP_TEMPLATE_ID}`;

console.log('Sending request to Muzztech...');
console.log('URL:', url);

fetch(url)
  .then(res => res.json())
  .then(data => {
    console.log('--- RESPONSE SUCCESS ---');
    console.log(JSON.stringify(data, null, 2));
  })
  .catch(err => {
    console.error('--- RESPONSE ERROR ---');
    console.error(err);
  });
