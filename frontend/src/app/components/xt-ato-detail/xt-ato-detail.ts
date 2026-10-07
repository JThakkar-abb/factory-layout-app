import { Component } from '@angular/core';
import { NgFor, NgIf, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';

interface XtAtoItem {
  material: string;
  description: string;
  qty: number;
  rack: string;
  level: number;
  bin: number;
  prodLoc: string;
  prodLine: string;
  externalKanbanId: string;
  binSize: string;
}

interface XtBin extends XtAtoItem {
  key: string;
}

interface XtLevelGroup {
  level: number;
  bins: XtBin[];
}

interface XtRackGroup {
  rack: string;
  levels: XtLevelGroup[];
}

@Component({
  selector: 'app-xt-ato-detail',
  standalone: true,
  imports: [NgFor, NgIf, NgClass, FormsModule, RouterLink],
  templateUrl: './xt-ato-detail.html',
  styleUrl: './xt-ato-detail.scss'
})
export class XtAtoDetailComponent {
  searchTerm = '';
  showSuggestions = false;
  selectedBinKey: string | null = null;
  selectedRack = 'ALL';

  xtAtoData: XtAtoItem[] = [];

  constructor(private http: HttpClient) {
    this.loadXtAtoData();
  }

  loadXtAtoData(): void {
    this.http.get<XtAtoItem[]>('http://localhost:3000/api/xt-ato').subscribe({
      next: (data) => {
        this.xtAtoData = Array.isArray(data) ? data : [];

        if (this.xtAtoData.length > 0) {
          this.selectedBinKey = null;
        }

        this.searchTerm = '';
        this.showSuggestions = false;
      },
      error: (error) => {
        console.error('Failed to load XT2/XT4 ATO data:', error);
      }
    });
  }

  makeKey(item: XtAtoItem): string {
    return `${item.rack}-${item.level}-${item.bin}`;
  }

  get allBins(): XtBin[] {
    return this.xtAtoData.map(item => ({
      ...item,
      key: this.makeKey(item)
    }));
  }

  get rackGroups(): XtRackGroup[] {
    const rackNames = Array.from(new Set(this.xtAtoData.map(x => x.rack))).sort();

    let groups = rackNames.map(rack => {
      const rackItems = this.xtAtoData.filter(x => x.rack === rack);
      const levelNumbers = Array.from(new Set(rackItems.map(x => x.level))).sort((a, b) => a - b);

      let levels: XtLevelGroup[] = levelNumbers.map(level => {
        const bins = rackItems
          .filter(x => x.level === level)
          .sort((a, b) => a.bin - b.bin)
          .map(item => ({
            ...item,
            key: this.makeKey(item)
          }));

        return {
          level,
          bins
        };
      });

      if (this.selectedBin && this.selectedBin.rack === rack) {
        const selectedLevelIndex = levels.findIndex(l => l.level === this.selectedBin!.level);
        if (selectedLevelIndex > 0) {
          const [selectedLevel] = levels.splice(selectedLevelIndex, 1);
          levels.unshift(selectedLevel);
        }
      }

      return {
        rack,
        levels
      };
    });

    if (this.selectedRack !== 'ALL') {
      groups = groups.filter(g => g.rack === this.selectedRack);
    }

    return groups;
  }

  get selectedBin(): XtBin | undefined {
    return this.allBins.find(b => b.key === this.selectedBinKey);
  }

  get filteredSuggestions(): XtBin[] {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) return [];

    return this.allBins
      .filter(bin =>
        bin.material.toLowerCase().includes(term) ||
        bin.description.toLowerCase().includes(term) ||
        bin.prodLoc.toLowerCase().includes(term) ||
        bin.externalKanbanId.toLowerCase().includes(term)
      )
      .slice(0, 10);
  }

  onSearchInput(): void {
    this.showSuggestions = this.searchTerm.trim().length > 0;
  }

  onSearch(): void {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) return;

    const found = this.allBins.find(bin =>
      bin.material.toLowerCase().includes(term) ||
      bin.description.toLowerCase().includes(term) ||
      bin.prodLoc.toLowerCase().includes(term) ||
      bin.externalKanbanId.toLowerCase().includes(term)
    );

    if (found) {
      this.selectedBinKey = found.key;
      this.selectedRack = found.rack;
      this.searchTerm = found.description;
      this.showSuggestions = false;
      this.scrollToBin(found.key);
    }
  }

  selectSuggestion(bin: XtBin): void {
    this.selectedBinKey = bin.key;
    this.selectedRack = bin.rack;
    this.searchTerm = bin.description;
    this.showSuggestions = false;
    this.scrollToBin(bin.key);
  }

  selectBin(bin: XtBin): void {
    this.selectedBinKey = bin.key;
    this.selectedRack = bin.rack;
    this.searchTerm = bin.description;
    this.scrollToBin(bin.key);
  }

  hideSuggestions(): void {
    setTimeout(() => {
      this.showSuggestions = false;
    }, 150);
  }

  selectRack(rack: string): void {
    this.selectedRack = rack;
  }

  get rackList(): string[] {
    return Array.from(new Set(this.xtAtoData.map(x => x.rack))).sort();
  }

  scrollToBin(key: string): void {
    setTimeout(() => {
      const el = document.getElementById('bin-' + key);
      if (el) {
        el.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }
    }, 300);
  }
}