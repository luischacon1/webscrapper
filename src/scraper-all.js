import puppeteer from 'puppeteer';
import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const outputDir = path.join(__dirname, '..', 'output');
const statusFile = path.join(outputDir, 'status.json');
const mainFile = path.join(outputDir, 'FMCG_leads_byluis.xlsx');

// Categories remaining (starting from Bebidas Alcohólicas)
const CATEGORIES = [
  { name: 'Bebidas Alcohólicas', url: 'https://www.proveedores.com/bebidas-alcoholicas/' },
  { name: 'Bebidas sin Alcohol', url: 'https://www.proveedores.com/bebidas-sin-alcohol/' },
  { name: 'Café', url: 'https://www.proveedores.com/cafe/' },
  { name: 'Carne', url: 'https://www.proveedores.com/carne/' },
  { name: 'Cestas y Lotes de Navidad', url: 'https://www.proveedores.com/cestas-y-lotes-de-navidad/' },
  { name: 'Chocolate y Dulces', url: 'https://www.proveedores.com/chocolate-y-dulces/' },
  { name: 'Condimentos, Hierbas y Especias', url: 'https://www.proveedores.com/condimentos-hierbas-y-especias/' },
  { name: 'Congelados', url: 'https://www.proveedores.com/congelados/' },
  { name: 'Conservas', url: 'https://www.proveedores.com/conservas/' },
  { name: 'Delicatessen', url: 'https://www.proveedores.com/delicatessen/' },
  { name: 'Derivados de Cereales', url: 'https://www.proveedores.com/derivados-de-cereales/' },
  { name: 'Derivados de la Fruta', url: 'https://www.proveedores.com/derivados-de-la-fruta/' },
  { name: 'Derivados de Legumbres', url: 'https://www.proveedores.com/derivados-de-legumbres/' },
  { name: 'Embutidos Veganos', url: 'https://www.proveedores.com/embutidos-veganos/' },
  { name: 'Frutas', url: 'https://www.proveedores.com/frutas/' },
  { name: 'Frutos Secos', url: 'https://www.proveedores.com/frutos-secos/' },
  { name: 'Grasas', url: 'https://www.proveedores.com/grasas/' },
  { name: 'Hamburguesas Veganas', url: 'https://www.proveedores.com/hamburguesas-veganas/' },
  { name: 'Hielo', url: 'https://www.proveedores.com/hielo/' },
  { name: 'Huevos', url: 'https://www.proveedores.com/huevos/' },
  { name: 'Ingredientes Alimentarios y Aromas', url: 'https://www.proveedores.com/ingredientes-alimentarios-y-aromas/' },
  { name: 'Legumbres', url: 'https://www.proveedores.com/legumbres/' },
  { name: 'Miel', url: 'https://www.proveedores.com/miel/' },
  { name: 'Panadería y Pastelería', url: 'https://www.proveedores.com/panaderia-y-pasteleria/' },
  { name: 'Pescado y Marisco', url: 'https://www.proveedores.com/pescado-y-marisco/' },
  { name: 'Platos Precocinados', url: 'https://www.proveedores.com/platos-precocinados/' },
  { name: 'Platos Preelaborados', url: 'https://www.proveedores.com/platos-preelaborados/' },
  { name: 'Postres', url: 'https://www.proveedores.com/postres/' },
  { name: 'Productos de IV Gama', url: 'https://www.proveedores.com/productos-de-iv-gama/' },
  { name: 'Productos Lácteos', url: 'https://www.proveedores.com/productos-lacteos/' },
  { name: 'Semillas Comestibles', url: 'https://www.proveedores.com/semillas-comestibles/' },
  { name: 'Té e Infusiones', url: 'https://www.proveedores.com/te-e-infusiones/' },
  { name: 'Toppings', url: 'https://www.proveedores.com/toppings/' },
  { name: 'Verduras', url: 'https://www.proveedores.com/verduras/' }
];

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function updateStatus(status) {
  fs.writeFileSync(statusFile, JSON.stringify(status, null, 2));
}

function loadMainFile() {
  if (fs.existsSync(mainFile)) {
    const wb = XLSX.readFile(mainFile);
    return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
  }
  return [];
}

function saveMainFile(data) {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(data);
  worksheet['!cols'] = [{wch:40},{wch:35},{wch:18},{wch:30},{wch:20},{wch:45},{wch:20},{wch:55}];
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Leads');
  XLSX.writeFile(workbook, mainFile);
}

async function getTotalPages(page) {
  return await page.evaluate(() => {
    const paginationLinks = document.querySelectorAll('a[href*="page="]');
    let maxPage = 1;
    paginationLinks.forEach(link => {
      const match = link.href.match(/page=(\d+)/);
      if (match) {
        const pageNum = parseInt(match[1]);
        if (pageNum > maxPage) maxPage = pageNum;
      }
    });
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

async function scrapeProviderPage(page, url) {
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await delay(600);

    return await page.evaluate(() => {
      const wrap = document.querySelector('div.flex-1');
      if (!wrap) return null;

      const nameEl = wrap.querySelector('h1');
      const name = nameEl ? nameEl.textContent.trim() : '';

      const allLis = wrap.querySelectorAll('li');
      let email = '', whatsapp = '';
      const contacts = [];

      allLis.forEach(li => {
        const text = li.textContent.trim();
        if (text.includes('@') && !email) email = text;
        if (li.classList.contains('cwhats-small')) whatsapp = text;
        if (li.classList.contains('custom-inline-list') && !text.includes('@') && !text.includes('https')) {
          contacts.push(text);
        }
      });

      let sede = '';
      const provinces = ['A Coruña','Álava','Albacete','Alicante','Almería','Asturias','Ávila','Badajoz','Barcelona','Burgos','Cáceres','Cádiz','Cantabria','Castellón','Ceuta','Ciudad Real','Córdoba','Cuenca','Girona','Granada','Guadalajara','Guipúzcoa','Gipuzkoa','Huelva','Huesca','Islas Baleares','Baleares','Jaén','La Rioja','Las Palmas','León','Lleida','Lérida','Lugo','Madrid','Málaga','Melilla','Murcia','Navarra','Ourense','Orense','Palencia','Pontevedra','Salamanca','Segovia','Sevilla','Soria','Tarragona','Tenerife','Santa Cruz de Tenerife','Teruel','Toledo','Valencia','Valladolid','Vizcaya','Bizkaia','Zamora','Zaragoza'];
      const fullText = document.body.innerText;
      for (const p of provinces) { if (fullText.includes(p)) { sede = p; break; } }

      const types = [];
      const pageText = document.body.innerText.toLowerCase();
      if (pageText.includes('distribuidor') || pageText.includes('mayorista')) types.push('Distribuidores mayoristas');
      if (pageText.includes('dropshipping')) types.push('Dropshipping');
      if (pageText.includes('exportador') || pageText.includes('exportamos')) types.push('Exportadores');
      if (pageText.includes('fabricante') || pageText.includes('fabricamos') || pageText.includes('elaboramos')) types.push('Fabricantes');
      if (pageText.includes('importador') || pageText.includes('importamos')) types.push('Importadores');

      return { name, email, whatsapp, contacts: contacts.join(' | '), sede, providerType: types.join(', ') };
    });
  } catch (e) { return null; }
}

async function getProviderLinks(page) {
  return await page.evaluate(() => {
    const links = document.querySelectorAll('a.duration-200');
    return Array.from(links).map(l => l.href).filter(h => h && h.startsWith('http'));
  });
}

async function scrapeCategory(browser, category, categoryIndex, totalCategories) {
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

  const results = [];

  try {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📂 [${categoryIndex + 1}/${totalCategories}] ${category.name}`);
    console.log(`${'='.repeat(60)}`);

    await page.goto(category.url, { waitUntil: 'networkidle2', timeout: 30000 });
    await delay(2000);

    const totalPages = await getTotalPages(page);
    console.log(`📊 Detected ${totalPages} pages\n`);

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      updateStatus({
        status: 'scraping',
        categoryIndex: categoryIndex + 1,
        totalCategories,
        category: category.name,
        currentPage: pageNum,
        totalPages,
        providersScraped: results.length,
        lastProvider: results[results.length - 1]?.name || ''
      });

      const links = await getProviderLinks(page);
      if (links.length === 0) break;

      console.log(`📑 Page ${pageNum}/${totalPages} - ${links.length} providers`);

      for (const url of links) {
        const data = await scrapeProviderPage(page, url);
        if (data) {
          results.push({
            Name: data.name,
            Email: data.email,
            WhatsApp: data.whatsapp,
            Contacts: data.contacts,
            SEDE: data.sede,
            'Tipo de Proveedor': data.providerType,
            Category: category.name,
            URL: url
          });
        }
        await delay(500);
      }

      if (pageNum < totalPages) {
        try {
          await page.goto(`${category.url}?page=${pageNum + 1}`, { waitUntil: 'networkidle2', timeout: 30000 });
          await delay(1000);
        } catch (e) { break; }
      }
    }

    console.log(`✅ ${category.name}: ${results.length} providers\n`);

  } catch (e) {
    console.error(`Error in ${category.name}:`, e.message);
  } finally {
    await page.close();
  }

  return results;
}

async function main() {
  console.log('🚀 STARTING BULK SCRAPER - All remaining categories\n');

  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  let allData = loadMainFile();
  console.log(`📂 Loaded ${allData.length} existing leads\n`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });

  for (let i = 0; i < CATEGORIES.length; i++) {
    const category = CATEGORIES[i];
    const newData = await scrapeCategory(browser, category, i, CATEGORIES.length);
    
    allData = allData.concat(newData);
    saveMainFile(allData);
    console.log(`💾 Total saved: ${allData.length} leads\n`);
  }

  await browser.close();

  updateStatus({
    status: 'ALL_COMPLETED',
    totalCategories: CATEGORIES.length,
    totalLeads: allData.length
  });

  console.log(`\n${'='.repeat(60)}`);
  console.log(`🎉 ALL COMPLETE! Total: ${allData.length} leads`);
  console.log(`${'='.repeat(60)}\n`);
}

main();

