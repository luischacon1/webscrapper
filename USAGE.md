# 🚀 Guía de Uso Rápido

## Para Compañeros del Equipo

### 1️⃣ Instalación (Solo Primera Vez)

```bash
# Clonar repo
git clone https://github.com/luischacon1/webscrapper.git
cd webscrapper

# Instalar dependencias
npm install
```

### 2️⃣ Cómo Usar

**Es muy simple:**

```bash
node scrape.js <URL_DE_LA_CATEGORIA>
```

### 3️⃣ Ejemplos Reales

#### Scrapear Verduras
```bash
node scrape.js https://www.proveedores.com/verduras/
```

#### Scrapear Frutas
```bash
node scrape.js https://www.proveedores.com/frutas/
```

#### Scrapear Carne
```bash
node scrape.js https://www.proveedores.com/carne/
```

### 4️⃣ ¿Dónde Están los Resultados?

Los archivos Excel se guardan en la carpeta `output/`:

```
output/
  └── verduras_1704819234567.xlsx  ← Tu archivo aquí
```

**El Excel se abre automáticamente cuando termina** 🎉

---

## 📊 Qué Datos Obtendrás

Cada Excel contiene:

- ✅ **Nombre** del proveedor
- ✅ **Email**
- ✅ **WhatsApp**
- ✅ **Teléfonos** de contacto
- ✅ **Sede** (provincia)
- ✅ **Tipo** de proveedor (mayorista, fabricante, etc.)
- ✅ **URL** del proveedor

---

## ⏱️ ¿Cuánto Tarda?

Aproximadamente **1 lead por cada 2-3 segundos**:

| Leads | Tiempo Estimado |
|-------|-----------------|
| 50 | ~2 minutos |
| 100 | ~4 minutos |
| 500 | ~20 minutos |
| 1000 | ~40 minutos |

---

## ❓ Preguntas Frecuentes

### ¿Puedo scrapear varias categorías a la vez?

No, ejecuta el comando una vez por cada categoría. Para múltiples categorías:

```bash
# Terminal 1
node scrape.js https://www.proveedores.com/verduras/

# Terminal 2
node scrape.js https://www.proveedores.com/frutas/
```

### ¿Qué pasa si se interrumpe?

Simplemente vuelve a ejecutar el comando. El script empieza desde cero cada vez.

### ¿Cómo sé qué URL usar?

1. Ve a [proveedores.com](https://www.proveedores.com)
2. Busca la categoría que quieres
3. Copia la URL completa
4. Pégala en el comando

### ¿El scraper puede ser detectado?

No, está diseñado con sistema anti-detección Cloudflare. **100% de tasa de éxito** en pruebas.

---

## 🆘 Si Algo Sale Mal

### Error: "Cannot find module..."

```bash
# Instalar dependencias
npm install
```

### Error: "permission denied"

```bash
# Dar permisos de ejecución
chmod +x scrape.js
```

### El Excel no se abre automáticamente

El archivo está guardado en `/output/`. Ábrelo manualmente.

---

## 📞 Contacto

Si tienes problemas, contacta al equipo de desarrollo o consulta el `README.md` completo.

---

**Happy Scraping! 🕷️✨**

