import puppeteer from 'puppeteer';
import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const outputDir = path.join(__dirname, '..', 'output');
const categoryDir = path.join(__dirname, '..', 'FMCG_Leads_Por_Categoria');
const statusFile = path.join(outputDir, 'status.json');

// TURBO CONFIG
const PARALLEL_TABS = 2; // Reducido para evitar detección de Cloudflare
const DELAY_MS = 800; // Aumentado para parecer más humano
const TIMEOUT = 45000; // Aumentado para dar más tiempo a cargar
const RETRY_ATTEMPTS = 3; // Reintentos por URL

// User agents reales para rotar
const USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0'
];

// Remaining categories (starting from Carne - #11)
const CATEGORIES = [
  { num: 11, name: 'Carne', url: 'https://www.proveedores.com/carne/', file: 'carne.xlsx' },
  { num: 12, name: 'Cestas y Lotes de Navidad', url: 'https://www.proveedores.com/cestas-y-lotes-de-navidad/', file: 'cestas_navidad.xlsx' },
  { num: 13, name: 'Chocolate y Dulces', url: 'https://www.proveedores.com/chocolate-y-dulces/', file: 'chocolate_dulces.xlsx' },
  { num: 14, name: 'Condimentos Hierbas y Especias', url: 'https://www.proveedores.com/condimentos-hierbas-y-especias/', file: 'condimentos.xlsx' },
  { num: 15, name: 'Congelados', url: 'https://www.proveedores.com/congelados/', file: 'congelados.xlsx' },
  { num: 16, name: 'Conservas', url: 'https://www.proveedores.com/conservas/', file: 'conservas.xlsx' },
  { num: 17, name: 'Delicatessen', url: 'https://www.proveedores.com/delicatessen/', file: 'delicatessen.xlsx' },
  { num: 18, name: 'Derivados de Cereales', url: 'https://www.proveedores.com/derivados-de-cereales/', file: 'derivados_cereales.xlsx' },
  { num: 19, name: 'Derivados de la Fruta', url: 'https://www.proveedores.com/derivados-de-la-fruta/', file: 'derivados_fruta.xlsx' },
  { num: 20, name: 'Derivados de Legumbres', url: 'https://www.proveedores.com/derivados-de-legumbres/', file: 'derivados_legumbres.xlsx' },
  { num: 21, name: 'Embutidos Veganos', url: 'https://www.proveedores.com/embutidos-veganos/', file: 'embutidos_veganos.xlsx' },
  { num: 22, name: 'Frutas', url: 'https://www.proveedores.com/frutas/', file: 'frutas.xlsx' },
  { num: 23, name: 'Frutos Secos', url: 'https://www.proveedores.com/frutos-secos/', file: 'frutos_secos.xlsx' },
  { num: 24, name: 'Grasas', url: 'https://www.proveedores.com/grasas/', file: 'grasas.xlsx' },
  { num: 25, name: 'Hamburguesas Veganas', url: 'https://www.proveedores.com/hamburguesas-veganas/', file: 'hamburguesas_veganas.xlsx' },
  { num: 26, name: 'Hielo', url: 'https://www.proveedores.com/hielo/', file: 'hielo.xlsx' },
  { num: 27, name: 'Huevos', url: 'https://www.proveedores.com/huevos/', file: 'huevos.xlsx' },
  { num: 28, name: 'Ingredientes Alimentarios y Aromas', url: 'https://www.proveedores.com/ingredientes-alimentarios-y-aromas/', file: 'ingredientes.xlsx' },
  { num: 29, name: 'Legumbres', url: 'https://www.proveedores.com/legumbres/', file: 'legumbres.xlsx' },
  { num: 30, name: 'Miel', url: 'https://www.proveedores.com/miel/', file: 'miel.xlsx' },
  { num: 31, name: 'Panadería y Pastelería', url: 'https://www.proveedores.com/panaderia-y-pasteleria/', file: 'panaderia.xlsx' },
  { num: 32, name: 'Pescado y Marisco', url: 'https://www.proveedores.com/pescado-y-marisco/', file: 'pescado_marisco.xlsx' },
  { num: 33, name: 'Platos Precocinados', url: 'https://www.proveedores.com/platos-precocinados/', file: 'precocinados.xlsx' },
  { num: 34, name: 'Platos Preelaborados', url: 'https://www.proveedores.com/platos-preelaborados/', file: 'preelaborados.xlsx' },
  { num: 35, name: 'Postres', url: 'https://www.proveedores.com/postres/', file: 'postres.xlsx' },
  { num: 36, name: 'Productos de IV Gama', url: 'https://www.proveedores.com/productos-de-iv-gama/', file: 'iv_gama.xlsx' },
  { num: 37, name: 'Productos Lácteos', url: 'https://www.proveedores.com/productos-lacteos/', file: 'lacteos.xlsx' },
  { num: 38, name: 'Semillas Comestibles', url: 'https://www.proveedores.com/semillas-comestibles/', file: 'semillas.xlsx' },
  { num: 39, name: 'Té e Infusiones', url: 'https://www.proveedores.com/te-e-infusiones/', file: 'te_infusiones.xlsx' },
  { num: 40, name: 'Toppings', url: 'https://www.proveedores.com/toppings/', file: 'toppings.xlsx' },
  { num: 41, name: 'Verduras', url: 'https://www.proveedores.com/verduras/', file: 'verduras.xlsx' }
];

const delay = ms => new Promise(r => setTimeout(r, ms));

function updateStatus(data) {
  fs.writeFileSync(statusFile, JSON.stringify(data, null, 2));
}

async function setupPage(page) {
  const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  await page.setUserAgent(userAgent);
  
  // Headers adicionales para parecer más humano
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

  // Configurar viewport aleatorio
  const viewports = [
    { width: 1920, height: 1080 },
    { width: 1366, height: 768 },
    { width: 1440, height: 900 },
    { width: 1536, height: 864 }
  ];
  const viewport = viewports[Math.floor(Math.random() * viewports.length)];
  await page.setViewport(viewport);

  // Ocultar que es un navegador automatizado
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', {
      get: () => false,
    });
    Object.defineProperty(navigator, 'plugins', {
      get: () => [1, 2, 3, 4, 5],
    });
    Object.defineProperty(navigator, 'languages', {
      get: () => ['es-ES', 'es', 'en-US', 'en'],
    });
    window.chrome = {
      runtime: {},
    };
    const originalQuery = window.navigator.permissions.query;
    window.navigator.permissions.query = (parameters) => (
      parameters.name === 'notifications' ?
        Promise.resolve({ state: Notification.permission }) :
        originalQuery(parameters)
    );
  });
}

async function scrapeProvider(page, url, attempt = 1) {
  try {
    // Delay aleatorio antes de cada request para parecer más humano
    await delay(Math.random() * 1000 + 500);

    await page.goto(url, { waitUntil: 'networkidle2', timeout: TIMEOUT });
    
    // Simular comportamiento humano: scroll
    await page.evaluate(() => {
      window.scrollBy(0, Math.random() * 500);
    });
    
    await delay(800 + Math.random() * 400);

    // Verificar si hay error de Cloudflare
    const hasError = await page.evaluate(() => {
      const bodyText = document.body.innerText;
      return bodyText.includes('Error 1015') || 
             bodyText.includes('Access denied') ||
             bodyText.includes('Ray ID') ||
             document.querySelector('.cf-error-details');
    });

    if (hasError && attempt < RETRY_ATTEMPTS) {
      await delay(3000 * attempt);
      return await scrapeProvider(page, url, attempt + 1);
    }

    if (hasError) {
      return null;
    }

    return await page.evaluate(() => {
      // Intentar múltiples selectores para el nombre
      let name = '';
      
      // Intento 1: div.flex-1 h1
      const wrap = document.querySelector('div.flex-1');
      if (wrap) {
        name = wrap.querySelector('h1')?.textContent?.trim() || '';
      }
      
      // Intento 2: Cualquier h1 en la página
      if (!name) {
        const h1 = document.querySelector('h1');
        if (h1) name = h1.textContent?.trim() || '';
      }
      
      // Intento 3: title de la página
      if (!name) {
        const title = document.title;
        if (title && !title.includes('proveedores.com')) {
          name = title.split('|')[0].trim();
        }
      }
      
      if (!name) return null;
      
      let email = '', whatsapp = '';
      const contacts = [];

      // Buscar email en toda la página
      const allText = document.body.innerText;
      const emailMatch = allText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      if (emailMatch) email = emailMatch[0];

      // Buscar en listas
      document.querySelectorAll('li').forEach(li => {
        const text = li.textContent.trim();
        if (text.includes('@') && !email) email = text;
        if (li.classList.contains('cwhats-small')) whatsapp = text;
        if (li.classList.contains('custom-inline-list') && !text.includes('@') && !text.includes('https')) {
          contacts.push(text);
        }
      });

      // Buscar WhatsApp en enlaces
      document.querySelectorAll('a[href*="wa.me"], a[href*="whatsapp"]').forEach(a => {
        if (!whatsapp) {
          const href = a.href;
          const match = href.match(/(\+?\d{10,15})/);
          if (match) whatsapp = match[1];
        }
      });

      let sede = '';
      const provinces = ['A Coruña','Álava','Albacete','Alicante','Almería','Asturias','Ávila','Badajoz','Barcelona','Burgos','Cáceres','Cádiz','Cantabria','Castellón','Ceuta','Ciudad Real','Córdoba','Cuenca','Girona','Granada','Guadalajara','Guipúzcoa','Huelva','Huesca','Baleares','Jaén','La Rioja','Las Palmas','León','Lleida','Lugo','Madrid','Málaga','Melilla','Murcia','Navarra','Ourense','Palencia','Pontevedra','Salamanca','Segovia','Sevilla','Soria','Tarragona','Tenerife','Teruel','Toledo','Valencia','Valladolid','Vizcaya','Zamora','Zaragoza'];
      const fullText = document.body.innerText;
      for (const p of provinces) { 
        if (fullText.includes(p)) { 
          sede = p; 
          break; 
        } 
      }

      const types = [];
      const pageText = fullText.toLowerCase();
      if (pageText.includes('distribuidor') || pageText.includes('mayorista')) types.push('Distribuidores mayoristas');
      if (pageText.includes('dropshipping')) types.push('Dropshipping');
      if (pageText.includes('exportador') || pageText.includes('exportamos')) types.push('Exportadores');
      if (pageText.includes('fabricante') || pageText.includes('fabricamos')) types.push('Fabricantes');
      if (pageText.includes('importador') || pageText.includes('importamos')) types.push('Importadores');

      // Intentar extraer teléfonos de contacto
      const phoneRegex = /(\+34\s?)?[96]\d{2}\s?\d{2}\s?\d{2}\s?\d{2}/g;
      const phones = fullText.match(phoneRegex);
      if (phones && phones.length > 0) {
        contacts.push(...phones.slice(0, 3)); // Máximo 3 teléfonos
      }

      return { 
        name, 
        email, 
        whatsapp, 
        contacts: contacts.filter((v, i, a) => a.indexOf(v) === i).join(' | '), // Eliminar duplicados
        sede, 
        providerType: types.join(', ') 
      };
    });
    
    return data;
  } catch (error) {
    if (attempt < RETRY_ATTEMPTS) {
      await delay(2000 * attempt);
      return await scrapeProvider(page, url, attempt + 1);
    }
    return null;
  }
}

async function getProviderLinks(page) {
  return page.evaluate(() => 
    Array.from(document.querySelectorAll('a.duration-200')).map(a => a.href).filter(h => h.startsWith('http'))
  );
}

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

async function scrapeInParallel(browser, urls, category) {
  const results = [];
  const pages = [];
  
  // Crear páginas con configuración anti-detección
  for (let i = 0; i < PARALLEL_TABS; i++) {
    const page = await browser.newPage();
    await setupPage(page);
    pages.push(page);
  }

  for (let i = 0; i < urls.length; i += PARALLEL_TABS) {
    const batch = urls.slice(i, i + PARALLEL_TABS);
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
      }
    });

    // Delay extra entre batches con componente aleatorio
    await delay(DELAY_MS + Math.random() * 500);
  }

  await Promise.all(pages.map(p => p.close()));
  return results;
}

function saveCategory(data, filename, catNum, catName) {
  // Save individual file
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);
  ws['!cols'] = [{wch:40},{wch:35},{wch:18},{wch:30},{wch:20},{wch:45},{wch:20},{wch:55}];
  XLSX.utils.book_append_sheet(wb, ws, 'Leads');
  XLSX.writeFile(wb, path.join(outputDir, filename));
  
  // Copy to category folder
  const numStr = catNum.toString().padStart(2, '0');
  const safeName = catName.replace(/[^a-zA-Z0-9]/g, '_');
  fs.copyFileSync(path.join(outputDir, filename), path.join(categoryDir, `${numStr}_${safeName}.xlsx`));
}

function updateConsolidated() {
  const files = fs.readdirSync(outputDir).filter(f => f.endsWith('.xlsx') && f !== 'FMCG_leads_byluis.xlsx');
  let allData = [];
  
  for (const file of files) {
    try {
      const wb = XLSX.readFile(path.join(outputDir, file));
      const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
      allData = allData.concat(data);
    } catch {}
  }

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(allData);
  ws['!cols'] = [{wch:40},{wch:35},{wch:18},{wch:30},{wch:20},{wch:45},{wch:20},{wch:55}];
  XLSX.utils.book_append_sheet(wb, ws, 'Leads');
  XLSX.writeFile(wb, path.join(outputDir, 'FMCG_leads_byluis.xlsx'));
  XLSX.writeFile(wb, path.join(categoryDir, 'TODOS_CONSOLIDADO.xlsx'));
  
  return allData.length;
}

async function main() {
  console.log('🚀 TURBO SCRAPER - 4x Parallel Mode\n');
  
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  if (!fs.existsSync(categoryDir)) fs.mkdirSync(categoryDir, { recursive: true });

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

  for (const cat of CATEGORIES) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`⚡ [${cat.num}/41] ${cat.name}`);
    console.log(`${'='.repeat(60)}`);

    const startTime = Date.now();
    const allUrls = [];

    // Get all provider URLs
    await mainPage.goto(cat.url, { waitUntil: 'networkidle2', timeout: TIMEOUT });
    await delay(1500);
    
    const totalPages = await getTotalPages(mainPage);
    console.log(`📊 ${totalPages} pages detected`);

    for (let p = 1; p <= totalPages; p++) {
      updateStatus({
        status: 'collecting_urls',
        category: cat.name,
        categoryNum: cat.num,
        currentPage: p,
        totalPages,
        urlsCollected: allUrls.length
      });

      if (p > 1) {
        await mainPage.goto(`${cat.url}?page=${p}`, { waitUntil: 'networkidle2', timeout: TIMEOUT });
        await delay(1000);
      }
      
      const links = await getProviderLinks(mainPage);
      allUrls.push(...links);
      process.stdout.write(`\r   Collecting URLs: ${allUrls.length} (page ${p}/${totalPages})`);
    }

    console.log(`\n   Total URLs: ${allUrls.length}`);
    console.log(`\n🔥 Scraping in parallel (${PARALLEL_TABS} tabs)...`);

    updateStatus({
      status: 'scraping_parallel',
      category: cat.name,
      categoryNum: cat.num,
      totalUrls: allUrls.length,
      providersScraped: 0
    });

    // Scrape in parallel
    const results = await scrapeInParallel(browser, allUrls, cat.name);

    const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
    console.log(`\n✅ ${cat.name}: ${results.length} providers in ${elapsed} min`);

    // Save category
    saveCategory(results, cat.file, cat.num, cat.name);
    console.log(`💾 Saved: ${cat.file}`);

    // Update consolidated
    const total = updateConsolidated();
    console.log(`📊 Total consolidated: ${total} leads`);

    updateStatus({
      status: 'category_complete',
      category: cat.name,
      categoryNum: cat.num,
      providersScraped: results.length,
      totalConsolidated: total,
      timeMinutes: elapsed
    });
  }

  await browser.close();

  updateStatus({ status: 'ALL_COMPLETE', totalCategories: 41 });
  console.log('\n🎉 ALL CATEGORIES COMPLETE!');
}

main().catch(console.error);

