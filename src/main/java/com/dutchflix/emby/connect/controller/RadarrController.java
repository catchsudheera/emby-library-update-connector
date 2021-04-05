package com.dutchflix.emby.connect.controller;

import com.dutchflix.emby.connect.service.EmbyService;
import com.jayway.jsonpath.JsonPath;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Arrays;
import java.util.HashSet;
import java.util.Optional;

@RestController
@RequestMapping("radarr")
@Slf4j
public class RadarrController {

    private EmbyService embyService;

    @Value("${radarr.media.directories}")
    private String mediaDirs;

    public RadarrController(EmbyService embyService) {
        this.embyService = embyService;
    }

    @PostMapping("/webhook")
    public void webhook(@RequestBody String body) {
        log.info("radarr : {}", body);
        String type = JsonPath.read(body, "$.eventType");
        if ("Download".equals(type)) {
            String imdbId = JsonPath.read(body, "$.remoteMovie.imdbId");
            embyService.updateLibraryPath(imdbId, new HashSet<>(Arrays.asList(mediaDirs.split(","))));
        }
    }
}
