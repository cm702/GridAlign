package com.gridalign.backend;

import org.springframework.stereotype.Service;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Service
public class MatchingEngine {

    public List<CoordinationOpportunity> findOverlaps(List<UtilityProject> projects) {
        List<CoordinationOpportunity> matches = new ArrayList<>();

        for (int i = 0; i < projects.size(); i++) {
            for (int j = i + 1; j < projects.size(); j++) {
                UtilityProject p1 = projects.get(i);
                UtilityProject p2 = projects.get(j);

                // Filter out completed projects (ported from ProjectMatcher.java)
                if ("Completed".equalsIgnoreCase(p1.getStatus()) || "Completed".equalsIgnoreCase(p2.getStatus())) {
                    continue;
                }

                // Skip comparisons between projects within the same utility company
                if (p1.getUtilityName() != null && p1.getUtilityName().equalsIgnoreCase(p2.getUtilityName())) {
                    continue;
                }

                double distanceMiles = calculateDistanceMiles(
                    p1.getLatitude(), p1.getLongitude(),
                    p2.getLatitude(), p2.getLongitude()
                );

                // 25-mile threshold check
                if (distanceMiles <= 25.0) {
                    long dayGap = calculateTimelineGapDays(p1.getStartDate(), p2.getStartDate());

                    // Ranking score formula
                    double score = (25.0 - distanceMiles) * 2 + Math.max(0, (365.0 - dayGap) / 10.0);

                    matches.add(new CoordinationOpportunity(
                        p1, p2,
                        Math.round(distanceMiles * 100.0) / 100.0,
                        dayGap,
                        Math.round(score * 100.0) / 100.0
                    ));
                }
            }
        }
        matches.sort(Comparator.comparingDouble(CoordinationOpportunity::getScore).reversed());
        return matches;
    }

    public double calculateDistanceMiles(double lat1, double lon1, double lat2, double lon2) {
        final double EARTH_RADIUS_MILES = 3958.8;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                 + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                 * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return EARTH_RADIUS_MILES * c;
    }

    private long calculateTimelineGapDays(LocalDate date1, LocalDate date2) {
        if (date1 == null || date2 == null) return 365;
        return Math.abs(ChronoUnit.DAYS.between(date1, date2));
    }
}