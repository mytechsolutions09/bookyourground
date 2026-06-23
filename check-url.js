const http = require('https');

http.get('https://bookyourground.com/ff70da8ffbf0429c9c7339246e05b0da.txt', (res) => {
  console.log('Status Code:', res.statusCode);
  console.log('Headers:', res.headers);
}).on('error', (e) => {
  console.error(e);
});
