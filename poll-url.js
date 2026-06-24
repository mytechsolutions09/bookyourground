const https = require('https');
const { execSync } = require('child_process');

function check() {
  https.get('https://bookyourground.com/1ba60a481d74428182129e3b4109626d.txt', (res) => {
    if (res.statusCode === 200) {
        console.log('File is live! Running submit...');
        try {
          const out = execSync('node submit-indexnow.js');
          console.log(out.toString());
        } catch (e) {
          console.error('Error submitting:', e.stdout ? e.stdout.toString() : e);
        }
    } else {
        console.log('File is not live yet (Status: ' + res.statusCode + '). Waiting 10s...');
        setTimeout(check, 10000);
    }
  }).on('error', (e) => {
    console.error(e);
    setTimeout(check, 10000);
  });
}

check();
