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
  private L: any;
  private markerMap: Map<number, any> = new Map();

  private mapLayers = {
    terrain: null,
    voyager: null,
    dark: null,
    satellite: null,
    toner: null,
    comic: null,
    positron: null,
  };

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      import('leaflet').then((L) => {
        this.L = L;
        this.initMap();
        this.displayWonders();
      });
    }
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  ngOnChanges(): void {
    if (this.map && this.L) {
      this.updateWonders();
    }
  }

  private initMap(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.createBaseMap();
    this.createMapLayers();
    this.addControls();
    this.setupMapEventListeners();
  }

  private createBaseMap(): void {
    this.map = this.L.map('map', {
      center: [20, 0],
      zoom: 2,
      minZoom: 2,
      maxZoom: 12,
      zoomControl: false,
      worldCopyJump: false,
      maxBounds: [
        [-85, -180],
        [85, 180],
      ],
      maxBoundsViscosity: 1.0,
    });

    this.wonderMarkers = this.L.layerGroup();
  }

  private createMapLayers(): void {
    this.mapLayers.voyager = this.L.tileLayer(
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

    this.mapLayers.terrain = this.L.tileLayer(
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

    this.mapLayers.dark = this.L.tileLayer(
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

    this.mapLayers.positron = this.L.tileLayer(
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

    this.mapLayers.satellite = this.L.tileLayer(
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

    this.mapLayers.toner = this.L.tileLayer(
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

    this.mapLayers.comic = this.L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
        className: 'comic-style-map',
        bounds: [
          [-85, -180],
          [85, 180],
        ],
      }
    );

    this.mapLayers.positron.addTo(this.map);
  }

  private addControls(): void {
    this.L.control
      .zoom({
        position: 'bottomright',
      })
      .addTo(this.map);

    this.L.control
      .scale({
        position: 'bottomleft',
        imperial: false,
      })
      .addTo(this.map);

    this.addStyleControl();
  }

  private addStyleControl(): void {
    const styleControl = this.L.control({ position: 'topright' });

    styleControl.onAdd = () => {
      const div = this.L.DomUtil.create('div', 'map-style-control');
      div.innerHTML = `
        <div class="map-style-title">Map Style</div>
        <a href="#" class="style-option active" data-style="terrain">Terrain</a>
        <a href="#" class="style-option" data-style="standard">Standard</a>
        <a href="#" class="style-option" data-style="dark">Dark</a>
        <a href="#" class="style-option" data-style="light">Light</a>
        <a href="#" class="style-option" data-style="satellite">Satellite</a>
        <a href="#" class="style-option" data-style="toner">B&W</a>
        <a href="#" class="style-option" data-style="comic">Comic</a>
      `;

      this.L.DomEvent.disableClickPropagation(div);
      this.L.DomEvent.on(div, 'mousewheel', this.L.DomEvent.stopPropagation);

      setTimeout(() => {
        this.setupStyleControlListeners(div);
      }, 0);

      return div;
    };

    styleControl.addTo(this.map);
  }

  private setupStyleControlListeners(controlDiv: HTMLElement): void {
    const options = controlDiv.querySelectorAll('.style-option');

    options.forEach((option: HTMLElement) => {
      option.addEventListener('click', (e) => {
        e.preventDefault();

        options.forEach((o: HTMLElement) => o.classList.remove('active'));
        option.classList.add('active');

        Object.values(this.mapLayers).forEach((layer) => {
          if (this.map.hasLayer(layer)) {
            this.map.removeLayer(layer);
          }
        });

        const style = option.getAttribute('data-style');
        switch (style) {
          case 'terrain':
            this.mapLayers.terrain.addTo(this.map);
            break;
          case 'standard':
            this.mapLayers.voyager.addTo(this.map);
            break;
          case 'dark':
            this.mapLayers.dark.addTo(this.map);
            break;
          case 'light':
            this.mapLayers.positron.addTo(this.map);
            break;
          case 'satellite':
            this.mapLayers.satellite.addTo(this.map);
            break;
          case 'toner':
            this.mapLayers.toner.addTo(this.map);
            break;
          case 'comic':
            this.mapLayers.comic.addTo(this.map);
            break;
          default:
            this.mapLayers.terrain.addTo(this.map);
        }
      });

      option.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          option.click();
        }
      });
      option.setAttribute('tabindex', '0');
      option.setAttribute('role', 'button');
      option.setAttribute(
        'aria-pressed',
        option.classList.contains('active') ? 'true' : 'false'
      );
    });
  }

  flyToWonder(wonder: Wonder): void {
    if (!this.map || !wonder) return;

    const marker = this.markerMap.get(wonder.id);
    if (marker) {
      this.map.flyTo([wonder.coordinates[1], wonder.coordinates[0]], 8, {
        animate: true,
        duration: 1.5,
      });

      setTimeout(() => {
        marker.openPopup();
      }, 1600);
    }
  }

  private setupMapEventListeners(): void {
    if (typeof ResizeObserver !== 'undefined') {
      const mapElement = document.getElementById('map');
      if (mapElement) {
        const ro = new ResizeObserver(() => {
          setTimeout(this.resizeMap, 10);
        });
        ro.observe(mapElement);
      }
    }

    window.addEventListener('resize', this.resizeMap);
    setTimeout(this.resizeMap, 200);
  }

  private resizeMap = (): void => {
    if (this.map) {
      this.map.invalidateSize({ animate: true });
    }
  };

  private updateWonders(): void {
    this.wonderMarkers.clearLayers();
    this.markerMap.clear();
    this.displayWonders();
  }

  private displayWonders(): void {
    if (!this.map || !this.L) return;

    const filteredWonders = this.wonders.filter((w) =>
      this.filteredTypes.includes(w.type)
    );

    filteredWonders.forEach((wonder) => {
      const marker = this.createMarker(wonder);
      this.bindPopupToMarker(marker, wonder);

      if (wonder.id) {
        this.markerMap.set(wonder.id, marker);
      }

      this.wonderMarkers.addLayer(marker);
    });

    this.map.addLayer(this.wonderMarkers);
  }

  private createMarker(wonder: Wonder): any {
    if (wonder.image) {
      const isNatural = wonder.type === 'Natural Wonder';

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

      const marker = this.L.marker(
        [wonder.coordinates[1], wonder.coordinates[0]],
        { icon: wonderIcon }
      );

      marker.on('click', () => {
        this.markerClicked.emit(wonder);
      });

      return marker;
    } else {
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

      marker.on('click', () => {
        this.markerClicked.emit(wonder);
      });

      return marker;
    }
  }

  private bindPopupToMarker(marker: any, wonder: Wonder): void {
    const imageClass =
      wonder.type === 'Natural Wonder'
        ? 'wonder-popup-image natural'
        : 'wonder-popup-image';

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
        className: 'wonder-custom-popup',
        maxWidth: 400,
        autoPanPadding: [50, 50],
        autoPan: true,
      }
    );
  }
}
