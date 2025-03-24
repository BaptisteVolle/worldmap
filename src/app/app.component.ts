import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MapComponent } from './components/map/map.component';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { WonderService } from './services/wonder.service';
import { Wonder } from './models/wonder.model';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, MapComponent, SidebarComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit {
  wonders: Wonder[] = [];
  filteredWonders: Wonder[] = [];
  wonderFilters: string[] = ['Wonder', 'Natural Wonder'];
  searchQuery: string = '';

  constructor(private wonderService: WonderService) {}

  ngOnInit(): void {
    this.loadWonders();
  }

  loadWonders(): void {
    this.wonderService.getAllWonders().subscribe((wonders) => {
      this.wonders = wonders;
      this.applyFilters();
    });
  }

  onFilterChange(filters: string[]): void {
    this.wonderFilters = filters;
    this.applyFilters();
  }

  onSearchChange(searchText: string): void {
    this.searchQuery = searchText;
    this.applyFilters();
  }

  private applyFilters(): void {
    this.filteredWonders = this.wonderService.filterWonders(
      this.wonders,
      this.wonderFilters,
      this.searchQuery
    );
  }
}
