package com.collabeditor.backend.controller;

import com.collabeditor.backend.model.CrdtOperation;
import com.collabeditor.backend.service.CrdtDocument;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Controller
public class DocumentController {

    private final SimpMessagingTemplate messagingTemplate;
    private final Map<String, CrdtDocument> documents = new ConcurrentHashMap<>();

    public DocumentController(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    @MessageMapping("/document.edit")
    public void handleEdit(@Payload EditMessage message) {
        String docId = message.getDocumentId();

        // Get or create the document
        CrdtDocument doc = documents.computeIfAbsent(docId, CrdtDocument::new);

        // Apply operation to server-side CRDT
        boolean applied = doc.applyOperation(message.getOperation());

        if (applied) {
            // Broadcast to all subscribers of this document
            messagingTemplate.convertAndSend(
                "/topic/document/" + docId,
                message
            );
        }
    }

    // Inner class for the incoming message format
    public static class EditMessage {
        private String documentId;
        private CrdtOperation operation;

        public EditMessage() {}

        public String getDocumentId() { return documentId; }
        public void setDocumentId(String documentId) { this.documentId = documentId; }

        public CrdtOperation getOperation() { return operation; }
        public void setOperation(CrdtOperation operation) { this.operation = operation; }
    }
}