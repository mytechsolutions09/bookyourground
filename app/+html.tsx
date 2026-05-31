import { ScrollViewStyleReset } from 'expo-router/html';

const schemaMarkup = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://bookyourground.com/#website",
      "url": "https://bookyourground.com/",
      "name": "BookYourGround",
      "description": "Book sports grounds instantly. Cricket, football, and more.",
      "publisher": {
        "@id": "https://bookyourground.com/#organization"
      }
    },
    {
      "@type": "Organization",
      "@id": "https://bookyourground.com/#organization",
      "name": "BookYourGround",
      "url": "https://bookyourground.com/",
      "logo": "https://bookyourground.com/logo.png"
    }
  ]
};

export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <title>Cricket Ground Booking - BookYourGround</title>
        <meta name="description" content="Instantly book cricket, football, and other sports grounds online." />
        <base href="/" />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: responsiveBackground }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaMarkup) }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const responsiveBackground = `
html, body, #root {
  height: 100%;
  overflow: hidden;
}
body {
  background-color: #F5F5F5;
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}
* {
  box-sizing: border-box;
  scrollbar-width: none !important;
  -ms-overflow-style: none !important;
}
*::-webkit-scrollbar {
  display: none !important;
}
`;
