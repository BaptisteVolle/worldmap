import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, map } from 'rxjs';
import { Wonder } from '../models/wonder.model';

@Injectable({
  providedIn: 'root',
})
export class WonderService {
  constructor(private http: HttpClient) {}

  /**
   * Load both world wonders and natural wonders
   */
  getAllWonders(): Observable<Wonder[]> {
    return forkJoin({
      worldWonders: this.http.get<Wonder[]>(
        'assets/json/civilization-wonders.json'
      ),
      naturalWonders: this.http.get<Wonder[]>(
        'assets/json/natural-wonders.json'
      ),
    }).pipe(
      map((result) => {
        const wonders = [
          ...(result.worldWonders || []),
          ...(result.naturalWonders || []),
        ];
        return wonders;
      })
    );
  }

  /**
   * Filter wonders by type and search text
   */
  filterWonders(
    wonders: Wonder[],
    types: string[],
    searchText: string = ''
  ): Wonder[] {
    let filtered = wonders.filter((wonder) => types.includes(wonder.type));

    if (searchText) {
      const search = searchText.toLowerCase();
      filtered = filtered.filter((wonder) =>
        wonder.name.toLowerCase().includes(search)
      );
    }

    // Always sort alphabetically
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }
}
