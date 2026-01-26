# 📊 TradeMatch Data Files

## Overview

This directory contains all the data files needed by the page generator script.

---

## Files Included

### 1. **uk-locations.csv**
Complete list of 500+ UK locations (sample of full 3,450 locations)

**Format:**
```csv
name,slug,city,county,postcode_area,population
Westminster,westminster-london,London,Greater London,SW1,250000
```

**Columns:**
- `name`: Location display name (e.g., "Westminster")
- `slug`: URL-friendly slug (e.g., "westminster-london")
- `city`: Parent city (e.g., "London")
- `county`: County/region (e.g., "Greater London")
- `postcode_area`: Postcode prefix (e.g., "SW1")
- `population`: Population estimate

**Current Coverage:**
- ✅ London: 200+ locations
- ✅ Manchester: 80+ locations
- ✅ Birmingham: 60+ locations
- ✅ Leeds: 60+ locations
- ✅ Glasgow: 100+ locations

**Total in file:** 500+ locations (expandable to 3,450)

---

## How It Works

### Generator Script Flow:

```python
1. Load Services (51 hardcoded)
   ├── Home Improvement (15)
   ├── Construction (15)
   ├── Outdoor (10)
   └── Specialist (11)

2. Load Cities (30 hardcoded)
   └── Major UK cities

3. Load Locations from CSV
   └── uk-locations.csv → 500+ locations

4. Generate Pages
   ├── For each service (51)
   │   ├── For each city (30)
   │   │   └── Generate page: /services/{service}/{city}.html
   │   └── For each location (500+)
   │       └── Generate page: /services/{service}/{location}.html
   └── Total: 51 × 530 = 27,030 pages
```

---

## Adding More Locations

### Option 1: Edit CSV File

```csv
# Add new row to uk-locations.csv
Shoreditch,shoreditch-london,London,Greater London,EC2,45000
```

### Option 2: Expand CSV

To reach full 3,450 locations, add more rows following the same format:

**Required columns:**
- name (required)
- slug (required)
- city (required)
- county (optional)
- postcode_area (optional)
- population (optional)

---

## Location Naming Convention

### Slugs:
```
Format: {location}-{city}
Examples:
  - westminster-london
  - city-centre-manchester
  - headingley-leeds
```

**Why?** Prevents duplicate slugs across different cities
- "Newtown" in London: `newtown-london`
- "Newtown" in Manchester: `newtown-manchester`

---

## Data Sources

### Where to get more locations:

1. **UK Postcode Database**
   - Download from: https://geoportal.statistics.gov.uk
   - Contains all UK postcodes

2. **OpenStreetMap**
   - API: https://nominatim.openstreetmap.org
   - Free location data

3. **Royal Mail PAF**
   - Official postcode address file
   - License required

4. **ONS Data**
   - Office for National Statistics
   - Census data with populations

---

## Example: Expanding London

Current: 200+ locations
Target: 500+ locations

**Areas to add:**
```csv
Bethnal Green,bethnal-green-london,London,Greater London,E2,35000
Mile End,mile-end-london,London,Greater London,E1,28000
Bow,bow-london,London,Greater London,E3,42000
Poplar,poplar-london,London,Greater London,E14,52000
Limehouse,limehouse-london,London,Greater London,E14,38000
...
```

---

## Validation

### CSV Requirements:

✅ UTF-8 encoding
✅ Header row required
✅ No empty rows
✅ No duplicate slugs
✅ Valid characters in slugs (a-z, 0-9, hyphen)

### Test Your CSV:

```python
python3 generate-pages.py
# Will show: "✅ Loaded X locations from uk-locations.csv"
```

---

## Performance

### File Size:
- 500 locations: ~40 KB
- 3,450 locations: ~250 KB
- Load time: < 1 second

### Generation Time:
- 500 locations × 51 services = 25,500 pages
- Generation time: ~5-10 minutes
- Depends on: CPU, disk speed

---

## Troubleshooting

### Error: "CSV file not found"
```bash
# Ensure file is in same directory as script
ls uk-locations.csv
```

### Error: "Invalid CSV format"
```bash
# Check encoding (must be UTF-8)
file -I uk-locations.csv

# Should show: charset=utf-8
```

### Error: "Duplicate slugs"
```python
# Find duplicates:
import csv
from collections import Counter

with open('uk-locations.csv', 'r') as f:
    reader = csv.DictReader(f)
    slugs = [row['slug'] for row in reader]
    dupes = [s for s, count in Counter(slugs).items() if count > 1]
    print(f"Duplicates: {dupes}")
```

---

## Future Enhancements

### Planned Features:

1. **JSON Export**
   ```json
   {
     "locations": [...],
     "total": 500,
     "by_city": {...}
   }
   ```

2. **Database Support**
   ```python
   # Load from SQLite/PostgreSQL
   locations = load_from_db()
   ```

3. **API Integration**
   ```python
   # Fetch from API
   locations = fetch_from_api()
   ```

4. **Auto-population**
   ```python
   # Estimate population based on postcode
   population = estimate_population(postcode)
   ```

---

## Quick Reference

### Current Stats:
```
Services:     51
Cities:       30
Locations:    500+
Total Pages:  27,030+
File Size:    40 KB
Load Time:    < 1 sec
```

### Target Stats (Full):
```
Services:     51
Cities:       30
Locations:    3,450
Total Pages:  175,950
File Size:    250 KB
Load Time:    < 1 sec
```

---

## Support

**Need help?**
1. Check CSV format matches example
2. Ensure UTF-8 encoding
3. Verify no duplicate slugs
4. Test with small CSV first

**Want to expand?**
1. Add more rows to CSV
2. Follow naming convention
3. Run generator script
4. Check output

---

**Status:** ✅ READY TO USE  
**Locations:** 500+ included  
**Format:** CSV (UTF-8)  
**Expandable:** Up to 3,450+  
**Load Time:** < 1 second  

🎨💫 **COMPLETE DATA PACKAGE!** 💫🎨
