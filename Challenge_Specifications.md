# Sperry Tech — Shell Hacks 2026 Challenge

## 1. What This Challenge Is

Power grid companies (“utilities”) each plan their own future construction projects — new power lines, upgraded substations, etc. — years in advance.

The problem: neighboring utilities in different states often plan this work without much visibility into what the other one is doing nearby.

### The Challenge

Build a tool that compares **at least two utilities' public future construction plans** and flags where their planned work overlaps — either because:

- The projects are **physically close** to each other, or
- They are **scheduled around the same time**.

### Why It Matters

When utilities coordinate on nearby projects, they can potentially share:

- Crews
- Equipment
- Right-of-way
- Substation capacity

This can save money and get infrastructure built faster. Right now, that coordination mostly doesn't happen at this level of detail.

This is a real, current problem. Federal regulators (**FERC**) issued a rule in 2024 — **Order No. 1920** — specifically because utilities have historically planned in isolation, leading to duplicated, inefficient work and delays in construction of our nation's infrastructure.

Our challenge is a smaller, hackathon-sized version of that same coordination problem.

---

# 2. The Two Utilities We're Using as an Example

### Utility 1: Dominion Energy South Carolina (DESC)

### Utility 2: Georgia Power (GPC)

Georgia Power is a founding sponsor of the same regional coordination forum DESC is joining (**SERTP**, see glossary), so this example for the challenge mirrors a real coordination relationship, not a made-up scenario.

More importantly, South Carolina and Georgia share a border (the Savannah River).

We confirmed real, currently-planned DESC projects:

- **Jasper**
- **Okatie**
- **Bluffton** near Savannah
- **Urquhart** near Augusta

These sit directly across the river from active Georgia Power work in the same two areas:

- A **Plant McIntosh expansion** near Savannah
- The **Thomson–Vogtle transmission line** near Augusta

DESC also owns an existing hydro plant physically located in **Martinez, GA**, near Augusta — so there's already a real cross of utilities overlapping.

### Optional Base Map Layer

**HIFLD (Homeland Infrastructure Foundation-Level Data)** provides public, downloadable GIS data on existing transmission lines and substations.

This can be useful as a backdrop layer, though it shares the same straight-line-approximation limitation noted in Section 4.

---

# 3. Vocabulary / Glossary

| Term | What it means |
|---|---|
| **Transmission line** | A high-voltage power line that moves electricity for long distances between power plants, substations, and regions. Different from smaller **distribution lines** that run to individual houses. |
| **Substation** | A facility where electricity is stepped up/down in voltage and routed between transmission lines. Think of it as a highway interchange for electricity. |
| **Right-of-way** | The strip of land a utility owns or has legal access to build/maintain a line. If two projects could share a right-of-way, that's a resource-sharing win. |
| **IRP (Integrated Resource Plan)** | A utility's official long-term plan for how it will generate and deliver power. Both Dominion Energy South Carolina and Georgia Power file one — DESC's is a 15-year plan with the SC PSC; Georgia Power's is a 10-year plan with the Georgia PSC. |
| **10-Year Transmission Plan** | Georgia Power's version of a long-term plan. It's not a separate filing, but a section embedded within their IRP, filed with the Georgia PSC. |
| **PSC (Public Service Commission)** | The state government agency that regulates utilities and reviews/approves their plans. Both SC and GA have one. |
| **FERC** | The federal agency (**Federal Energy Regulatory Commission**) that regulates interstate electricity transmission and sits above the state-level PSCs. |
| **FERC Order No. 1920** | A 2024 federal rule requiring utilities to do more coordinated, long-term regional transmission planning. The real-world reason for this challenge is relevant right now. |
| **SERTP** | **Southeastern Regional Transmission Planning** — a regional coordination forum founded by Southern Company (Georgia Power's parent) along with Georgia Transmission Corporation, MEAG, and others. DESC is in the process of joining SERTP as part of its own FERC Order 1920 compliance work — so both utilities in this challenge sit in the same regional forum. |
| **SCRTP** | **South Carolina Regional Transmission Planning** — the specific process Dominion Energy South Carolina and Santee Cooper use to publish their planned project lists. This is where our DESC data comes from. Dominion and Santee Cooper co-administer this process as peers — it's not a hierarchy. **Note:** DESC is transitioning from SCRTP to SERTP, so future project lists may move to a SERTP-published source — worth double-checking for a newer source before this challenge runs. |
| **CEII (Critical Energy Infrastructure Information)** | A special “confidential, do not share” label the government puts on sensitive grid data. Anything marked CEII is off-limits for this challenge — only public filings should be used. |
| **Geographic overlap** | Two planned projects are physically near or crossing each other on a map. |
| **Timeline overlap** | Two planned projects are scheduled to be built in the same window of time, even if not in the exact same spot. |

---

# 4. Challenge

## Challenge Title

# Gridlock Challenge

## What We Want You to Make

Build a tool that ingests **publicly available future-construction data** from at least two electric utilities, such as:

- Dominion Energy South Carolina
- Georgia Power

The tool should identify where their planned transmission projects overlap using **two definitions of overlap**.

---

## Geographic Overlap

Two planned projects count as overlapping if they are within:

> **40 km (25 miles)** of each other.

### Rule

- **Closer than 40 km → Flag it**
- **40 km or farther → Ignore it**

Measure the **closest points between two projects**, not their centers.

For example:

> A 60 km power line can still pass within 5 km of the other utility's substation, and that counts as an overlap.

### Why 40 km?

It's about how far a crew will drive from one staging yard in the morning.

Inside that distance, two utilities can potentially share:

- Crews
- Cranes
- Contractors
- Equipment

Outside that distance, they would likely set up separately anyway.

---

## Geographic Overlap Ranking

Closer overlaps are worth more, so rank them by distance:

| Distance | Potential Coordination Opportunity |
|---|---|
| **Touching / crossing** | Must coordinate — outage timing, crossing structures |
| **Under 1.6 km** | Can share the land itself — right-of-way, access roads, permits |
| **Under 8 km** | Can share site logistics — laydown yards, deliveries |
| **Under 40 km** | Can share crews and equipment |

---

## Timeline Overlap

Planned projects are considered to have **timeline overlap** when they are scheduled to be built during the same window of time.

### Important

Teams should treat:

1. **Geographic overlap** as the **primary signal**
2. **Timeline overlap** as a **strong secondary signal**

The two signals should be used **together** when identifying coordination opportunities.

---

# 5. Data Sources

Examples of data sources you can use:

- **Refer to:** `ShellHacks_finding_real_locations`
- **OneDrive PDF:** [www.OneDriveLinkHere.com](http://www.OneDriveLinkHere.com)

You are free to use whatever additional tools and public data sources you find.

> **Important:** Teams should expect most of the dataset to **NOT overlap** — finding the real matches is the point of the exercise.

---

# 6. What Teams Must Deliver

The format is up to you.

You can build:

- A web app
- Dashboard
- Notebook
- GIS application
- Or anything else

The tech stack is **not prescribed**.

### However, the output must be:

- Visually clear
- At least somewhat interactive
- Easy to understand

For example, use a map that users can:

- Pan
- Zoom
- Click into projects

Rather than presenting only a static image.

> **The goal is to be creative!**

---

## Required

### 1. Interactive UI

An interactive UI showing **both utilities' planned projects**, visually highlighting where overlaps occur.

### 2. Ranked Coordination Opportunities

A ranked list showing the **top coordination opportunities**, including which projects overlap.

---

## Bonus Points

### Cost / Impact Estimate

Provide a rough cost or impact estimate for at least **one flagged opportunity**.

For example:

- How much land the two projects could share instead of using separate land
- Potential savings from sharing equipment
- Potential savings from sharing crews
- Potential savings from shared site logistics
- A simple explanation of how much money could potentially be saved

---

# 7. Prizes

| Place | Prize |
|---|---|
| 🥇 **1st Place** | Guaranteed internship + laptop |
| 🥈 **2nd Place** | Internship interview + laptop |
| 🥉 **3rd Place** | Internship interview |