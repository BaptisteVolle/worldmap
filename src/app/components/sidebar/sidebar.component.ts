import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { Wonder } from '../../models/wonder.model';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonToggleModule,
    MatCardModule,
    MatFormFieldModule,
    MatSelectModule,
    MatIconModule,
  ],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent {
  @Input() wonders: Wonder[] = [];
  @Input() filteredWonders: Wonder[] = [];
  @Input() selectedFilters: string[] = [];

  @Output() filterChange = new EventEmitter<string[]>();
  @Output() searchChange = new EventEmitter<string>();
  @Output() wonderSelected = new EventEmitter<Wonder>();

  searchControl = new FormControl('');
  selectedWonder = new FormControl();

  constructor() {
    this.searchControl.valueChanges.subscribe((value) => {
      this.searchChange.emit(value || '');
    });
  }

  onFilterChange(filter: string, event: any): void {
    const filters = [...this.selectedFilters];

    if (event.source.checked) {
      // Add filter if not already present
      if (!filters.includes(filter)) {
        filters.push(filter);
      }
    } else {
      // Remove filter
      const index = filters.indexOf(filter);
      if (index >= 0) {
        filters.splice(index, 1);
      }
    }

    this.filterChange.emit(filters);
  }

  onWonderSelected(event: any): void {
    if (event.value) {
      this.wonderSelected.emit(event.value);
    }
  }
}
