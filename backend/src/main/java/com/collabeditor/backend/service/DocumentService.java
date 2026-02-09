package com.collabeditor.backend.service;

import com.collabeditor.backend.model.CrdtChar;
import com.collabeditor.backend.model.CrdtOperation;
import com.collabeditor.backend.model.DocumentEntity;
import com.collabeditor.backend.repository.DocumentRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class DocumentService {

    private final Map<String, CrdtDocument> activeDocuments = new ConcurrentHashMap<>();
    private final Set<String> dirtyDocuments = ConcurrentHashMap.newKeySet();
    private final DocumentRepository repository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public DocumentService(DocumentRepository repository) {
        this.repository = repository;
    }

    public CrdtDocument getOrLoadDocument(String documentId) {
        return activeDocuments.computeIfAbsent(documentId, id -> {
            // Try loading from database
            return repository.findById(id)
                .map(entity -> {
                    CrdtDocument doc = new CrdtDocument(id);
                    loadState(doc, entity.getCrdtState());
                    return doc;
                })
                .orElse(new CrdtDocument(id));
        });
    }

    public boolean applyOperation(String documentId, CrdtOperation op) {
        CrdtDocument doc = getOrLoadDocument(documentId);
        boolean applied = doc.applyOperation(op);
        if (applied) {
            dirtyDocuments.add(documentId);
        }
        return applied;
    }

    @Scheduled(fixedRate = 30000) // every 30 seconds
    public void persistDirtyDocuments() {
        for (String docId : dirtyDocuments) {
            try {
                saveDocument(docId);
                dirtyDocuments.remove(docId);
            } catch (Exception e) {
                System.err.println("Failed to save document " + docId + ": " + e.getMessage());
            }
        }
    }

    public void saveDocument(String documentId) {
        CrdtDocument doc = activeDocuments.get(documentId);
        if (doc == null) return;

        String json = serializeState(doc.getFullState());

        DocumentEntity entity = repository.findById(documentId)
            .orElse(new DocumentEntity(documentId, ""));
        entity.setCrdtState(json);
        repository.save(entity);
    }

    private String serializeState(List<CrdtChar> state) {
        try {
            return objectMapper.writeValueAsString(state);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Failed to serialize CRDT state", e);
        }
    }

    private void loadState(CrdtDocument doc, String json) {
        if (json == null || json.isEmpty()) return;
        try {
            List<CrdtChar> chars = objectMapper.readValue(json, new TypeReference<>() {});
            doc.loadFromState(chars);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Failed to load CRDT state", e);
        }
    }
}