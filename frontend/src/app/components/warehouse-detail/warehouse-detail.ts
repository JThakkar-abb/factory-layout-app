import { Component } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';

interface WarehouseItem {
  material: string;
  description: string;
  qty: number;

  level: number;
  row: number;
  block: string;
  bin: number;

  storageBin?: string;
  warehouseMap?: string;
  storageType?: string;
  unit?: string;
}

interface WarehouseBin extends WarehouseItem {
  key: string;
}

interface WarehouseBlock {
  block: string;
  bins: WarehouseBin[];
}

interface WarehouseRow {
  row: number;
  blocks: WarehouseBlock[];
}

interface WarehouseLevel {
  level: number;
  rows: WarehouseRow[];
}

@Component({
  selector: 'app-warehouse-detail',
  standalone: true,
  imports: [NgFor, NgIf, FormsModule, RouterLink],
  templateUrl: './warehouse-detail.html',
  styleUrl: './warehouse-detail.scss'
})
export class WarehouseDetailComponent {

  searchTerm = '';
  showSuggestions = false;

  selectedBinKey: string | null = null;

  selectedLevel: number | 'ALL' = 'ALL';

  warehouseData: WarehouseItem[] = [];

  constructor(private http: HttpClient) {
    this.loadWarehouseData();
  }

  loadWarehouseData(): void {
    this.http
      .get<any[]>('http://localhost:3000/api/warehouse')
      .subscribe({
        next: data => {

          const rows = Array.isArray(data) ? data : [];

          this.warehouseData = rows
            .map(r => ({
              material: String(
                r.material ?? r.Material ?? ''
              ).trim(),

              description: String(
                r.description ??
                r['Material Description'] ??
                ''
              ).trim(),

              qty: Number(
                r.qty ??
                r['Available stock'] ??
                0
              ),

              level: Number(
                r.level ??
                r['Parsed Level'] ??
                0
              ),

              row: Number(
                r.row ??
                r['Parsed Row'] ??
                0
              ),

              block: String(
                r.block ??
                r['Parsed Block'] ??
                ''
              ).trim(),

              bin: Number(
                r.bin ??
                r['Parsed Bin'] ??
                0
              ),

              storageBin: String(
                r.storageBin ??
                r['Storage Bin'] ??
                ''
              ).trim(),

              warehouseMap: String(
                r.warehouseMap ??
                r['Warehouse Map'] ??
                ''
              ).trim(),

              storageType: String(
                r.storageType ??
                r['Storage Typ'] ??
                ''
              ).trim(),

              unit: String(
                r.unit ??
                r['Base Unit of Measure'] ??
                ''
              ).trim()
            }))
            .filter(item =>
              item.material &&
              item.level > 0 &&
              item.row > 0 &&
              item.block &&
              item.bin > 0
            );

          this.selectedLevel = 'ALL';
          this.selectedBinKey = null;
          this.searchTerm = '';
          this.showSuggestions = false;

          console.log(
            'Warehouse rows loaded:',
            this.warehouseData.length
          );
        },

        error: error => {
          console.error(
            'Failed to load warehouse data:',
            error
          );

          this.warehouseData = [];
        }
      });
  }

  makeKey(item: WarehouseItem): string {
    return (
      `LV${item.level}` +
      `-ROW${item.row}` +
      `-${item.block}` +
      `-BIN${item.bin}` +
      `-${item.material}`
    );
  }

  get allBins(): WarehouseBin[] {
    return this.warehouseData.map(item => ({
      ...item,
      key: this.makeKey(item)
    }));
  }

  get selectedBin(): WarehouseBin | undefined {
    return this.allBins.find(
      bin => bin.key === this.selectedBinKey
    );
  }

  get levels(): WarehouseLevel[] {

    const levelNumbers = Array.from(
      new Set(
        this.warehouseData.map(x => x.level)
      )
    ).sort((a, b) => a - b);

    return levelNumbers.map(level => {

      const levelItems =
        this.warehouseData.filter(
          x => x.level === level
        );

      const rowNumbers = Array.from(
        new Set(levelItems.map(x => x.row))
      ).sort((a, b) => a - b);

      const rows: WarehouseRow[] =
        rowNumbers.map(rowNum => {

          const rowItems =
            levelItems.filter(
              x => x.row === rowNum
            );

          const blockNames = Array.from(
            new Set(
              rowItems.map(x => x.block)
            )
          ).sort((a, b) => this.sortBlocks(a, b));

          const blocks: WarehouseBlock[] =
            blockNames.map(blockName => {

              const bins =
                rowItems
                  .filter(
                    x => x.block === blockName
                  )
                  .sort((a, b) => a.bin - b.bin)
                  .map(item => ({
                    ...item,
                    key: this.makeKey(item)
                  }));

              return {
                block: blockName,
                bins
              };
            });

          return {
            row: rowNum,
            blocks
          };
        });

      return {
        level,
        rows
      };
    });
  }

  get visibleLevels(): WarehouseLevel[] {

    if (this.selectedLevel === 'ALL') {
      return this.levels;
    }

    return this.levels.filter(
      level => level.level === this.selectedLevel
    );
  }

  sortBlocks(a: string, b: string): number {

    const aMatch =
      String(a).match(/^([A-Z]+)(\d+)$/);

    const bMatch =
      String(b).match(/^([A-Z]+)(\d+)$/);

    if (!aMatch || !bMatch) {

      return String(a).localeCompare(
        String(b),
        undefined,
        {
          numeric: true,
          sensitivity: 'base'
        }
      );
    }

    const aLetters = aMatch[1];
    const bLetters = bMatch[1];

    const aNum = Number(aMatch[2]);
    const bNum = Number(bMatch[2]);

    if (aLetters !== bLetters) {
      return aLetters.localeCompare(bLetters);
    }

    return aNum - bNum;
  }

  get filteredSuggestions(): WarehouseBin[] {

    const term =
      this.searchTerm
        .trim()
        .toLowerCase();

    if (!term) {
      return [];
    }

    return this.allBins
      .filter(bin =>

        String(bin.material || '')
          .toLowerCase()
          .includes(term)

        ||

        String(bin.description || '')
          .toLowerCase()
          .includes(term)

        ||

        String(bin.storageBin || '')
          .toLowerCase()
          .includes(term)

        ||

        String(bin.warehouseMap || '')
          .toLowerCase()
          .includes(term)
      )
      .slice(0, 10);
  }

  onSearchInput(): void {

    this.showSuggestions =
      this.searchTerm.trim().length > 0;
  }

  onSearch(): void {

    const term =
      this.searchTerm
        .trim()
        .toLowerCase();

    if (!term) {
      return;
    }

    const found = this.allBins.find(bin =>

      String(bin.material || '')
        .toLowerCase()
        .includes(term)

      ||

      String(bin.description || '')
        .toLowerCase()
        .includes(term)

      ||

      String(bin.storageBin || '')
        .toLowerCase()
        .includes(term)

      ||

      String(bin.warehouseMap || '')
        .toLowerCase()
        .includes(term)
    );

    if (found) {

      this.selectBin(found);

      this.searchTerm =
        found.material ||
        found.description;

      this.showSuggestions = false;
    }
  }

  selectSuggestion(bin: WarehouseBin): void {

    this.selectBin(bin);

    this.searchTerm =
      bin.material ||
      bin.description;

    this.showSuggestions = false;
  }

  selectBin(bin: WarehouseBin): void {

    this.selectedBinKey = bin.key;

    this.selectedLevel = bin.level;

    setTimeout(() => {

      const el = document.getElementById(
        'warehouse-bin-' + bin.key
      );

      if (el) {
        el.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }

    }, 100);
  }

  hideSuggestions(): void {

    setTimeout(() => {
      this.showSuggestions = false;
    }, 150);
  }

  selectLevel(level: number | 'ALL'): void {

    this.selectedLevel = level;

    this.selectedBinKey = null;
  }

  clearSearch(): void {

    this.searchTerm = '';

    this.showSuggestions = false;

    this.selectedBinKey = null;

    this.selectedLevel = 'ALL';
  }
}