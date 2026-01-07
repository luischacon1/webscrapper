#!/usr/bin/env node

/**
 * SCRAPER DE PROVEEDORES.COM
 * Script principal para extraer leads de cualquier categoría
 * 
 * Uso:
 *   node scrape.js <URL_CATEGORIA>
 * 
 * Ejemplo:
 *   node scrape.js https://www.proveedores.com/verduras/
 */

import puppeteer from 'puppeteer';
import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
  PARALLEL_TABS: 2,        // Number of parallel tabs (2 to avoid detection)
  DELAY_MS: 800,           // Delay between batches
  TIMEOUT: 45000,          // Page load timeout
  RETRY_ATTEMPTS: 3,       // Retry attempts per URL
  OUTPUT_DIR: path.join(__dirname, 'output')
};

// User agents para rotar y evitar detección
const USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0'
];

const delay = ms => new Promise(r => setTimeout(r, ms));

/**
 * Configura una página con técnicas anti-detección
 */
async function setupPage(page) {
  const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  await page.setUserAgent(userAgent);
  
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Cache-Control': 'max-age=0'
  });

  const viewports = [
    { width: 1920, height: 1080 },
    { width: 1366, height: 768 },
    { width: 1440, height: 900 },
    { width: 1536, height: 864 }
  ];
  const viewport = viewports[Math.floor(Math.random() * viewports.length)];
  await page.setViewport(viewport);

  // Ocultar marcadores de automatización
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    Object.defineProperty(navigator, 'languages', { get: () => ['es-ES', 'es', 'en-US', 'en'] });
    window.chrome = { runtime: {} };
    const originalQuery = window.navigator.permissions.query;
    window.navigator.permissions.query = (parameters) => (
      parameters.name === 'notifications' ?
        Promise.resolve({ state: Notification.permission }) :
        originalQuery(parameters)
    );
  });
}

/**
 * Extrae datos de un proveedor individual
 */
async function scrapeProvider(page, url, attempt = 1) {
  try {
    await delay(Math.random() * 1000 + 500);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: CONFIG.TIMEOUT });
    await page.evaluate(() => window.scrollBy(0, Math.random() * 500));
    await delay(800 + Math.random() * 400);

    // Verificar errores de Cloudflare
    const hasError = await page.evaluate(() => {
      const bodyText = document.body.innerText;
      return bodyText.includes('Error 1015') || 
             bodyText.includes('Access denied') ||
             bodyText.includes('Ray ID') ||
             document.querySelector('.cf-error-details');
    });

    if (hasError && attempt < CONFIG.RETRY_ATTEMPTS) {
      await delay(3000 * attempt);
      return await scrapeProvider(page, url, attempt + 1);
    }

    if (hasError) return null;

    // Extraer datos
    const data = await page.evaluate(() => {
      let name = '';
      const wrap = document.querySelector('div.flex-1');
      if (wrap) name = wrap.querySelector('h1')?.textContent?.trim() || '';
      if (!name) {
        const h1 = document.querySelector('h1');
        if (h1) name = h1.textContent?.trim() || '';
      }
      if (!name) {
        const title = document.title;
        if (title && !title.includes('proveedores.com')) {
          name = title.split('|')[0].trim();
        }
      }
      if (!name) return null;
      
      let email = '', whatsapp = '';
      const contacts = [];
      const allText = document.body.innerText;
      const emailMatch = allText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      if (emailMatch) email = emailMatch[0];

      document.querySelectorAll('li').forEach(li => {
        const text = li.textContent.trim();
        if (text.includes('@') && !email) email = text;
        if (li.classList.contains('cwhats-small')) whatsapp = text;
        if (li.classList.contains('custom-inline-list') && !text.includes('@') && !text.includes('https')) {
          contacts.push(text);
        }
      });

      document.querySelectorAll('a[href*="wa.me"], a[href*="whatsapp"]').forEach(a => {
        if (!whatsapp) {
          const href = a.href;
          const match = href.match(/(\+?\d{10,15})/);
          if (match) whatsapp = match[1];
        }
      });

      let sede = '';
      const provinces = ['A Coruña','Álava','Albacete','Alicante','Almería','Asturias','Ávila','Badajoz','Barcelona','Burgos','Cáceres','Cádiz','Cantabria','Castellón','Ceuta','Ciudad Real','Córdoba','Cuenca','Girona','Granada','Guadalajara','Guipúzcoa','Huelva','Huesca','Baleares','Jaén','La Rioja','Las Palmas','León','Lleida','Lugo','Madrid','Málaga','Melilla','Murcia','Navarra','Ourense','Palencia','Pontevedra','Salamanca','Segovia','Sevilla','Soria','Tarragona','Tenerife','Teruel','Toledo','Valencia','Valladolid','Vizcaya','Zamora','Zaragoza'];
      for (const p of provinces) { 
        if (allText.includes(p)) { 
          sede = p; 
          break; 
        } 
      }

      const types = [];
      const pageText = allText.toLowerCase();
      if (pageText.includes('distribuidor') || pageText.includes('mayorista')) types.push('Distribuidores mayoristas');
      if (pageText.includes('dropshipping')) types.push('Dropshipping');
      if (pageText.includes('exportador') || pageText.includes('exportamos')) types.push('Exportadores');
      if (pageText.includes('fabricante') || pageText.includes('fabricamos')) types.push('Fabricantes');
      if (pageText.includes('importador') || pageText.includes('importamos')) types.push('Importadores');

      const phoneRegex = /(\+34\s?)?[96]\d{2}\s?\d{2}\s?\d{2}\s?\d{2}/g;
      const phones = allText.match(phoneRegex);
      if (phones && phones.length > 0) {
        contacts.push(...phones.slice(0, 3));
      }

      return { 
        name, 
        email, 
        whatsapp, 
        contacts: contacts.filter((v, i, a) => a.indexOf(v) === i).join(' | '),
        sede, 
        providerType: types.join(', ') 
      };
    });
    
    return data;
  } catch (error) {
    if (attempt < CONFIG.RETRY_ATTEMPTS) {
      await delay(2000 * attempt);
      return await scrapeProvider(page, url, attempt + 1);
    }
    return null;
  }
}

/**
 * Obtiene los enlaces de proveedores de una página
 */
async function getProviderLinks(page) {
  return page.evaluate(() => 
    Array.from(document.querySelectorAll('a.duration-200')).map(a => a.href).filter(h => h.startsWith('http'))
  );
}

/**
 * Obtiene el número total de páginas
 */
async function getTotalPages(page) {
  return page.evaluate(() => {
    let max = 1;
    document.querySelectorAll('a').forEach(a => {
      const m = a.href?.match(/page=(\d+)/);
      if (m) max = Math.max(max, parseInt(m[1]));
      if (/^\d+$/.test(a.textContent.trim())) max = Math.max(max, parseInt(a.textContent.trim()));
    });
    return max;
  });
}

/**
 * Scrapea múltiples URLs en paralelo
 */
async function scrapeInParallel(browser, urls, category) {
  const results = [];
  const failed = [];
  const pages = [];
  
  for (let i = 0; i < CONFIG.PARALLEL_TABS; i++) {
    const page = await browser.newPage();
    await setupPage(page);
    pages.push(page);
  }

  for (let i = 0; i < urls.length; i += CONFIG.PARALLEL_TABS) {
    const batch = urls.slice(i, i + CONFIG.PARALLEL_TABS);
    const promises = batch.map((url, idx) => scrapeProvider(pages[idx], url));
    const batchResults = await Promise.all(promises);
    
    batchResults.forEach((data, idx) => {
      if (data && data.name) {
        results.push({
          Name: data.name,
          Email: data.email,
          WhatsApp: data.whatsapp,
          Contacts: data.contacts,
          SEDE: data.sede,
          'Tipo de Proveedor': data.providerType,
          Category: category,
          URL: batch[idx]
        });
      } else {
        failed.push(batch[idx]);
      }
    });

    process.stdout.write(`\r   ⏳ ${Math.min(i + CONFIG.PARALLEL_TABS, urls.length)}/${urls.length} | ✅ ${results.length} | ❌ ${failed.length}`);
    await delay(CONFIG.DELAY_MS + Math.random() * 500);
  }

  await Promise.all(pages.map(p => p.close()));
  return { results, failed };
}

/**
 * Guarda los resultados en Excel
 */
function saveResults(data, filename) {
  if (!fs.existsSync(CONFIG.OUTPUT_DIR)) fs.mkdirSync(CONFIG.OUTPUT_DIR, { recursive: true });
  
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);
  ws['!cols'] = [{wch:40},{wch:35},{wch:18},{wch:30},{wch:20},{wch:45},{wch:20},{wch:55}];
  XLSX.utils.book_append_sheet(wb, ws, 'Leads');
  
  const outputPath = path.join(CONFIG.OUTPUT_DIR, filename);
  XLSX.writeFile(wb, outputPath);
  
  return outputPath;
}

/**
 * Extrae el nombre de la categoría de la URL
 */
function getCategoryFromUrl(url) {
  const match = url.match(/proveedores\.com\/([^\/]+)\/?$/);
  if (match) {
    return match[1]
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
  return 'categoria';
}

/**
 * Función principal
 */
async function main() {
  const categoryUrl = process.argv[2];
  
  if (!categoryUrl) {
    console.error('❌ Error: Debes proporcionar una URL de categoría');
    console.log('\n📖 Uso: node scrape.js <URL_CATEGORIA>');
    console.log('\n📝 Ejemplo:');
    console.log('   node scrape.js https://www.proveedores.com/verduras/\n');
    process.exit(1);
  }

  const categoryName = getCategoryFromUrl(categoryUrl);
  const filename = `${categoryName.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}.xlsx`;

  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║     SCRAPER DE PROVEEDORES.COM - Modo Stealth        ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');
  console.log(`📂 Categoría: ${categoryName}`);
  console.log(`🔗 URL: ${categoryUrl}\n`);

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
      '--disable-blink-features=AutomationControlled'
    ]
  });

  const mainPage = await browser.newPage();
  await setupPage(mainPage);

  const startTime = Date.now();
  const allUrls = [];

  // Recopilar URLs
  console.log('🔍 Recopilando URLs...');
  await mainPage.goto(categoryUrl, { waitUntil: 'networkidle2', timeout: CONFIG.TIMEOUT });
  await delay(1500);
  
  const totalPages = await getTotalPages(mainPage);
  console.log(`📊 ${totalPages} páginas detectadas\n`);

  for (let p = 1; p <= totalPages; p++) {
    if (p > 1) {
      await mainPage.goto(`${categoryUrl}?page=${p}`, { waitUntil: 'networkidle2', timeout: CONFIG.TIMEOUT });
      await delay(1000);
    }
    
    const links = await getProviderLinks(mainPage);
    allUrls.push(...links);
    process.stdout.write(`\r   📄 Página ${p}/${totalPages} - ${allUrls.length} URLs recopiladas`);
  }

  console.log(`\n\n🔥 Iniciando scraping (${CONFIG.PARALLEL_TABS} tabs en paralelo)...\n`);

  const { results, failed } = await scrapeInParallel(browser, allUrls, categoryName);

  const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  
  console.log('\n\n╔════════════════════════════════════════════════════════╗');
  console.log('║                    RESULTADOS                         ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');
  console.log(`✅ Leads exitosos: ${results.length}`);
  console.log(`❌ URLs fallidas: ${failed.length}`);
  console.log(`⏱️  Tiempo total: ${elapsed} min`);
  console.log(`📊 Velocidad: ${(results.length / parseFloat(elapsed)).toFixed(1)} leads/min\n`);

  if (failed.length > 0) {
    const failedPath = path.join(CONFIG.OUTPUT_DIR, 'failed_urls.txt');
    fs.writeFileSync(failedPath, failed.join('\n'));
    console.log(`⚠️  URLs fallidas guardadas en: ${failedPath}\n`);
  }

  const outputPath = saveResults(results, filename);
  console.log(`💾 Archivo guardado: ${outputPath}\n`);

  await browser.close();

  // Abrir el archivo
  console.log('📂 Abriendo archivo Excel...');
  const { exec } = await import('child_process');
  exec(`open "${outputPath}"`, (error) => {
    if (!error) console.log('✅ Excel abierto correctamente\n');
    console.log('🎉 ¡Scraping completado!\n');
    process.exit(0);
  });
}

main().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});

