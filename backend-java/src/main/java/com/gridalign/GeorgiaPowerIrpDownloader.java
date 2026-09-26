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
import java.util.LinkedHashSet;
import java.util.Set;

public class GeorgiaPowerIrpDownloader {

    private static final String START_URL =
            "https://www.georgiapower.com/about/company/filings/irp.html";

    private static final String DOMAIN =
            "www.georgiapower.com";

    // Prevent downloading the same URL twice
    private static final Set<String> visited =
            new LinkedHashSet<String>();

    private static int htmlNumber = 1;
    private static int pdfNumber = 1;

    private static long totalWords = 0;

    // Manifest that connects each downloaded file to its original URL
    private static Path manifestFile;


    public static void main(String[] args) {

        try {

            Path folder = Paths.get(
                    "data",
                    "raw-pages",
                    "georgia-power-irp"
            );

            // Delete the previous complete download
            deleteFolder(folder);

            // Create the new empty folder
            Files.createDirectories(folder);

            // Create manifest.csv
            manifestFile =
                    folder.resolve("manifest.csv");

            String header =
                    "file,type,url"
                            + System.lineSeparator();

            Files.write(
                    manifestFile,
                    header.getBytes(
                            StandardCharsets.UTF_8
                    )
            );

            System.out.println(
                    "Starting Georgia Power IRP crawl..."
            );

            System.out.println();

            crawl(
                    START_URL,
                    folder
            );

            System.out.println();

            System.out.println(
                    "================================"
            );

            System.out.println(
                    "CRAWL FINISHED"
            );

            System.out.println(
                    "================================"
            );

            System.out.println(
                    "Unique URLs visited: "
                            + visited.size()
            );

            System.out.println(
                    "HTML pages saved: "
                            + (htmlNumber - 1)
            );

            System.out.println(
                    "PDF files saved: "
                            + (pdfNumber - 1)
            );

            System.out.println(
                    "Total HTML words: "
                            + totalWords
            );

            System.out.println(
                    "Estimated LLM tokens: "
                            + estimateTokens(
                                    totalWords
                            )
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


    private static void crawl(
            String url,
            Path folder) {

        try {

            String cleanUrl =
                    cleanUrl(url);

            if (cleanUrl == null) {
                return;
            }

            // Already visited
            if (visited.contains(cleanUrl)) {
                return;
            }

            URI uri =
                    URI.create(cleanUrl);

            // Only Georgia Power
            if (!DOMAIN.equalsIgnoreCase(
                    uri.getHost())) {

                return;
            }


            /*
             * Mark URL as visited before recursion.
             *
             * This prevents loops such as:
             *
             * A -> B -> A -> B...
             */
            visited.add(cleanUrl);


            System.out.println();

            System.out.println(
                    "--------------------------------"
            );

            System.out.println(
                    "Downloading:"
            );

            System.out.println(
                    cleanUrl
            );


            Connection.Response response;

            try {

                response =
                        Jsoup.connect(cleanUrl)

                                .userAgent(
                                        "Mozilla/5.0 GridAlign Hackathon Project"
                                )

                                .timeout(15000)

                                .followRedirects(true)

                                .ignoreHttpErrors(true)

                                .ignoreContentType(true)

                                // Do not limit page size
                                .maxBodySize(0)

                                .execute();

            } catch (Exception e) {

                /*
                 * This page failed.
                 * Stop THIS branch only.
                 */

                System.out.println(
                        "FAILED: "
                                + e.getMessage()
                );

                return;
            }


            int status =
                    response.statusCode();

            if (status < 200
                    || status >= 300) {

                System.out.println(
                        "HTTP error: "
                                + status
                );

                return;
            }


            String contentType =
                    response.contentType();

            if (contentType == null) {

                System.out.println(
                        "Unknown content type."
                );

                return;
            }


            // =====================================
            // HTML PAGE
            // =====================================

            if (contentType.contains(
                    "text/html")) {

                Document page;

                try {

                    page =
                            response.parse();

                } catch (Exception e) {

                    System.out.println(
                            "Could not parse HTML."
                    );

                    return;
                }


                String filename =
                        String.format(
                                "page_%05d.html",
                                htmlNumber
                        );

                Path file =
                        folder.resolve(
                                filename
                        );


                try {

                    Files.write(
                            file,

                            page.outerHtml()
                                    .getBytes(
                                            StandardCharsets.UTF_8
                                    )
                    );

                } catch (Exception e) {

                    System.out.println(
                            "Could not save page."
                    );

                    return;
                }


                // Save URL -> file relationship
                addToManifest(
                        filename,
                        "HTML",
                        cleanUrl
                );


                htmlNumber++;


                int words =
                        countWords(
                                page.text()
                        );

                totalWords +=
                        words;


                System.out.println(
                        "Saved: "
                                + filename
                );

                System.out.println(
                        "Words: "
                                + words
                );

                System.out.println(
                        "Estimated tokens: "
                                + estimateTokens(
                                        words
                                )
                );


                /*
                 * Find every link inside
                 * this page.
                 */
                Elements links =
                        page.select(
                                "a[href]"
                        );


                System.out.println(
                        "Links found: "
                                + links.size()
                );


                /*
                 * Follow only links that
                 * appear related to IRP.
                 */
                for (Element element : links) {

                    String nextUrl =
                            element.absUrl(
                                    "href"
                            );

                    if (nextUrl == null
                            || nextUrl.isEmpty()) {

                        continue;
                    }


                    if (!shouldFollowIrpLink(
                            cleanUrl,
                            element,
                            nextUrl)) {

                        continue;
                    }


                    /*
                     * Small delay before
                     * requesting another page.
                     */
                    try {

                        Thread.sleep(800);

                    } catch (
                            InterruptedException e
                    ) {

                        Thread.currentThread()
                                .interrupt();

                        return;
                    }


                    crawl(
                            nextUrl,
                            folder
                    );
                }
            }


            // =====================================
            // PDF
            // =====================================

            else if (
                    contentType.contains(
                            "application/pdf"
                    )
            ) {

                String filename =
                        String.format(
                                "document_%05d.pdf",
                                pdfNumber
                        );

                Path file =
                        folder.resolve(
                                filename
                        );


                try {

                    Files.write(
                            file,
                            response.bodyAsBytes()
                    );

                } catch (Exception e) {

                    System.out.println(
                            "Could not save PDF."
                    );

                    return;
                }


                // Save URL -> PDF relationship
                addToManifest(
                        filename,
                        "PDF",
                        cleanUrl
                );


                pdfNumber++;


                System.out.println(
                        "PDF saved: "
                                + filename
                );


                /*
                 * Jsoup does not follow links
                 * inside PDFs.
                 */
                return;
            }


            // =====================================
            // OTHER FILE TYPES
            // =====================================

            else {

                System.out.println(
                        "Skipping content type: "
                                + contentType
                );

                return;
            }


        } catch (Exception e) {

            /*
             * Unexpected problem:
             * stop only this branch.
             */

            System.out.println(
                    "Branch stopped: "
                            + e.getMessage()
            );
        }
    }


    /*
     * Decide whether a link found on an
     * IRP page should be followed.
     *
     * IRP information is stored in several
     * different Georgia Power sections,
     * so we cannot use only one path.
     */
    private static boolean shouldFollowIrpLink(
            String currentUrl,
            Element element,
            String nextUrl) {

        try {

            String normalizedUrl =
                    cleanUrl(nextUrl);

            if (normalizedUrl == null) {
                return false;
            }


            URI uri =
                    URI.create(
                            normalizedUrl
                    );


            // Stay inside Georgia Power
            if (!DOMAIN.equalsIgnoreCase(
                    uri.getHost())) {

                return false;
            }


            String path =
                    uri.getPath();

            if (path == null) {
                return false;
            }


            String lowerPath =
                    path.toLowerCase();

            String linkText =
                    element.text()
                            .toLowerCase();

            String lowerUrl =
                    normalizedUrl
                            .toLowerCase();

            String currentLower =
                    currentUrl
                            .toLowerCase();


            /*
             * Always allow the main
             * IRP page.
             */
            String normalizedStart =
                    cleanUrl(
                            START_URL
                    );

            if (normalizedStart != null
                    && normalizedUrl.equals(
                            normalizedStart
                    )) {

                return true;
            }


            /*
             * Allow URLs that clearly
             * identify IRP content.
             */
            if (lowerUrl.contains("irp")
                    || lowerUrl.contains(
                            "integrated-resource-plan"
                    )
                    || lowerUrl.contains(
                            "integrated_resource_plan"
                    )) {

                return true;
            }


            /*
             * Allow links whose visible
             * text clearly identifies
             * IRP content.
             */
            if (linkText.contains("irp")
                    || linkText.contains(
                            "integrated resource plan"
                    )) {

                return true;
            }


            /*
             * Determine whether the current
             * page is already an IRP page.
             */
            boolean currentPageIsIrp =
                    currentLower.contains("irp")
                            || currentLower.contains(
                                    "integrated-resource-plan"
                            )
                            || currentLower.contains(
                                    "integrated_resource_plan"
                            );


            /*
             * PDFs directly linked from an
             * IRP page are useful raw data.
             */
            if (lowerPath.endsWith(".pdf")
                    && currentPageIsIrp) {

                return true;
            }


            /*
             * The main IRP page sometimes
             * uses generic "Read More"
             * links for previous IRP plans.
             */
            if (normalizedStart != null
                    && currentUrl.equals(
                            normalizedStart
                    )
                    && linkText.startsWith(
                            "read more"
                    )) {

                return true;
            }


            /*
             * IRP-related news pages may
             * continue through another
             * generic "Read More" link.
             */
            if (currentPageIsIrp
                    && linkText.startsWith(
                            "read more"
                    )) {

                return true;
            }


            return false;

        } catch (Exception e) {

            return false;
        }
    }


    /*
     * Normalize URLs so:
     *
     * https://www.GeorgiaPower.com/page
     *
     * and
     *
     * https://www.georgiapower.com/page
     *
     * become the same URL.
     */
    private static String cleanUrl(
            String url) {

        try {

            URI uri =
                    URI.create(url);


            String scheme =
                    uri.getScheme();

            if (scheme == null) {
                return null;
            }


            scheme =
                    scheme.toLowerCase();


            if (!scheme.equals("http")
                    && !scheme.equals("https")) {

                return null;
            }


            String host =
                    uri.getHost();

            if (host == null) {
                return null;
            }


            host =
                    host.toLowerCase();


            /*
             * Treat:
             *
             * georgiapower.com
             *
             * and
             *
             * www.georgiapower.com
             *
             * as the same domain.
             */
            if (host.equals(
                    "georgiapower.com")) {

                host =
                        "www.georgiapower.com";
            }


            String path =
                    uri.getPath();

            if (path == null
                    || path.isEmpty()) {

                path = "/";
            }


            /*
             * Remove the #fragment.
             *
             * Example:
             *
             * page.html#faq
             *
             * becomes:
             *
             * page.html
             */
            URI clean =
                    new URI(
                            scheme,
                            uri.getUserInfo(),
                            host,
                            uri.getPort(),
                            path,
                            uri.getQuery(),
                            null
                    );


            return clean.toString();

        } catch (Exception e) {

            return null;
        }
    }


    /*
     * Add one downloaded file
     * to manifest.csv.
     */
    private static void addToManifest(
            String filename,
            String type,
            String url) {

        try {

            /*
             * CSV format:
             *
             * file,type,url
             */
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
     * Count words from visible
     * HTML text.
     */
    private static int countWords(
            String text) {

        if (text == null) {
            return 0;
        }


        text =
                text.trim();


        if (text.isEmpty()) {
            return 0;
        }


        return text
                .split("\\s+")
                .length;
    }


    /*
     * Rough token estimate.
     *
     * English:
     *
     * 1 word ≈ 1.3 tokens
     */
    private static long estimateTokens(
            long words) {

        return Math.round(
                words * 1.3
        );
    }


    /*
     * Delete previous crawl.
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