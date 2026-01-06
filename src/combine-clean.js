import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Solo las 10 primeras categorías (hasta Café) - ANTES del turbo scraper
const VALID_FILES = [
  '01_Aceite.xlsx',
  '02_Algas_Comestibles.xlsx',
  '03_Alimentos_de_Bebe.xlsx',
  '04_Alimentos_Dieteticos.xlsx',
  '05_Alimentos_Alergias.xlsx',
  '06_Alimentos_Veganos.xlsx',
  '07_Aperitivos.xlsx',
  '08_Bebidas_Alcoholicas.xlsx',
  '09_Bebidas_sin_Alcohol.xlsx',
  '10_Cafe.xlsx'
];

async function combineCleanFiles() {
  const inputDir = path.join(__dirname, '..', 'FMCG_Leads_Por_Categoria');
  const outputFile = path.join(__dirname, '..', 'output', 'FMCG_leads_byluis.xlsx');
  
  let allData = [];
  
  console.log('📊 Combinando solo las 10 primeras categorías (hasta Café)...\n');
  
  for (const fileName of VALID_FILES) {
    const filePath = path.join(inputDir, fileName);
    
    try {
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
      
      console.log(`✅ ${fileName}: ${data.length} leads`);
      allData = allData.concat(data);
    } catch (error) {
      console.log(`❌ Error leyendo ${fileName}: ${error.message}`);
    }
  }
  
  console.log(`\n📈 Total leads consolidados: ${allData.length}`);
  
  // Crear el archivo consolidado
  const ws = XLSX.utils.json_to_sheet(allData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'FMCG_Leads');
  XLSX.writeFile(wb, outputFile);
  
  console.log(`\n✅ Archivo guardado: ${outputFile}`);
}

combineCleanFiles();

