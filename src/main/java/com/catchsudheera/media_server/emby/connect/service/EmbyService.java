package com.catchsudheera.media_server.emby.connect.service;

import com.catchsudheera.media_server.emby.connect.config.ConfigProperties;
import com.jayway.jsonpath.JsonPath;
import com.mashape.unirest.http.HttpResponse;
import com.mashape.unirest.http.Unirest;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.ObjectUtils;

import javax.annotation.PostConstruct;
import javax.annotation.PreDestroy;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ScheduledThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

@Service
@Slf4j
public class EmbyService {

    private final ConfigProperties configProperties;
    private final ScheduledThreadPoolExecutor scheduler = new ScheduledThreadPoolExecutor(1);

    private static final String ACCESS_TOKEN_HEADER = "X-Emby-Token";

    private volatile LocalDateTime lastFullLibraryRefreshTime = LocalDateTime.MIN;

    public EmbyService(ConfigProperties configProperties) {
        this.configProperties = configProperties;
    }

    @PostConstruct
    public void initialRefresh() {
        refreshLibrary();
    }

    @SneakyThrows
    @PreDestroy
    public void tearDown() {
        this.scheduler.shutdown();
        this.scheduler.awaitTermination(5, TimeUnit.MINUTES);
    }

    @SneakyThrows
    public void updateLibraryPath(String imdbId, Set<String> mediaDirs) {
        if (ObjectUtils.isEmpty(imdbId)) {
            log.error("Given imdbId is empty");
            return;
        }

        Set<String> itemIds = getItemIdsByImdbId(imdbId, mediaDirs);
        if (itemIds.isEmpty()) {
            Set<String> directorySetItemIds = getDirectorySetItemIds(mediaDirs);
            if (directorySetItemIds.isEmpty()) {
                refreshLibrary();
            } else {
                directorySetItemIds.forEach(this::refreshItem);
            }
        } else {
            itemIds.forEach(this::refreshItem);
        }
    }

    @SneakyThrows
    private Set<String> getDirectorySetItemIds(Set<String> directorySet) {
        HttpResponse<String> response = Unirest.get(configProperties.getEmbyUrl()+ "/Items?IsFolder=1")
                .header(ACCESS_TOKEN_HEADER, configProperties.getEmbyAccessToken())
                .asString();
        handleErrorResponse(response);
        List<Map<String, String>> itemList = JsonPath.read(response.getBody(), "$.Items");
        return itemList.stream()
                .filter(e -> directorySet.contains(e.get("Name")))
                .map(e -> e.get("Id"))
                .collect(Collectors.toSet());
    }

    @SneakyThrows
    private Set<String> getItemIdsByImdbId(String imdbId, Set<String> directorySet) {
        HttpResponse<String> response = Unirest.get(configProperties.getEmbyUrl() + "/Items?IsFolder=1")
                .header(ACCESS_TOKEN_HEADER, configProperties.getEmbyAccessToken())
                .asString();
        handleErrorResponse(response);
        List<Map<String, String>> itemList = JsonPath.read(response.getBody(), "$.Items");
        return itemList.stream()
                .filter(e -> directorySet.contains(e.get("Name")))
                .map(e -> getItemIdsWithImdbIdsInParentDir(e.get("Id"), imdbId))
                .flatMap(Collection::stream)
                .collect(Collectors.toSet());
    }

    @SneakyThrows
    private Set<String> getItemIdsWithImdbIdsInParentDir(String parentId, String imdbId) {
        HttpResponse<String> response = Unirest.get(configProperties.getEmbyUrl() + "/Items?Recursive=1&ParentId=" + parentId + "&Fields=ProviderIds&IsFolder=1&HasImdbId=1")
                .header(ACCESS_TOKEN_HEADER, configProperties.getEmbyAccessToken())
                .asString();
        handleErrorResponse(response);

        List<Map<String, Object>> itemList = JsonPath.read(response.getBody(), "$.Items");
        return itemList.stream()
                .filter(e -> {
                    Map<String, String> providerMap = (Map<String, String>) e.get("ProviderIds");
                    return imdbId.equals(providerMap.get("Imdb"));
                })
                .map(e -> (String) e.get("Id"))
                .collect(Collectors.toSet());
    }

    @SneakyThrows
    private void refreshItem(String id) {
        log.info("Refresh request : Item {}", id);
        HttpResponse<String> response = Unirest.post(configProperties.getEmbyUrl() + "/emby/Items/" + id + "/Refresh?Recursive=true")
                .header("Content-Type", "application/json")
                .header(ACCESS_TOKEN_HEADER, configProperties.getEmbyAccessToken())
                .asString();
        handleErrorResponse(response);
        log.info("Refresh request sent : Item {}", id);
    }

    @SneakyThrows
    private void refreshLibrary() {
        log.info("Refresh request : Library");
        if (lastFullLibraryRefreshTime.plusMinutes(configProperties.getEmbyFullRefreshTimeoutMins()).isAfter(LocalDateTime.now())) {
            log.warn("Last library refresh request sent at : {}. Too soon for another refresh. " +
                    "Scheduling a full refresh in {} minutes", lastFullLibraryRefreshTime, configProperties.getEmbyFullRefreshTimeoutMins());
            if (this.scheduler.getQueue().size() == 0) {
                this.scheduler.schedule(this::refreshLibrary, configProperties.getEmbyFullRefreshTimeoutMins(), TimeUnit.MINUTES);
            } else {
                log.info("There is already a scheduled full library refresh. Skip scheduling more refresh jobs.");
            }
            return;
        }

        HttpResponse<String> response = Unirest.post(configProperties.getEmbyUrl() + "/Library/Refresh")
                .header(ACCESS_TOKEN_HEADER, configProperties.getEmbyAccessToken())
                .asString();
        handleErrorResponse(response);
        lastFullLibraryRefreshTime = LocalDateTime.now();
        log.info("Refresh request sent : Library");
    }

    private void handleErrorResponse(HttpResponse<?> response) {
        if (!String.valueOf(response.getStatus()).startsWith("2")) {
            log.error("Error response : {}", response);
            throw new RuntimeException("Error response from emby");
        }
    }
}
