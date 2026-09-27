package com.gridalign;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;

import java.io.File;

public class ProjectMatcher {

    private static final double MAX_DISTANCE_KM = 40.0;

    private static final ObjectMapper mapper =
            new ObjectMapper();


    public static void main(String[] args) {

        try {

            File georgiaFile =
                    new File(
                            "data/processed/georgia_power.json"
                    );

            File dominionFile =
                    new File(
                            "data/processed/dominion_energy_south_carolina.json"
                    );


            JsonNode georgiaData =
                    mapper.readTree(
                            georgiaFile
                    );

            JsonNode dominionData =
                    mapper.readTree(
                            dominionFile
                    );


            JsonNode georgiaProjects =
                    georgiaData.get(
                            "projects"
                    );

            JsonNode dominionProjects =
                    dominionData.get(
                            "projects"
                    );


            ArrayNode matches =
                    mapper.createArrayNode();


            // =========================
            // COMPARE PROJECTS
            // =========================

            for (
                    JsonNode georgiaProject :
                    georgiaProjects
            ) {

                // Ignore completed projects
                if (
                        isCompleted(
                                georgiaProject
                        )
                ) {

                    continue;
                }


                for (
                        JsonNode dominionProject :
                        dominionProjects
                ) {

                    // Ignore completed projects
                    if (
                            isCompleted(
                                    dominionProject
                            )
                    ) {

                        continue;
                    }


                    // Both projects need coordinates

                    if (
                            !hasCoordinates(
                                    georgiaProject
                            )
                            ||
                            !hasCoordinates(
                                    dominionProject
                            )
                    ) {

                        continue;
                    }


                    double distance =
                            minimumDistance(
                                    georgiaProject,
                                    dominionProject
                            );


                    // Geographic filter:
                    // projects must be within 40 km

                    if (
                            distance >
                            MAX_DISTANCE_KM
                    ) {

                        continue;
                    }


                    // =========================
                    // CREATE MATCH
                    // =========================

                    ObjectNode match =
                            mapper.createObjectNode();


                    match.put(
                            "company_a",
                            georgiaData
                                    .get(
                                            "company_name"
                                    )
                                    .asText()
                    );


                    match.put(
                            "company_b",
                            dominionData
                                    .get(
                                            "company_name"
                                    )
                                    .asText()
                    );


                    match.put(
                            "distance_km",
                            Math.round(
                                    distance * 100.0
                            ) / 100.0
                    );


                    match.set(
                            "project_a",
                            georgiaProject
                    );


                    match.set(
                            "project_b",
                            dominionProject
                    );


                    matches.add(
                            match
                    );


                    System.out.println(
                            "MATCH: "
                            + georgiaProject
                                    .get(
                                            "project_name"
                                    )
                                    .asText()
                            + " <-> "
                            + dominionProject
                                    .get(
                                            "project_name"
                                    )
                                    .asText()
                            + " | "
                            + String.format(
                                    "%.2f km",
                                    distance
                            )
                    );
                }
            }


            // =========================
            // OUTPUT
            // =========================

            ObjectNode output =
                    mapper.createObjectNode();


            output.put(
                    "match_count",
                    matches.size()
            );


            output.put(
                    "max_distance_km",
                    MAX_DISTANCE_KM
            );


            output.set(
                    "matches",
                    matches
            );

            File matchesFile =
                    new File(
                            "data/processed/matches.json"
                    );

            File outputDirectory =
                    matchesFile.getParentFile();

            if (
                    outputDirectory != null
                    && !outputDirectory.exists()
                    && !outputDirectory.mkdirs()
            ) {
                throw new IllegalStateException(
                        "Could not create output directory: "
                        + outputDirectory.getAbsolutePath()
                );
            }

            mapper
                    .writerWithDefaultPrettyPrinter()
                    .writeValue(
                            matchesFile,
                            output
                    );


            System.out.println();

            System.out.println(
                    "Matches found: "
                    + matches.size()
            );

            System.out.println(
                    "Saved to "
                    + "data/processed/matches.json"
            );


        } catch (Exception e) {

            e.printStackTrace();
            throw new RuntimeException(
                    "ProjectMatcher failed: " + e.getMessage(),
                    e
            );
        }
    }


    // =========================
    // COMPLETED PROJECT FILTER
    // =========================

    private static boolean isCompleted(
            JsonNode project
    ) {

        String status =
                project
                        .path(
                                "status"
                        )
                        .asText(
                                ""
                        );


        return status.equalsIgnoreCase(
                "Completed"
        );
    }


    // =========================
    // COORDINATE CHECK
    // =========================

    private static boolean hasCoordinates(
            JsonNode project
    ) {

        JsonNode coordinates =
                project.get(
                        "coordinates"
                );


        return coordinates != null
                && coordinates.isArray()
                && coordinates.size() > 0;
    }


    // =========================
    // MINIMUM DISTANCE
    // =========================

    private static double minimumDistance(
            JsonNode projectA,
            JsonNode projectB
    ) {

        double minimum =
                Double.MAX_VALUE;


        for (
                JsonNode pointA :
                projectA.get(
                        "coordinates"
                )
        ) {

            for (
                    JsonNode pointB :
                    projectB.get(
                            "coordinates"
                    )
            ) {

                double lat1 =
                        pointA
                                .get(
                                        "latitude"
                                )
                                .asDouble();


                double lon1 =
                        pointA
                                .get(
                                        "longitude"
                                )
                                .asDouble();


                double lat2 =
                        pointB
                                .get(
                                        "latitude"
                                )
                                .asDouble();


                double lon2 =
                        pointB
                                .get(
                                        "longitude"
                                )
                                .asDouble();


                double distance =
                        haversine(
                                lat1,
                                lon1,
                                lat2,
                                lon2
                        );


                if (
                        distance <
                        minimum
                ) {

                    minimum =
                            distance;
                }
            }
        }


        return minimum;
    }


    // =========================
    // HAVERSINE DISTANCE
    // =========================

    private static double haversine(
            double lat1,
            double lon1,
            double lat2,
            double lon2
    ) {

        final double EARTH_RADIUS_KM =
                6371.0;


        double deltaLat =
                Math.toRadians(
                        lat2 - lat1
                );


        double deltaLon =
                Math.toRadians(
                        lon2 - lon1
                );


        double a =
                Math.sin(
                        deltaLat / 2
                )
                        *
                Math.sin(
                        deltaLat / 2
                )

                +

                Math.cos(
                        Math.toRadians(
                                lat1
                        )
                )
                        *
                Math.cos(
                        Math.toRadians(
                                lat2
                        )
                )

                        *
                Math.sin(
                        deltaLon / 2
                )
                        *
                Math.sin(
                        deltaLon / 2
                );


        double c =
                2
                *
                Math.atan2(
                        Math.sqrt(
                                a
                        ),
                        Math.sqrt(
                                1 - a
                        )
                );


        return EARTH_RADIUS_KM * c;
    }
}