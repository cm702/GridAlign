// =========================
// GRIDALIGN DASHBOARD
// =========================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        console.log(
            "GridAlign dashboard loaded"
        );


        const refreshDataButton =
            document.getElementById(
                "refresh-data"
            );

        const runMatcherButton =
            document.getElementById(
                "run-matcher"
            );

        const generateReportsButton =
            document.getElementById(
                "generate-reports"
            );

        const logoutButton =
            document.getElementById(
                "logout-button"
            );


        // =========================
        // REFRESH PROJECT DATA
        // =========================

        if (refreshDataButton) {

            refreshDataButton.addEventListener(
                "click",
                async function () {

                    const confirmed = confirm(
                        "Process the utility source data again?"
                    );


                    if (!confirmed) {
                        return;
                    }


                    await startJob({

                        button:
                            refreshDataButton,

                        endpoint:
                            "/api/refresh-data",

                        statusEndpoint:
                            "/api/refresh-data/status",

                        logElement:
                            "refresh-data-log",

                        runningText:
                            "Processing Project Data...",

                        normalText:
                            "Refresh Project Data",

                        successMessage:
                            "Project data processed successfully.",

                        afterSuccess:
                            function () {

                                alert(
                                    "Project data processed successfully.\n\nRun Project Matcher next."
                                );
                            }
                    });

                }
            );
        }


        // =========================
        // RUN PROJECT MATCHER
        // =========================

        if (runMatcherButton) {

            runMatcherButton.addEventListener(
                "click",
                async function () {

                    const confirmed = confirm(
                        "Run the Java Project Matcher?"
                    );


                    if (!confirmed) {
                        return;
                    }


                    await startJob({

                        button:
                            runMatcherButton,

                        endpoint:
                            "/api/run-matcher",

                        statusEndpoint:
                            "/api/run-matcher/status",

                        logElement:
                            "run-matcher-log",

                        runningText:
                            "Running Matcher...",

                        normalText:
                            "Run Project Matcher",

                        successMessage:
                            "Project matching completed successfully.",

                        afterSuccess:
                            function () {

                                alert(
                                    "Project matching completed successfully."
                                );

                                window.location.reload();
                            }
                    });

                }
            );
        }


        // =========================
        // GENERATE REPORTS
        // =========================

        if (generateReportsButton) {

            generateReportsButton.addEventListener(
                "click",
                async function () {

                    const confirmed = confirm(
                        "Generate AI reports for all detected matches?"
                    );


                    if (!confirmed) {
                        return;
                    }


                    await startJob({

                        button:
                            generateReportsButton,

                        endpoint:
                            "/api/generate-reports",

                        statusEndpoint:
                            "/api/reports/status",

                        logElement:
                            "generate-reports-log",

                        runningText:
                            "Generating AI Reports...",

                        normalText:
                            "Generate AI Reports",

                        successMessage:
                            "AI reports generated successfully.",

                        afterSuccess:
                            function () {

                                alert(
                                    "All AI reports were generated successfully."
                                );

                                window.location.reload();
                            }
                    });

                }
            );
        }


        // =========================
        // LOGOUT
        // =========================

        if (logoutButton) {

            logoutButton.addEventListener(
                "click",
                async function () {

                    try {

                        await fetch(
                            "/api/logout",
                            {
                                method: "POST"
                            }
                        );

                    } catch (error) {

                        console.error(
                            "Logout error:",
                            error
                        );
                    }


                    window.location.href = "/";
                }
            );
        }


        // =========================
        // INITIAL LOAD
        // =========================

        loadOverview();

        restoreJobStatuses();

    }
);


// =========================
// AUTH CHECK
// =========================

function handleUnauthorized(
    response
) {

    if (response.status === 401) {

        window.location.href = "/";

        return true;
    }

    return false;
}


// =========================
// UPDATE TERMINAL
// =========================

function updateJobLog(
    elementId,
    status
) {

    const element =
        document.getElementById(
            elementId
        );


    if (!element) {
        return;
    }


    const lines =
        status.log || [];


    if (lines.length === 0) {

        element.textContent = "";

        element.classList.remove(
            "active"
        );

        return;
    }


    element.classList.add(
        "active"
    );


    element.textContent =
        lines.join("\n");


    element.scrollTop =
        element.scrollHeight;
}


// =========================
// START JOB
// =========================

async function startJob(
    options
) {

    const {
        button,
        endpoint,
        statusEndpoint,
        logElement,
        runningText,
        normalText,
        successMessage,
        afterSuccess
    } = options;


    button.disabled = true;

    button.textContent =
        runningText;


    const logBox =
        document.getElementById(
            logElement
        );


    if (logBox) {

        logBox.textContent =
            "Starting...";

        logBox.classList.add(
            "active"
        );
    }


    try {

        const response = await fetch(
            endpoint,
            {
                method: "POST",
                cache: "no-store"
            }
        );


        if (
            handleUnauthorized(
                response
            )
        ) {
            return;
        }


        const data =
            await response.json();


        if (!response.ok) {

            alert(
                data.detail ||
                "Could not start operation."
            );


            button.disabled = false;

            button.textContent =
                normalText;


            return;
        }


        pollJobStatus({
            button,
            statusEndpoint,
            logElement,
            runningText,
            normalText,
            successMessage,
            afterSuccess
        });


    } catch (error) {

        console.error(
            "Job start error:",
            error
        );


        button.disabled = false;

        button.textContent =
            normalText;


        alert(
            "Could not connect to the server."
        );
    }
}


// =========================
// POLL JOB
// =========================

async function pollJobStatus(
    options
) {

    const {
        button,
        statusEndpoint,
        logElement,
        runningText,
        normalText,
        successMessage,
        afterSuccess
    } = options;


    try {

        const response = await fetch(
            statusEndpoint,
            {
                cache: "no-store"
            }
        );


        if (
            handleUnauthorized(
                response
            )
        ) {
            return;
        }


        if (!response.ok) {

            throw new Error(
                "Could not read job status."
            );
        }


        const status =
            await response.json();


        updateJobLog(
            logElement,
            status
        );


        if (status.running) {

            button.disabled = true;

            button.textContent =
                runningText;


            setTimeout(
                function () {

                    pollJobStatus(
                        options
                    );

                },
                1000
            );


            return;
        }


        button.disabled = false;

        button.textContent =
            normalText;


        if (
            status.message ===
            successMessage
        ) {

            if (afterSuccess) {

                afterSuccess();
            }


            return;
        }


        if (
            status.message &&
            status.message !== "Idle"
        ) {

            alert(
                status.message
            );
        }


    } catch (error) {

        console.error(
            "Job status error:",
            error
        );


        button.disabled = false;

        button.textContent =
            normalText;
    }
}


// =========================
// RESTORE JOB STATUS
// =========================

async function restoreJobStatuses() {

    const jobs = [

        {
            button:
                document.getElementById(
                    "refresh-data"
                ),

            statusEndpoint:
                "/api/refresh-data/status",

            logElement:
                "refresh-data-log",

            runningText:
                "Processing Project Data...",

            normalText:
                "Refresh Project Data",

            successMessage:
                "Project data processed successfully.",

            afterSuccess:
                function () {}
        },


        {
            button:
                document.getElementById(
                    "run-matcher"
                ),

            statusEndpoint:
                "/api/run-matcher/status",

            logElement:
                "run-matcher-log",

            runningText:
                "Running Matcher...",

            normalText:
                "Run Project Matcher",

            successMessage:
                "Project matching completed successfully.",

            afterSuccess:
                function () {}
        },


        {
            button:
                document.getElementById(
                    "generate-reports"
                ),

            statusEndpoint:
                "/api/reports/status",

            logElement:
                "generate-reports-log",

            runningText:
                "Generating AI Reports...",

            normalText:
                "Generate AI Reports",

            successMessage:
                "AI reports generated successfully.",

            afterSuccess:
                function () {}
        }

    ];


    for (const job of jobs) {

        if (!job.button) {
            continue;
        }


        try {

            const response = await fetch(
                job.statusEndpoint,
                {
                    cache: "no-store"
                }
            );


            if (
                handleUnauthorized(
                    response
                )
            ) {
                return;
            }


            if (!response.ok) {
                continue;
            }


            const status =
                await response.json();


            updateJobLog(
                job.logElement,
                status
            );


            if (status.running) {

                job.button.disabled = true;

                job.button.textContent =
                    job.runningText;


                pollJobStatus(
                    job
                );

            } else {

                job.button.disabled = false;

                job.button.textContent =
                    job.normalText;
            }


        } catch (error) {

            console.error(
                "Could not restore job:",
                error
            );
        }
    }
}


// =========================
// DASHBOARD OVERVIEW
// =========================

async function loadOverview() {

    try {

        const response = await fetch(
            "/api/matches",
            {
                cache: "no-store"
            }
        );


        if (
            handleUnauthorized(
                response
            )
        ) {
            return;
        }


        if (!response.ok) {

            // This is normal if matches.json
            // has not been created yet.

            setOverviewValue(
                "stat-matches",
                "0"
            );

            setOverviewValue(
                "stat-utilities",
                "0"
            );

            setOverviewValue(
                "stat-projects",
                "0"
            );

            renderRankings([]);

            return;
        }


        const data =
            await response.json();


        const matches =
            data.matches || [];

        renderRankings(matches);


        // =========================
        // MATCHES
        // =========================

        setOverviewValue(
            "stat-matches",
            matches.length
        );


        // =========================
        // UTILITIES
        // =========================

        const utilities =
            new Set();


        matches.forEach(
            function (match) {

                if (match.company_a) {

                    utilities.add(
                        match.company_a
                    );
                }


                if (match.company_b) {

                    utilities.add(
                        match.company_b
                    );
                }
            }
        );


        setOverviewValue(
            "stat-utilities",
            utilities.size
        );


        // =========================
        // UNIQUE PROJECTS
        // =========================

        const projects =
            new Set();


        matches.forEach(
            function (match) {

                if (
                    match.project_a &&
                    match.project_a.project_name
                ) {

                    projects.add(
                        match.company_a
                        + "|"
                        + match.project_a.project_name
                    );
                }


                if (
                    match.project_b &&
                    match.project_b.project_name
                ) {

                    projects.add(
                        match.company_b
                        + "|"
                        + match.project_b.project_name
                    );
                }
            }
        );


        setOverviewValue(
            "stat-projects",
            projects.size
        );


        console.log(
            "Matches:",
            matches.length
        );

        console.log(
            "Utilities:",
            utilities.size
        );

        console.log(
            "Projects:",
            projects.size
        );


    } catch (error) {

        console.error(
            "Overview error:",
            error
        );

        const rankingsElement =
            document.getElementById(
                "ranked-opportunities"
            );

        if (rankingsElement) {
            rankingsElement.textContent =
                "Ranked opportunities could not be loaded.";
        }
    }
}


// =========================
// RANKED OPPORTUNITIES
// =========================

function renderRankings(matches) {

    const container =
        document.getElementById(
            "ranked-opportunities"
        );

    if (!container) {
        return;
    }

    container.replaceChildren();

    if (!Array.isArray(matches) || matches.length === 0) {
        const emptyMessage =
            document.createElement("p");

        emptyMessage.className =
            "ranked-opportunity-empty";

        emptyMessage.textContent =
            "No coordination matches are available yet. Run the project matcher to identify opportunities.";

        container.appendChild(emptyMessage);
        return;
    }

    matches.forEach(function (match) {

        const projectA =
            match.project_a || {};

        const projectB =
            match.project_b || {};

        const ranking =
            match.ranking || {};

        const costSavings =
            match.cost_savings || {};

        const card =
            document.createElement("article");

        card.className =
            "ranked-opportunity-card";

        const topline =
            document.createElement("div");

        topline.className =
            "ranked-opportunity-topline";

        const rank =
            document.createElement("span");

        rank.className =
            "ranked-opportunity-rank";

        rank.textContent =
            `Priority ${match.rank || "--"}`;

        const score =
            document.createElement("span");

        score.className =
            "ranked-opportunity-score";

        score.textContent =
            `Balanced score ${Number(ranking.score || 0).toFixed(1)} / 100`;

        topline.append(rank, score);
        card.appendChild(topline);

        const title =
            document.createElement("h3");

        title.textContent =
            `${projectA.project_name || "Project A"} ↔ ${projectB.project_name || "Project B"}`;

        card.appendChild(title);

        const companies =
            document.createElement("p");

        companies.className =
            "ranked-opportunity-companies";

        companies.textContent =
            `${match.company_a || "Utility A"} ↔ ${match.company_b || "Utility B"}`;

        card.appendChild(companies);

        const timelineLabels = {
            overlap: "Schedule windows overlap",
            no_overlap: "No schedule overlap found",
            unknown: "Schedule compatibility unknown"
        };

        const distance =
            Number(match.distance_km);

        const meta =
            document.createElement("p");

        meta.className =
            "ranked-opportunity-meta";

        meta.textContent =
            `Distance: ${Number.isFinite(distance) ? `${distance.toFixed(2)} km` : "Not available"} · Geography: ${ranking.geographic_score ?? "N/A"}/100 · Timeline: ${timelineLabels[ranking.timeline_status] || "Not available"} (${ranking.timeline_score ?? "N/A"}/100)`;

        card.appendChild(meta);

        const costSection =
            document.createElement("section");

        costSection.className =
            "ranked-opportunity-costs";

        const costHeading =
            document.createElement("h4");

        costHeading.textContent =
            "Cost-saving opportunities";

        costSection.appendChild(costHeading);

        const costList =
            document.createElement("ul");

        const costItems =
            Array.isArray(costSavings.items)
                ? costSavings.items
                : [];

        if (costItems.length === 0) {
            const unavailableItem =
                document.createElement("li");

            unavailableItem.textContent =
                costSavings.status === "unavailable"
                    ? "No filing-supported cost-saving information is available."
                    : "Cost-saving information is not available yet.";

            costList.appendChild(unavailableItem);
        } else {
            costItems.forEach(function (item) {
                const listItem =
                    document.createElement("li");

                listItem.textContent =
                    item;

                costList.appendChild(listItem);
            });
        }

        costSection.appendChild(costList);
        card.appendChild(costSection);

        if (Array.isArray(ranking.reasons)) {
            const reason =
                document.createElement("p");

            reason.className =
                "ranked-opportunity-reason";

            reason.textContent =
                ranking.reasons.join(" ");

            card.appendChild(reason);
        }

        if (match.report_available) {
            const actions =
                document.createElement("div");

            actions.className =
                "ranked-opportunity-actions";

            const reportLink =
                document.createElement("a");

            reportLink.className =
                "ranked-opportunity-report";

            reportLink.href =
                `/api/reports/${match.match_id}`;

            reportLink.textContent =
                "Download AI Report";

            actions.appendChild(reportLink);
            card.appendChild(actions);
        }

        container.appendChild(card);
    });
}


// =========================
// SET OVERVIEW VALUE
// =========================

function setOverviewValue(
    id,
    value
) {

    const element =
        document.getElementById(
            id
        );


    if (element) {

        element.textContent =
            value;
    }
}