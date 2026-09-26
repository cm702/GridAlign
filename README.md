# GridAlign
AI-powered platform for detecting coordination opportunities between utility infrastructure projects.

## Current app

The interactive React dashboard, source-backed coordination suggestions, and server-side Gemini assistant are in [app/](./app/). For local setup, `.env` configuration, production build/start commands, and GoDaddy domain deployment notes, see [app/README.md](./app/README.md).

# Project Name

An AI-powered platform that finds coordination opportunities between future electric utility projects.

## How It Works

### 1. Frontend

The frontend allows users to:

- View utility projects on an interactive map
- See projects from different utility companies
- Filter projects by company, date, type, and status
- View detected geographic overlaps
- See timeline overlaps
- View a ranked list of coordination opportunities
- Open AI-generated reports explaining each opportunity

### 2. Java Backend

Java is the main data and analysis layer.

It will:

- Collect public project data from utility websites and documents
- Use a different extractor for each public data source
- Convert all data into one common project format
- Validate and organize the project data
- Store the normalized data
- Compare projects from different utility companies
- Calculate geographic distance between projects
- Detect projects within 40 km of each other
- Compare their construction timelines
- Rank the strongest coordination opportunities

Example pipeline:

Utility Sources
      |
      v
Java Extractors
      |
      v
Common Project Format
      |
      v
Storage
      |
      v
Geographic Analysis
      |
      v
Timeline Analysis
      |
      v
Coordination Opportunities

### 3. Python AI Service

Python receives the coordination opportunities detected by Java.

It will:

- Send structured project information to the Gemini API
- Analyze why coordination may be useful
- Identify possible shared resources
- Explain possible benefits and risks
- Generate a human-readable coordination report
- Return the report to the Java backend

Java performs the exact calculations.

Gemini is used to understand and explain the results, not to determine the geographic distance.

### 4. Data Flow

Public Utility Sources
        |
        v
Java Data Extractors
        |
        v
Normalized Project Data
        |
        v
Java Geographic + Timeline Analysis
        |
        v
Detected Coordination Opportunities
        |
        v
Python + Gemini
        |
        v
AI Coordination Report
        |
        v
Frontend Dashboard