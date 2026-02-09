package com.collabeditor.backend.service;

import com.collabeditor.backend.model.CrdtChar;
import com.collabeditor.backend.model.CrdtOperation;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class CrdtDocument {

    private final List<CrdtChar> sequence;
    private final Map<String, Integer> idIndex;  // charId → position in sequence
    private final String documentId;

    public CrdtDocument(String documentId) {
        this.documentId = documentId;
        this.sequence = new ArrayList<>();
        this.idIndex = new HashMap<>();
    }

    /**
     * Apply an operation (insert or delete).
     * Returns true if it was new, false if duplicate.
     */
    public synchronized boolean applyOperation(CrdtOperation op) {
        return switch (op.getType()) {
            case INSERT -> applyInsert(op.getCharacter());
            case DELETE -> applyDelete(op.getCharacter());
        };
    }

    /**
     * This is the algorithm from Step 4:
     * 1. Find the parent
     * 2. Move right
     * 3. Scan siblings — higher clock goes LEFT
     * 4. Insert where we stop
     */
    private boolean applyInsert(CrdtChar newChar) {
        // Duplicate check
        if (idIndex.containsKey(newChar.getId())) {
            return false;
        }

        int insertIdx;

        if (newChar.getParentId() == null || newChar.getParentId().isEmpty()) {
            // No parent — insert at the beginning
            insertIdx = 0;

            // But still check siblings at position 0
            while (insertIdx < sequence.size()) {
                CrdtChar existing = sequence.get(insertIdx);
                if (existing.getParentId() != null && !existing.getParentId().isEmpty()) {
                    break; // different parent
                }
                if (shouldGoBeforeExisting(newChar, existing)) {
                    break;
                }
                insertIdx++;
            }
        } else {
            // Find parent's position
            Integer parentIdx = idIndex.get(newChar.getParentId());
            if (parentIdx == null) {
                return false; // parent hasn't arrived yet
            }

            // Start scanning from right of parent
            insertIdx = parentIdx + 1;

            while (insertIdx < sequence.size()) {
                CrdtChar existing = sequence.get(insertIdx);

                // Different parent — we've passed all siblings, stop
                if (!newChar.getParentId().equals(existing.getParentId())) {
                    break;
                }

                // Same parent — compare to determine order
                if (shouldGoBeforeExisting(newChar, existing)) {
                    break;
                }

                insertIdx++;
            }
        }

        sequence.add(insertIdx, newChar);
        rebuildIndex();
        return true;
    }

    /**
     * The comparison rule from Step 4:
     * Higher clock goes LEFT (closer to parent).
     * Equal clock → higher siteId goes LEFT.
     */
    private boolean shouldGoBeforeExisting(CrdtChar newChar, CrdtChar existing) {
        if (newChar.getClock() != existing.getClock()) {
            return newChar.getClock() > existing.getClock();
        }
        return newChar.getSiteId().compareTo(existing.getSiteId()) > 0;
    }

    /**
     * Delete = mark as tombstone. Don't remove it.
     */
    private boolean applyDelete(CrdtChar deleteChar) {
        Integer idx = idIndex.get(deleteChar.getId());
        if (idx == null) return false;

        CrdtChar existing = sequence.get(idx);
        if (existing.isTombstone()) return false; // already deleted

        existing.setTombstone(true);
        return true;
    }

    /** Get visible text (skip tombstones) */
    public String getText() {
        StringBuilder sb = new StringBuilder();
        for (CrdtChar c : sequence) {
            if (c.isVisible()) {
                sb.append(c.getValue());
            }
        }
        return sb.toString();
    }

    /** Get full state including tombstones (for saving/syncing) */
    public List<CrdtChar> getFullState() {
        return new ArrayList<>(sequence);
    }

    public String getDocumentId() {
        return documentId;
    }

    private void rebuildIndex() {
        idIndex.clear();
        for (int i = 0; i < sequence.size(); i++) {
            idIndex.put(sequence.get(i).getId(), i);
        }
    }

    /**
     * Load state directly from a saved sequence.
     * No need to replay the insert algorithm — the order is already correct.
     */
    public void loadFromState(List<CrdtChar> chars) {
        sequence.clear();
        sequence.addAll(chars);
        rebuildIndex();
    }

}