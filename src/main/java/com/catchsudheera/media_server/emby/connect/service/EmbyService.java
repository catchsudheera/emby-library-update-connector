package com.catchsudheera.media_server.emby.connect.service;

import com.catchsudheera.media_server.emby.connect.config.ConfigProperties;
import com.jayway.jsonpath.JsonPath;
import com.mashape.unirest.http.HttpResponse;
import com.mashape.unirest.http.Unirest;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.ObjectUtils;

import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Slf4j
public class EmbyService {

    private final ConfigProperties configProperties;

    private static final String ACCESS_TOKEN_HEADER = "X-Emby-Token";

    private LocalTime lastFullLibraryRefreshTime = LocalTime.now();

    public EmbyService(ConfigProperties configProperties) {
        this.configProperties = configProperties;
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
        if (lastFullLibraryRefreshTime.isBefore(LocalTime.now().minusMinutes(configProperties.getEmbyFullRefreshTimeoutMins()))) {
            log.warn("Last library refresh request sent at : {}. Too soon for another refresh", lastFullLibraryRefreshTime);
            return;
        }
        HttpResponse<String> response = Unirest.post(configProperties.getEmbyUrl() + "/Library/Refresh")
                .header(ACCESS_TOKEN_HEADER, configProperties.getEmbyAccessToken())
                .asString();
        handleErrorResponse(response);
        lastFullLibraryRefreshTime = LocalTime.now();
        log.info("Refresh request sent : Library");
    }

    private void handleErrorResponse(HttpResponse<?> response) {
        if (!String.valueOf(response.getStatus()).startsWith("2")) {
            log.error("Error response : {}", response);
            throw new RuntimeException("Error response from emby");
        }
    }
}
