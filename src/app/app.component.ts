import 'whatwg-fetch'; // Add this line
import { Component, OnInit, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import * as d3 from 'd3'; // Keep d3 for color scales
import * as topojson from 'topojson-client';

// Material imports
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
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
    MatGridListModule,
    MatIconModule,
    MatTableModule,
    MatSlideToggleModule,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit {
  private map: any; // Change from L.Map to any
  private geojsonLayer: any; // Add this property for the GeoJSON layer
  private selectedCountry: any;
  private wonderMarkers: any;
  private L: any; // Will store Leaflet when in browser

  selectedCountryName: string = '';
  countryInfo: any;
  allCountriesNameList = [];
  countryControl = new FormControl('');
  options: string[] = this.allCountriesNameList;
  currentAttribute: string = '';
  wonders: any[] = [];
  showWonders: boolean = false;
  wonderFilters: string[] = ['Wonder', 'Natural Wonder'];

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    // Browser check - use the proper method
    const isBrowser = isPlatformBrowser(this.platformId);

    if (isBrowser) {
      // Import Leaflet dynamically when in browser
      import('leaflet').then((L) => {
        this.L = L;
        this.initMap();
        this.loadCountries();
      });
    }

    // This can safely run on server or client
    this.loadWonders();
  }

  private initMap(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    // Create the Leaflet map with improved antimeridian handling
    this.map = this.L.map('map', {
      center: [20, 0],
      zoom: 2,
      minZoom: 1,
      maxZoom: 8,
      zoomControl: false,
      worldCopyJump: true,
      maxBounds: [
        [-90, -180],
        [90, 180],
      ],
      maxBoundsViscosity: 1.0,
      renderer: this.L.canvas({ padding: 0.5, tolerance: 5 }), // Use canvas renderer for better polygon handling
    });

    this.wonderMarkers = this.L.layerGroup();

    // Use a different tile layer that handles the date line better
    this.L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png',
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20,
        noWrap: true, // Changed to true to prevent tile wrapping
        bounds: [
          [-90, -180],
          [90, 180],
        ],
      }
    ).addTo(this.map);

    // Add custom zoom controls
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

    window.addEventListener('resize', () => {
      setTimeout(() => {
        this.map.invalidateSize();
      }, 0);
    });

    // Also trigger a size update after map initialization
    setTimeout(() => {
      this.map.invalidateSize();
    }, 200);
  }

  private loadCountries(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    // Use your local GeoJSON file
    this.http.get('assets/json/world-geo.json').subscribe((worldData: any) => {
      this.allCountriesNameList = worldData.features.map(
        (feature: any) => feature.properties.name
      );

      // Fix antimeridian crossing issue
      const fixedData = this.fixAntimeridianCrossing(worldData);

      // Create and add GeoJSON layer with improved options
      this.geojsonLayer = this.L.geoJSON(fixedData, {
        style: () => ({
          weight: 1,
          color: '#000',
          opacity: 1,
          fillOpacity: 0.7,
          fillColor: '#ccc',
          stroke: true,
          fill: true,
        }),
        // New smoothFactor option to improve rendering:
        smoothFactor: 0.5,
        onEachFeature: (feature, layer) => {
          // Add tooltips for countries
          const countryName = feature.properties.name;
          layer.bindTooltip(countryName, {
            permanent: false,
            direction: 'center',
            className: 'country-tooltip',
          });

          layer.on({
            mouseover: (e) => {
              const l = e.target;

              // Store the current fill color to preserve it
              const currentFillColor = l.options.fillColor;

              // Only modify border properties, not the fill
              l.setStyle({
                weight: 2,
                color: '#666',
                // Keep the original fill color
                fillColor: currentFillColor,
              });

              l.bringToFront();
            },
            mouseout: (e) => {
              if (this.selectedCountry !== e.target) {
                // Don't use resetStyle as it removes custom colors
                e.target.setStyle({
                  weight: 1,
                  color: '#000',
                  // fillColor remains unchanged
                });
              }
            },
            click: (e) => {
              const country = e.target.feature.properties.name;
              this.selectCountry(country, e.target);
            },
          });
        },
      }).addTo(this.map);

      // Set initial coloring
      this.displayColorByAttribute('population');
    });
  }

  // New method to fix the antimeridian crossing issue
  private fixAntimeridianCrossing(geojsonData: any): any {
    // Create a deep copy to avoid modifying the original
    const fixedData = JSON.parse(JSON.stringify(geojsonData));

    // Process each feature
    fixedData.features.forEach((feature: any) => {
      // Add a property to indicate this feature crosses the dateline
      let crossesDateLine = false;

      if (feature.geometry.type === 'Polygon') {
        feature.geometry.coordinates = feature.geometry.coordinates.map(
          (ring: any) => this.fixCoordinates(ring, feature.properties.name)
        );
      } else if (feature.geometry.type === 'MultiPolygon') {
        feature.geometry.coordinates = feature.geometry.coordinates.map(
          (polygon: any) =>
            polygon.map((ring: any) =>
              this.fixCoordinates(ring, feature.properties.name)
            )
        );
      }
    });

    return fixedData;
  }

  private fixCoordinates(coordinates: any[], countryName?: string): any[] {
    if (!coordinates || coordinates.length < 2) return coordinates;

    // Special case for countries that need special treatment
    const troubleCountries = [
      'Russia',
      'Fiji',
      'New Zealand',
      'United States',
      'Kiribati',
    ];

    // Create a new array to store the fixed coordinates
    const fixedCoordinates = [...coordinates];

    // First pass: detect if polygon actually crosses the antimeridian
    let crossesAntimeridian = false;
    for (let i = 0; i < coordinates.length - 1; i++) {
      const [lon1, lat1] = coordinates[i];
      const [lon2, lat2] = coordinates[i + 1];

      if (Math.abs(lon1 - lon2) > 180) {
        crossesAntimeridian = true;
        break;
      }
    }

    // If it crosses the antimeridian, use a different approach based on country
    if (crossesAntimeridian && troubleCountries.includes(countryName)) {
      // For these specific countries, add 360 to all negative coordinates to keep them on one side
      for (let i = 0; i < fixedCoordinates.length; i++) {
        if (fixedCoordinates[i][0] < 0) {
          fixedCoordinates[i][0] += 360;
        }
      }
      return fixedCoordinates;
    }

    // For other cases, fix each crossing individually
    for (let i = 0; i < fixedCoordinates.length - 1; i++) {
      const [lon1, lat1] = fixedCoordinates[i];
      const [lon2, lat2] = fixedCoordinates[i + 1];

      if (Math.abs(lon1 - lon2) > 180) {
        if (lon1 < 0) {
          fixedCoordinates[i][0] += 360;
        } else {
          fixedCoordinates[i][0] -= 360;
        }
      }
    }

    return fixedCoordinates;
  }

  loadWonders(): void {
    this.http
      .get('assets/json/civilization-wonders.json')
      .subscribe((data: any) => {
        this.wonders = data;
      });
  }

  displayColorByAttribute(attribute: string): void {
    this.currentAttribute = attribute;

    this.http
      .get('https://restcountries.com/v3.1/all')
      .subscribe((data: any[]) => {
        const colorScale = this.createColorScale(attribute);
        const countryStyles = {};

        data.forEach((country) => {
          let currentAttribute = country[attribute];

          if (attribute === 'density') {
            currentAttribute = country['population'] / country['area'];
          }

          if (attribute === 'continents' && Array.isArray(currentAttribute)) {
            currentAttribute = currentAttribute[0];
          }

          const countryName = country.name.common;
          const countryCode = country.cca3;
          const fillColor = colorScale(currentAttribute);

          countryStyles[countryName] = { fillColor };
          if (countryCode) countryStyles[countryCode] = { fillColor };
        });

        // Apply styles to each country in the GeoJSON layer
        this.geojsonLayer.eachLayer((layer: any) => {
          const countryName = layer.feature.properties.name;
          const style = countryStyles[countryName];

          if (style) {
            layer.setStyle(style);
          }
        });

        this.addLegend(colorScale, attribute);
      });
  }

  createColorScale(attribute: string): any {
    let colorScale;

    switch (attribute) {
      case 'population':
        colorScale = d3
          .scaleThreshold<number, string>()
          .domain([
            100000, 1000000, 5000000, 10000000, 30000000, 60000000, 100000000,
            500000000,
          ])
          .range(d3.schemeBlues[9]);
        break;

      case 'area':
        colorScale = d3
          .scaleThreshold<number, string>()
          .domain([
            50000, 100000, 200000, 500000, 1000000, 2000000, 5000000, 10000000,
          ])
          .range(d3.schemeGreens[9]);
        break;

      case 'density':
        colorScale = d3
          .scaleThreshold<number, string>()
          .domain([5, 10, 20, 50, 100, 200, 500, 1000])
          .range(d3.schemeOranges[9]);
        break;

      case 'continents':
        colorScale = d3
          .scaleOrdinal()
          .domain([
            'Europe',
            'Africa',
            'North America',
            'South America',
            'Asia',
            'Oceania',
          ])
          .range([
            '#F1C232',
            '#6AA84F',
            '#45818e',
            '#3C78D8',
            '#A61C00',
            '#741b47',
          ]);
        break;
    }

    return colorScale;
  }

  addLegend(colorScale: any, attribute: string): void {
    // Remove existing legend if it exists
    if ((this.map as any).legend) {
      this.map.removeControl((this.map as any).legend);
    }

    // Create a new legend control
    const legend = new this.L.Control({ position: 'topleft' });

    legend.onAdd = () => {
      const div = this.L.DomUtil.create('div', 'info legend');
      const domain = colorScale.domain();
      let labels = [];

      // Add title
      let title = '';
      switch (attribute) {
        case 'population':
          title = 'Population';
          break;
        case 'area':
          title = 'Area (km²)';
          break;
        case 'density':
          title = 'Population / km²';
          break;
        case 'continents':
          title = 'Continents';
          break;
      }

      div.innerHTML = `<h4>${title}</h4>`;

      // Generate legend items
      if (attribute === 'continents') {
        // Categorical legend
        domain.forEach((continent: string, i: number) => {
          labels.push(
            `<i style="background:${colorScale(continent)}"></i> ${continent}`
          );
        });
      } else {
        // Numerical legend
        for (let i = 0; i < domain.length; i++) {
          const from = i === 0 ? 0 : domain[i - 1];
          const to = domain[i];

          // Format large numbers
          const formatFrom =
            from >= 1000000
              ? `${(from / 1000000).toLocaleString()}M`
              : from.toLocaleString();
          const formatTo =
            to >= 1000000
              ? `${(to / 1000000).toLocaleString()}M`
              : to.toLocaleString();

          labels.push(
            `<i style="background:${colorScale(to)}"></i> ${
              i === 0 ? '< ' + formatTo : formatFrom + ' - ' + formatTo
            }`
          );
        }

        // Add the last category
        const lastValue = domain[domain.length - 1];
        const formattedValue =
          lastValue >= 1000000
            ? `${(lastValue / 1000000).toLocaleString()}M`
            : lastValue.toLocaleString();

        labels.push(
          `<i style="background:${colorScale(
            Infinity
          )}"></i> > ${formattedValue}`
        );
      }

      div.innerHTML += labels.join('<br>');
      return div;
    };

    legend.addTo(this.map);
    (this.map as any).legend = legend;
  }

  selectCountry(countryName: string, layer?: any): void {
    // Reset previously selected country
    if (this.selectedCountry) {
      this.geojsonLayer.resetStyle(this.selectedCountry);
    }

    // Set new selected country
    if (layer) {
      this.selectedCountry = layer;
      this.selectedCountry.setStyle({
        weight: 3,
        color: '#FFA500',
        dashArray: '',
        fillOpacity: 0.7,
      });
      this.selectedCountry.bringToFront();
    }

    // Update country name
    this.selectedCountryName = countryName;
    this.countryControl.setValue(countryName);

    // Load country info
    this.showCountryInfo(countryName);
  }

  showCountryInfo(country: any): void {
    this.http
      .get(`https://restcountries.com/v3.1/name/${country}?fullText=true`)
      .subscribe((data: any) => {
        this.countryInfo = data[0];

        // Extract currency and language
        for (let key in this.countryInfo.currencies) {
          this.countryInfo.currency = this.countryInfo.currencies[key];
          break;
        }

        for (let key in this.countryInfo.languages) {
          this.countryInfo.language = this.countryInfo.languages[key];
          break;
        }
      });
  }

  emptyCountryInfo(): void {
    this.countryControl.setValue('');
    this.countryInfo = null;

    // Deselect on the map
    if (this.selectedCountry) {
      this.geojsonLayer.resetStyle(this.selectedCountry);
      this.selectedCountry = null;
    }
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

  displayWonders(): void {
    // Clear existing markers
    this.wonderMarkers.clearLayers();

    // Filter wonders by selected types
    const filteredWonders = this.wonders.filter((w) =>
      this.wonderFilters.includes(w.type)
    );

    // Create markers for each wonder
    filteredWonders.forEach((wonder) => {
      const iconColor = wonder.type === 'Wonder' ? 'gold' : 'green';

      // Create a marker with a custom icon
      const marker = this.L.circleMarker(
        [wonder.coordinates[1], wonder.coordinates[0]],
        {
          radius: 6,
          fillColor: iconColor,
          color: '#000',
          weight: 1,
          opacity: 1,
          fillOpacity: 0.8,
        }
      );

      // Add a popup with information
      marker.bindTooltip(wonder.name, {
        permanent: false,
        direction: 'top',
        className: 'wonder-tooltip',
      });

      // Add click handler to open Wikipedia page
      marker.on('click', () => {
        window.open(wonder.wikipedia, '_blank');
      });

      this.wonderMarkers.addLayer(marker);
    });

    // Add the marker group to the map
    this.map.addLayer(this.wonderMarkers);
  }

  removeWonders(): void {
    this.wonderMarkers.clearLayers();
    this.map.removeLayer(this.wonderMarkers);
  }

  // Helper method to center and zoom to a country
  zoomToCountry(countryName: string): void {
    let found = false;

    if (this.geojsonLayer) {
      this.geojsonLayer.eachLayer((layer: any) => {
        if (!found && layer.feature.properties.name === countryName) {
          found = true;
          this.map.fitBounds(layer.getBounds());
        }
      });
    }
  }
}
