package com.collabeditor.backend.service;

import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class SessionManager {

    private static final String[] COLORS = {
        "#e06c75", "#61afef", "#98c379", "#e5c07b", 
        "#c678dd", "#56b6c2", "#be5046", "#d19a66"
    };

    // documentId → { siteId → user info }
    private final Map<String, Map<String, UserInfo>> documentUsers = new ConcurrentHashMap<>();

    public void userJoined(String documentId, String siteId, String userName) {
        Map<String, UserInfo> users = documentUsers.computeIfAbsent(documentId, k -> new ConcurrentHashMap<>());
        int colorIndex = users.size() % COLORS.length;
        users.put(siteId, new UserInfo(siteId, userName, COLORS[colorIndex]));
    }

    public void userLeft(String documentId, String siteId) {
        Map<String, UserInfo> users = documentUsers.get(documentId);
        if (users != null) {
            users.remove(siteId);
            if (users.isEmpty()) {
                documentUsers.remove(documentId);
            }
        }
    }

    public List<UserInfo> getUsers(String documentId) {
        Map<String, UserInfo> users = documentUsers.get(documentId);
        return users != null ? new ArrayList<>(users.values()) : new ArrayList<>();
    }

    public static class UserInfo {
        private String siteId;
        private String userName;
        private String color;

        public UserInfo(String siteId, String userName, String color) {
            this.siteId = siteId;
            this.userName = userName;
            this.color = color;
        }

        public String getSiteId() { return siteId; }
        public String getUserName() { return userName; }
        public String getColor() { return color; }
    }
}