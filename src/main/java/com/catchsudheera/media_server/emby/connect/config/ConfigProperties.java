package com.catchsudheera.media_server.emby.connect.config;

import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.annotation.PostConstruct;

@Component
@Data
@Slf4j
public class ConfigProperties {

    @Value("${emby.access.token}")
    private String embyAccessToken;
    @Value("${emby.url}")
    private String embyUrl;
    @Value("${emby.full_refresh_timeout_mins}")
    private int embyFullRefreshTimeoutMins;

    @Value("${sonarr.media_directories}")
    private String sonarrMediaDirectories;

    @Value("${radarr.media_directories}")
    private String radarrMediaDirectories;

    @PostConstruct
    public void logAll() {
        log.info(" == EMBY_ACCESS_TOKEN  ->  " + embyAccessToken);
        log.info(" == EMBY_URL  ->  " + embyUrl);
        log.info(" == EMBY_FULL_REFRESH_TIMEOUT_MINS  ->  " + embyFullRefreshTimeoutMins);
        log.info(" == SONARR_MEDIA_DIRECTORIES  ->  " + sonarrMediaDirectories);
        log.info(" == RADARR_MEDIA_DIRECTORIES  ->  " + radarrMediaDirectories);
    }
}
