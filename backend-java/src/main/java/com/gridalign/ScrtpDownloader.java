package com.gridalign;

import org.jsoup.Connection;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardOpenOption;

public class ScrtpDownloader {

    private static final String START_URL =
            "https://www.scrtp.com/";

    private static Path manifestFile;


    public static void main(String[] args) {

        try {

            Path folder = Paths.get(
                    "data",
                    "raw-pages",
                    "scrtp"
            );

            // Delete previous SCRTP download
            deleteFolder(folder);

            // Create clean folder
            Files.createDirectories(folder);

            // Create manifest
            manifestFile =
                    folder.resolve("manifest.csv");

            String header =
                    "file,type,url"
                            + System.lineSeparator();

            Files.write(
                    manifestFile,
                    header.getBytes(StandardCharsets.UTF_8)
            );

            System.out.println();
            System.out.println(
                    "Starting SCRTP download..."
            );
            System.out.println();

            // =========================================
            // DOWNLOAD SCRTP HOME PAGE
            // =========================================

            Connection.Response homeResponse =
                    Jsoup.connect(START_URL)

                            .userAgent(
                                    "Mozilla/5.0 GridAlign Hackathon Project"
                            )

                            .timeout(15000)

                            .followRedirects(true)

                            .ignoreHttpErrors(false)

                            .execute();


            Document page =
                    homeResponse.parse();


            String htmlFilename =
                    "scrtp_home.html";

            Path htmlFile =
                    folder.resolve(htmlFilename);


            Files.write(
                    htmlFile,
                    page.outerHtml()
                            .getBytes(StandardCharsets.UTF_8)
            );


            addToManifest(
                    htmlFilename,
                    "HTML",
                    START_URL
            );


            System.out.println(
                    "Saved: " + htmlFilename
            );


            // =========================================
            // FIND PROJECT DESCRIPTIONS PDF
            // =========================================

            Elements links =
                    page.select("a[href]");


            String projectPdfUrl =
                    null;


            for (Element link : links) {

                String text =
                        link.text()
                                .toLowerCase();

                String url =
                        link.absUrl("href");


                if (url == null
                        || url.isEmpty()) {

                    continue;
                }


                /*
                 * We only want the SCRTP PDF containing
                 * the planned project descriptions.
                 */

                if (
                        text.contains(
                                "project descriptions"
                        )
                                && url.toLowerCase()
                                .contains(".pdf")
                ) {

                    projectPdfUrl =
                            url;

                    break;
                }
            }


            if (projectPdfUrl == null) {

                throw new RuntimeException(
                        "Could not find the "
                                + "SCRTP Project Descriptions PDF."
                );
            }


            System.out.println();
            System.out.println(
                    "Project PDF found:"
            );

            System.out.println(
                    projectPdfUrl
            );


            // =========================================
            // DOWNLOAD PROJECT PDF
            // =========================================

            Connection.Response pdfResponse =
                    Jsoup.connect(projectPdfUrl)

                            .userAgent(
                                    "Mozilla/5.0 GridAlign Hackathon Project"
                            )

                            .timeout(30000)

                            .followRedirects(true)

                            .ignoreHttpErrors(false)

                            .ignoreContentType(true)

                            .maxBodySize(0)

                            .execute();


            String pdfFilename =
                    getFilenameFromUrl(
                            projectPdfUrl
                    );


            Path pdfFile =
                    folder.resolve(
                            pdfFilename
                    );


            Files.write(
                    pdfFile,
                    pdfResponse.bodyAsBytes()
            );


            addToManifest(
                    pdfFilename,
                    "PDF",
                    projectPdfUrl
            );


            System.out.println();
            System.out.println(
                    "PDF saved: "
                            + pdfFilename
            );


            System.out.println();
            System.out.println(
                    "================================"
            );

            System.out.println(
                    "SCRTP DOWNLOAD FINISHED"
            );

            System.out.println(
                    "================================"
            );

            System.out.println(
                    "HTML pages saved: 1"
            );

            System.out.println(
                    "PDF files saved: 1"
            );

            System.out.println(
                    "Saved at: "
                            + folder.toAbsolutePath()
            );

            System.out.println(
                    "Manifest: "
                            + manifestFile.toAbsolutePath()
            );


        } catch (Exception e) {

            e.printStackTrace();
        }
    }


    /*
     * Get the original PDF filename
     * from its URL.
     */
    private static String getFilenameFromUrl(
            String url) {

        try {

            URI uri =
                    URI.create(url);

            String path =
                    uri.getPath();


            if (path != null
                    && !path.isEmpty()) {

                int lastSlash =
                        path.lastIndexOf('/');


                if (lastSlash >= 0
                        && lastSlash
                        < path.length() - 1) {

                    return path.substring(
                            lastSlash + 1
                    );
                }
            }

        } catch (Exception e) {

            // Fall through to default filename
        }


        return "scrtp_project_descriptions.pdf";
    }


    /*
     * Save local filename -> original URL.
     */
    private static void addToManifest(
            String filename,
            String type,
            String url) {

        try {

            String line =
                    "\""
                            + filename
                            + "\",\""
                            + type
                            + "\",\""
                            + url.replace(
                                    "\"",
                                    "\"\""
                            )
                            + "\""
                            + System.lineSeparator();


            Files.write(
                    manifestFile,

                    line.getBytes(
                            StandardCharsets.UTF_8
                    ),

                    StandardOpenOption.APPEND
            );


        } catch (Exception e) {

            System.out.println(
                    "Could not update manifest: "
                            + e.getMessage()
            );
        }
    }


    /*
     * Delete previous SCRTP folder.
     */
    private static void deleteFolder(
            Path folder)
            throws Exception {

        if (!Files.exists(folder)) {

            return;
        }


        Files.walk(folder)

                .sorted(
                        (a, b) ->
                                b.compareTo(a)
                )

                .forEach(path -> {

                    try {

                        Files.delete(path);

                    } catch (Exception e) {

                        throw new RuntimeException(
                                e
                        );
                    }
                });
    }
}