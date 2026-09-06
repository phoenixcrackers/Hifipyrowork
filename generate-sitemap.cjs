// generate-sitemap.js

const { SitemapStream, streamToPromise } = require('sitemap');
const { createWriteStream } = require('fs');

(async () => {
  const sitemap = new SitemapStream({ hostname: 'https://www.hifipyropark.com' });

  const writeStream = createWriteStream('./public/sitemap.xml');
  sitemap.pipe(writeStream);

  // Define your routes here (extracted from router.jsx)
  const pages = [
    '/',
    '/admin',
    '/dealers',
    '/report',
    '/booking',
  ];

  pages.forEach(page => {
    sitemap.write({ url: page, changefreq: 'weekly', priority: 0.8 });
  });

  sitemap.end();

  await streamToPromise(sitemap);
  console.log('✅ Sitemap generated successfully at public/sitemap.xml');
})();