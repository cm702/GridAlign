package com.gridalign.backend;

import org.springframework.stereotype.Service;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Service
public class MatchingEngine {
	public double calculateDistanceMiles(double lat1, double lon1, double lat2, double lon2) {
        final int EARTH_RADIUS_MILES = 3958;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                 + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                 * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return EARTH_RADIUS_MILES * c;
    }
	
	public List<CoordinationOpportunity> findOverlaps(List<UtilityProject> projects) {
        List<CoordinationOpportunity> matches = new ArrayList<>();

        for (int i = 0; i < projects.size(); i++) {
            for (int j = i + 1; j < projects.size(); j++) {
                UtilityProject p1 = projects.get(i);
                UtilityProject p2 = projects.get(j);

                // Skipping the comparison between projects within the same company
                if (p1.getCompany() != null && p1.getCompany().equalsIgnoreCase(p2.getCompany())) {
                    continue;
                }

                double distance = calculateDistanceMiles(p1.getLatitude(), p1.getLongitude(),
                                                         p2.getLatitude(), p2.getLongitude());

                // 25-mile threshold check
                if (distance <= 25.0) {
                    long dayGap = calculateTimelineGapDays(p1.getStartDate(), p2.getStartDate());
                    
                    // Simple ranking score calc: closer distance + smaller time gap -> higher score
                    double score = (25.0 - distance) * 2 + Math.max(0, (365.0 - dayGap) / 10.0);

                    matches.add(new CoordinationOpportunity(p1, p2, Math.round(distance * 100.0) / 100.0, dayGap, Math.round(score * 100.0) / 100.0));
                }
            }
        }
        matches.sort(Comparator.comparingDouble(CoordinationOpportunity::getScore).reversed());
        return matches;
	} 
	
	private long calculateTimelineGapDays(String dateStr1, String dateStr2) {
        if (dateStr1 == null || dateStr2 == null) return 365; // Default fallback if dates are missing
        try {
            LocalDate d1 = LocalDate.parse(dateStr1);
            LocalDate d2 = LocalDate.parse(dateStr2);
            return Math.abs(ChronoUnit.DAYS.between(d1, d2));
        } catch (Exception e) {
            return 365;
        }
    }
}
