package com.gridalign.backend;

public class CoordinationOpportunity {
	private UtilityProject projectA;
    private UtilityProject projectB;
    private double distanceMiles;
    private long timelineGapDays;
    private double score;
    
    public CoordinationOpportunity(UtilityProject projectA, UtilityProject projectB, double distanceMiles, long timelineGapDays, double score) {
        this.projectA = projectA;
        this.projectB = projectB;
        this.distanceMiles = distanceMiles;
        this.timelineGapDays = timelineGapDays;
        this.score = score;
    }
    
    // Getters and Setters
    public UtilityProject getProjectA() { return projectA; }
    
    public UtilityProject getProjectB() { return projectB; }
    
    public double getDistanceMiles() { return distanceMiles; }
    
    public long getTimelineGapDays() { return timelineGapDays; }
    
    public double getScore() { return score; }
}
