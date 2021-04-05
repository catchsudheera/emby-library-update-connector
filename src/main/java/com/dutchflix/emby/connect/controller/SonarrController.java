package com.dutchflix.emby.connect.controller;

import com.jayway.jsonpath.JsonPath;
import lombok.extern.slf4j.Slf4j;
import com.dutchflix.emby.connect.service.EmbyService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Arrays;
import java.util.HashSet;

@RestController
@RequestMapping("sonarr")
@Slf4j
public class SonarrController {

    private EmbyService embyService;

    @Value("${sonarr.media.directories}")
    private String mediaDirs;

    public SonarrController(EmbyService embyService) {
        this.embyService = embyService;
    }

    @PostMapping("/webhook")
    public void webhook(@RequestBody String body) {
        log.info("sonarr : {}", body);
        String type = JsonPath.read(body, "$.eventType");
        if ("Download".equals(type)) {
            String imdbId = JsonPath.read(body, "$.series.imdbId");
            embyService.updateLibraryPath(imdbId, new HashSet<>(Arrays.asList(mediaDirs.split(","))));
        }
    }
}
