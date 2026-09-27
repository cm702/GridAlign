# GridAlign

AI-powered platform for detecting coordination opportunities between future electric utility infrastructure projects.

## Project Goal

GridAlign helps utility companies identify future construction projects that may benefit from coordination.

The system combines project data from different utility companies, detects projects that are geographically close, compares their timelines, and uses AI to generate coordination reports.

The main goal is to find opportunities such as:

- Shared construction resources
- Shared contractors or equipment
- Shared staging areas
- Coordinated road access
- Delivery coordination
- Permitting coordination
- Outage planning
- Construction scheduling
- Reduced duplicated work

---

## 1. Frontend Dashboard

The frontend is the main interface used to control and explore GridAlign.

Access to the dashboard is protected by a special password.

After authentication, users can:

- Start the project analysis workflow
- View detected coordination opportunities
- View matched projects on an interactive map
- See projects from different utility companies
- See the distance between matched projects
- Compare project timelines
- Filter matches by company, project type, date, status, or coordination strength
- View project information
- View ranked coordination opportunities
- Open AI-generated coordination reports
- Review possible shared resources, benefits, and risks
- Review filing-supported cost-saving opportunities or see when filing information is unavailable

The map focuses on projects that have already been detected as possible matches.

Each coordination opportunity can connect two projects and display their locations, distance, timeline information, and AI report.

---

## 2. Python Data Extraction Service

Python is responsible for processing project source files and converting their information into structured data.

The extraction system can process files such as:

- PDF project documents
- Utility planning documents
- Infrastructure reports
- Other supported project files

A separate extraction configuration can be used for each utility company because different companies may organize their documents differently.

The extraction process uses Gemini to understand the documents and extract structured project information.

The extracted information can include:

- Project name
- Utility company
- Project type
- Description
- Location
- County
- Latitude
- Longitude
- Start date
- End date
- Status
- Source information

The result is stored as structured JSON data that can be used by the Java backend.

Python does not calculate geographic matches.

Its job in this stage is to transform unstructured utility documents into structured project data.

Example:

Utility Project Files  
↓  
Python Extraction  
↓  
Gemini Structured Data Extraction  
↓  
Company JSON Data  
↓  
Java Backend

---

## 3. Java Backend

Java is the main analysis and matching engine of GridAlign.

It receives the structured project data produced by the Python extraction service.

Java is responsible for:

- Loading project data
- Validating project information
- Converting projects into a common internal format
- Resolving or preparing project locations
- Managing latitude and longitude information
- Comparing projects from different utility companies
- Calculating geographic distance
- Detecting projects within 40 km (25 miles)
- Comparing construction timelines
- Detecting timeline overlap
- Calculating match information
- Producing geographically eligible match candidates
- Sending matched projects to the Python AI report service

Geographic calculations are performed directly in Java.

AI is not used to determine whether two projects are geographically close.

### Matching Logic

GridAlign first compares the geographic location of projects.

Projects from different companies that are within 40 km of each other become possible coordination matches.

After the geographic filter, Java analyzes additional information such as:

- Construction dates
- Timeline overlap
- Project type
- Project status
- Available project information

The dashboard's deterministic priority ranking weights geographic proximity (70%)
more heavily than schedule compatibility (30%). The geographic filter still limits
candidate pairs to less than 40 km; the ranking then uses the challenge's
distance bands and compares available project date windows. Missing dates
are shown as unknown and receive a neutral timeline score.

Projects do not need to be the same type of construction to create a coordination opportunity.

For example, a transmission line project and a substation project may still benefit from coordination.

Example Java pipeline:

Structured Project Data  
↓  
Validation  
↓  
Common Project Model  
↓  
Location Processing  
↓  
Geographic Comparison  
↓  
40 km Distance Filter  
↓  
Timeline Analysis  
↓  
Matched Projects  
↓  
Python Balanced Opportunity Ranking

↓

Dashboard Priority List

---

## 4. Python AI Report Service

Python also provides a second AI service after Java finishes the matching process.

Java sends structured information about two matched projects to Python.

Python then sends the information to Gemini to analyze why coordination between the projects may be useful.

Gemini can identify possible:

- Shared crews
- Shared equipment
- Shared contractors
- Shared staging areas
- Shared deliveries
- Access road coordination
- Permitting coordination
- Outage coordination
- Construction scheduling opportunities
- Risks or limitations

The report prompt also requests filing-supported cost-saving opportunities.
It does not treat a project's estimated construction cost as a savings
estimate, and reports explicitly state when filing-supported cost-saving
information is unavailable. Ranked results and report-derived cost details
are saved separately under `data/rankings/`; existing source project data,
match data, and PDF report names remain unchanged.

The AI must use only the information provided by GridAlign.

It must not invent:

- Missing project information
- Dates
- Costs
- Relationships between companies
- Expected savings

The result is a human-readable coordination report.

Example:

Matched Projects from Java  
↓  
Python Report Service  
↓  
Gemini Analysis  
↓  
Coordination Report  
↓  
Java Backend  
↓  
Frontend

---

## 5. Python Operating Modes

The Python service has two main modes.

### Mode 1 — Project Data Extraction

Processes utility project files and creates structured project data.

Files  
↓  
Gemini  
↓  
Structured JSON

### Mode 2 — Coordination Report Generation

Receives project matches already calculated by Java and generates AI reports.

Java Match  
↓  
Python  
↓  
Gemini  
↓  
Coordination Report

This separation keeps the responsibilities clear:

**Gemini understands documents and explains coordination opportunities.**

**Java performs deterministic geographic and timeline calculations.**

---

## 6. Complete Data Flow

Utility Project Documents  
↓  
Python + Gemini Data Extraction  
↓  
Structured Company Project Data  
↓  
Java Backend  
↓  
Project Validation and Location Processing  
↓  
Geographic Analysis  
↓  
40 km Match Detection  
↓  
Timeline Analysis  
↓  
Coordination Opportunity Ranking  
↓  
Python + Gemini Report Generation  
↓  
AI Coordination Reports  
↓  
Frontend Dashboard  
↓  
Interactive Map + Match Analysis

---

## 7. System Architecture

GridAlign follows a hybrid architecture:

**Frontend**
- Authentication
- Dashboard
- Interactive map
- Filters
- Match visualization
- Coordination reports
- User controls

**Java**
- Main backend
- Project model
- Data validation
- Geographic calculations
- Distance detection
- Timeline comparison
- Match creation
- Match ranking
- Communication between services

**Python**
- Utility document processing
- Gemini integration
- Structured data extraction
- Weighted geography (70%) and timeline (30%) ranking
- AI coordination analysis
- Filing-supported cost-saving information
- Report generation

**Gemini**
- Understands unstructured project documents
- Extracts structured project information
- Explains coordination possibilities
- Generates human-readable reports

### Core Design Principle

GridAlign separates exact calculations from AI reasoning.

Java decides **which projects match**.

Gemini explains **why the match may be useful**.