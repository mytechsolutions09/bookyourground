const fs = require('fs');
const path = require('path');

const HOST = 'bookyourground.com';
const API_KEY = '1ba60a481d74428182129e3b4109626d';
const KEY_LOCATION = `https://${HOST}/${API_KEY}.txt`;
const SITEMAP_PATH = path.join(__dirname, 'public', 'sitemap.xml');

async function submitToIndexNow() {
  try {
    if (!fs.existsSync(SITEMAP_PATH)) {
      console.error('Sitemap not found at', SITEMAP_PATH);
      return;
    }

    const sitemapContent = fs.readFileSync(SITEMAP_PATH, 'utf-8');
    
    // Extract URLs from sitemap.xml
    const urlMatches = sitemapContent.matchAll(/<loc>(.*?)<\/loc>/g);
    const urlList = [];
    for (const match of urlMatches) {
      if (match[1]) {
        urlList.push(match[1].trim());
      }
    }

    if (urlList.length === 0) {
      console.log('No URLs found in sitemap.');
      return;
    }

    console.log(`Found ${urlList.length} URLs to submit to IndexNow.`);

    const payload = {
      host: HOST,
      key: API_KEY,
      keyLocation: KEY_LOCATION,
      urlList: urlList,
    };

    const response = await fetch('https://api.indexnow.org/IndexNow', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      console.log('Successfully submitted URLs to IndexNow.');
      console.log('HTTP Status:', response.status);
    } else {
      console.error('Failed to submit URLs. HTTP Status:', response.status);
      const text = await response.text();
      console.error('Response:', text);
    }
  } catch (error) {
    console.error('Error submitting to IndexNow:', error);
  }
}

submitToIndexNow();
