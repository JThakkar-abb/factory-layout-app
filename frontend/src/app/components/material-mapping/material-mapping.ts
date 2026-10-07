import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';

interface MaterialItem {
  material: string;
  description: string;
  area: string;
  storingPosition: string;
  kanbanContainer: string;
  qty: number;
  idNumber: string;

  line: string;
  rack: string;
  level: number;
  bin: string;
  isFloor: boolean;
  isCart?: boolean;
  locationType?: string;
  isXT5BB?: boolean;
  imagePath?: string;
}

interface BinItem extends MaterialItem {
  key: string;
  kanbanIds?: string[];
  duplicateCount?: number;
  duplicateItems?: MaterialItem[];
  isEmpty?: boolean;
}

interface LevelGroup {
  level: number;
  bins: BinItem[];
}

interface RackGroup {
  rack: string;
  levels: LevelGroup[];
}

interface LineGroup {
  line: string;
  racks: RackGroup[];
}

@Component({
  selector: 'app-material-mapping',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './material-mapping.html',
  styleUrls: ['./material-mapping.scss']
})

export class MaterialMappingComponent implements OnInit {

  allMaterials: MaterialItem[] = [];
  lineGroups: LineGroup[] = [];
  rackList: string[] = [];

  selectedLine = 'ALL';
  selectedRack = 'ALL';

  selectedBin: BinItem | null = null;
  selectedBinKey = '';
  selectedDuplicateBins: MaterialItem[] = [];

  searchTerm = '';
  activeSearchTerm = '';
  showSuggestions = false;
  filteredSuggestions: MaterialItem[] = [];
  xt5View = '';

  pageTitle = 'Material Mapping';

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute
  ) {}

  goBack(): void {
    window.history.back();
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.selectedLine = String(params['line'] || 'ALL').toUpperCase();
      this.searchTerm = String(params['search'] || '');
      this.activeSearchTerm = this.searchTerm.trim().toLowerCase();
      this.pageTitle = `Material Mapping — ${this.selectedLine}`;
      this.xt5View = String(params['view'] || '').toUpperCase();
      this.loadSqlData();
    });
  }

 private loadSqlData(): void {
  this.http.get<any>('http://localhost:3000/api/materials')
    .subscribe({
      next: (res) => {
        const raw = res?.data || [];

        let mapped: MaterialItem[] = raw.flatMap((x: any) => this.mapRows(x));

        // XT5 rules first
       mapped = mapped.filter(m => {
  const area = String(m.area || '').toUpperCase();
  const rack = String(m.rack || '').toUpperCase();

  if (this.selectedLine === 'XT5KIT' && this.xt5View === 'BB') {
    return area.includes('XT5BB') &&
      ['N', 'O', 'P', 'Q'].includes(rack);
  }

  if (this.selectedLine === 'XT5KIT' && this.xt5View === 'KIT') {
    return area.includes('XT5KIT') &&
      !area.includes('XT5BB') &&
      ['A','B','C','D','E','F','G','H','I','J','K','L','M'].includes(rack);
  }

  return true;
});

        // Then selected line filter
        mapped = mapped.filter(m => {
          if (this.selectedLine === 'ALL') return true;
          return m.line === this.selectedLine;
        });

        this.allMaterials = mapped;

        this.buildRackList();
        this.buildHierarchy();

        if (this.activeSearchTerm) {
          this.onSearch();
        }
      },
      error: (err) => console.error(err)
    });
}
  
private normalizeLine(area: string): string {
  const raw = String(area || '')
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/\./g, '')
    .replace(/_/g, '')
    .replace(/-/g, '');

  // XT2 / XT4
  if (raw.includes('XT2XT4TU')) return 'XT2XT4TU';
  if (raw.includes('XT2XT4ATO1')) return 'XT2XT4ATO1';

  // XT5
  if (
    raw.includes('XT5TRIPUNIT') ||
    raw.includes('XT5TU')
  ) {
    return 'XT5TU';
  }

  if (raw.includes('XT5STAT')) return 'XT5ATO';
  if (raw.includes('XT5KIT')) return 'XT5KIT';
  if (raw.includes('XT5BB')) return 'XT5KIT';

  // TMAX
  if (raw.includes('TMAXSTAT')) return 'TMAXATO';

  if (
    raw.includes('TMAXXT3KIT') ||
    raw.includes('TMAXXT6KIT')
  ) {
    return 'TMAXKIT';
  }

  // XT7
  if (
    raw.includes('XT7E12BB1') ||
    raw.includes('XT7E12BB')
  ) {
    return 'XT7BB';
  }

  if (
    raw.includes('XT7E12KIT') ||
    raw.includes('XT7E12STAT')
  ) {
    return 'XT7_E1.2.KIT';
  }

  // EMAX
  if (
    raw.includes('EMAX2BB1STAT')
  ) {
    return 'EMAX2BB1';
  }

  if (
    raw.includes('EMAX2BB23STAT') ||
    raw.includes('EMAX2BB2&3STAT')
  ) {
    return 'EMAX2BB23';
  }

  if (
    raw.includes('EMAX2PLST') ||
    raw.includes('EMAX2PL')
  ) {
    return 'EMAX2PL_ST';
  }

  if (
    raw.includes('EMAX2KIT') ||
    raw.includes('EMAX2STAT') ||
    raw.includes('EMAX2LINE1&2PREP') ||
    raw.includes('EMAX2LINE1PREP') ||
    raw.includes('EMAX2LINE2PREP')
  ) {
    return 'EMAX2ATO';
  }

  // TRUONE
  if (raw.includes('ATSTRU1KIT')) {
    return 'TRUONE_LINE1';
  }

  if (
    raw.includes('TRUONESWKITTING') ||
    raw.includes('TRUONESWSTATION') ||
    raw.includes('TRU1SWST')
  ) {
    return 'TRUONE_SW';
  }

  return 'FLOOR';
}

 private mapRows(x: any): MaterialItem[] {

  const area = String(x.area || '');
  const storingPosition = String(x.storingPosition || '');
  const rawArea = area.toUpperCase();
  
  const locations = this.extractLocations(storingPosition);

  return locations.map(parsed => ({
  material: String(x.material || ''),
  description: String(x.description || ''),
  area,
  storingPosition,
  kanbanContainer: String(x.kanbanContainer || ''),
  qty: Number(x.qty || 0),
  idNumber: String(x.idNumber || ''),

  line: this.normalizeLine(area),

  rack: parsed.rack,
  level: parsed.level,
  bin: parsed.bin,

  isFloor: parsed.isFloor,
  isCart: parsed.isCart || false,
  locationType: parsed.locationType || 'FLOOR',

  isXT5BB: rawArea.includes('XT5BB'),
  imagePath: encodeURI(String(x.imagePath || x.ImagePath || '').trim())
}));
}
onImageError(url: string | undefined): void {
  console.log('IMAGE FAILED TO LOAD:', url);
  this.showImage = false;
}
hasSelectedImage(): boolean {
  return !!this.selectedBin?.imagePath &&
         String(this.selectedBin.imagePath).trim().length > 0;
}
private extractLocations(pos: string): any[] {

  const raw = String(pos || '').toUpperCase();
  const locations: any[] = [];
  const rackMatches = [...raw.matchAll(/([A-Z])\.(\d+)\.(\d+)/g)];

  for (const match of rackMatches) {
    locations.push({
      rack: match[1],
      level: Number(match[2]),
      bin: String(match[3]),
      isFloor: false,
      isCart: false,
      locationType: 'RACK'
    });
  }

  const cartMatches = [
  ...raw.matchAll(/CART[\s\-_]*([A-Z][0-9]*)/gi)
];

for (const match of cartMatches) {
  locations.push({
    rack: `CART ${String(match[1]).toUpperCase()}`,
    level: 1,
    bin: '1',
    isFloor: false,
    isCart: true,
    locationType: 'CART'
  });
}

  if (locations.length > 0) {
    return locations;
  }

  return [{
    rack: 'FLOOR',
    level: 0,
    bin: '0',
    isFloor: true,
    isCart: false,
    locationType: 'FLOOR'
  }];
}
  private parseStoringPosition(pos: string): {
  rack: string;
  level: number;
  bin: string;
  isFloor: boolean;
  isCart?: boolean;
  locationType?: string;
} {
  
  const raw = String(pos || '').toUpperCase().trim();

  const cartMatch = raw.match(/^CART\s+([A-Z][0-9]*)$/);

  if (cartMatch) {
    return {
      rack: `CART ${cartMatch[1]}`,
      level: 1,
      bin: '1',
      isFloor: false,
      isCart: true,
      locationType: 'CART'
    };
  }

  const rackMatch = raw.match(/^([A-Z])\.(\d+)\.(\d+)$/);

  if (rackMatch) {
    return {
      rack: rackMatch[1],
      level: Number(rackMatch[2]),
      bin: String(rackMatch[3]),
      isFloor: false,
      isCart: false,
      locationType: 'RACK'
    };
  }

  return {
    rack: 'FLOOR',
    level: 0,
    bin: '0',
    isFloor: true,
    isCart: false,
    locationType: 'FLOOR'
  };
}

  private buildRackList(): void {

  this.rackList = [
    ...new Set(this.allMaterials.map(x => x.rack).filter(Boolean))
  ];

  this.rackList.sort((a, b) => this.sortRack(a, b));

   // XT5 BB page → only N,O,P,Q
  if (this.selectedLine === 'XT5KIT') {
    this.rackList = this.rackList.filter(r =>
      ['N', 'O', 'P', 'Q'].includes(String(r).toUpperCase())
    );
  }
}

  private buildHierarchy(): void {
  const lineMap = new Map<string, Map<string, Map<number, BinItem[]>>>();

  for (const item of this.allMaterials) {
    const line = item.line || 'FLOOR';
    const rack = item.rack || 'FLOOR';
    const level = item.level ?? 0;


    if (
      this.selectedLine === 'XT5KIT' &&
      !['N', 'O', 'P', 'Q'].includes(String(rack).toUpperCase())
    ) {
      continue;
    }

    if (!lineMap.has(line)) lineMap.set(line, new Map());
    const rackMap = lineMap.get(line)!;

    if (!rackMap.has(rack)) rackMap.set(rack, new Map());
    const levelMap = rackMap.get(rack)!;

    if (!levelMap.has(level)) levelMap.set(level, []);

    const key = `${line}-${rack}-${level}-${item.bin}-${item.material}`;
    const existing = levelMap.get(level)!.find(b => b.key === key);

    if (existing) {
      existing.kanbanIds = [...(existing.kanbanIds || []), item.idNumber];
      existing.duplicateItems = [...(existing.duplicateItems || []), item];
      existing.duplicateCount = existing.kanbanIds.length;
    } else {
      const binItem: BinItem = {
        ...item,
        key,
        kanbanIds: [item.idNumber],
        duplicateItems: [item],
        duplicateCount: 1
      };

      levelMap.get(level)!.push(binItem);
    }
  }

  this.lineGroups = Array.from(lineMap.entries())
    .sort(([a], [b]) => this.sortLine(a, b))
    .map(([line, rackMap]) => ({
      line,
      racks: Array.from(rackMap.entries())
        .sort(([a], [b]) => this.sortRack(a, b))
        .map(([rack, levelMap]) => ({
          rack,
          levels: Array.from(levelMap.entries())
            .sort(([a], [b]) => b - a)
            .map(([level, bins]) => ({
              level,
              bins: bins.sort((a, b) => {
                const binCompare = Number(a.bin) - Number(b.bin);
                if (binCompare !== 0) return binCompare;
                return a.material.localeCompare(b.material);
              })
            }))
        }))
    }));
}
  getDisplayBins(bins: BinItem[]): BinItem[] {
    return bins;
  }

  private sortRack(a: string, b: string): number {
    if (a === 'FLOOR') return 1;
    if (b === 'FLOOR') return -1;
    return a.localeCompare(b, undefined, { numeric: true });
  }

  private sortLine(a: string, b: string): number {
    if (a === 'FLOOR') return 1;
    if (b === 'FLOOR') return -1;
    return a.localeCompare(b, undefined, { numeric: true });
  }

  onSearch(): void {
    this.showSuggestions = false;
    this.activeSearchTerm = this.searchTerm.trim().toLowerCase();
  }

  onSearchInput(): void {
    const term = this.searchTerm.trim().toLowerCase();

    if (!term) {
      this.filteredSuggestions = [];
      this.showSuggestions = false;
      this.activeSearchTerm = '';
      return;
    }

    this.filteredSuggestions = this.allMaterials
      .filter(x =>
        x.material.toLowerCase().includes(term) ||
        x.description.toLowerCase().includes(term) ||
        x.idNumber.toLowerCase().includes(term)
      )
      .slice(0, 50);

    this.showSuggestions = true;
  }

  hideSuggestions(): void {
    setTimeout(() => this.showSuggestions = false, 200);
  }

  selectSuggestion(item: MaterialItem): void {
    this.searchTerm = item.material;
    this.activeSearchTerm = this.searchTerm.trim().toLowerCase();
    this.showSuggestions = false;

    const found = this.findBinByItem(item);
    if (found) {
      this.selectBin(found);
    }
  }

clearSearch(): void {
  this.searchTerm = '';
  this.activeSearchTerm = '';
  this.filteredSuggestions = [];
  this.showSuggestions = false;
  this.selectedBin = null;
  this.selectedBinKey = '';
  this.selectedDuplicateBins = [];
}

  matches(bin: BinItem): boolean {
    const t = this.activeSearchTerm;
    if (!t) return false;

    return (
      bin.material.toLowerCase().includes(t) ||
      bin.description.toLowerCase().includes(t) ||
      bin.idNumber.toLowerCase().includes(t)
    );
  }

  hasMatches(): boolean {
    if (!this.activeSearchTerm) return true;

    return this.allMaterials.some(m =>
      m.material.toLowerCase().includes(this.activeSearchTerm) ||
      m.description.toLowerCase().includes(this.activeSearchTerm) ||
      m.idNumber.toLowerCase().includes(this.activeSearchTerm)
    );
  }


showImage = true;

selectBin(bin: BinItem): void {
  this.selectedBin = bin;
  this.selectedBinKey = bin.key;
  this.showImage = !!String(bin.imagePath || '').trim();

  if (bin.rack === 'FLOOR') {
    this.selectedDuplicateBins = [];
    return;
  }

  this.selectedDuplicateBins = bin.duplicateItems || [bin];
}

  selectRack(rack: string): void {
    this.selectedRack = rack;
    this.selectedBin = null;
    this.selectedBinKey = '';
    this.selectedDuplicateBins = [];
  }

  selectLine(line: string): void {
    this.selectedLine = line;
    this.selectedRack = 'ALL';
    this.selectedBin = null;
    this.selectedBinKey = '';
    this.selectedDuplicateBins = [];
  }
  rackHasSearchMatch(rack: RackGroup): boolean {
  if (!this.activeSearchTerm) return true;

  return rack.levels.some(level =>
    level.bins.some(bin => this.matches(bin))
  );
}
get matchedRackNames(): string[] {
  if (!this.activeSearchTerm) return [];

  const names: string[] = [];

  for (const line of this.lineGroups) {
    for (const rack of line.racks) {
      if (this.rackHasSearchMatch(rack)) {
        names.push(rack.rack);
      }
    }
  }

  return [...new Set(names)];
}
  private findBinByItem(item: MaterialItem): BinItem | null {
    for (const line of this.lineGroups) {
      for (const rack of line.racks) {
        for (const level of rack.levels) {
          const found = level.bins.find(bin =>
            bin.material === item.material &&
            bin.rack === item.rack &&
            bin.level === item.level &&
            bin.bin === item.bin
          );
          if (found) return found;
        }
      }
    }
    return null;
  }
}