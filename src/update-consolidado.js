import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Archivos válidos - las 23 categorías completadas
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
  '10_Cafe.xlsx',
  '11_Carne.xlsx',
  '12_Cestas_y_Lotes_de_Navidad.xlsx',
  '13_Chocolate_y_Dulces.xlsx',
  '14_Condimentos_Hierbas_Especias.xlsx',
  '15_Congelados.xlsx',
  '16_Conservas.xlsx',
  '17_Delicatessen.xlsx',
  '18_Derivados_Cereales.xlsx',
  '19_Derivados_Fruta.xlsx',
  '20_Derivados_Legumbres.xlsx',
  '21_Embutidos_Veganos.xlsx',
  '22_Frutas.xlsx',
  '23_Frutos_Secos.xlsx'
];

async function updateConsolidado() {
  const inputDir = path.join(__dirname, '..', 'FMCG_Leads_Por_Categoria');
  const outputFile = path.join(__dirname, '..', 'output', 'FMCG_leads_byluis.xlsx');
  
  let allData = [];
  
  console.log('📊 Actualizando consolidado con 23 categorías...\n');
  
  for (const fileName of VALID_FILES) {
    const filePath = path.join(inputDir, fileName);
    
    try {
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
      
      console.log(`✅ ${fileName}: ${data.length} leads`);
      allData = allData.concat(data);
    } catch (error) {
      console.log(`❌ Error: ${fileName}: ${error.message}`);
    }
  }
  
  console.log(`\n📈 Total leads consolidados: ${allData.length}`);
  
  const ws = XLSX.utils.json_to_sheet(allData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'FMCG_Leads');
  XLSX.writeFile(wb, outputFile);
  
  // También actualizar el consolidado en la carpeta de categorías
  const consolidadoCategoria = path.join(inputDir, 'TODOS_CONSOLIDADO.xlsx');
  XLSX.writeFile(wb, consolidadoCategoria);
  
  console.log(`\n✅ Archivos actualizados:`);
  console.log(`   - ${outputFile}`);
  console.log(`   - ${consolidadoCategoria}`);
}

updateConsolidado();
