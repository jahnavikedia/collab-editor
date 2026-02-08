package com.collabeditor.backend.model;

public class CrdtOperation {

    public enum Type {
        INSERT,
        DELETE
    }

    private Type type;
    private CrdtChar character;
    private String documentId;
    private String siteId;
    private int clock;

    public CrdtOperation() {}

    public CrdtOperation(Type type, CrdtChar character, String documentId, String siteId, int clock) {
        this.type = type;
        this.character = character;
        this.documentId = documentId;
        this.siteId = siteId;
        this.clock = clock;
    }

    // Getters and setters
    public Type getType() { return type; }
    public void setType(Type type) { this.type = type; }

    public CrdtChar getCharacter() { return character; }
    public void setCharacter(CrdtChar character) { this.character = character; }

    public String getDocumentId() { return documentId; }
    public void setDocumentId(String documentId) { this.documentId = documentId; }

    public String getSiteId() { return siteId; }
    public void setSiteId(String siteId) { this.siteId = siteId; }

    public int getClock() { return clock; }
    public void setClock(int clock) { this.clock = clock; }
}