const generateReportsButton =
    document.getElementById("generate-reports");


// =========================
// REPORT GENERATION
// =========================

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


            const data = await response.json();


            if (!response.ok) {

                alert(
                    data.detail ||
                    "Could not start report generation."
                );

                generateReportsButton.disabled = false;

                generateReportsButton.textContent =
                    "Generate AI Reports";

                return;
            }


            generateReportsButton.textContent =
                "Generating AI Reports...";


            checkReportGenerationStatus();

        } catch (error) {

            console.error(error);

            alert(
                "Could not connect to the server."
            );

            generateReportsButton.disabled = false;

            generateReportsButton.textContent =
                "Generate AI Reports";
        }
    }
);


// =========================
// CHECK STATUS
// =========================

async function checkReportGenerationStatus() {

    try {

        const response = await fetch(
            "/api/reports/status"
        );

        const status = await response.json();


        if (status.running) {

            generateReportsButton.textContent =
                "Generating AI Reports...";

            setTimeout(
                checkReportGenerationStatus,
                2000
            );

            return;
        }


        generateReportsButton.disabled = false;

        generateReportsButton.textContent =
            "Generate AI Reports";


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

        console.error(error);

        generateReportsButton.disabled = false;

        generateReportsButton.textContent =
            "Generate AI Reports";
    }
}