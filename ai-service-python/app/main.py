import os
from pathlib import Path

from .report_generator import generate_reports

from dotenv import load_dotenv

from .gemini_client import GeminiClient
from .extraction_prompt import build_extraction_prompt


# GridAlign repository root
PROJECT_ROOT = Path(__file__).resolve().parents[2]

RAW_DATA = PROJECT_ROOT / "data" / "raw-pages"
PROCESSED_DATA = PROJECT_ROOT / "data" / "processed"


# Load API key
load_dotenv(
    PROJECT_ROOT / ".env"
)


# One company can have multiple source folders
COMPANIES = {

    "Georgia Power": [
        RAW_DATA / "georgia-power-irp",
        RAW_DATA / "georgia-power-transmission",
    ],

    "Dominion Energy South Carolina": [
        RAW_DATA / "scrtp",
    ],
}


def create_company_data():

    if not os.getenv("GEMINI_API_KEY"):
        raise RuntimeError(
            "GEMINI_API_KEY was not found "
            "in the .env file."
        )

    gemini = GeminiClient()

    PROCESSED_DATA.mkdir(
        parents=True,
        exist_ok=True
    )

    for company_name, folders in COMPANIES.items():

        print()
        print("=" * 60)
        print(
            f"Processing: {company_name}"
        )
        print("=" * 60)

        prompt = build_extraction_prompt(
            company_name
        )

        # Create safe output filename
        file_name = (
            company_name
            .lower()
            .replace(" ", "_")
        )

        output_file = (
            PROCESSED_DATA
            / f"{file_name}.json"
        )

        # Upload all raw files
        uploaded_files = (
            gemini.upload_folders(
                folders
            )
        )

        # Process them incrementally
        dataset = (
            gemini.extract_dataset_incrementally(
                uploaded_files=uploaded_files,
                company_name=company_name,
                prompt=prompt,
                output_file=output_file
            )
        )

        print()
        print(
            f"Finished: {company_name}"
        )
        print(
            f"Projects: "
            f"{len(dataset.projects)}"
        )
        print(
            f"Saved: {output_file}"
        )


def main():

    print()
    print("GridAlign AI Service")
    print("====================")
    print(
        "1 - Create structured data"
    )
    print(
        "2 - Generate AI report"
    )
    print()

    option = input(
        "Select option: "
    ).strip()

    if option == "1":

        create_company_data()

    elif option == "2":

         generate_reports()

    else:

        print(
            "Invalid option."
        )


if __name__ == "__main__":
    main()