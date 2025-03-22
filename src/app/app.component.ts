import { Component, OnInit, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

// Material imports
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    HttpClientModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatDividerModule,
    MatListModule,
    MatButtonToggleModule,
    MatSlideToggleModule,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit {
  private map: any;
  private wonderMarkers: any;
  private L: any; // Will store Leaflet when in browser

  wonders: any[] = [];
  showWonders: boolean = true;
  wonderFilters: string[] = ['Wonder', 'Natural Wonder'];
  gameFilters: string[] = ['Civ V', 'Civ VI', 'Civ VII'];

  wondersByGame = {
    'Civ V': [],
    'Civ VI': [],
    'Civ VII': [],
  };

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      // Import Leaflet dynamically when in browser
      import('leaflet').then((L) => {
        this.L = L;
        this.initMap();
        //this.loadCountries();
        this.loadWonders();
      });
    }
  }

  private initMap(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    // Create the Leaflet map
    this.map = this.L.map('map', {
      center: [20, 0],
      zoom: 2,
      minZoom: 2,
      maxZoom: 8,
      zoomControl: false,
      worldCopyJump: true,
      maxBoundsViscosity: 0.8,
      maxBounds: [
        [-85, -180], // Southwest corner
        [85, 180], // Northeast corner
      ],
    });

    this.wonderMarkers = this.L.layerGroup();

    // Add base tile layer
    this.L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20,
      }
    ).addTo(this.map);

    // Add zoom controls
    this.L.control
      .zoom({
        position: 'bottomright',
      })
      .addTo(this.map);

    // Add scale control
    this.L.control
      .scale({
        position: 'bottomleft',
        imperial: false,
      })
      .addTo(this.map);

    // Handle resize events
    const resizeMap = () => {
      this.map.invalidateSize({ animate: true });
    };

    if (typeof ResizeObserver !== 'undefined') {
      const mapElement = document.getElementById('map');
      if (mapElement) {
        const ro = new ResizeObserver(() => {
          setTimeout(resizeMap, 10);
        });
        ro.observe(mapElement);
      }
    }

    window.addEventListener('resize', resizeMap);
    setTimeout(resizeMap, 200);
  }

  // loadCountries(): void {
  //   // Just load a simple GeoJSON for country outlines
  //   this.http.get('assets/json/world-geo.json').subscribe((worldGeo: any) => {
  //     // Create a simple GeoJSON layer with minimal styling
  //     this.L.geoJSON(worldGeo, {
  //       style: {
  //         fillColor: '#e8e8e8',
  //         weight: 1,
  //         opacity: 0.5,
  //         color: '#666',
  //         fillOpacity: 0.2,
  //       },
  //     }).addTo(this.map);
  //   });
  // }

  loadWonders(): void {
    this.http
      .get('assets/json/civilization-wonders.json')
      .subscribe((data: any) => {
        this.wonders = data;

        this.wonders.forEach((wonder) => {
          wonder.game.forEach((game) => {
            if (!this.wondersByGame[game].includes(wonder)) {
              this.wondersByGame[game].push(wonder);
            }
          });
        });

        this.displayWonders();
      });
  }

  toggleWonders(event: any): void {
    this.showWonders = event.checked;

    if (this.showWonders) {
      this.displayWonders();
    } else {
      this.removeWonders();
    }
  }

  filterWonders(type: string, event: any): void {
    if (event.source.checked) {
      this.wonderFilters.push(type);
    } else {
      this.wonderFilters = this.wonderFilters.filter((t) => t !== type);
    }

    if (this.showWonders) {
      this.removeWonders();
      this.displayWonders();
    }
  }

  filterByGame(game: string, event: any): void {
    if (event.source.checked) {
      this.gameFilters.push(game);
    } else {
      this.gameFilters = this.gameFilters.filter((g) => g !== game);
    }

    if (this.showWonders) {
      this.removeWonders();
      this.displayWonders();
    }
  }

  displayWonders(): void {
    if (!this.map) return;

    // Clear existing markers
    this.wonderMarkers.clearLayers();

    // Filter and add wonders
    this.wonders
      .filter(
        (w) =>
          this.wonderFilters.includes(w.type) &&
          w.game &&
          w.game.some((g) => this.gameFilters.includes(g))
      )
      .forEach((wonder) => {
        const marker = this.L.circleMarker(
          [wonder.coordinates[1], wonder.coordinates[0]],
          {
            radius: 6,
            fillColor: wonder.type === 'Wonder' ? 'gold' : 'green',
            color: '#000',
            weight: 1,
            opacity: 1,
            fillOpacity: 0.8,
          }
        );

        // Add tooltip with wonder name
        marker.bindTooltip(wonder.name, {
          permanent: false,
          direction: 'top',
          className: 'wonder-tooltip',
        });

        // Add popup with more details
        marker.bindPopup(`
          <div class="wonder-popup">
            <h3>${wonder.name}</h3>
            <p><strong>Type:</strong> ${wonder.type}</p>
            <p><strong>Location:</strong> ${wonder.description || 'Unknown'}</p>
            <p><strong>Appears in:</strong> ${
              wonder.game ? wonder.game.join(', ') : 'Unknown'
            }</p>
            ${
              wonder.quote
                ? `<blockquote class="wonder-quote">
                  "${wonder.quote}"
                  <footer>— <cite>${
                    wonder.quoteAuthor || 'Unknown'
                  }</cite></footer>
                </blockquote>`
                : ''
            }
            <div class="wonder-links">
              <a href="${
                wonder.wikipedia
              }" target="_blank">Read more on Wikipedia</a>
            </div>
          </div>
        `);

        this.wonderMarkers.addLayer(marker);
      });

    this.map.addLayer(this.wonderMarkers);
  }

  removeWonders(): void {
    this.wonderMarkers.clearLayers();
    this.map.removeLayer(this.wonderMarkers);
  }
}
