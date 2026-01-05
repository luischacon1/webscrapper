import puppeteer from 'puppeteer';
import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG = {
  category: { name: 'Aceite', url: 'https://www.proveedores.com/aceite/' },
  startPage: 3,
  maxPages: 61,
  delayBetweenRequests: 600,
  outputDir: path.join(__dirname, '..', 'output'),
  statusFile: path.join(__dirname, '..', 'output', 'status.json')
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

async function main() {
  console.log('🚀 Continuing scraper for Aceite - Pages 3 to 61...\n');

  // Load existing data
  let existingData = [];
  const existingFile = path.join(CONFIG.outputDir, 'aceite_test.xlsx');
  if (fs.existsSync(existingFile)) {
    const workbook = XLSX.readFile(existingFile);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    existingData = XLSX.utils.sheet_to_json(sheet);
    console.log(`📂 Loaded ${existingData.length} existing records\n`);
  }

  updateStatus({ status: 'starting', currentPage: 0, totalPages: CONFIG.maxPages, providersScraped: existingData.length, lastProvider: '' });

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

  const allResults = existingData.map(r => ({
    name: r.Name || '',
    email: r.Email || '',
    whatsapp: r.WhatsApp || '',
    contacts: r.Contacts || '',
    sede: r.SEDE || '',
    providerType: r['Tipo de Proveedor'] || '',
    category: r.Category || 'Aceite',
    url: r.URL || ''
  }));

  try {
    // Go to start page directly
    const startUrl = `${CONFIG.category.url}?page=${CONFIG.startPage}`;
    console.log(`📄 Starting from page ${CONFIG.startPage}...`);
    await page.goto(startUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await delay(2000);

    for (let pageNum = CONFIG.startPage; pageNum <= CONFIG.maxPages; pageNum++) {
      console.log(`\n📑 PAGE ${pageNum}/${CONFIG.maxPages}`);
      updateStatus({ 
        status: 'scraping', 
        currentPage: pageNum, 
        totalPages: CONFIG.maxPages, 
        providersScraped: allResults.length,
        lastProvider: allResults[allResults.length - 1]?.name || ''
      });

      const links = await getProviderLinks(page);
      
      if (links.length === 0) {
        console.log('   ⚠️ No providers found - might be last page');
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
          console.log(`   [${i+1}/${links.length}] ✓ ${data.name}`);
          
          updateStatus({ 
            status: 'scraping', 
            currentPage: pageNum, 
            totalPages: CONFIG.maxPages, 
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
      if (pageNum < CONFIG.maxPages) {
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
      currentPage: CONFIG.maxPages, 
      totalPages: CONFIG.maxPages, 
      providersScraped: allResults.length,
      lastProvider: allResults[allResults.length - 1]?.name || ''
    });

    console.log(`\n🎉 COMPLETE! Total: ${allResults.length} providers`);

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
    { wch: 20 }, { wch: 45 }, { wch: 15 }, { wch: 55 }
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Proveedores');
  XLSX.writeFile(workbook, path.join(CONFIG.outputDir, 'aceite_test.xlsx'));
}

main();

