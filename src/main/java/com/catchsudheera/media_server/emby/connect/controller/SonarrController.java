package com.catchsudheera.media_server.emby.connect.controller;

import com.catchsudheera.media_server.emby.connect.config.ConfigProperties;
import com.catchsudheera.media_server.emby.connect.service.EmbyService;
import com.jayway.jsonpath.JsonPath;
import lombok.extern.slf4j.Slf4j;
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

    private final HashSet<String> eventTypes;
    private EmbyService embyService;
    private final ConfigProperties configProperties;

    public SonarrController(EmbyService embyService, ConfigProperties configProperties) {
        this.embyService = embyService;
        this.configProperties = configProperties;
        this.eventTypes = new HashSet<>(Arrays.asList(configProperties.getSonarrEventTypes().split(",")));
    }

    @PostMapping("/webhook")
    public void webhook(@RequestBody String body) {
        log.info("sonarr : {}", body);
        String type = JsonPath.read(body, "$.eventType");
        if (isInterestedEvent(type)) {
            String imdbId = JsonPath.read(body, "$.series.imdbId");
            embyService.updateLibraryPath(imdbId, new HashSet<>(Arrays.asList(configProperties.getSonarrMediaDirectories().split(","))));
        }
    }

    private boolean isInterestedEvent(String type) {
        return eventTypes.stream()
                .anyMatch(e -> e.equalsIgnoreCase(type));
    }
}
