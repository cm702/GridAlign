import time
from pathlib import Path

from google import genai
from google.genai import types

from .schemas import CompanyDataset


MODEL = "gemini-3.8-flash"

BATCH_SIZE = 4

SUPPORTED_EXTENSIONS = {
    ".pdf",
    ".html",
    ".htm",
}


class GeminiClient:

    def __init__(self):
        self.client = genai.Client()

    def upload_folders(self, folders: list[Path]):
        """
        Upload every supported file from all folders belonging
        to the same company.
        """

        files_to_upload = []

        for folder in folders:

            if not folder.exists():
                raise FileNotFoundError(
                    f"Folder does not exist: {folder}"
                )

            for path in folder.rglob("*"):

                if (
                    path.is_file()
                    and path.suffix.lower() in SUPPORTED_EXTENSIONS
                ):
                    files_to_upload.append(
                        (folder, path)
                    )

        files_to_upload.sort(
            key=lambda item: str(item[1])
        )

        if not files_to_upload:
            raise ValueError(
                "No supported PDF or HTML files were found."
            )

        print()
        print(
            f"Found {len(files_to_upload)} files to upload."
        )
        print()

        uploaded_files = []

        for source_folder, path in files_to_upload:

            # Prevent duplicate names such as:
            # document_00001.pdf from different folders
            source_name = (
                f"{source_folder.name}__{path.name}"
            )

            print(
                f"Uploading: {source_name}"
            )

            uploaded_file = self.client.files.upload(
                file=path,
                config=types.UploadFileConfig(
                    display_name=source_name
                )
            )

            uploaded_files.append(
                uploaded_file
            )

        print()
        print("All files uploaded.")
        print("Waiting for Gemini to process them...")
        print()

        ready_files = []

        for uploaded_file in uploaded_files:

            ready_file = self.wait_until_ready(
                uploaded_file
            )

            ready_files.append(
                ready_file
            )

        print()
        print("All files are ready.")
        print()

        return ready_files

    def wait_until_ready(self, uploaded_file):
        """
        Wait until Gemini finishes processing one uploaded file.
        """

        current_file = uploaded_file

        while True:

            current_file = self.client.files.get(
                name=current_file.name
            )

            if (
                current_file.state
                and current_file.state.name == "ACTIVE"
            ):
                print(
                    f"Ready: {current_file.display_name}"
                )

                return current_file

            if (
                current_file.state
                and current_file.state.name == "FAILED"
            ):
                raise RuntimeError(
                    f"Gemini failed to process: "
                    f"{current_file.display_name}"
                )

            print(
                f"Processing: "
                f"{current_file.display_name}"
            )

            time.sleep(2)

    def extract_dataset_incrementally(
        self,
        uploaded_files,
        company_name: str,
        prompt: str,
        output_file: Path
    ) -> CompanyDataset:
        """
        Process company files incrementally.

        Current master JSON + next batch of files
                        ↓
                      Gemini
                        ↓
               updated master JSON
        """

        if not uploaded_files:
            raise ValueError(
                "No uploaded files were provided."
            )

        # If an existing master file exists, continue from it.
        if output_file.exists():

            print()
            print(
                f"Existing master dataset found:"
            )
            print(output_file)
            print("Continuing from existing data...")

            master_dataset = (
                CompanyDataset.model_validate_json(
                    output_file.read_text(
                        encoding="utf-8"
                    )
                )
            )

        else:

            print()
            print("Creating new master dataset...")

            master_dataset = CompanyDataset(
                company_name=company_name,
                projects=[]
            )

        total_batches = (
            len(uploaded_files)
            + BATCH_SIZE
            - 1
        ) // BATCH_SIZE

        for start in range(
            0,
            len(uploaded_files),
            BATCH_SIZE
        ):

            batch = uploaded_files[
                start:start + BATCH_SIZE
            ]

            batch_number = (
                start // BATCH_SIZE
            ) + 1

            print()
            print("=" * 60)
            print(
                f"Batch {batch_number}/{total_batches}"
            )
            print(
                f"Files in batch: {len(batch)}"
            )
            print(
                f"Current projects: "
                f"{len(master_dataset.projects)}"
            )
            print("=" * 60)

            master_json = (
                master_dataset.model_dump_json(
                    indent=2
                )
            )

            current_master_text = f"""
CURRENT MASTER DATASET:

{master_json}

Now analyze the NEW FILES attached to this request.

Return the COMPLETE UPDATED MASTER DATASET.
"""

            contents = [
                prompt,
                current_master_text,
                *batch
            ]

            response = (
                self.client.models.generate_content(
                    model=MODEL,
                    contents=contents,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        response_schema=CompanyDataset,
                        temperature=0.1,
                    ),
                )
            )

            if not response.text:
                raise RuntimeError(
                    f"Gemini returned an empty response "
                    f"for batch {batch_number}."
                )

            # Gemini returns the COMPLETE updated master
            master_dataset = (
                CompanyDataset.model_validate_json(
                    response.text
                )
            )

            # Save progress after EVERY batch
            output_file.parent.mkdir(
                parents=True,
                exist_ok=True
            )

            output_file.write_text(
                master_dataset.model_dump_json(
                    indent=2
                ),
                encoding="utf-8"
            )

            print(
                f"Master updated: "
                f"{len(master_dataset.projects)} projects"
            )

            print(
                f"Progress saved to: {output_file}"
            )

        print()
        print("=" * 60)
        print("COMPANY COMPLETE")
        print("=" * 60)
        print(
            f"Final projects: "
            f"{len(master_dataset.projects)}"
        )

        return master_dataset
        
    def generate_report(
        self,
        prompt: str
    ) -> str:
        """
        Generate one GridAlign coordination report
        from one project match.
        """

        print(
            "Sending match to Gemini "
            "for coordination analysis..."
        )

        response = (
            self.client.models.generate_content(
                model=MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.2,
                ),
            )
        )

        if not response.text:
            raise RuntimeError(
                "Gemini returned an empty report."
            )

        return response.text.strip()

    