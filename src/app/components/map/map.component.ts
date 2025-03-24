import {
  Component,
  OnInit,
  OnDestroy,
  Input,
  Output,
  EventEmitter,
  PLATFORM_ID,
  Inject,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Wonder } from '../../models/wonder.model';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './map.component.html',
  styleUrl: './map.component.scss',
})
export class MapComponent implements OnInit, OnDestroy {
  @Input() wonders: Wonder[] = [];
  @Input() filteredTypes: string[] = [];
  @Output() markerClicked = new EventEmitter<Wonder>();

  private map: any;
  private wonderMarkers: any;
  private L: any; // Will store Leaflet when in browser
  private markerMap: Map<number, any> = new Map(); // Map wonder IDs to markers

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      // Import Leaflet dynamically when in browser
      import('leaflet').then((L) => {
        this.L = L;
        this.initMap();
        this.displayWonders();
      });
    }
  }

  ngOnDestroy(): void {
    // Clean up event listeners
    if (this.map) {
      // Remove the map
      this.map.remove();
      this.map = null;
    }
  }

  /**
   * Updates the map when wonders or filters change
   */
  ngOnChanges(): void {
    if (this.map && this.L) {
      this.updateWonders();
    }
  }

  /**
   * Initialize the Leaflet map with a contained view
   */
  private initMap(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    // Create the map with fixed bounds
    this.map = this.L.map('map', {
      center: [20, 0],
      zoom: 2,
      minZoom: 2,
      maxZoom: 12,
      zoomControl: false,
      // Remove worldCopyJump to prevent infinite scrolling
      worldCopyJump: false,
      // Set bounds instead
      maxBounds: [
        [-85, -180],
        [85, 180], // Northeast corner
      ],
      maxBoundsViscosity: 1.0, // Make bounds completely solid
    });

    this.wonderMarkers = this.L.layerGroup();

    const voyagerTiles = this.L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20,
        bounds: [
          [-85, -180],
          [85, 180],
        ],
      }
    );

    // Terrain style - shows elevation with colors
    const terrainTiles = this.L.tileLayer(
      'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
      {
        attribution:
          'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
        maxZoom: 17,
        bounds: [
          [-85, -180],
          [85, 180],
        ],
      }
    );

    // Dark style - for a different look
    const darkTiles = this.L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20,
        bounds: [
          [-85, -180],
          [85, 180],
        ],
      }
    );

    // Add these to your map initialization where you define the other tile layers

    // Positron (Light) - a clean, light-colored base map
    const positronTiles = this.L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20,
        bounds: [
          [-85, -180],
          [85, 180],
        ],
      }
    );

    // Satellite imagery
    const satelliteTiles = this.L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        attribution:
          'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
        maxZoom: 18,
        bounds: [
          [-85, -180],
          [85, 180],
        ],
      }
    );

    // Toner - Black and white style
    const tonerTiles = this.L.tileLayer(
      'https://tiles.stadiamaps.com/tiles/stamen_toner/{z}/{x}/{y}.png',
      {
        attribution:
          'Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 20,
        bounds: [
          [-85, -180],
          [85, 180],
        ],
      }
    );

    // Comic style - a fun, colorful style
    const comicTiles = this.L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
        className: 'comic-style-map', // We'll add a CSS filter to give it a comic look
        bounds: [
          [-85, -180],
          [85, 180],
        ],
      }
    );

    // Add the terrain style by default - it's more colorful
    terrainTiles.addTo(this.map);

    // Create a layer control and add it to the map
    const baseLayers = {
      Terrain: terrainTiles,
      Standard: voyagerTiles,
      Dark: darkTiles,
      Satellite: satelliteTiles,
      'Black & White': tonerTiles,
      Comic: comicTiles,
      Light: positronTiles,
    };

    const styleControl = this.L.control({ position: 'topright' });
    styleControl.onAdd = () => {
      const div = this.L.DomUtil.create('div', 'map-style-control leaflet-bar');
      div.innerHTML = `
    <div class="map-style-title">Map Style</div>
    <a href="#" class="style-option active" data-style="terrain">Terrain</a>
    <a href="#" class="style-option" data-style="standard">Standard</a>
    <a href="#" class="style-option" data-style="dark">Dark</a>
    <a href="#" class="style-option" data-style="satellite">Satellite</a>
    <a href="#" class="style-option" data-style="toner">B&W</a>
    <a href="#" class="style-option" data-style="comic">Comic</a>
  `;

      this.L.DomEvent.disableClickPropagation(div);

      // Add click handlers
      setTimeout(() => {
        const options = div.querySelectorAll('.style-option');
        options.forEach((option: HTMLElement) => {
          option.addEventListener('click', (e) => {
            e.preventDefault();

            // Update active clas
            options.forEach((o: HTMLElement) => o.classList.remove('active'));
            option.classList.add('active');

            [
              terrainTiles,
              voyagerTiles,
              darkTiles,
              satelliteTiles,
              tonerTiles,
              comicTiles,
              positronTiles,
            ].forEach((layer) => {
              if (this.map.hasLayer(layer)) {
                this.map.removeLayer(layer);
              }
            });

            const style = option.getAttribute('data-style');
            switch (style) {
              case 'terrain':
                terrainTiles.addTo(this.map);
                break;
              case 'standard':
                voyagerTiles.addTo(this.map);
                break;
              case 'dark':
                darkTiles.addTo(this.map);
                break;
              case 'satellite':
                satelliteTiles.addTo(this.map);
                break;
              case 'toner':
                tonerTiles.addTo(this.map);
                break;
              case 'comic':
                comicTiles.addTo(this.map);
                break;
              default:
                terrainTiles.addTo(this.map);
            }
          });
        });
      }, 0);

      return div;
    };
    styleControl.addTo(this.map);

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

  /**
   * Fly to a specific wonder and open its popup
   */
  flyToWonder(wonder: Wonder): void {
    if (!this.map || !wonder) return;

    const marker = this.markerMap.get(wonder.id);
    if (marker) {
      // Fly to the wonder location with a deeper zoom
      this.map.flyTo([wonder.coordinates[1], wonder.coordinates[0]], 8, {
        animate: true,
        duration: 1.5,
      });

      // Open the popup after a small delay to ensure the map has moved
      setTimeout(() => {
        marker.openPopup();
      }, 1600);
    }
  }

  /**
   * Update the wonders displayed on the map
   */
  private updateWonders(): void {
    this.wonderMarkers.clearLayers();
    this.markerMap.clear();
    this.displayWonders();
  }

  /**
   * Display filtered wonders on the map
   */
  private displayWonders(): void {
    if (!this.map || !this.L) return;

    // Filter wonders by selected types
    const filteredWonders = this.wonders.filter((w) =>
      this.filteredTypes.includes(w.type)
    );

    // Add markers for each wonder
    filteredWonders.forEach((wonder) => {
      let marker;

      // Check if the wonder has an image to use as a pin
      if (wonder.image) {
        const isNatural = wonder.type === 'Natural Wonder';

        // Use fixed size icons - no scaling with zoom
        const wonderIcon = this.L.icon({
          iconUrl: wonder.image,
          iconSize: [32, 32],
          iconAnchor: [16, 32],
          popupAnchor: [0, -32],
          className: isNatural
            ? 'natural-wonder-image-icon'
            : 'wonder-image-icon',
          tooltipAnchor: [16, -16],
        });

        marker = this.L.marker([wonder.coordinates[1], wonder.coordinates[0]], {
          icon: wonderIcon,
        });
      } else {
        // Fallback to circle marker if no image
        marker = this.L.circleMarker(
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
      }

      const imageClass =
        wonder.type === 'Natural Wonder'
          ? 'wonder-popup-image natural'
          : 'wonder-popup-image';

      // Create the popup with a new layout - image on left
      marker.bindPopup(
        `
        <div class="wonder-popup">
          ${
            wonder.image
              ? `<div class="${imageClass}">
              <img src="${wonder.image}" alt="${wonder.name}">
            </div>`
              : ''
          }
          <div class="wonder-content">
            <h3>${wonder.name}</h3>
            <p><strong>Type:</strong> ${wonder.type}</p>
            <p><strong>Description:</strong> ${
              wonder.description || 'Unknown'
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
        </div>
      `,
        {
          className: 'wonder-custom-popup', // Use our custom popup class
          maxWidth: 400,
          autoPanPadding: [50, 50], // Add padding when auto-panning
          autoPan: true, // Ensure the popup is visible in the view
        }
      );

      // On click, emit the selected wonder
      marker.on('click', () => {
        this.markerClicked.emit(wonder);
      });

      // Store the marker in our map for quick lookup
      if (wonder.id) {
        this.markerMap.set(wonder.id, marker);
      }

      this.wonderMarkers.addLayer(marker);
    });

    this.map.addLayer(this.wonderMarkers);
  }
}
