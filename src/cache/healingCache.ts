import * as fs from 'fs';
import * as path from 'path';

export interface CacheEntry {
  oldLocator: string;
  suggestedLocator: string;
  confidence: number;
  domainOrContext?: string;
  updatedAt: string;
  hitCount: number;
}

export class HealingCache {
  private cacheFilePath: string;
  private memoryMap: Map<string, CacheEntry> = new Map();

  constructor(customPath?: string) {
    this.cacheFilePath = customPath || path.resolve(process.cwd(), '.autoheal-cache.json');
    this.loadCache();
  }

  private loadCache(): void {
    if (fs.existsSync(this.cacheFilePath)) {
      try {
        const raw = fs.readFileSync(this.cacheFilePath, 'utf-8');
        const parsed = JSON.parse(raw);
        for (const [key, val] of Object.entries(parsed)) {
          this.memoryMap.set(key, val as CacheEntry);
        }
      } catch {
        this.memoryMap.clear();
      }
    }
  }

  public get(oldLocator: string): CacheEntry | undefined {
    const entry = this.memoryMap.get(oldLocator);
    if (entry) {
      entry.hitCount = (entry.hitCount || 0) + 1;
      this.saveCache();
    }
    return entry;
  }

  public set(oldLocator: string, suggestedLocator: string, confidence: number, context?: string): void {
    this.memoryMap.set(oldLocator, {
      oldLocator,
      suggestedLocator,
      confidence,
      domainOrContext: context,
      updatedAt: new Date().toISOString(),
      hitCount: 1
    });
    this.saveCache();
  }

  public saveCache(): void {
    const obj: Record<string, CacheEntry> = {};
    for (const [k, v] of this.memoryMap.entries()) {
      obj[k] = v;
    }
    fs.writeFileSync(this.cacheFilePath, JSON.stringify(obj, null, 2), 'utf-8');
  }

  public getAll(): CacheEntry[] {
    return Array.from(this.memoryMap.values());
  }
}
