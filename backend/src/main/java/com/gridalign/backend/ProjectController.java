package com.gridalign.backend;

import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/projects")
@CrossOrigin(origins = "*")
public class ProjectController {
	private final MatchingEngine matchingEngine;

    public ProjectController(MatchingEngine matchingEngine) {
        this.matchingEngine = matchingEngine;
    }

    @PostMapping("/analyze")
    public List<CoordinationOpportunity> analyze(@RequestBody List<UtilityProject> projects) {
        return matchingEngine.findOverlaps(projects);
    }
}
