package com.collabeditor.backend.controller;

import com.collabeditor.backend.model.CrdtChar;
import com.collabeditor.backend.service.DocumentService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/documents")
public class DocumentRestController {

    private final DocumentService documentService;

    public DocumentRestController(DocumentService documentService) {
        this.documentService = documentService;
    }

    @GetMapping("/{documentId}/state")
    public List<CrdtChar> getDocumentState(@PathVariable String documentId) {
        return documentService.getOrLoadDocument(documentId).getFullState();
    }

    @DeleteMapping("/{documentId}")
    public void clearDocument(@PathVariable String documentId) {
        documentService.clearDocument(documentId);
    }
}