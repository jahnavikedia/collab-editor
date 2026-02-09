package com.collabeditor.backend.model;

import jakarta.persistence.*;

@Entity
@Table(name = "documents")
public class DocumentEntity {

    @Id
    private String id;

    @Column(columnDefinition = "TEXT")
    private String crdtState;

    @Version
    private Integer version;

    public DocumentEntity() {}

    public DocumentEntity(String id, String crdtState) {
        this.id = id;
        this.crdtState = crdtState;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getCrdtState() { return crdtState; }
    public void setCrdtState(String crdtState) { this.crdtState = crdtState; }

    public Integer getVersion() { return version; }
    public void setVersion(Integer version) { this.version = version; }
}