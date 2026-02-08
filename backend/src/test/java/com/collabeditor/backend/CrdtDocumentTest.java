package com.collabeditor.backend;

import com.collabeditor.backend.model.CrdtChar;
import com.collabeditor.backend.model.CrdtOperation;
import com.collabeditor.backend.service.CrdtDocument;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class CrdtDocumentTest {

    @Test
    void testBasicInsert() {
        CrdtDocument doc = new CrdtDocument("test");

        CrdtChar c = new CrdtChar("A-1", 'C', null, 1, "A", false);
        CrdtChar a = new CrdtChar("A-2", 'A', "A-1", 2, "A", false);
        CrdtChar t = new CrdtChar("A-3", 'T', "A-2", 3, "A", false);

        doc.applyOperation(new CrdtOperation(CrdtOperation.Type.INSERT, c, "test", "A", 1));
        doc.applyOperation(new CrdtOperation(CrdtOperation.Type.INSERT, a, "test", "A", 2));
        doc.applyOperation(new CrdtOperation(CrdtOperation.Type.INSERT, t, "test", "A", 3));

        assertEquals("CAT", doc.getText());
    }

    @Test
    void testInsertBetween() {
        // Your question! Type "CT" then insert "A" between them
        CrdtDocument doc = new CrdtDocument("test");

        CrdtChar c = new CrdtChar("A-1", 'C', null, 1, "A", false);
        CrdtChar t = new CrdtChar("A-2", 'T', "A-1", 2, "A", false);

        doc.applyOperation(new CrdtOperation(CrdtOperation.Type.INSERT, c, "test", "A", 1));
        doc.applyOperation(new CrdtOperation(CrdtOperation.Type.INSERT, t, "test", "A", 2));

        assertEquals("CT", doc.getText());

        // Now insert A after C (parent = A-1), clock 3
        CrdtChar a = new CrdtChar("A-3", 'A', "A-1", 3, "A", false);
        doc.applyOperation(new CrdtOperation(CrdtOperation.Type.INSERT, a, "test", "A", 3));

        assertEquals("CAT", doc.getText());
    }

    @Test
    void testDelete() {
        CrdtDocument doc = new CrdtDocument("test");

        CrdtChar h = new CrdtChar("A-1", 'H', null, 1, "A", false);
        CrdtChar i = new CrdtChar("A-2", 'I', "A-1", 2, "A", false);

        doc.applyOperation(new CrdtOperation(CrdtOperation.Type.INSERT, h, "test", "A", 1));
        doc.applyOperation(new CrdtOperation(CrdtOperation.Type.INSERT, i, "test", "A", 2));

        assertEquals("HI", doc.getText());

        // Delete H
        doc.applyOperation(new CrdtOperation(CrdtOperation.Type.DELETE, h, "test", "A", 1));

        assertEquals("I", doc.getText());
    }

    @Test
    void testConcurrentInsertConvergence() {
        // Two users insert after the same character — must converge
        CrdtChar root = new CrdtChar("X-1", 'A', null, 1, "X", false);
        CrdtChar byUserA = new CrdtChar("A-1", 'B', "X-1", 1, "A", false);
        CrdtChar byUserB = new CrdtChar("B-1", 'C', "X-1", 1, "B", false);

        // Order 1: A first, then B
        CrdtDocument doc1 = new CrdtDocument("doc1");
        doc1.applyOperation(new CrdtOperation(CrdtOperation.Type.INSERT, root, "doc1", "X", 1));
        doc1.applyOperation(new CrdtOperation(CrdtOperation.Type.INSERT, byUserA, "doc1", "A", 1));
        doc1.applyOperation(new CrdtOperation(CrdtOperation.Type.INSERT, byUserB, "doc1", "B", 1));

        // Order 2: B first, then A
        CrdtDocument doc2 = new CrdtDocument("doc2");
        doc2.applyOperation(new CrdtOperation(CrdtOperation.Type.INSERT, root, "doc2", "X", 1));
        doc2.applyOperation(new CrdtOperation(CrdtOperation.Type.INSERT, byUserB, "doc2", "B", 1));
        doc2.applyOperation(new CrdtOperation(CrdtOperation.Type.INSERT, byUserA, "doc2", "A", 1));

        // Both must produce the same text
        assertEquals(doc1.getText(), doc2.getText());
    }
}