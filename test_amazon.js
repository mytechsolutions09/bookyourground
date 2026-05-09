const url = 'https://www.amazon.in/SG-Savage-Cricket-Bat-Size/dp/B07P7S6QJL';
const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;

fetch(proxyUrl)
  .then(res => res.text())
  .then(html => {
    console.log("HTML length:", html.length);
    
    const titleMatch = html.match(/<span id="productTitle"[^>]*>([^<]+)<\/span>/);
    console.log("Title:", titleMatch ? titleMatch[1].trim() : 'NOT FOUND');
    
    const priceMatch = html.match(/<span class="a-price-whole">([^<]+)<\/span>/);
    console.log("Price:", priceMatch ? priceMatch[1].trim().replace(/,/g, '') : 'NOT FOUND');
    
    const imgMatch = html.match(/id="landingImage"[^>]*src="([^"]+)"/);
    console.log("Image:", imgMatch ? imgMatch[1] : 'NOT FOUND');
    
    if (!titleMatch) {
      console.log("Preview of HTML:");
      console.log(html.substring(0, 500));
    }
  })
  .catch(console.error);
