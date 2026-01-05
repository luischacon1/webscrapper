import puppeteer from 'puppeteer';
import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Current category configuration
const CONFIG = {
  category: { name: 'Alimentos Dietéticos', url: 'https://www.proveedores.com/alimentos-dieteticos/' },
  startPage: 1,
  maxPages: 100,
  delayBetweenRequests: 600,
  outputDir: path.join(__dirname, '..', 'output'),
  statusFile: path.join(__dirname, '..', 'output', 'status.json'),
  outputFile: 'alimentos_dieteticos.xlsx'
};

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function updateStatus(status) {
  fs.writeFileSync(CONFIG.statusFile, JSON.stringify(status, null, 2));
}

async function scrapeProviderPage(page, url) {
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await delay(800);

    const data = await page.evaluate(() => {
      const wrap = document.querySelector('div.flex-1');
      if (!wrap) return null;

      const nameEl = wrap.querySelector('h1');
      const name = nameEl ? nameEl.textContent.trim() : '';

      const allLis = wrap.querySelectorAll('li');
      let email = '';
      let whatsapp = '';
      const contacts = [];

      allLis.forEach(li => {
        const text = li.textContent.trim();
        if (text.includes('@') && !email) email = text;
        if (li.classList.contains('cwhats-small')) whatsapp = text;
        if (li.classList.contains('custom-inline-list')) {
          if (!text.includes('@') && !text.includes('https')) contacts.push(text);
        }
      });

      let sede = '';
      const spanishProvinces = [
        'A Coruña', 'Álava', 'Albacete', 'Alicante', 'Almería', 'Asturias', 'Ávila',
        'Badajoz', 'Barcelona', 'Burgos', 'Cáceres', 'Cádiz', 'Cantabria', 'Castellón',
        'Ceuta', 'Ciudad Real', 'Córdoba', 'Cuenca', 'Girona', 'Granada', 'Guadalajara',
        'Guipúzcoa', 'Gipuzkoa', 'Huelva', 'Huesca', 'Islas Baleares', 'Baleares', 'Jaén',
        'La Rioja', 'Las Palmas', 'León', 'Lleida', 'Lérida', 'Lugo', 'Madrid', 'Málaga',
        'Melilla', 'Murcia', 'Navarra', 'Ourense', 'Orense', 'Palencia', 'Pontevedra',
        'Salamanca', 'Segovia', 'Sevilla', 'Soria', 'Tarragona', 'Tenerife',
        'Santa Cruz de Tenerife', 'Teruel', 'Toledo', 'Valencia', 'Valladolid',
        'Vizcaya', 'Bizkaia', 'Zamora', 'Zaragoza'
      ];

      const fullText = document.body.innerText;
      for (const province of spanishProvinces) {
        if (fullText.includes(province)) {
          sede = province;
          break;
        }
      }

      const detectedTypes = [];
      const pageText = document.body.innerText.toLowerCase();

      if (pageText.includes('distribuidor') || pageText.includes('mayorista')) detectedTypes.push('Distribuidores mayoristas');
      if (pageText.includes('dropshipping')) detectedTypes.push('Dropshipping');
      if (pageText.includes('exportador') || pageText.includes('exportamos') || pageText.includes('export')) detectedTypes.push('Exportadores');
      if (pageText.includes('fabricante') || pageText.includes('fabricamos') || pageText.includes('elaboramos')) detectedTypes.push('Fabricantes');
      if (pageText.includes('importador') || pageText.includes('importamos') || pageText.includes('import')) detectedTypes.push('Importadores');

      const typeLinks = document.querySelectorAll('a[href*="_t/"]');
      typeLinks.forEach(link => {
        const href = link.href.toLowerCase();
        if (href.includes('distribuidores-mayoristas') && !detectedTypes.includes('Distribuidores mayoristas')) detectedTypes.push('Distribuidores mayoristas');
        if (href.includes('dropshipping') && !detectedTypes.includes('Dropshipping')) detectedTypes.push('Dropshipping');
        if (href.includes('exportadores') && !detectedTypes.includes('Exportadores')) detectedTypes.push('Exportadores');
        if (href.includes('fabricantes') && !detectedTypes.includes('Fabricantes')) detectedTypes.push('Fabricantes');
        if (href.includes('importadores') && !detectedTypes.includes('Importadores')) detectedTypes.push('Importadores');
      });

      return { name, email, whatsapp, contacts: contacts.join(' | '), sede, providerType: detectedTypes.join(', ') };
    });

    return data;
  } catch (error) {
    return null;
  }
}

async function getProviderLinks(page) {
  return await page.evaluate(() => {
    const links = document.querySelectorAll('a.duration-200');
    return Array.from(links).map(link => link.href).filter(href => href && href.startsWith('http'));
  });
}

async function getTotalPages(page) {
  return await page.evaluate(() => {
    // Look for pagination links to find the last page number
    const paginationLinks = document.querySelectorAll('a[href*="page="]');
    let maxPage = 1;
    
    paginationLinks.forEach(link => {
      const match = link.href.match(/page=(\d+)/);
      if (match) {
        const pageNum = parseInt(match[1]);
        if (pageNum > maxPage) maxPage = pageNum;
      }
    });
    
    // Also check text content for "Última" or last page indicator
    const allLinks = document.querySelectorAll('a');
    allLinks.forEach(link => {
      const text = link.textContent.trim();
      if (/^\d+$/.test(text)) {
        const num = parseInt(text);
        if (num > maxPage) maxPage = num;
      }
    });
    
    return maxPage;
  });
}

async function main() {
  console.log(`🚀 Scraping: ${CONFIG.category.name}...\n`);

  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  }

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
    });
  } catch (err) {
    console.error('Error launching browser:', err.message);
    process.exit(1);
  }

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

  const allResults = [];

  try {
    console.log(`📂 Category: ${CONFIG.category.name}`);
    console.log(`🔗 URL: ${CONFIG.category.url}\n`);

    await page.goto(CONFIG.category.url, { waitUntil: 'networkidle2', timeout: 30000 });
    await delay(2000);

    // Detect total pages FIRST
    const detectedPages = await getTotalPages(page);
    const totalPages = Math.min(detectedPages, CONFIG.maxPages);
    
    console.log(`📊 Detected ${detectedPages} pages (will scrape up to ${totalPages})\n`);
    
    updateStatus({ status: 'starting', category: CONFIG.category.name, currentPage: 0, totalPages: totalPages, providersScraped: 0, lastProvider: '' });

    for (let pageNum = CONFIG.startPage; pageNum <= totalPages; pageNum++) {
      console.log(`\n📑 PAGE ${pageNum}/${totalPages}`);
      updateStatus({
        status: 'scraping',
        category: CONFIG.category.name,
        currentPage: pageNum,
        totalPages: totalPages,
        providersScraped: allResults.length,
        lastProvider: allResults[allResults.length - 1]?.name || ''
      });

      const links = await getProviderLinks(page);

      if (links.length === 0) {
        console.log('   ⚠️ No providers found - end of category');
        break;
      }

      console.log(`   Found ${links.length} providers`);

      for (let i = 0; i < links.length; i++) {
        const url = links[i];
        const data = await scrapeProviderPage(page, url);

        if (data) {
          allResults.push({
            name: data.name,
            email: data.email,
            whatsapp: data.whatsapp,
            contacts: data.contacts,
            sede: data.sede,
            providerType: data.providerType,
            category: CONFIG.category.name,
            url
          });
          console.log(`   [${i + 1}/${links.length}] ✓ ${data.name}`);

          updateStatus({
            status: 'scraping',
            category: CONFIG.category.name,
            currentPage: pageNum,
            totalPages: totalPages,
            providersScraped: allResults.length,
            lastProvider: data.name
          });
        }

        await delay(CONFIG.delayBetweenRequests);
      }

      // Save after each page
      saveToExcel(allResults);
      console.log(`   💾 Saved ${allResults.length} total providers`);

      // Go to next page
      if (pageNum < totalPages) {
        const nextUrl = `${CONFIG.category.url}?page=${pageNum + 1}`;
        try {
          await page.goto(nextUrl, { waitUntil: 'networkidle2', timeout: 30000 });
          await delay(1500);
        } catch (e) {
          console.log('   ⚠️ Could not navigate to next page');
          break;
        }
      }
    }

    updateStatus({
      status: 'completed',
      category: CONFIG.category.name,
      currentPage: totalPages,
      totalPages: totalPages,
      providersScraped: allResults.length,
      lastProvider: allResults[allResults.length - 1]?.name || ''
    });

    console.log(`\n🎉 COMPLETE! ${CONFIG.category.name}: ${allResults.length} providers`);

  } catch (error) {
    console.error('Error:', error);
    updateStatus({ status: 'error', error: error.message });
  } finally {
    await browser.close();
  }
}

function saveToExcel(results) {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(results.map(r => ({
    'Name': r.name,
    'Email': r.email,
    'WhatsApp': r.whatsapp,
    'Contacts': r.contacts,
    'SEDE': r.sede,
    'Tipo de Proveedor': r.providerType,
    'Category': r.category,
    'URL': r.url
  })));

  worksheet['!cols'] = [
    { wch: 40 }, { wch: 35 }, { wch: 18 }, { wch: 30 },
    { wch: 20 }, { wch: 45 }, { wch: 20 }, { wch: 55 }
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Proveedores');
  XLSX.writeFile(workbook, path.join(CONFIG.outputDir, CONFIG.outputFile));
}

main();

