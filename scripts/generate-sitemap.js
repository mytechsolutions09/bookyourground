const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const SITE_URL = 'https://bookyourground.com';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('Supabase credentials not found. Skipping sitemap generation.');
  process.exit(0);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function slugifyGroundSegment(value) {
  return (value || 'ground')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

function slugify(text) {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')     // Replace spaces with -
    .replace(/[^\w-]+/g, '')  // Remove all non-word chars
    .replace(/--+/g, '-');    // Replace multiple - with single -
}

async function generateSitemap() {
  try {
    console.log('Fetching active grounds from Supabase...');
    const { data: grounds, error } = await supabase
      .from('grounds')
      .select(`
        *,
        ground_images(*),
        reviews(rating, comment, created_at, user:profiles(full_name)),
        time_slots(custom_price, is_available, overs_count, start_time, end_time)
      `)
      .eq('active', true)
      .eq('approved', true);

    if (error) {
      throw error;
    }

    const date = new Date().toISOString().split('T')[0];

    // Core static routes
    const routes = [
      '',
      '/about',
      '/contact',
      '/faq',
      '/terms',
      '/privacy',
      '/shipping',
      '/refund-policy',
      '/blog',
      '/shop',
      '/corporate',
      '/cricket-grounds',
      '/football-grounds',
      '/how-it-works',
      '/list-your-venue',
      '/match-strategies',
      '/pricing',
      '/book-cricket-ground-in-delhi',
      '/book-cricket-ground-in-gurugram',
    ];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    // Add static routes
    for (const route of routes) {
      xml += `  <url>\n`;
      xml += `    <loc>${SITE_URL}${route}</loc>\n`;
      xml += `    <lastmod>${date}</lastmod>\n`;
      xml += `    <changefreq>weekly</changefreq>\n`;
      xml += `    <priority>${route === '' ? '1.0' : '0.8'}</priority>\n`;
      xml += `  </url>\n`;
    }

    // Add dynamic ground routes
    if (grounds && grounds.length > 0) {
      for (const ground of grounds) {
        const c = slugifyGroundSegment(ground.city);
        const n = slugifyGroundSegment(ground.name);
        const route = `/ground/${c}/${n}`;
        
        xml += `  <url>\n`;
        xml += `    <loc>${SITE_URL}${route}</loc>\n`;
        xml += `    <lastmod>${date}</lastmod>\n`;
        xml += `    <changefreq>daily</changefreq>\n`;
        xml += `    <priority>0.9</priority>\n`;
        xml += `  </url>\n`;
      }
    }

    // Add dynamic blog routes
    try {
      console.log('Fetching active blogs from Supabase...');
      const { data: blogs, error: blogError } = await supabase
        .from('blogs')
        .select('slug')
        .eq('is_published', true);
      
      if (blogError) {
        console.warn('Error fetching blogs from Supabase. Skipping blog routes:', blogError);
      } else if (blogs && blogs.length > 0) {
        for (const blog of blogs) {
          if (!blog.slug) continue;
          const route = `/blog/${blog.slug}`;
          
          xml += `  <url>\n`;
          xml += `    <loc>${SITE_URL}${route}</loc>\n`;
          xml += `    <lastmod>${date}</lastmod>\n`;
          xml += `    <changefreq>weekly</changefreq>\n`;
          xml += `    <priority>0.8</priority>\n`;
          xml += `  </url>\n`;
        }
      }
    } catch (err) {
      console.error('Failed to process blog routes for sitemap:', err);
    }

    // Add dynamic product routes
    try {
      console.log('Fetching products from Supabase...');
      const { data: products, error: productError } = await supabase
        .from('shop_products')
        .select('name');
      
      if (productError) {
        console.warn('Error fetching products from Supabase. Skipping product routes:', productError);
      } else if (products && products.length > 0) {
        for (const product of products) {
          if (!product.name) continue;
          const route = `/shop/${slugify(product.name)}`;
          
          xml += `  <url>\n`;
          xml += `    <loc>${SITE_URL}${route}</loc>\n`;
          xml += `    <lastmod>${date}</lastmod>\n`;
          xml += `    <changefreq>weekly</changefreq>\n`;
          xml += `    <priority>0.8</priority>\n`;
          xml += `  </url>\n`;
        }
      }
    } catch (err) {
      console.error('Failed to process product routes for sitemap:', err);
    }

    xml += `</urlset>`;

    const publicDir = path.join(__dirname, '..', 'public');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }

    fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), xml);
    console.log('Successfully generated sitemap.xml');

    // Write grounds cache to tmp folder
    const tmpDir = path.join(__dirname, '..', 'tmp');
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
    fs.writeFileSync(path.join(tmpDir, 'grounds-cache.json'), JSON.stringify(grounds, null, 2));
    console.log('Successfully cached grounds data to tmp/grounds-cache.json');

    // Generate robots.txt
    const robotsTxt = `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`;
    fs.writeFileSync(path.join(publicDir, 'robots.txt'), robotsTxt);
    console.log('Successfully generated robots.txt');

  } catch (err) {
    console.error('Error generating sitemap:', err);
  }
}

generateSitemap();
