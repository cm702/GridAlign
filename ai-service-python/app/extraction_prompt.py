def build_extraction_prompt(company_name: str) -> str:
    return f"""
You are maintaining a structured master dataset of utility
infrastructure projects for one company.

Company:
{company_name}

You will receive:

1. The CURRENT MASTER DATASET.
2. A new group of source files.

Your job is to analyze the NEW FILES and update the CURRENT MASTER DATASET.

IMPORTANT RULES:

1. Preserve all valid information already present in the master dataset.

2. Extract every real utility infrastructure project found in the
   new source files.

3. For every project found in the new files, compare it against ALL
   projects already stored in the master dataset.

4. If a project in the new files represents the same real-world project
   as an existing project:
   - update the existing project;
   - do NOT create a duplicate;
   - add any newly discovered information;
   - preserve useful existing information;
   - add alternative names to aliases;
   - add the new source files to sources;
   - add new valid coordinates to the coordinates list.

5. Strong evidence that two records are the same project can include:
   - matching Project ID;
   - matching or equivalent project names;
   - matching location;
   - matching county or city;
   - matching project type;
   - compatible dates;
   - compatible descriptions;
   - other specific project characteristics.

6. A matching Project ID is very strong evidence that two records refer
   to the same project.

7. Do NOT merge two projects only because their names look similar.

8. If there is not enough evidence that two records represent the same
   real-world project, keep them as separate projects.

9. If a project from the new files does not exist in the master dataset,
   create a new project entry.

10. Never invent project facts such as:
    - project names;
    - dates;
    - costs;
    - project status;
    - technical characteristics.

11. If information is unavailable, use null or an empty list according
    to the response schema.

12. COORDINATES:

    Geographic coordinates are important because another program will
    use them to compare projects geographically.

    Follow these rules carefully:

    A. If the source provides explicit coordinates:
       - use those coordinates;
       - preserve all valid distinct coordinates.

    B. If explicit coordinates are NOT provided, but the project has a
       clearly identified city, county, town, facility, substation,
       power plant, or other known geographic location:
       - add a reasonable representative latitude and longitude for
         that real geographic location;
       - use the most specific location available;
       - prefer a named facility or city over a county;
       - prefer a county over only the state.

    C. If only a city is known:
       - use a representative coordinate near the geographic center
         of that city.

    D. If only a county is known:
       - use a representative coordinate near the geographic center
         of that county.

    E. If the project clearly spans multiple REAL named locations,
       facilities, cities, counties, endpoints, or substations:
       - include multiple coordinates representing those real locations;
       - each coordinate must correspond to an actual named place
         supported by the project information.

    F. Do NOT create arbitrary coordinates simply to spread points
       across a large county, city, or state.

    G. Do NOT create multiple fake coordinates to simulate the physical
       size or route of a project.

    H. For a transmission line:
       - if both endpoints are known, include coordinates for both
         endpoints when reasonably identifiable;
       - if additional named substations or facilities along the route
         are explicitly identified, they may also be included.

    I. For a statewide project or a project whose location cannot be
       narrowed below the state level:
       - leave coordinates empty.

    J. Coordinates inferred from a city, county, or named facility are
       allowed to be approximate, but they must represent a real
       geographic place associated with the project.

13. One project may contain zero, one, or many coordinates.
    Do not duplicate the project because it has multiple locations.

14. Preserve approximate dates.
    If the source only gives a year, quarter, season, or approximate
    timeframe, do not invent a more precise date.

15. Include every source file that contributed information to a project.

16. For PDF files, include page numbers when they can be identified
    reliably.

17. TABLES ARE IMPORTANT.

    If a PDF or HTML file contains a table where individual rows
    represent projects:
    - inspect the table row by row;
    - extract every real project row;
    - do not summarize the table instead of extracting its projects;
    - preserve useful IDs, dates, locations, costs, descriptions,
      and statuses when available.

18. Return the COMPLETE UPDATED MASTER DATASET, not only the projects
    found in the new files.

The result must contain all previous valid projects plus all valid
updates and new projects found in this batch.
"""