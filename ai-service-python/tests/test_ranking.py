import tempfile
import unittest
from pathlib import Path

from app.ranking import (
    extract_cost_savings,
    rank_matches,
    timeline_compatibility,
    update_cost_savings,
    write_rankings,
)


def make_match(distance, start_a, end_a, start_b, end_b, name="A"):
    return {
        "company_a": "Utility A",
        "company_b": "Utility B",
        "distance_km": distance,
        "project_a": {
            "project_name": name,
            "start_date": start_a,
            "end_date": end_a,
        },
        "project_b": {
            "project_name": f"{name} counterpart",
            "start_date": start_b,
            "end_date": end_b,
        },
    }


class RankingTests(unittest.TestCase):

    def test_timeline_overlap_uses_year_and_quarter_windows(self):
        self.assertEqual(
            timeline_compatibility(
                make_match(5, "2027", "2028", "Q3 2027", "Q1 2028")
            )["status"],
            "overlap",
        )

    def test_missing_or_unparseable_timeline_is_unknown(self):
        self.assertEqual(
            timeline_compatibility(
                make_match(5, "TBD", None, "2027", "2028")
            )["status"],
            "unknown",
        )

    def test_rank_balances_distance_and_timeline(self):
        close_but_no_overlap = make_match(
            1, "2024", "2024", "2026", "2026", "Close"
        )
        farther_with_overlap = make_match(
            10, "2027", "2028", "2027", "2028", "Overlap"
        )

        ranked = rank_matches([
            close_but_no_overlap,
            farther_with_overlap,
        ])

        self.assertEqual(
            [item["project_a"]["project_name"] for item in ranked],
            ["Overlap", "Close"],
        )
        self.assertEqual(ranked[0]["rank"], 1)
        self.assertEqual(ranked[1]["rank"], 2)
        self.assertEqual(ranked[0]["ranking"]["score"], 80.8)
        self.assertEqual(ranked[1]["ranking"]["score"], 65.7)

    def test_geographic_score_varies_smoothly_between_challenge_bands(self):
        ranked = rank_matches([
            make_match(distance, None, None, None, None, str(distance))
            for distance in (0, 1.6, 4.8, 8, 24, 40)
        ])
        by_name = {
            item["project_a"]["project_name"]: item["ranking"]["geographic_score"]
            for item in ranked
        }

        self.assertEqual(by_name["0"], 100)
        self.assertEqual(by_name["1.6"], 90)
        self.assertEqual(by_name["4.8"], 82.5)
        self.assertEqual(by_name["8"], 75)
        self.assertEqual(by_name["24"], 55)
        self.assertEqual(by_name["40"], 35)

    def test_partial_timeline_overlap_gets_proportional_score(self):
        result = timeline_compatibility(
            make_match(5, "2027", "2028", "2028", "2029")
        )

        self.assertEqual(result["status"], "overlap")
        self.assertEqual(result["score"], 50.1)

    def test_unknown_timeline_uses_neutral_component(self):
        ranked = rank_matches([
            make_match(5, None, None, "2027", "2028")
        ])

        self.assertEqual(ranked[0]["ranking"]["timeline_status"], "unknown")
        self.assertEqual(ranked[0]["ranking"]["timeline_score"], 50)
        self.assertEqual(ranked[0]["ranking"]["score"], 72.4)

    def test_distance_scores_follow_challenge_bands(self):
        ranked = rank_matches([
            make_match(distance, None, None, None, None, str(distance))
            for distance in (0, 1.6, 8, 40, 40.1)
        ])
        by_name = {
            item["project_a"]["project_name"]: item["ranking"]
            for item in ranked
        }

        self.assertEqual(by_name["0"]["geographic_score"], 100)
        self.assertEqual(by_name["1.6"]["geographic_score"], 90)
        self.assertEqual(by_name["8"]["geographic_score"], 75)
        self.assertEqual(by_name["40"]["geographic_score"], 35)
        self.assertEqual(by_name["40.1"]["geographic_score"], 0)

    def test_cost_savings_section_is_extracted_without_markdown(self):
        report = (
            "POTENTIAL BENEFITS\n"
            "Coordinate deliveries.\n"
            "COST-SAVING OPPORTUNITIES\n"
            "- No filing-supported cost-saving information is available.\n"
            "RISKS AND LIMITATIONS\n"
            "Schedules may differ.\n"
        )

        self.assertEqual(
            extract_cost_savings(report),
            {
                "status": "unavailable",
                "items": [
                    "No filing-supported cost-saving information is available.",
                ],
            },
        )

    def test_reported_cost_opportunity_is_retained_in_separate_ranking_file(self):
        match = {
            **make_match(2, "2027", "2028", "2027", "2028"),
            "match_id": 7,
        }
        report = (
            "COST-SAVING OPPORTUNITIES\n"
            "- Coordinate deliveries using the shared access area.\n"
            "RISKS AND LIMITATIONS\n"
        )

        with tempfile.TemporaryDirectory() as temporary_directory:
            output_file = (
                Path(temporary_directory)
                / "rankings"
                / "priority_rankings.json"
            )
            artifact = write_rankings([match], output_file)
            update_cost_savings(7, report, output_file)
            refreshed_artifact = write_rankings([match], output_file)

            self.assertTrue(output_file.exists())
            self.assertEqual(artifact["matches"][0]["match_id"], 7)
            self.assertEqual(
                refreshed_artifact["matches"][0]["cost_savings"],
                {
                    "status": "reported",
                    "items": [
                        "Coordinate deliveries using the shared access area."
                    ],
                },
            )


if __name__ == "__main__":
    unittest.main()
