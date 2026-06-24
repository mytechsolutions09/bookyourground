const https = require('https');

const url = 'https://api.indexnow.org/indexnow?url=https://bookyourground.com/&key=ff70da8ffbf0429c9c7339246e05b0da&keyLocation=https://bookyourground.com/ff70da8ffbf0429c9c7339246e05b0da.txt';

https.get(url, (res) => {
  console.log('Status bookyourground.com:', res.statusCode);
});

const url2 = 'https://api.indexnow.org/indexnow?url=https://www.bookyourground.com/&key=ff70da8ffbf0429c9c7339246e05b0da&keyLocation=https://www.bookyourground.com/ff70da8ffbf0429c9c7339246e05b0da.txt';

https.get(url2, (res) => {
  console.log('Status www.bookyourground.com:', res.statusCode);
});
