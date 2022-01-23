package com.catchsudheera.media_server.emby.connect.config;

import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.validation.annotation.Validated;

import javax.annotation.PostConstruct;
import javax.validation.constraints.NotBlank;
import javax.validation.constraints.Positive;

@Component
@Data
@Slf4j
@Validated
public class ConfigProperties {

    @Value("${emby.access.token}")
    @NotBlank
    private String embyAccessToken;

    @Value("${emby.url}")
    @NotBlank
    private String embyUrl;

    @Positive
    @Value("${emby.full_refresh_timeout_mins:30}")
    private int embyFullRefreshTimeoutMins;

    @Value("${sonarr.media_directories:tv}")
    @NotBlank
    private String sonarrMediaDirectories;

    /**
     * Value defaults are from file : src/NzbDrone.Core/Notifications/Webhook/WebhookEventType.cs of https://github.com/Sonarr/Sonarr
     */
    @NotBlank
    @Value("${sonarr.trigger.event_types:Download,Rename,SeriesDelete,EpisodeFileDelete}")
    private String sonarrEventTypes;

    @NotBlank
    @Value("${radarr.media_directories:movies}")
    private String radarrMediaDirectories;

    /**
     * Value defaults are from file : src/NzbDrone.Core/Notifications/Webhook/WebhookEventType.cs of https://github.com/Radarr/Radarr/
     */
    @NotBlank
    @Value("${radarr.trigger.event_types:Download,Rename,MovieDelete,MovieFileDelete}")
    private String radarrEventTypes;

    @PostConstruct
    public void logAll() {
        log.info(" == EMBY_ACCESS_TOKEN  ->  " + embyAccessToken);
        log.info(" == EMBY_URL  ->  " + embyUrl);
        log.info(" == EMBY_FULL_REFRESH_TIMEOUT_MINS  ->  " + embyFullRefreshTimeoutMins);
        log.info(" == SONARR_MEDIA_DIRECTORIES  ->  " + sonarrMediaDirectories);
        log.info(" == SONARR_TRIGGER_EVENT_TYPES  ->  " + sonarrEventTypes);
        log.info(" == RADARR_MEDIA_DIRECTORIES  ->  " + radarrMediaDirectories);
        log.info(" == RADARR_TRIGGER_EVENT_TYPES  ->  " + radarrEventTypes);
    }
}
