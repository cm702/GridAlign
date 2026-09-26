const map = L.map("map").setView(
    [33.2, -81.2],
    7
);


// =========================
// BASE MAP
// =========================

L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors"
    }
).addTo(map);


// =========================
// COLORS
// =========================

const georgiaStyle = {
    radius: 7,
    color: "#93c5fd",
    fillColor: "#2563eb",
    fillOpacity: 1,
    weight: 2
};

const dominionStyle = {
    radius: 7,
    color: "#fde68a",
    fillColor: "#f59e0b",
    fillOpacity: 1,
    weight: 2
};


// =========================
// HELPERS
// =========================

function safe(value, fallback = "Not available") {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return fallback;
    }

    return value;
}


function escapeHtml(value) {

    return String(safe(value))
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


// =========================
// PROJECT COORDINATES
// =========================

function getCoordinates(project) {

    if (
        !project ||
        !Array.isArray(project.coordinates)
    ) {
        return [];
    }

    return project.coordinates
        .filter(point =>
            point.latitude !== null &&
            point.latitude !== undefined &&
            point.longitude !== null &&
            point.longitude !== undefined
        )
        .map(point => [
            Number(point.latitude),
            Number(point.longitude)
        ]);
}


// =========================
// DISTANCE
// =========================

function haversine(a, b) {

    const earthRadius = 6371;

    const lat1 = a[0] * Math.PI / 180;
    const lat2 = b[0] * Math.PI / 180;

    const dLat =
        (b[0] - a[0]) * Math.PI / 180;

    const dLon =
        (b[1] - a[1]) * Math.PI / 180;

    const value =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1) *
        Math.cos(lat2) *
        Math.sin(dLon / 2) ** 2;

    return (
        2 *
        earthRadius *
        Math.asin(Math.sqrt(value))
    );
}


// Find the closest known points
// between both projects.

function closestPoints(coordsA, coordsB) {

    let bestA = null;
    let bestB = null;

    let minimum = Infinity;

    coordsA.forEach(a => {

        coordsB.forEach(b => {

            const distance =
                haversine(a, b);

            if (distance < minimum) {

                minimum = distance;

                bestA = a;
                bestB = b;
            }

        });

    });

    return {
        pointA: bestA,
        pointB: bestB
    };
}


// =========================
// LABEL
// =========================

function createLabel(project) {

    return `
        <div class="project-map-label">

            <strong>
                ${escapeHtml(project.project_name)}
            </strong>

            <span>
                ${escapeHtml(project.start_date)}
                →
                ${escapeHtml(project.end_date)}
            </span>

        </div>
    `;
}


// =========================
// POPUP
// =========================

function createPopup(
    project,
    company,
    matchId,
    distance,
    reportAvailable
) {

    let reportSection;

    if (reportAvailable) {

        reportSection = `
            <a
                href="/api/reports/${matchId}"
                class="map-report-button"
            >
                Download AI Report
            </a>
        `;

    } else {

        reportSection = `
            <div class="map-report-unavailable">
                AI report not generated yet
            </div>
        `;
    }


    return `
        <div class="gridalign-popup">

            <div class="popup-utility">
                ${escapeHtml(company)}
            </div>

            <h3>
                ${escapeHtml(project.project_name)}
            </h3>

            <div class="popup-details">

                <div>
                    <strong>Location</strong>

                    <span>
                        ${escapeHtml(project.location)}
                    </span>
                </div>

                <div>
                    <strong>City</strong>

                    <span>
                        ${escapeHtml(project.city)}
                    </span>
                </div>

                <div>
                    <strong>County</strong>

                    <span>
                        ${escapeHtml(project.county)}
                    </span>
                </div>

                <div>
                    <strong>State</strong>

                    <span>
                        ${escapeHtml(project.state)}
                    </span>
                </div>

                <div>
                    <strong>Status</strong>

                    <span>
                        ${escapeHtml(project.status)}
                    </span>
                </div>

                <div>
                    <strong>Start</strong>

                    <span>
                        ${escapeHtml(project.start_date)}
                    </span>
                </div>

                <div>
                    <strong>End</strong>

                    <span>
                        ${escapeHtml(project.end_date)}
                    </span>
                </div>

                <div>
                    <strong>Distance</strong>

                    <span>
                        ${distance.toFixed(2)} km
                    </span>
                </div>

            </div>

            ${reportSection}

        </div>
    `;
}


// =========================
// DRAW PROJECT
// =========================

function drawProject(
    project,
    company,
    style,
    matchId,
    distance,
    reportAvailable
) {

    const coordinates =
        getCoordinates(project);


    if (coordinates.length === 0) {
        return [];
    }


    // If the project contains several known
    // coordinates, draw its path.

    if (coordinates.length > 1) {

        L.polyline(
            coordinates,
            {
                color: style.fillColor,
                weight: 3,
                opacity: 0.7
            }
        ).addTo(map);

    }


    // Main point used for label/popup

    const mainPoint = coordinates[0];


    L.circleMarker(
    mainPoint,
    style
)
    .addTo(map)

    .bindPopup(
        createPopup(
            project,
            company,
            matchId,
            distance,
            reportAvailable
        )
    );

    coordinates
        .slice(1)
        .forEach(point => {

            L.circleMarker(
                point,
                {
                    ...style,
                    radius: 4
                }
            )
                .addTo(map)

                .bindPopup(
                    createPopup(
                        project,
                        company,
                        matchId,
                        distance,
                        reportAvailable
                    )
                );

        });


    return coordinates;
}


// =========================
// LOAD MATCHES
// =========================

async function loadMatches() {

    try {

        const response =
            await fetch(
            "/api/matches",
            {
                cache: "no-store"
            }
        );


        if (!response.ok) {

            throw new Error(
                "Could not load matches."
            );

        }


        const data =
            await response.json();


        // IMPORTANT:
        // matches are inside data.matches

        const matches =
            data.matches || [];


        console.log(
            "GridAlign matches loaded:",
            matches.length
        );


        const allPoints = [];


        matches.forEach(match => {

            const projectA =
                match.project_a;

            const projectB =
                match.project_b;

            const companyA =
                match.company_a;

            const companyB =
                match.company_b;

            const distance =
                Number(match.distance_km);

            const matchId =
                match.match_id;

            const reportAvailable =
                match.report_available;


            const coordsA =
                drawProject(
                    projectA,
                    companyA,
                    georgiaStyle,
                    matchId,
                    distance,
                    reportAvailable
                );


            const coordsB =
                drawProject(
                    projectB,
                    companyB,
                    dominionStyle,
                    matchId,
                    distance,
                    reportAvailable
                );


            if (
                coordsA.length === 0 ||
                coordsB.length === 0
            ) {
                return;
            }


            // Determine closest known
            // pair of points.

            const closest =
                closestPoints(
                    coordsA,
                    coordsB
                );


            if (
                closest.pointA &&
                closest.pointB
            ) {

                L.polyline(
                    [
                        closest.pointA,
                        closest.pointB
                    ],
                    {
                        color: "#475569",
                        weight: 2,
                        opacity: 0.8,
                        dashArray: "7, 7"
                    }
                )
                    .addTo(map)

                    .bindTooltip(
                        `Match #${matchId} · ${distance.toFixed(2)} km`
                    );

            }


            allPoints.push(
                ...coordsA,
                ...coordsB
            );

        });


        // =========================
        // AUTO CENTER
        // =========================

        if (allPoints.length > 0) {

            map.fitBounds(
                allPoints,
                {
                    padding: [60, 60]
                }
            );

        }

    } catch (error) {

        console.error(
            "GridAlign map error:",
            error
        );

    }

}


loadMatches();