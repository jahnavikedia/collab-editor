package com.collabeditor.backend.handler;

import com.collabeditor.backend.service.SessionManager;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class WebSocketEventHandler {

    private final SessionManager sessionManager;
    private final SimpMessagingTemplate messagingTemplate;

    // Track which WebSocket session belongs to which user/document
    private final Map<String, String[]> sessionMap = new ConcurrentHashMap<>();

    public WebSocketEventHandler(SessionManager sessionManager, SimpMessagingTemplate messagingTemplate) {
        this.sessionManager = sessionManager;
        this.messagingTemplate = messagingTemplate;
    }

    public void registerSession(String wsSessionId, String documentId, String siteId) {
        sessionMap.put(wsSessionId, new String[]{documentId, siteId});
    }

    @EventListener
    public void handleDisconnect(SessionDisconnectEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
        String wsSessionId = accessor.getSessionId();

        String[] info = sessionMap.remove(wsSessionId);
        if (info != null) {
            String documentId = info[0];
            String siteId = info[1];
            sessionManager.userLeft(documentId, siteId);
            messagingTemplate.convertAndSend(
                "/topic/presence/" + documentId,
                sessionManager.getUsers(documentId)
            );
        }
    }
}