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
const PARALLEL_TABS = 4;
const DELAY_MS = 150;
const TIMEOUT = 20000;

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

async function scrapeProvider(page, url) {
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });
    await delay(100);

    return await page.evaluate(() => {
      const wrap = document.querySelector('div.flex-1');
      if (!wrap) return null;

      const name = wrap.querySelector('h1')?.textContent?.trim() || '';
      let email = '', whatsapp = '';
      const contacts = [];

      wrap.querySelectorAll('li').forEach(li => {
        const text = li.textContent.trim();
        if (text.includes('@') && !email) email = text;
        if (li.classList.contains('cwhats-small')) whatsapp = text;
        if (li.classList.contains('custom-inline-list') && !text.includes('@') && !text.includes('https')) {
          contacts.push(text);
        }
      });

      let sede = '';
      const provinces = ['A Coruña','Álava','Albacete','Alicante','Almería','Asturias','Ávila','Badajoz','Barcelona','Burgos','Cáceres','Cádiz','Cantabria','Castellón','Ceuta','Ciudad Real','Córdoba','Cuenca','Girona','Granada','Guadalajara','Guipúzcoa','Huelva','Huesca','Baleares','Jaén','La Rioja','Las Palmas','León','Lleida','Lugo','Madrid','Málaga','Melilla','Murcia','Navarra','Ourense','Palencia','Pontevedra','Salamanca','Segovia','Sevilla','Soria','Tarragona','Tenerife','Teruel','Toledo','Valencia','Valladolid','Vizcaya','Zamora','Zaragoza'];
      const fullText = document.body.innerText;
      for (const p of provinces) { if (fullText.includes(p)) { sede = p; break; } }

      const types = [];
      const pageText = fullText.toLowerCase();
      if (pageText.includes('distribuidor') || pageText.includes('mayorista')) types.push('Distribuidores mayoristas');
      if (pageText.includes('dropshipping')) types.push('Dropshipping');
      if (pageText.includes('exportador') || pageText.includes('exportamos')) types.push('Exportadores');
      if (pageText.includes('fabricante') || pageText.includes('fabricamos')) types.push('Fabricantes');
      if (pageText.includes('importador') || pageText.includes('importamos')) types.push('Importadores');

      return { name, email, whatsapp, contacts: contacts.join(' | '), sede, providerType: types.join(', ') };
    });
  } catch { return null; }
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
  const pages = await Promise.all(Array(PARALLEL_TABS).fill().map(() => browser.newPage()));
  
  for (const p of pages) {
    await p.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
  }

  for (let i = 0; i < urls.length; i += PARALLEL_TABS) {
    const batch = urls.slice(i, i + PARALLEL_TABS);
    const promises = batch.map((url, idx) => scrapeProvider(pages[idx], url));
    const batchResults = await Promise.all(promises);
    
    batchResults.forEach((data, idx) => {
      if (data) {
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

    await delay(DELAY_MS);
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
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });

  const mainPage = await browser.newPage();
  await mainPage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

  for (const cat of CATEGORIES) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`⚡ [${cat.num}/41] ${cat.name}`);
    console.log(`${'='.repeat(60)}`);

    const startTime = Date.now();
    const allUrls = [];

    // Get all provider URLs
    await mainPage.goto(cat.url, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });
    await delay(1000);
    
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
        await mainPage.goto(`${cat.url}?page=${p}`, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });
        await delay(300);
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

