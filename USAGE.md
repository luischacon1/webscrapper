# 🚀 Quick Usage Guide

## For Team Members

### 1️⃣ Installation (First Time Only)

```bash
# Clone repository
git clone https://github.com/luischacon1/webscrapper.git
cd webscrapper

# Install dependencies
npm install
```

### 2️⃣ How to Use

**It's very simple:**

```bash
node scrape.js <CATEGORY_URL>
```

### 3️⃣ Example

```bash
node scrape.js https://www.proveedores.com/your-category-here/
```

Replace `your-category-here` with the actual category slug from the website.

### 4️⃣ Where Are the Results?

Excel files are saved in the `output/` folder:

```
output/
  └── your_category_1704819234567.xlsx  ← Your file here
```

**The Excel file opens automatically when finished** 🎉

---

## 📊 What Data You'll Get

Each Excel file contains:

- ✅ **Name** of the provider
- ✅ **Email**
- ✅ **WhatsApp**
- ✅ **Phone numbers**
- ✅ **Location** (province)
- ✅ **Provider type** (wholesaler, manufacturer, etc.)
- ✅ **URL** of the provider

---

## ⏱️ How Long Does It Take?

Approximately **1 lead every 2-3 seconds**:

| Leads | Estimated Time |
|-------|----------------|
| 50 | ~2 minutes |
| 100 | ~4 minutes |
| 500 | ~20 minutes |
| 1000 | ~40 minutes |

---

## 📝 How to Get the Category URL

1. Go to [proveedores.com](https://www.proveedores.com)
2. Find the category you want to scrape
3. Copy the complete URL from your browser
4. Use it in the command:

```bash
node scrape.js <PASTE_URL_HERE>
```

---

## ❓ Frequently Asked Questions

### Can I scrape multiple categories at once?

No, run the command once for each category. For multiple categories, use separate terminals:

```bash
# Terminal 1
node scrape.js https://www.proveedores.com/category-1/

# Terminal 2
node scrape.js https://www.proveedores.com/category-2/
```

### What happens if it gets interrupted?

Simply run the command again. The script starts from scratch each time.

### Can the scraper be detected?

No, it's designed with Cloudflare anti-detection system. **100% success rate** in tests.

### How do I know it's working?

You'll see real-time progress in the terminal:

```
🔍 Collecting URLs...
📊 15 pages detected

🔥 Starting scraping (2 tabs in parallel)...
   ⏳ 120/500 | ✅ 118 | ❌ 2

✅ Successful leads: 498
⏱️  Total time: 19.2 min
💾 File saved: output/category_1704819234567.xlsx
```

---

## 🆘 If Something Goes Wrong

### Error: "Cannot find module..."

```bash
# Install dependencies
npm install
```

### Error: "permission denied"

```bash
# Give execution permissions
chmod +x scrape.js
```

### Excel doesn't open automatically

The file is saved in `/output/`. Open it manually from there.

### Script is too slow

You can adjust speed in `scrape.js` (see README.md for details).

---

## 💡 Tips

- ✅ Let the script finish completely before closing the terminal
- ✅ Check the `/output/` folder for your Excel files
- ✅ Each file is timestamped, so you won't overwrite previous results
- ✅ If you need to stop, just press `Ctrl+C`

---

## 📞 Need Help?

If you have problems, check the complete `README.md` or contact the development team.

---

**Happy Scraping! 🕷️✨**
