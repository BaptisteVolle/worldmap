import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import * as d3 from 'd3';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

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
  selectedCountryName: string = '';
  countryInfo: any;
  isShowing = false;
  allCountriesNameList = [];

  countryControl = new FormControl('');
  options: string[] = this.allCountriesNameList;
  currentAttribute: string = '';
  private mapZoom: any;
  wonders: any[] = [];
  showWonders: boolean = false;
  wonderFilters: string[] = ['Wonder', 'Natural Wonder'];
  mapProjection: any;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.drawMap();
    this.loadWonders();
  }

  loadWonders() {
    this.http
      .get('assets/json/civilization-wonders.json')
      .subscribe((data: any) => {
        this.wonders = data;
      });
  }

  drawMap() {
    if (typeof window !== 'undefined') {
      this.http
        .get('assets/json/world-geo.json')
        .subscribe((worldData: any) => {
          for (let i = 0; i < worldData.features.length; i++) {
            let currentCountryName: string =
              worldData.features[i].properties.name;
            this.allCountriesNameList.push(currentCountryName);
          }

          const screenWidth = window.innerWidth;
          const screenHeight = window.innerHeight;

          const viewBoxWidth = screenWidth - 350;
          const viewBoxHeight = screenHeight;
          const viewBox = `0 0 ${viewBoxWidth} ${viewBoxHeight}`;

          let scale = (screenWidth + screenHeight) / 15;

          var projection = d3
            .geoMercator()
            .scale(scale)
            .center([-10, 0])
            .translate([viewBoxWidth / 2, viewBoxHeight / 1.55]);

          this.mapProjection = projection;

          const path: d3.GeoPath<any, any> = d3
            .geoPath()
            .projection(projection);

          const svg = d3
            .select('.world-map-container')
            .append('svg')
            .attr('viewBox', viewBox)
            .attr('preserveAspectRatio', 'xMidYMid meet')
            .attr('width', '100%')
            .attr('height', '100%')
            .style('display', 'block')
            .style('margin', 'auto');

          const mapGroup = svg.append('g').attr('class', 'map-group');

          const zoom = d3
            .zoom()
            .scaleExtent([1, 8])
            .filter((event) => {
              return (
                !event.ctrlKey && !event.button && event.type !== 'dblclick'
              );
            })

            .on('zoom', (event) => {
              mapGroup.attr('transform', event.transform);
              this.updateScaleBar(svg, projection, event.transform);
            });

          svg.call(zoom);

          this.mapZoom = zoom;

          svg.on('dblclick.zoom', null);
          svg.on('dblclick', (event) => {
            event.preventDefault();
            event.stopPropagation();
            this.resetZoom();
          });

          svg.call(this.mapZoom);

          mapGroup
            .selectAll('path')
            .data(worldData.features)
            .enter()
            .append('path')
            .attr('name', function (d: any) {
              return d.properties?.name || '';
            })
            .attr('d', path)
            .attr('stroke', '#000000');

          const tooltip = this.addTooltip(svg);
          let allCountries = mapGroup.selectAll('path');

          allCountries
            .on('mouseover', (e, d: Object) => {
              const bbox = e.target.getBBox();
              const centroid = [
                bbox.x + bbox.width / 2,
                bbox.y + bbox.height / 2,
              ];
              tooltip.show(
                d['properties'].name || '',
                centroid[0],
                centroid[1]
              );
            })
            .on('click', (e, d: Object) => {
              const target = e.currentTarget;
              let country = d['properties'].name;
              this.countryControl.setValue(d['properties'].name);
              this.selectCountryOnMap(target);
              this.showCountryInfo(country);
            })
            .on('mouseleave', () => {
              tooltip.hide();
            });

          this.displayColorByAttribute('population');
        });
    }
  }

  addTooltip(svgSelect: any, elementSelect = null) {
    const mouseOffset = [10, 10];

    const style = `
      .svg-tooltip {
        background-color: rgba(255, 255, 255, 0.7);
        position: absolute;
        transform: translate(178px, 410.19px);
        border-style: solid;
        border-color: black;
        border-width: 1px;
        border-radius: 2px;
        font-family: sans-serif;
        font-size: 12px;
        padding: 8px;
        visibility: hidden;
        max-width: 150px;
    }`;

    svgSelect.append('style').text(style);

    const foreignObject = svgSelect
      .append('foreignObject')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('pointer-events', 'none');

    const tooltip = foreignObject
      .append('xhtml:div')
      .attr('class', 'svg-tooltip');

    function show(text, x, y) {
      let posX = x + mouseOffset[0];
      let posY = y + mouseOffset[1];

      tooltip.html(text);
      tooltip.style('visibility', 'visible');

      const svgBox = svgSelect.node().getBBox();
      const tooltipBox = tooltip.node().getBoundingClientRect();

      if (posX > svgBox.width - tooltipBox.width) {
        posX = x - tooltipBox.width - mouseOffset[0];
      }
      if (posY > svgBox.height - tooltipBox.height) {
        posY = y - tooltipBox.height - mouseOffset[1];
      }

      tooltip.style('transform', `translate(${posX}px,${posY}px)`);
    }

    function hide() {
      tooltip.style('visibility', 'hidden');
    }

    if (elementSelect != null) {
      elementSelect
        .on('mouseover', (e) => {
          const title = d3.select(e.target).select('title').text();
          const bbox = e.target.getBBox();
          const centroid = [bbox.x + bbox.width / 2, bbox.y + bbox.height / 2];
          show(title, centroid[0], centroid[1]);
        })
        .on('mouseleave', () => hide());
    }

    return { show, hide };
  }

  showCountryInfo(country: any) {
    this.http
      .get(`https://restcountries.com/v3.1/name/${country}?fullText=true`)
      .subscribe((data: any) => {
        this.countryInfo = data[0];
        for (var key in this.countryInfo.currencies) {
          this.countryInfo.currency = this.countryInfo.currencies[key];
          break;
        }

        for (var key in this.countryInfo.languages) {
          this.countryInfo.language = this.countryInfo.languages[key];
          break;
        }
      });
  }

  emptyCountryInfo() {
    this.countryControl.setValue('');
    this.countryInfo = null;
  }

  randomColor(): string {
    const red = Math.floor(Math.random() * 256);
    const green = Math.floor(Math.random() * 256);
    const blue = Math.floor(Math.random() * 256);

    const color =
      '#' +
      red.toString(16).padStart(2, '0') +
      green.toString(16).padStart(2, '0') +
      blue.toString(16).padStart(2, '0');

    return color;
  }

  selectCountryOnMap(target: any) {
    this.unSelectAllCountries();
    d3.select(target)
      .classed('selected-country', true)
      .style('stroke', '#FFA500');
  }

  unSelectAllCountries() {
    d3.selectAll('.selected-country')
      .classed('selected-country', false)
      .style('stroke', '#000000');
  }

  clearSelection() {
    this.countryControl.setValue('');
    this.clearSelectedCountry();
  }

  clearSelectedCountry() {
    d3.selectAll('.selected-country')
      .style('stroke', '#000000')
      .style('stroke-width', '1px')
      .classed('selected-country', false);

    this.countryInfo = null;
  }

  displayColorByAttribute(attribute: string) {
    this.http
      .get(`https://restcountries.com/v3.1/all`)
      .subscribe((data: any[]) => {
        let colorScale = this.createColorScale(attribute);

        data.forEach((country) => {
          let currentAttribute = country[attribute];
          if (attribute === 'density') {
            currentAttribute = country['population'] / country['area'];
          }
          if (attribute == 'continents') {
            currentAttribute = currentAttribute[0];
          }

          let selectedElement: any = d3.selectAll(
            `[name="${country.name.official}"]`
          );
          if (selectedElement.size() < 1) {
            selectedElement = d3.selectAll(`[name="${country.name.common}"]`);
          }
          selectedElement.style('fill', colorScale(currentAttribute));
        });

        let svg = d3.select('.world-map-container').select('svg');
        this.addLegend(svg, colorScale, attribute);
      });

    this.currentAttribute = attribute;
  }

  createColorScale(attribute: string) {
    let colorScale, legend: any;
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
            50000, 100000, 200000, 50000, 1000000, 2000000, 5000000, 10000000,
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
          .scaleOrdinal([
            '#F1C232',
            '#6AA84F',
            '#45818e',
            '#3C78D8',
            '#A61C00',
            '#741b47',
          ])
          .domain([
            'Europe',
            'Africa',
            'North America',
            'South America',
            'Asia',
            'Oceania',
          ]);
        break;
    }

    return colorScale;
  }

  addLegend(svg: any, colorScale: any, attribute: string) {
    const legendWidth = 20;
    const legendHeight = 20;
    const legendX = 20;
    const legendY = 30;
    let unit: string = '';

    switch (attribute) {
      case 'population':
        unit = 'Population in millions';
        break;
      case 'area':
        unit = 'Countries area in km²';
        break;
      case 'density':
        unit = 'Population / km²';
        break;
      case 'continents':
        unit = 'Continents';
        break;
    }
    d3.selectAll('.legend').remove();

    const legend = svg
      .append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${legendX}, ${legendY})`);

    const legendItems = legend
      .selectAll('.legend-item')
      .data(colorScale.range())
      .enter()
      .append('g')
      .attr('class', 'legend-item')
      .attr('transform', (d, i) => `translate(0, ${i * (legendHeight + 5)})`);

    legendItems
      .append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', legendWidth)
      .attr('height', legendHeight)
      .style('fill', (d) => d);

    const domain = colorScale.domain();

    legendItems
      .append('text')
      .attr('x', legendWidth + 10)
      .attr('y', legendHeight / 2)
      .attr('dy', '0.35em')
      .text((d, i) => {
        if (typeof domain[i] == 'number' && domain[i] >= 1000000) {
          domain[i] = (domain[i] / 1000000).toLocaleString() + 'm';
        }

        if (attribute == 'continents') {
          return domain[i].toLocaleString();
        } else {
          if (i === 0) {
            return `< ${domain[i].toLocaleString()}`;
          } else if (i === colorScale.range().length - 1) {
            return `> ${domain[i - 1].toLocaleString()}`;
          } else {
            return `${domain[i - 1].toLocaleString()} - ${domain[
              i
            ].toLocaleString()}`;
          }
        }
      });
  }

  createScaleBar(svg: any, projection: any) {
    this.updateScaleBar(svg, projection, d3.zoomIdentity);
  }

  updateScaleBar(svg: any, projection: any, transform: any) {
    const scale = transform.k;

    let distance: number;
    let unit: string;

    if (scale <= 1) {
      distance = 1000;
      unit = '1000 km';
    } else if (scale <= 2) {
      distance = 500;
      unit = '500 km';
    } else if (scale <= 4) {
      distance = 100;
      unit = '100 km';
    } else {
      distance = 50;
      unit = '50 km';
    }

    const point1 = projection([0, 0]);
    const point2 = projection([distance / 111.32, 0]); // Convert km to degrees
    let barLength = Math.abs(point2[0] - point1[0]) * transform.k;

    if (barLength > 150) {
      const ratio = 150 / barLength;
      barLength = 150;
      distance = Math.round(distance * ratio);
      unit = `${distance} km`;
    }

    const container = document.getElementById('scale-bar-container');
    if (container) {
      container.innerHTML = '';

      const scaleSvg = d3
        .select('#scale-bar-container')
        .append('svg')
        .attr('width', barLength + 2)
        .attr('height', 20);

      scaleSvg
        .append('rect')
        .attr('x', 1)
        .attr('y', 10)
        .attr('width', barLength)
        .attr('height', 3)
        .attr('fill', 'black');

      scaleSvg
        .append('rect')
        .attr('x', 1)
        .attr('y', 5)
        .attr('width', 1)
        .attr('height', 13)
        .attr('fill', 'black');

      scaleSvg
        .append('rect')
        .attr('x', barLength)
        .attr('y', 5)
        .attr('width', 1)
        .attr('height', 13)
        .attr('fill', 'black');
    }

    const scaleText = document.getElementById('scale-info-text');
    if (scaleText) {
      scaleText.textContent = unit;
    }
  }

  zoomIn() {
    const svg = d3.select('.world-map-container svg');

    if (svg.empty() || !this.mapZoom) return;

    svg.transition().duration(300).call(this.mapZoom.scaleBy, 1.5);
  }

  zoomOut() {
    const svg = d3.select('.world-map-container svg');
    if (svg.empty() || !this.mapZoom) return;

    svg.transition().duration(300).call(this.mapZoom.scaleBy, 0.67);
  }

  resetZoom() {
    const svg = d3.select('.world-map-container svg');
    if (svg.empty() || !this.mapZoom) return;

    svg
      .transition()
      .duration(500)
      .call(this.mapZoom.transform, d3.zoomIdentity);
  }

  // Civ Wonders part
  toggleWonders(event: any) {
    this.showWonders = event.checked;
    if (this.showWonders) {
      this.displayWonders();
    } else {
      this.removeWonders();
    }
  }

  filterWonders(type: string, event: any) {
    if (event.source.checked) {
      this.wonderFilters.push(type);
    } else {
      this.wonderFilters = this.wonderFilters.filter((t) => t !== type);
    }

    this.removeWonders();
    if (this.showWonders) {
      this.displayWonders();
    }
  }

  displayWonders() {
    const svg = d3.select('.world-map-container svg');
    const mapGroup = svg.select('.map-group');
    const projection = this.getCurrentProjection();

    if (!projection || !mapGroup) return;

    mapGroup.selectAll('.wonder-marker').remove();

    const filteredWonders = this.wonders.filter((w) =>
      this.wonderFilters.includes(w.type)
    );

    const wonderMarkers = mapGroup
      .selectAll('.wonder-marker')
      .data(filteredWonders)
      .enter()
      .append('g')
      .attr('class', 'wonder-marker')
      .attr('transform', (d) => {
        const coords = projection([d.coordinates[0], d.coordinates[1]]);
        return `translate(${coords[0]},${coords[1]})`;
      });

    wonderMarkers
      .append('circle')
      .attr('r', 5)
      .attr('fill', (d) => (d.type === 'Wonder' ? '#FFD700' : '#00FF00'))
      .attr('stroke', '#000')
      .attr('stroke-width', 1)
      .style('cursor', 'pointer');

    wonderMarkers
      .append('text')
      .attr('x', 8)
      .attr('y', 4)
      .text((d) => d.name)
      .attr('font-size', '10px')
      .attr('fill', '#000')
      .attr('stroke', '#000')
      .attr('stroke-width', 0.5)
      .style('pointer-events', 'none');

    wonderMarkers
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        window.open(d.wikipedia, '_blank');
      })
      .on('mouseover', function () {
        d3.select(this).select('circle').attr('r', 7);
      })
      .on('mouseout', function () {
        d3.select(this).select('circle').attr('r', 5);
      });
  }

  removeWonders() {
    const svg = d3.select('.world-map-container svg');
    svg.selectAll('.wonder-marker').remove();
  }

  // Helper method to get current projection
  getCurrentProjection() {
    return this.mapProjection;
  }
}
