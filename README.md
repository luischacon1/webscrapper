# Web Scraper - Proveedores.com

A web scraper built with Puppeteer to extract supplier information from [proveedores.com](https://www.proveedores.com).

## ⚠️ Disclaimer

**This tool is intended for internal use only by the FMCG Team.**  
It is not authorized for distribution, commercial use, or use by external parties.

---

## Features

- 🔄 Automated pagination navigation (all pages per category)
- 📧 Extracts: Name, Email, WhatsApp, Contacts, SEDE (Province), Provider Type
- 🏷️ Provider types: Distribuidores mayoristas, Dropshipping, Exportadores, Fabricantes, Importadores
- 💾 Exports to CSV and Excel (.xlsx)
- 📊 Real-time status tracking

## Categories (41 total)

1. Aceite ✅ (1,084 providers)
2. Algas Comestibles
3. Alimentos de Bebé
4. Alimentos Dietéticos
5. Alimentos para Alergias Alimentarias
6. Alimentos Veganos
7. Aperitivos
8. Bebidas Alcohólicas
9. Bebidas sin Alcohol
10. Café
11. Carne
12. Cestas y Lotes de Navidad
13. Chocolate y Dulces
14. Condimentos, Hierbas y Especias
15. Congelados
16. Conservas
17. Delicatessen
18. Derivados de Cereales
19. Derivados de la Fruta
20. Derivados de Legumbres
21. Embutidos Veganos
22. Frutas
23. Frutos Secos
24. Grasas
25. Hamburguesas Veganas
26. Hielo
27. Huevos
28. Ingredientes Alimentarios y Aromas
29. Legumbres
30. Miel
31. Panadería y Pastelería
32. Pescado y Marisco
33. Platos Precocinados
34. Platos Preelaborados
35. Postres
36. Productos de IV Gama
37. Productos Lácteos
38. Semillas Comestibles
39. Té e Infusiones
40. Toppings
41. Verduras

## Output Format

| Column | Description |
|--------|-------------|
| Name | Company name |
| Email | Contact email |
| WhatsApp | WhatsApp number |
| Contacts | Additional phone numbers |
| SEDE | Province (extracted from address) |
| Tipo de Proveedor | Provider types (multiple selection) |
| Category | Product category |
| URL | Provider page URL |

## Project Structure

```
webscrapper/
├── src/
│   ├── scraper.js           # Main scraper (single category)
│   └── scraper-continue.js  # Continue/resume scraper
├── output/                   # Generated files
│   ├── *.csv
│   ├── *.xlsx
│   └── status.json          # Real-time progress
├── package.json
└── README.md
```

## Installation

```bash
git clone https://github.com/luischacon1/webscrapper.git
cd webscrapper
npm install
```

## Usage

```bash
# Run scraper
npm start

# Continue from where left off
npm run continue
```

## License

**UNLICENSED** - Private repository for FMCG Team internal use only.

---

*Built for FMCG Team © 2026*
