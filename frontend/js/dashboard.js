document.addEventListener(
    "DOMContentLoaded",
    function () {

        console.log(
            "GridAlign dashboard.js loaded"
        );


        // =========================
        // ELEMENTS
        // =========================

        const generateReportsButton =
            document.getElementById(
                "generate-reports"
            );


        // =========================
        // REPORT GENERATION
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


                    generateReportsButton.disabled = true;

                    generateReportsButton.textContent =
                        "Starting...";


                    try {

                        const response = await fetch(
                            "/api/generate-reports",
                            {
                                method: "POST"
                            }
                        );


                        const data =
                            await response.json();


                        if (!response.ok) {

                            alert(
                                data.detail ||
                                "Could not start report generation."
                            );

                            generateReportsButton.disabled =
                                false;

                            generateReportsButton.textContent =
                                "Generate AI Reports";

                            return;
                        }


                        generateReportsButton.textContent =
                            "Generating AI Reports...";


                        checkReportGenerationStatus();

                    } catch (error) {

                        console.error(
                            "Report generation error:",
                            error
                        );

                        alert(
                            "Could not connect to the server."
                        );

                        generateReportsButton.disabled =
                            false;

                        generateReportsButton.textContent =
                            "Generate AI Reports";
                    }
                }
            );

        } else {

            console.warn(
                "Generate reports button not found."
            );
        }


        // =========================
        // LOAD OVERVIEW
        // =========================

        loadOverview();

    }
);


// =========================
// REPORT STATUS
// =========================

async function checkReportGenerationStatus() {

    const button =
        document.getElementById(
            "generate-reports"
        );


    try {

        const response = await fetch(
            "/api/reports/status",
            {
                cache: "no-store"
            }
        );


        const status =
            await response.json();


        if (status.running) {

            if (button) {
                button.textContent =
                    "Generating AI Reports...";
            }

            setTimeout(
                checkReportGenerationStatus,
                2000
            );

            return;
        }


        if (button) {

            button.disabled = false;

            button.textContent =
                "Generate AI Reports";
        }


        if (
            status.message ===
            "AI reports generated successfully."
        ) {

            alert(
                "All AI reports were generated successfully."
            );

            window.location.reload();

        } else {

            alert(
                status.message
            );
        }


    } catch (error) {

        console.error(
            "Report status error:",
            error
        );


        if (button) {

            button.disabled = false;

            button.textContent =
                "Generate AI Reports";
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


        if (!response.ok) {

            throw new Error(
                "Could not load dashboard statistics."
            );
        }


        const data =
            await response.json();


        const matches =
            data.matches || [];


        console.log(
            "Matches:",
            matches.length
        );


        // =========================
        // MATCH COUNT
        // =========================

        const matchesElement =
            document.getElementById(
                "stat-matches"
            );

        if (matchesElement) {

            matchesElement.textContent =
                matches.length;
        }


        // =========================
        // UTILITIES
        // =========================

        const utilities =
            new Set();


        matches.forEach(match => {

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

        });


        const utilitiesElement =
            document.getElementById(
                "stat-utilities"
            );

        if (utilitiesElement) {

            utilitiesElement.textContent =
                utilities.size;
        }


        // =========================
        // UNIQUE PROJECTS
        // =========================

        const projects =
            new Set();


        matches.forEach(match => {

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

        });


        const projectsElement =
            document.getElementById(
                "stat-projects"
            );

        if (projectsElement) {

            projectsElement.textContent =
                projects.size;
        }


        console.log(
            "Utilities:",
            utilities.size
        );

        console.log(
            "Unique projects:",
            projects.size
        );


    } catch (error) {

        console.error(
            "GridAlign overview error:",
            error
        );

    }
}