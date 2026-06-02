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
      "logo": "https://nwvarvvyhjkvtgijwfkc.supabase.co/storage/v1/object/public/Assets/logo.png"
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
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://bookyourground.com/" />
        <meta property="og:title" content="Cricket Ground Booking - BookYourGround" />
        <meta property="og:description" content="Instantly book cricket, football, and other sports grounds online." />
        <meta property="og:image" content="https://nwvarvvyhjkvtgijwfkc.supabase.co/storage/v1/object/public/Assets/logo.png" />

        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://bookyourground.com/" />
        <meta property="twitter:title" content="Cricket Ground Booking - BookYourGround" />
        <meta property="twitter:description" content="Instantly book cricket, football, and other sports grounds online." />
        <meta property="twitter:image" content="https://nwvarvvyhjkvtgijwfkc.supabase.co/storage/v1/object/public/Assets/logo.png" />
        
        <base href="/" />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: responsiveBackground }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaMarkup) }} />
        
        {/* Google tag (gtag.js) */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-2K1150PVEP"></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-2K1150PVEP');
            `,
          }}
        />

        {/* Google Search Console Verification */}
        {process.env.EXPO_PUBLIC_GOOGLE_SITE_VERIFICATION && (
          <meta name="google-site-verification" content={process.env.EXPO_PUBLIC_GOOGLE_SITE_VERIFICATION} />
        )}
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
.admin-sidebar-scroll {
  scrollbar-width: thin !important;
  scrollbar-color: rgba(0, 234, 107, 0.4) transparent !important;
}
.admin-sidebar-scroll::-webkit-scrollbar {
  display: block !important;
  width: 6px !important;
  height: 6px !important;
}
.admin-sidebar-scroll::-webkit-scrollbar-track {
  background: transparent !important;
}
.admin-sidebar-scroll::-webkit-scrollbar-thumb {
  background-color: rgba(0, 234, 107, 0.4) !important;
  border-radius: 3px !important;
}
.admin-sidebar-scroll::-webkit-scrollbar-thumb:hover {
  background-color: rgba(0, 234, 107, 0.7) !important;
}
`;
