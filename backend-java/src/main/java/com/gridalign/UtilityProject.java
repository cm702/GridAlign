package com.gridalign;
import java.time.LocalDate;

public class UtilityProject {

    private String id;
    private String utilityName;
    private String projectName;
    private String description;

    private double latitude;
    private double longitude;

    private LocalDate startDate;
    private LocalDate endDate;

    private String projectType;
    private String sourceUrl;

    public UtilityProject(
            String id,
            String utilityName,
            String projectName,
            String description,
            double latitude,
            double longitude,
            LocalDate startDate,
            LocalDate endDate,
            String projectType,
            String sourceUrl) {

        this.id = id;
        this.utilityName = utilityName;
        this.projectName = projectName;
        this.description = description;
        this.latitude = latitude;
        this.longitude = longitude;
        this.startDate = startDate;
        this.endDate = endDate;
        this.projectType = projectType;
        this.sourceUrl = sourceUrl;
    }

    public String getId() {
        return id;
    }

    public String getUtilityName() {
        return utilityName;
    }

    public String getProjectName() {
        return projectName;
    }

    public String getDescription() {
        return description;
    }

    public double getLatitude() {
        return latitude;
    }

    public double getLongitude() {
        return longitude;
    }

    public LocalDate getStartDate() {
        return startDate;
    }

    public LocalDate getEndDate() {
        return endDate;
    }

    public String getProjectType() {
        return projectType;
    }

    public String getSourceUrl() {
        return sourceUrl;
    }
}

// UtilityProject represents the normalized structure used to store utility project data.
// All extracted project information will be converted to this format before being saved as JSON.