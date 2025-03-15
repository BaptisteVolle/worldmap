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
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit {
  selectedCountryName: string = '';
  countryInfo: any;
  isShowing = false;
  allCountriesNameList = [];

  //@ViewChild('input') input: ElementRef<HTMLInputElement>;
  countryControl = new FormControl('');
  options: string[] = this.allCountriesNameList;
  currentAttribute: string = '';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.drawMap();
  }

  drawMap() {
    console.log('before', typeof window);
    if (typeof window !== 'undefined') {
      console.log('after', typeof window);

      this.http
        .get('assets/json/world-geo.json')
        .subscribe((worldData: any) => {
          console.log(worldData);
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

          // Créer un chemin pour chaque pays
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

          svg
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
          let allCountries = svg.selectAll('path');

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
    this.countryControl.setValue(''); // Vider le sélecteur en définissant sa valeur sur une chaîne vide
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
    let unit;

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

    // Delete alls previous legends
    d3.selectAll('.legend').remove();

    const legend = svg
      .append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${legendX}, ${legendY})`);

    const legendTitle = legend
      .append('text')
      .attr('x', 0)
      .attr('y', -10)
      .text(`${unit}`)
      .attr('font-weight', 'bold');

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
}
