# Web Scraper - Proveedores.com

A web scraper built with Puppeteer to extract supplier information from [proveedores.com](https://www.proveedores.com).

## ⚠️ Disclaimer

**This tool is intended for internal use only by the FMCG Team.**  
It is not authorized for distribution, commercial use, or use by external parties.

---

## Features

- 🔄 Automated pagination navigation
- 📧 Extracts company names, emails, WhatsApp numbers, and contact information
- 💾 Exports data to CSV format
- ⏱️ Built-in rate limiting to respect server resources

## Project Structure

```
webscrapper/
├── src/
│   └── scraper.js      # Main scraper logic
├── output/             # Generated CSV files (gitignored)
├── package.json
├── .gitignore
└── README.md
```

## Requirements

- Node.js 18+ 
- npm or yarn

## Installation

```bash
# Clone the repository
git clone https://github.com/luischacon1/webscrapper.git

# Navigate to project directory
cd webscrapper

# Install dependencies
npm install
```

## Usage

```bash
# Run the scraper
npm start

# or
npm run scrape
```

The scraper will:
1. Navigate to the food & beverages category
2. Collect provider links from the first 10 pages
3. Visit each provider page and extract contact information
4. Save results to `output/providers.csv`

## Configuration

You can modify the scraper settings in `src/scraper.js`:

```javascript
const CONFIG = {
  startUrl: 'https://www.proveedores.com/alimentacion-y-bebidas/',
  maxPages: 10,                    // Number of pages to scrape
  delayBetweenRequests: 800,       // Delay in ms between requests
  outputDir: './output'            // Output directory
};
```

## Output Format

The CSV file contains the following columns:

| Column | Description |
|--------|-------------|
| Name | Company name |
| Email | Contact email |
| WhatsApp | WhatsApp number |
| Contacts | Additional contact numbers |
| URL | Provider page URL |

## Tech Stack

- [Puppeteer](https://pptr.dev/) - Headless browser automation
- [csv-writer](https://www.npmjs.com/package/csv-writer) - CSV file generation
- Node.js ES Modules

## License

**UNLICENSED** - Private repository for FMCG Team internal use only.

---

*Built for FMCG Team © 2026*

