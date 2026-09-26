package com.gridalign.backend;

public class UtilityProject {
	private String id;
    private String name;
    private String company;
    private String projectType;
    private double latitude;
    private double longitude;
    private String startDate; //Format: YYYY-MM-DD
    private String endDate;
    
    //Constructor
    public UtilityProject() {}
    
    //Getters
    public String getId() { return id; }
    
    public String getName() { return name; }
    
    public String getCompany() { return company; }
    
    public String getProjectType() { return projectType; }
    
    public double getLatitude() { return latitude; }
    
    public double getLongitude() { return longitude; }
    
    public String getStartDate() { return startDate; }
    
    public String getEndDate() { return endDate; }
    
    //Setters
    public void setId(String id) { this.id = id; }
    
    public void setName(String name) { this.name = name; }
    
    public void setCompany(String company) { this.company = company; }
    
    public void setProjectType(String projectType) { this.projectType = projectType; }
    
    public void setLatitude(double latitude) { this.latitude = latitude; }
    
    public void setLongitude(double longitude) { this.longitude = longitude; }
    
    public void setStartDate(String startDate) { this.startDate = startDate; }
    
    public void setEndDate(String endDate) { this.endDate = endDate; }
    
}
