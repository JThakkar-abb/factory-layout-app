import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef } from '@angular/core';

interface MaterialItem {
  material: string;
  description: string;
  area: string;
  storingPosition: string;
  kanbanContainer: string;
  qty: number;
  idNumber: string;

  line?: string;
  rack?: string;
  level?: number;
  bin?: number;

  isFloor?: boolean;
  isXT5BB?: boolean;
}

@Component({
  selector: 'app-factory-layout',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './factory-layout.html',
  styleUrls: ['./factory-layout.scss']
})
export class FactoryLayout implements OnInit {

  // =========================================
  // FIXED / RESPONSIVE FACTORY LAYOUT
  // =========================================

  readonly designWidth = 1840;
  readonly pageGutter = 24;
  layoutScale = 1;


  // =========================================
  // MATERIAL DATA
  // =========================================

  materialSearch = '';
  allMaterials: MaterialItem[] = [];

  matchedLines: Record<string, number> = {};
  matchedLineNames: string[] = [];

  floorCounts: Record<string, number> = {};

  isSearching = false;
  searched = false;


  constructor(
    private http: HttpClient,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}


  // =========================================
  // INITIALIZATION
  // =========================================

  ngOnInit(): void {

    // Calculate initial screen scale
    this.updateLayoutScale();

    this.http
      .get<any>('http://localhost:3000/api/materials')
      .subscribe({
        next: (res) => {

          const rows = Array.isArray(res)
            ? res
            : (res?.data || []);

          this.allMaterials = rows.map(
            (x: any) => this.mapRow(x)
          );

          this.buildFloorCounts();

          this.cdr.detectChanges();
        },

        error: (err) =>
          console.error('API ERROR:', err)
      });
  }


  // =========================================
  // RESPONSIVE FACTORY LAYOUT
  // =========================================

  @HostListener('window:resize')
  onWindowResize(): void {
    this.updateLayoutScale();
  }


  private updateLayoutScale(): void {

    const availableWidth = Math.max(
      320,
      window.innerWidth - this.pageGutter
    );

    this.layoutScale = Math.min(
      1,
      availableWidth / this.designWidth
    );
  }


  // =========================================
  // FLOOR MATERIAL COUNTS
  // =========================================

  private buildFloorCounts(): void {

    this.floorCounts = {};

    for (const item of this.allMaterials) {

      const line = item.line;

      const pos = String(
        item.storingPosition || ''
      ).toUpperCase();

      if (!line || line === 'FLOOR') {
        continue;
      }

      const isRealFloor =
        item.isFloor === true ||
        pos.includes('FLOOR') ||
        pos.includes('PALLET');

      if (isRealFloor) {

        this.floorCounts[line] =
          (this.floorCounts[line] || 0) + 1;
      }
    }

    console.log(
      'Floor Counts:',
      this.floorCounts
    );
  }


  // =========================================
  // NORMALIZE PRODUCTION LINE NAMES
  // =========================================

  private normalizeLine(area: string): string {

    const raw = String(area || '')
      .toUpperCase()
      .replace(/\s+/g, '')
      .replace(/\./g, '')
      .replace(/_/g, '')
      .replace(/-/g, '');


    // ================= XT2 / XT4 =================

    if (
      raw.includes('XT2XT4TU')
    ) {
      return 'XT2XT4TU';
    }

    if (
      raw.includes('XT2XT4ATO1')
    ) {
      return 'XT2XT4ATO1';
    }


    // ================= XT5 =================

    if (
      raw.includes('XT5TRIPUNIT')
    ) {
      return 'XT5TU';
    }

    if (
      raw.includes('XT5STAT')
    ) {
      return 'XT5ATO';
    }

    // XT5 KITTING
    if (
      raw.includes('XT5KIT')
    ) {
      return 'XT5KIT';
    }

    // XT5 BB -> same line as XT5KIT
    if (
      raw.includes('XT5BB')
    ) {
      return 'XT5KIT';
    }


    // ================= TMAX =================

    if (
      raw.includes('TMAXSTAT')
    ) {
      return 'TMAXATO';
    }

    if (
      raw.includes('TMAXXT3KIT') ||
      raw.includes('TMAXXT6KIT')
    ) {
      return 'TMAXKIT';
    }


    // ================= XT7 / E1.2 BB =================

    if (
      raw.includes('XT7E12BB1') ||
      raw.includes('XT7E12BB')
    ) {
      return 'XT7BB';
    }


    // ================= XT7 / E1.2 ATO =================

    if (
      raw.includes('XT7E12KIT') ||
      raw.includes('XT7E12STAT')
    ) {
      return 'XT7_E1.2.KIT';
    }


    // ================= EMAX2 BB LINE 1 =================

    if (
      raw.includes('EMAX2BB1STAT') ||
      raw.includes('EMAX2BB_1STAT')
    ) {
      return 'EMAX2BB1';
    }


    // ================= EMAX2 BB LINE 2 & 3 =================

    if (
      raw.includes('EMAX2BB23STAT') ||
      raw.includes('EMAX2BB2&3STAT')
    ) {
      return 'EMAX2BB23';
    }


    // ================= EMAX2 POLE LINE =================

    if (
      raw.includes('EMAX2PLST') ||
      raw.includes('EMAX2PL')
    ) {
      return 'EMAX2PL_ST';
    }


    // ================= EMAX2 ATO =================

    if (
      raw.includes('EMAX2KIT') ||
      raw.includes('EMAX2STAT')
    ) {
      return 'EMAX2ATO';
    }


    // ================= TRUONE LINE 1 =================

    if (
      raw.includes('ATSTRU1KIT')
    ) {
      return 'TRUONE_LINE1';
    }


    // ================= TRUONE SWITCH =================

    if (
      raw.includes('TRUONESWKITTING') ||
      raw.includes('TRUONESWSTATION')
    ) {
      return 'TRUONE_SW';
    }


    return 'FLOOR';
  }


  // =========================================
  // MAP API ROW
  // =========================================

  private mapRow(x: any): MaterialItem {

    const area = String(
      x.area || ''
    );

    const storingPosition = String(
      x.storingPosition || ''
    );

    const rawArea =
      area.toUpperCase();

    const parsed =
      this.parseStoringPosition(
        storingPosition
      );

    return {

      material:
        String(x.material || ''),

      description:
        String(x.description || ''),

      area,

      storingPosition,

      kanbanContainer:
        String(x.kanbanContainer || ''),

      qty:
        Number(x.qty || 0),

      idNumber:
        String(x.idNumber || ''),

      line:
        this.normalizeLine(area),

      rack:
        parsed.rack,

      level:
        parsed.level,

      bin:
        parsed.bin,

      isFloor:
        parsed.isFloor,

      isXT5BB:
        rawArea.includes('XT5BB')
    };
  }


  // =========================================
  // PARSE STORAGE POSITION
  // =========================================

  private parseStoringPosition(
    pos: string
  ) {

    const raw =
      String(pos || '')
        .toUpperCase();

    const match =
      raw.match(
        /([A-Z])[\.\-\s]?(\d+)[\.\-\s]?(\d+)/
      );

    if (match) {

      return {

        rack:
          match[1],

        level:
          Number(match[2]),

        bin:
          Number(match[3]),

        isFloor:
          false
      };
    }

    return {

      rack:
        'FLOOR',

      level:
        0,

      bin:
        0,

      isFloor:
        true
    };
  }


  // =========================================
  // SEARCH MATERIAL
  // =========================================

  searchMaterial(): void {

    const term =
      this.materialSearch
        .trim()
        .toLowerCase();

    this.isSearching = true;

    this.matchedLines = {};
    this.matchedLineNames = [];


    if (!term) {

      this.searched = false;
      this.isSearching = false;

      return;
    }


    const matches =
      this.allMaterials.filter(
        x =>
          x.material.toLowerCase() === term ||
          String(x.idNumber)
            .toLowerCase() === term
      );


    for (const item of matches) {

      const line = item.line;

      if (
        !line ||
        line === 'FLOOR'
      ) {
        continue;
      }


      // XT5 BB special handling
      if (
        line === 'XT5KIT'
      ) {

        const isBB =
          item.area
            .toUpperCase()
            .includes('XT5BB') ||
          item.isXT5BB;

        if (
          isBB &&
          ![
            'N',
            'O',
            'P',
            'Q'
          ].includes(
            item.rack || ''
          )
        ) {
          continue;
        }
      }


      this.matchedLines[line] =
        (this.matchedLines[line] || 0) + 1;
    }


    this.matchedLineNames =
      Object.keys(
        this.matchedLines
      );

    this.searched = true;
    this.isSearching = false;
  }


  // =========================================
  // CLEAR SEARCH
  // =========================================

  clearMaterialSearch(): void {

    this.materialSearch = '';

    this.matchedLines = {};

    this.matchedLineNames = [];

    this.searched = false;

    this.isSearching = false;
  }


  // =========================================
  // SEARCH SUMMARY
  // =========================================

  get totalLinesFound(): number {

    return (
      this.matchedLineNames?.length ||
      0
    );
  }


  // =========================================
  // FLOOR COUNTS
  // =========================================

  getFloorCount(
    line: string
  ): number {

    return (
      this.floorCounts[line] ||
      0
    );
  }


  hasFloorMaterials(
    line: string
  ): boolean {

    return (
      this.floorCounts[line] ||
      0
    ) > 0;
  }


  // =========================================
  // HEATMAP COUNTS
  // =========================================

  getLineCount(
    line: string
  ): number {

    return (
      this.matchedLines[line] ||
      0
    );
  }


  isLineHot(
    line: string
  ): boolean {

    return (
      this.getLineCount(line) >
      0
    );
  }


  getHeatClass(
    line: string
  ): string {

    const c =
      this.getLineCount(line);

    if (c >= 5) {
      return 'heat-high';
    }

    if (c >= 3) {
      return 'heat-medium';
    }

    if (c >= 1) {
      return 'heat-low';
    }

    return '';
  }


  // =========================================
  // OPEN PRODUCTION LINE
  // =========================================

  openLine(
    line: string
  ): void {

    this.router.navigate(
      ['/mapping'],
      {
        queryParams: {
          line,
          search:
            this.materialSearch
        }
      }
    );
  }


  // =========================================
  // DASHBOARD TOTALS
  // =========================================

  get totalLines(): number {

    return new Set(
      this.allMaterials
        .map(x => x.line)
        .filter(
          x =>
            x &&
            x !== 'FLOOR'
        )
    ).size;
  }


  get totalFloorMaterials(): number {

    return this.allMaterials
      .filter(
        x => x.isFloor
      )
      .length;
  }


  get totalBins(): number {

    return new Set(
      this.allMaterials
        .filter(
          x => !x.isFloor
        )
        .map(
          x =>
            `${x.line}-${x.rack}-${x.level}-${x.bin}`
        )
    ).size;
  }


  // =========================================
  // WAREHOUSE
  // =========================================

  openWarehouse(): void {

    this.router.navigate(
      ['/warehouse-1']
    );
  }


  // =========================================
  // SEARCH WHILE TYPING
  // =========================================

  onMaterialSearchInput(): void {

    this.searchMaterial();
  }

}