import puppeteer from 'puppeteer';
import { createObjectCsvWriter } from 'csv-writer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
  startUrl: 'https://www.proveedores.com/alimentacion-y-bebidas/',
  maxPages: 10,
  delayBetweenRequests: 800,
  outputDir: path.join(__dirname, '..', 'output')
};

/**
 * Delays execution for a specified time
 * @param {number} ms - Milliseconds to wait
 */
async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Scrapes provider details from individual provider page
 * @param {Page} page - Puppeteer page instance
 * @param {string} url - Provider page URL
 * @returns {Object|null} Provider data or null if failed
 */
async function scrapeProviderPage(page, url) {
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await delay(1000);

    const data = await page.evaluate(() => {
      const wrap = document.querySelector('div.flex-1');
      if (!wrap) return null;

      // Company name
      const nameEl = wrap.querySelector('h1');
      const name = nameEl ? nameEl.textContent.trim() : '';

      // Extract contact information
      const allLis = wrap.querySelectorAll('li');
      let email = '';
      let whatsapp = '';
      const contacts = [];

      allLis.forEach(li => {
        const text = li.textContent.trim();
        
        // Email detection
        if (text.includes('@') && !email) {
          email = text;
        }
        
        // WhatsApp detection
        if (li.classList.contains('cwhats-small')) {
          whatsapp = text;
        }
        
        // Other contacts
        if (li.classList.contains('custom-inline-list')) {
          if (!text.includes('@') && !text.includes('https')) {
            contacts.push(text);
          }
        }
      });

      return {
        name,
        email,
        whatsapp,
        contacts: contacts.join(' | ')
      };
    });

    return data;
  } catch (error) {
    console.error(`Error scraping ${url}:`, error.message);
    return null;
  }
}

/**
 * Extracts provider links from listing page
 * @param {Page} page - Puppeteer page instance
 * @returns {string[]} Array of provider URLs
 */
async function getProviderLinks(page) {
  return await page.evaluate(() => {
    const links = document.querySelectorAll('a.duration-200');
    return Array.from(links)
      .map(link => link.href)
      .filter(href => href && href.startsWith('http'));
  });
}

/**
 * Navigates to the next pagination page
 * @param {Page} page - Puppeteer page instance
 * @returns {boolean} True if navigation successful
 */
async function goToNextPage(page) {
  try {
    const nextLink = await page.evaluate(() => {
      const links = document.querySelectorAll('a');
      for (const link of links) {
        if (link.textContent.includes('Siguiente')) {
          return link.href;
        }
      }
      return null;
    });

    if (nextLink) {
      await page.goto(nextLink, { waitUntil: 'networkidle2', timeout: 30000 });
      await delay(1500);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error navigating to next page:', error.message);
    return false;
  }
}

/**
 * Main scraper function
 */
async function main() {
  console.log('🚀 Starting web scraper...\n');
  
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });
  } catch (err) {
    console.error('Error launching browser:', err.message);
    process.exit(1);
  }

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  
  const allResults = [];
  const allProviderUrls = [];

  try {
    // Navigate to start page
    console.log('📄 Navigating to start page...');
    await page.goto(CONFIG.startUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await delay(2000);

    // Collect provider URLs from pagination
    for (let pageNum = 1; pageNum <= CONFIG.maxPages; pageNum++) {
      console.log(`\n📑 Processing page ${pageNum}/${CONFIG.maxPages}...`);
      
      const links = await getProviderLinks(page);
      console.log(`   Found ${links.length} providers on this page`);
      allProviderUrls.push(...links);

      if (pageNum < CONFIG.maxPages) {
        const hasNext = await goToNextPage(page);
        if (!hasNext) {
          console.log('   No more pages available');
          break;
        }
      }
    }

    console.log(`\n✅ Total URLs collected: ${allProviderUrls.length}`);
    console.log('\n🔍 Scraping each provider...\n');

    // Scrape each provider
    for (let i = 0; i < allProviderUrls.length; i++) {
      const url = allProviderUrls[i];
      console.log(`   [${i + 1}/${allProviderUrls.length}] Scraping: ${url}`);
      
      const data = await scrapeProviderPage(page, url);
      if (data) {
        allResults.push({
          url,
          ...data
        });
        console.log(`   ✓ ${data.name || 'No name'}`);
      }
      
      await delay(CONFIG.delayBetweenRequests);
    }

    // Save results to CSV
    console.log('\n💾 Saving results to CSV...');
    
    const csvWriter = createObjectCsvWriter({
      path: path.join(CONFIG.outputDir, 'providers.csv'),
      header: [
        { id: 'name', title: 'Name' },
        { id: 'email', title: 'Email' },
        { id: 'whatsapp', title: 'WhatsApp' },
        { id: 'contacts', title: 'Contacts' },
        { id: 'url', title: 'URL' }
      ]
    });

    await csvWriter.writeRecords(allResults);
    
    console.log(`\n🎉 Complete! Scraped ${allResults.length} providers.`);
    console.log(`📁 File saved: output/providers.csv`);

  } catch (error) {
    console.error('General error:', error);
  } finally {
    await browser.close();
  }
}

main();

