export interface CrdtChar {
  id: string;
  value: string;
  parentId: string | null;
  clock: number;
  siteId: string;
  tombstone: boolean;
}

export interface CrdtOperation {
  type: 'INSERT' | 'DELETE';
  character: CrdtChar;
  documentId: string;
  siteId: string;
  clock: number;
}

export class CrdtEngine {
  private sequence: CrdtChar[] = [];
  private idIndex: Map<string, number> = new Map();
  private counter: number = 0;
  private siteId: string;
  private documentId: string;

  constructor(siteId: string, documentId: string) {
    this.siteId = siteId;
    this.documentId = documentId;
  }

  /**
   * LOCAL user typed a character.
   * Generate the CRDT operation and apply it locally.
   */
  generateInsert(char: string, afterIndex: number): CrdtOperation {
    this.counter++;

    const visibleChars = this.getVisibleChars();
    const parentId = afterIndex >= 0 && afterIndex < visibleChars.length
      ? visibleChars[afterIndex].id
      : null;

    const newChar: CrdtChar = {
      id: `${this.siteId}-${this.counter}`,
      value: char,
      parentId,
      clock: this.counter,
      siteId: this.siteId,
      tombstone: false,
    };

    this.applyInsert(newChar);

    return {
      type: 'INSERT',
      character: newChar,
      documentId: this.documentId,
      siteId: this.siteId,
      clock: this.counter,
    };
  }

  /**
   * LOCAL user deleted a character.
   */
  generateDelete(visualIndex: number): CrdtOperation | null {
    const visibleChars = this.getVisibleChars();
    if (visualIndex < 0 || visualIndex >= visibleChars.length) return null;

    const charToDelete = visibleChars[visualIndex];
    this.applyDelete(charToDelete.id);

    return {
      type: 'DELETE',
      character: { ...charToDelete, tombstone: true },
      documentId: this.documentId,
      siteId: this.siteId, // Use deleter's siteId, not character's original siteId
      clock: charToDelete.clock,
    };
  }

  /**
   * REMOTE operation arrived from server. Apply it.
   */
  applyRemoteOperation(op: CrdtOperation): boolean {
    if (op.siteId === this.siteId) return false; // skip our own

    // Lamport timestamp: update our clock to maintain causal ordering
    this.counter = Math.max(this.counter, op.clock);

    switch (op.type) {
      case 'INSERT': return this.applyInsert(op.character);
      case 'DELETE': return this.applyDelete(op.character.id);
    }
  }

  /**
   * Load CRDT state directly from server's ordered sequence.
   * Use this when fetching initial document state - do NOT replay through insert algorithm.
   */
  loadFromState(chars: CrdtChar[]): void {
    this.sequence = [...chars];
    this.rebuildIndex();

    // Update counter to max clock value to avoid ID conflicts
    const maxClock = chars.reduce((max, c) => Math.max(max, c.clock), 0);
    this.counter = Math.max(this.counter, maxClock);
  }

  getText(): string {
    return this.sequence.filter(c => !c.tombstone).map(c => c.value).join('');
  }

  getVisibleChars(): CrdtChar[] {
    return this.sequence.filter(c => !c.tombstone);
  }

  // --- Same algorithm as the Java version ---

  private applyInsert(newChar: CrdtChar): boolean {
    if (this.idIndex.has(newChar.id)) return false;

    let insertIdx: number;

    if (!newChar.parentId) {
      insertIdx = 0;
      while (insertIdx < this.sequence.length) {
        const existing = this.sequence[insertIdx];
        if (existing.parentId !== null && existing.parentId !== '') break;
        if (this.shouldGoBeforeExisting(newChar, existing)) break;
        insertIdx++;
      }
    } else {
      const parentIdx = this.idIndex.get(newChar.parentId);
      if (parentIdx === undefined) {
        return false;
      }

      insertIdx = parentIdx + 1;
      while (insertIdx < this.sequence.length) {
        const existing = this.sequence[insertIdx];
        if (existing.parentId !== newChar.parentId) break;
        if (this.shouldGoBeforeExisting(newChar, existing)) break;
        insertIdx++;
      }
    }

    this.sequence.splice(insertIdx, 0, newChar);
    this.rebuildIndex();
    return true;
  }

  private shouldGoBeforeExisting(newChar: CrdtChar, existing: CrdtChar): boolean {
    if (newChar.clock !== existing.clock) {
      return newChar.clock > existing.clock;
    }
    return newChar.siteId > existing.siteId;
  }

  private applyDelete(charId: string): boolean {
    const idx = this.idIndex.get(charId);
    if (idx === undefined) return false;
    if (this.sequence[idx].tombstone) return false;
    this.sequence[idx] = { ...this.sequence[idx], tombstone: true };
    return true;
  }

  private rebuildIndex(): void {
    this.idIndex.clear();
    this.sequence.forEach((c, i) => this.idIndex.set(c.id, i));
  }
}