package com.collabeditor.backend.controller;

import com.collabeditor.backend.model.CrdtOperation;
import com.collabeditor.backend.service.DocumentService;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

@Controller
public class DocumentController {

    private final SimpMessagingTemplate messagingTemplate;
    private final DocumentService documentService;

    public DocumentController(SimpMessagingTemplate messagingTemplate, DocumentService documentService) {
        this.messagingTemplate = messagingTemplate;
        this.documentService = documentService;
    }

    @MessageMapping("/document.edit")
    public void handleEdit(@Payload EditMessage message) {
        String docId = message.getDocumentId();

        boolean applied = documentService.applyOperation(docId, message.getOperation());

        if (applied) {
            messagingTemplate.convertAndSend(
                "/topic/document/" + docId,
                message
            );
        }
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
}