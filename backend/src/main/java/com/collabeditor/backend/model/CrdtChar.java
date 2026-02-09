package com.collabeditor.backend.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public class CrdtChar {

    private String id;        // "siteId-counter" — globally unique
    private char value;       // the actual character
    private String parentId;  // inserted after this character
    private int clock;        // logical timestamp
    private String siteId;    // which client created this
    private boolean tombstone; // true = deleted

    public CrdtChar() {}

    public CrdtChar(String id, char value, String parentId, int clock, String siteId, boolean tombstone) {
        this.id = id;
        this.value = value;
        this.parentId = parentId;
        this.clock = clock;
        this.siteId = siteId;
        this.tombstone = tombstone;
    }

    // Getters and setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public char getValue() { return value; }
    public void setValue(char value) { this.value = value; }

    public String getParentId() { return parentId; }
    public void setParentId(String parentId) { this.parentId = parentId; }

    public int getClock() { return clock; }
    public void setClock(int clock) { this.clock = clock; }

    public String getSiteId() { return siteId; }
    public void setSiteId(String siteId) { this.siteId = siteId; }

    public boolean isTombstone() { return tombstone; }
    public void setTombstone(boolean tombstone) { this.tombstone = tombstone; }

    public boolean isVisible() { return !tombstone; }
}