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

            return;
        }


        const data =
            await response.json();


        const matches =
            data.matches || [];


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
    }
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