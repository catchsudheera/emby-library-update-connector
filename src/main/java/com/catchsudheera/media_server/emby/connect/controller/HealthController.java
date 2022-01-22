package com.catchsudheera.media_server.emby.connect.controller;

import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("health")
@Slf4j
public class HealthController {

    @GetMapping("/ping")
    public String ping() {
        return "ok";
    }
}
