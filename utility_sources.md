# Utility Data Sources

All data sources will be converted into the same common project format.

If a source does not provide a field, the value will be stored as `null`.

## Common Project Format

{
  "utility": null,
  "projectId": null,
  "projectName": null,
  "projectType": null,
  "description": null,
  "status": null,
  "startDate": null,
  "endDate": null,
  "voltageKv": null,
  "estimatedCost": null,
  "region": null,
  "geometry": null,
  "sourceUrl": null
}

---

# 1. Georgia Power - Transmission Projects Website

Source:
https://www.georgiapower.com/about/grid-reliability/grid-improvements/grid-projects/transmission-projects.html

Source Type:
HTML

Utility:
Georgia Power

## Expected Information

{
  "utility": "Georgia Power",
  "projectId": null,
  "projectName": "Available",
  "projectType": "Available",
  "description": "Available",
  "status": "Sometimes Available",
  "startDate": "Sometimes Available",
  "endDate": "Sometimes Available",
  "voltageKv": "Sometimes Available",
  "estimatedCost": null,
  "region": "Available",
  "geometry": null,
  "sourceUrl": "Available"
}

Main information expected from this source:

- Project name
- County / region
- Project type
- Project description
- Project timeline
- Construction start date when available
- Completion date when available
- Voltage when available
- Individual project page URL

Java extraction method:
Jsoup

---

# 2. Georgia Power - IRP / 10-Year Transmission Plan

Source:
https://www.georgiapower.com/about/company/filings/irp.html

Source Type:
PDF

Utility:
Georgia Power

## Expected Information

{
  "utility": "Georgia Power",
  "projectId": "Available",
  "projectName": "Available",
  "projectType": "Sometimes Available",
  "description": "Sometimes Available",
  "status": "Available",
  "startDate": null,
  "endDate": "Need Date",
  "voltageKv": "Sometimes Available",
  "estimatedCost": null,
  "region": "Sometimes Available",
  "geometry": null,
  "sourceUrl": "Available"
}

Main information expected from this source:

- Project number
- Project name
- Need Date
- Project status
- Future transmission projects
- Voltage when included in the project name
- Region or location when available

Java extraction method:
PDFBox / Tabula

---

# 3. Dominion Energy South Carolina - SCRTP Planned Facilities

Source:
https://www.scrtp.com/

Source Type:
PDF

Utility:
Dominion Energy South Carolina

## Expected Information

{
  "utility": "Dominion Energy South Carolina",
  "projectId": "Available",
  "projectName": "Available",
  "projectType": "Derived from description",
  "description": "Available",
  "status": "Available",
  "startDate": null,
  "endDate": "Planned In-Service Date",
  "voltageKv": "Sometimes Available",
  "estimatedCost": "Available",
  "region": "Sometimes Available / Derived",
  "geometry": null,
  "sourceUrl": "Available"
}

Main information expected from this source:

- Project ID
- Project description
- Project need
- Project status
- Planned In-Service Date
- Estimated project cost
- Voltage when included in the description
- Location names
- Substation names
- Transmission line endpoints when available

Java extraction method:
PDFBox + Regex

---

# 4. HIFLD / ArcGIS Geographic Data

Source:
HIFLD Electric Power Transmission Lines / Substations

Source Type:
REST API / JSON / GeoJSON

Utility:
Multiple Utilities

This source is mainly used to add geographic information to projects obtained from the other sources.

## Expected Information

{
  "utility": "Sometimes Available as Owner",
  "projectId": null,
  "projectName": null,
  "projectType": "Transmission Line / Substation",
  "description": null,
  "status": "Sometimes Available",
  "startDate": null,
  "endDate": null,
  "voltageKv": "Available",
  "estimatedCost": null,
  "region": "Derived from geographic position",
  "geometry": "Available",
  "sourceUrl": "Available"
}

Main information expected from this source:

- Transmission line geometry
- Substation coordinates
- Utility / owner
- Voltage
- Geographic position
- Line endpoints
- GIS geometry

Java extraction method:
HTTP Request + JSON / GeoJSON parser

---

# Data Combination

Each source provides different parts of the same project.

Georgia Power:

Georgia Power Transmission Projects Website
+
Georgia Power IRP / 10-Year Transmission Plan
+
HIFLD Geographic Data
=
Complete Georgia Power Project

Dominion Energy South Carolina:

SCRTP Planned Facilities
+
HIFLD Geographic Data
=
Complete Dominion Energy Project

The final normalized object will always follow the Common Project Format.

Any information that cannot be found or verified will remain `null`.

Missing information must never be invented.