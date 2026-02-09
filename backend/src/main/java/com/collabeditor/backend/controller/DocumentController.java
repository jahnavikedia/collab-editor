package com.collabeditor.backend.controller;

import com.collabeditor.backend.model.CrdtOperation;
import com.collabeditor.backend.service.DocumentService;
import com.collabeditor.backend.service.SessionManager;
import com.collabeditor.backend.handler.WebSocketEventHandler;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

@Controller
public class DocumentController {

    private final SimpMessagingTemplate messagingTemplate;
    private final DocumentService documentService;
    private final SessionManager sessionManager;
    private final WebSocketEventHandler eventHandler;

    public DocumentController(SimpMessagingTemplate messagingTemplate, DocumentService documentService, SessionManager sessionManager, WebSocketEventHandler eventHandler) {
        this.messagingTemplate = messagingTemplate;
        this.documentService = documentService;
        this.sessionManager = sessionManager;
        this.eventHandler = eventHandler;
    }

    @MessageMapping("/document.edit")
    public void handleEdit(@Payload EditMessage message) {
        String docId = message.getDocumentId();
        boolean applied = documentService.applyOperation(docId, message.getOperation());
        if (applied) {
            messagingTemplate.convertAndSend("/topic/document/" + docId, message);
        }
    }

    @MessageMapping("/document.join")
    public void handleJoin(@Payload JoinMessage message, SimpMessageHeaderAccessor headerAccessor) {
        String wsSessionId = headerAccessor.getSessionId();
        sessionManager.userJoined(message.getDocumentId(), message.getSiteId(), message.getUserName());
        eventHandler.registerSession(wsSessionId, message.getDocumentId(), message.getSiteId());
        messagingTemplate.convertAndSend(
            "/topic/presence/" + message.getDocumentId(),
            sessionManager.getUsers(message.getDocumentId())
        );
    }

    @MessageMapping("/document.leave")
    public void handleLeave(@Payload LeaveMessage message) {
        sessionManager.userLeft(message.getDocumentId(), message.getSiteId());
        messagingTemplate.convertAndSend(
            "/topic/presence/" + message.getDocumentId(),
            sessionManager.getUsers(message.getDocumentId())
        );
    }

    public static class EditMessage {
        private String documentId;
        private CrdtOperation operation;
        public EditMessage() {}
        public String getDocumentId() { return documentId; }
        public void setDocumentId(String documentId) { this.documentId = documentId; }
        public CrdtOperation getOperation() { return operation; }
        public void setOperation(CrdtOperation operation) { this.operation = operation; }
    }

    public static class JoinMessage {
        private String documentId;
        private String siteId;
        private String userName;
        public JoinMessage() {}
        public String getDocumentId() { return documentId; }
        public void setDocumentId(String documentId) { this.documentId = documentId; }
        public String getSiteId() { return siteId; }
        public void setSiteId(String siteId) { this.siteId = siteId; }
        public String getUserName() { return userName; }
        public void setUserName(String userName) { this.userName = userName; }
    }

    public static class LeaveMessage {
        private String documentId;
        private String siteId;
        public LeaveMessage() {}
        public String getDocumentId() { return documentId; }
        public void setDocumentId(String documentId) { this.documentId = documentId; }
        public String getSiteId() { return siteId; }
        public void setSiteId(String siteId) { this.siteId = siteId; }
    }

    @MessageMapping("/document.cursor")
    public void handleCursor(@Payload CursorMessage message) {
        messagingTemplate.convertAndSend(
            "/topic/cursor/" + message.getDocumentId(), message
        );
    }

    public static class CursorMessage {
        private String documentId;
        private String siteId;
        private String userName;
        private String color;
        private int position;
        public CursorMessage() {}
        public String getDocumentId() { return documentId; }
        public void setDocumentId(String documentId) { this.documentId = documentId; }
        public String getSiteId() { return siteId; }
        public void setSiteId(String siteId) { this.siteId = siteId; }
        public String getUserName() { return userName; }
        public void setUserName(String userName) { this.userName = userName; }
        public String getColor() { return color; }
        public void setColor(String color) { this.color = color; }
        public int getPosition() { return position; }
        public void setPosition(int position) { this.position = position; }
    }
}