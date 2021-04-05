package com.dutchflix.emby.connect.service;

import com.jayway.jsonpath.JsonPath;
import com.mashape.unirest.http.HttpResponse;
import com.mashape.unirest.http.Unirest;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.ObjectUtils;

import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Slf4j
public class EmbyService {

    @Value("${emby.access.token}")
    private String accessToken;

    @Value("${emby.url}")
    private String url;

    @Value("${emby.full.library.refresh.threshold.mins}")
    private int refreshThreshold;

    private static final String ACCESS_TOKEN_HEADER = "X-Emby-Token";

    private LocalTime lastFullLibraryRefreshTime = LocalTime.now();

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
        HttpResponse<String> response = Unirest.get(url + "/Items?IsFolder=1")
                .header(ACCESS_TOKEN_HEADER, accessToken)
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
        HttpResponse<String> response = Unirest.get(url + "/Items?IsFolder=1")
                .header(ACCESS_TOKEN_HEADER, accessToken)
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
        HttpResponse<String> response = Unirest.get(url + "/Items?Recursive=1&ParentId=" + parentId + "&Fields=ProviderIds&IsFolder=1&HasImdbId=1")
                .header(ACCESS_TOKEN_HEADER, accessToken)
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
        HttpResponse<String> response = Unirest.post(url + "/emby/Items/" + id + "/Refresh?Recursive=true")
                .header("Content-Type", "application/json")
                .header(ACCESS_TOKEN_HEADER, accessToken)
                .asString();
        handleErrorResponse(response);
        log.info("Refresh request sent : Item {}", id);
    }

    @SneakyThrows
    private void refreshLibrary() {
        log.info("Refresh request : Library");
        if (lastFullLibraryRefreshTime.isBefore(LocalTime.now().minusMinutes(refreshThreshold))) {
            log.warn("Last library refresh request sent at : {}. Too soon for another refresh", lastFullLibraryRefreshTime);
            return;
        }
        HttpResponse<String> response = Unirest.post(url + "/Library/Refresh")
                .header(ACCESS_TOKEN_HEADER, accessToken)
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
