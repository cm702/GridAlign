import copy
import hashlib
import json
import re
import tempfile
from calendar import monthrange
from datetime import date, datetime
from math import isfinite
from pathlib import Path


RANKING_METHOD = (
    "Weighted average favoring geographic proximity (70%) over schedule compatibility (30%). "
    "Geographic scores interpolate between the challenge distance bands "
    "(0 km: 100, 1.6 km: 90, 8 km: 75, 40 km: 35; beyond 40 km: 0). "
    "Timeline scores are the share of the shorter schedule window that "
    "overlaps (0-100), and a neutral 50 when dates are unknown. Ties use "
    "company/project names and then the original match id."
)

_COST_SECTION = "COST-SAVING OPPORTUNITIES"
_REPORT_SECTION_ENDINGS = {
    "RISKS AND LIMITATIONS",
    "FINAL ASSESSMENT",
    "RECOMMENDED NEXT STEP",
}


def _parse_period(value):
    if not isinstance(value, str) or not value.strip():
        return None

    text = value.strip()
    quarter_match = re.fullmatch(
        r"(?:Q([1-4])\s+(19\d{2}|20\d{2})|(19\d{2}|20\d{2})\s+Q([1-4]))",
        text,
        re.IGNORECASE,
    )
    if quarter_match:
        if quarter_match.group(1):
            quarter = int(quarter_match.group(1))
            year = int(quarter_match.group(2))
        else:
            year = int(quarter_match.group(3))
            quarter = int(quarter_match.group(4))
        first_month = (quarter - 1) * 3 + 1
        last_month = first_month + 2
        return (
            date(year, first_month, 1),
            date(year, last_month, monthrange(year, last_month)[1]),
        )

    season_match = re.fullmatch(
        r"(spring|summer|fall|autumn|winter)\s+(19\d{2}|20\d{2})|"
        r"(19\d{2}|20\d{2})\s+(spring|summer|fall|autumn|winter)",
        text,
        re.IGNORECASE,
    )
    if season_match:
        season = (season_match.group(1) or season_match.group(4)).lower()
        year = int(season_match.group(2) or season_match.group(3))
        season_months = {
            "spring": (3, 5),
            "summer": (6, 8),
            "fall": (9, 11),
            "autumn": (9, 11),
            "winter": (12, 2),
        }
        first_month, last_month = season_months[season]
        first_year = year
        last_year = year + 1 if last_month < first_month else year
        return (
            date(first_year, first_month, 1),
            date(
                last_year,
                last_month,
                monthrange(last_year, last_month)[1],
            ),
        )

    year_match = re.fullmatch(r"(19\d{2}|20\d{2})", text)
    if year_match:
        year = int(year_match.group(1))
        return date(year, 1, 1), date(year, 12, 31)

    if re.fullmatch(r"(19\d{2}|20\d{2})-\d{2}", text):
        year, month = map(int, text.split("-"))
        if 1 <= month <= 12:
            return (
                date(year, month, 1),
                date(year, month, monthrange(year, month)[1]),
            )

    for date_format in ("%Y-%m-%d", "%m/%d/%Y", "%b %Y", "%B %Y"):
        try:
            parsed = datetime.strptime(text, date_format).date()
        except ValueError:
            continue
        if date_format in ("%b %Y", "%B %Y"):
            return (
                date(parsed.year, parsed.month, 1),
                date(
                    parsed.year,
                    parsed.month,
                    monthrange(parsed.year, parsed.month)[1],
                ),
            )
        return parsed, parsed

    return None


def _project_window(project):
    start_period = _parse_period(project.get("start_date"))
    end_period = _parse_period(project.get("end_date"))
    if not start_period or not end_period:
        return None

    start = start_period[0]
    end = end_period[1]
    if start > end:
        return None

    return start, end


def timeline_compatibility(match):
    project_a = _project_window(match.get("project_a") or {})
    project_b = _project_window(match.get("project_b") or {})
    if not project_a or not project_b:
        return {
            "score": 50,
            "status": "unknown",
            "reason": "Project dates are incomplete or not in a supported format.",
        }

    overlaps = (
        project_a[0] <= project_b[1]
        and project_b[0] <= project_a[1]
    )
    if overlaps:
        overlap_start = max(project_a[0], project_b[0])
        overlap_end = min(project_a[1], project_b[1])
        overlap_days = (overlap_end - overlap_start).days + 1
        shorter_window_days = min(
            (project_a[1] - project_a[0]).days + 1,
            (project_b[1] - project_b[0]).days + 1,
        )
        overlap_score = round(
            overlap_days / shorter_window_days * 100,
            1,
        )
        return {
            "score": overlap_score,
            "status": "overlap",
            "reason": (
                f"The supplied schedule windows overlap by "
                f"{overlap_score:g}% of the shorter project window."
            ),
        }

    return {
        "score": 0,
        "status": "no_overlap",
        "reason": "The supplied project date windows do not overlap.",
    }


def _geographic_score(distance):
    try:
        distance_km = float(distance)
    except (TypeError, ValueError) as error:
        raise ValueError(f"Invalid match distance: {distance!r}") from error

    if not isfinite(distance_km) or distance_km < 0:
        raise ValueError(
            f"Match distance must be finite and nonnegative: {distance!r}"
        )
    anchors = (
        (0.0, 100.0),
        (1.6, 90.0),
        (8.0, 75.0),
        (40.0, 35.0),
    )
    if distance_km > 40:
        return 0, "outside_40_km"

    for (lower_distance, lower_score), (upper_distance, upper_score) in zip(
        anchors,
        anchors[1:],
    ):
        if distance_km <= upper_distance:
            progress = (
                (distance_km - lower_distance)
                / (upper_distance - lower_distance)
            )
            score = round(
                lower_score + progress * (upper_score - lower_score),
                1,
            )
            break
    else:
        score = anchors[-1][1]

    if distance_km < 1.6:
        tier = "under_1_6_km"
    elif distance_km < 8:
        tier = "under_8_km"
    else:
        tier = "within_40_km"
    return score, tier


def _ranked_copy(match):
    result = copy.deepcopy(match)
    result.pop("rank", None)
    result.pop("ranking", None)
    return result


def rank_matches(matches):
    ranked = []
    for match in matches:
        item = _ranked_copy(match)
        geographic_score, distance_tier = _geographic_score(
            item.get("distance_km")
        )
        timeline = timeline_compatibility(item)
        score = round(0.70 * geographic_score + 0.30 * timeline["score"], 1)
        item["ranking"] = {
            "score": score,
            "geographic_score": geographic_score,
            "distance_tier": distance_tier,
            "timeline_score": timeline["score"],
            "timeline_status": timeline["status"],
            "reasons": [
                f"Distance tier: {distance_tier.replace('_', ' ')}.",
                timeline["reason"],
            ],
        }
        ranked.append(item)

    ranked.sort(
        key=lambda item: (
            -item["ranking"]["score"],
            str(item.get("company_a", "")).casefold(),
            str(item.get("company_b", "")).casefold(),
            str((item.get("project_a") or {}).get("project_name", "")).casefold(),
            str((item.get("project_b") or {}).get("project_name", "")).casefold(),
            int(item.get("match_id", 0)),
        )
    )

    for position, item in enumerate(ranked, start=1):
        item["rank"] = position
    return ranked


def _input_fingerprint(matches):
    source_matches = []
    for match in matches:
        source_matches.append({
            key: value
            for key, value in match.items()
            if key not in {"rank", "ranking", "report_available", "cost_savings"}
        })
    serialized = json.dumps(
        source_matches,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=True,
    )
    return hashlib.sha256(serialized.encode("utf-8")).hexdigest()


def _write_json_atomically(output_file, payload):
    output_file.parent.mkdir(parents=True, exist_ok=True)
    temporary_path = None
    try:
        with tempfile.NamedTemporaryFile(
            "w",
            encoding="utf-8",
            dir=output_file.parent,
            delete=False,
        ) as temporary_file:
            temporary_path = Path(temporary_file.name)
            json.dump(payload, temporary_file, indent=2, ensure_ascii=False)
            temporary_file.write("\n")

        temporary_path.replace(output_file)
    finally:
        if temporary_path and temporary_path.exists():
            temporary_path.unlink()


def write_rankings(matches, output_file):
    output_file = Path(output_file)
    fingerprint = _input_fingerprint(matches)
    existing_cost_savings = {}

    if output_file.exists():
        previous = json.loads(output_file.read_text(encoding="utf-8"))
        if previous.get("input_fingerprint") == fingerprint:
            existing_cost_savings = {
                str(match["match_id"]): match["cost_savings"]
                for match in previous.get("matches", [])
                if "cost_savings" in match and "match_id" in match
            }

    ranked = rank_matches(matches)
    for match in ranked:
        saved_costs = existing_cost_savings.get(str(match.get("match_id")))
        if saved_costs:
            match["cost_savings"] = saved_costs

    artifact = {
        "schema_version": 1,
        "ranking_method": RANKING_METHOD,
        "input_fingerprint": fingerprint,
        "matches": ranked,
    }
    _write_json_atomically(output_file, artifact)
    return artifact


def extract_cost_savings(report_text):
    section_lines = []
    in_section = False

    for raw_line in report_text.splitlines():
        heading = raw_line.strip().lstrip("#").strip().rstrip(":").upper()
        if heading == _COST_SECTION:
            in_section = True
            continue
        if in_section and heading in _REPORT_SECTION_ENDINGS:
            break
        if in_section and raw_line.strip():
            item = raw_line.strip()
            item = re.sub(r"^(?:[-*•]\s*)", "", item)
            section_lines.append(item)

    if not in_section:
        return {
            "status": "missing_section",
            "items": [],
        }

    if not section_lines:
        return {
            "status": "unavailable",
            "items": [
                "No filing-supported cost-saving information is available."
            ],
        }

    unavailable_only = bool(section_lines) and all(
        re.match(
            r"^(?:no filing-supported cost(?:-saving)? information|"
            r"cost(?:-saving)? information (?:is|was) (?:not available|unavailable)|"
            r"none (?:is )?available|not available)",
            item,
            re.IGNORECASE,
        )
        for item in section_lines
    )

    return {
        "status": "unavailable" if unavailable_only else "reported",
        "items": section_lines,
    }


def update_cost_savings(match_id, report_text, output_file):
    output_file = Path(output_file)
    if not output_file.exists():
        raise FileNotFoundError(
            f"Ranking artifact does not exist: {output_file}"
        )

    artifact = json.loads(output_file.read_text(encoding="utf-8"))
    target = next(
        (
            match
            for match in artifact.get("matches", [])
            if match.get("match_id") == match_id
        ),
        None,
    )
    if target is None:
        raise KeyError(f"Match {match_id} was not found in the ranking artifact.")

    target["cost_savings"] = extract_cost_savings(report_text)
    _write_json_atomically(output_file, artifact)
