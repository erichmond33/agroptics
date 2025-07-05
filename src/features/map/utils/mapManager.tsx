import maplibregl, { Map as MapLibreMap } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import type { Feature, FeatureCollection, Polygon, GeoJsonProperties } from 'geojson';
import { featureCollection } from '@turf/turf';
import { initDrawControl } from './drawControl';
import { getFields, saveField, deleteField } from './backendApi';

export const BASEMAPS = {
  positron: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
  satellite: 'https://roblabs.com/xyz-raster-sources/styles/arcgis-world-imagery.json',
} as const;

export type BasemapType = keyof typeof BASEMAPS;

const DEFAULT_MAP_CENTER = [-104.033, 40.097] as [number, number];
const DEFAULT_ZOOM = 14;

export interface MapState {
  polygons: Feature<Polygon>[];
  basemap: BasemapType;
  selectedFeature: Feature<Polygon, GeoJsonProperties> | null;
  showForm: boolean;
  layerVisibility: { [key: string]: boolean };
}

export type MapStateUpdater = (updater: (prev: MapState) => MapState) => void;

export class MapManager {
  private map: MapLibreMap | null = null;
  private draw: mapboxgl.Draw | null = null;
  private existingFeatures: FeatureCollection<Polygon> | null = null;

  constructor(
    private mapContainer: HTMLDivElement,
    private setState: MapStateUpdater
  ) {}

  async initialize(basemap: BasemapType): Promise<MapLibreMap> {
    this.map = new maplibregl.Map({
      container: this.mapContainer,
      style: BASEMAPS[basemap],
      center: DEFAULT_MAP_CENTER,
      zoom: DEFAULT_ZOOM,
    });

    this.map.on('load', () => {
      this.setupMapStyles();
      this.loadExistingFeatures();
      this.initializeDrawControl();
    });

    return this.map;
  }

  get mapInstance(): MapLibreMap | null {
    return this.map;
  }

  private setupMapStyles(): void {
    if (!this.map) return;

    this.map.getCanvas().className = 'mapboxgl-canvas maplibregl-canvas';
    this.map.getContainer().classList.add('mapboxgl-map');

    const canvasContainer = this.map.getCanvasContainer();
    canvasContainer.classList.add('mapboxgl-canvas-container');
    if (canvasContainer.classList.contains('maplibregl-interactive')) {
      canvasContainer.classList.add('mapboxgl-interactive');
    }
  }

  private async loadExistingFeatures(): Promise<void> {
    try {
      const featureCollection = await getFields();
      if (featureCollection) {
        this.existingFeatures = featureCollection;
        const visibility = this.createVisibilityMap(featureCollection.features);
        
        this.setState(prev => ({
          ...prev,
          polygons: featureCollection.features,
          layerVisibility: visibility
        }));

        this.updateDrawControl(featureCollection);
      }
    } catch (error) {
      console.error('Error loading existing fields:', error);
    }
  }

  private createVisibilityMap(features: Feature<Polygon>[]): { [key: string]: boolean } {
    return features.reduce((acc, feature) => {
      const featureId = this.getFeatureId(feature);
      return { ...acc, [featureId]: true };
    }, {});
  }

  private getFeatureId(feature: Feature<Polygon>): string {
    return feature.id?.toString() || 
           feature.properties?.id?.toString() || 
           JSON.stringify(feature.geometry.coordinates);
  }

  private initializeDrawControl(): void {
    if (!this.map) return;

    this.draw = initDrawControl({
      map: this.map,
      onUpdate: (features) => {
        this.setState(prev => ({ ...prev, polygons: features }));
      },
      onSelected: (feature) => this.handleFeatureSelection(feature),
      onDelete: (featureId) => this.deleteFeature(featureId),
    });
  }

  private async handleFeatureSelection(feature?: Feature<Polygon, GeoJsonProperties>): Promise<void> {
    if (!feature) {
      this.setState(prev => ({ ...prev, showForm: false, selectedFeature: null }));
      return;
    }

    const exists = await this.checkFeatureExists(feature);
    this.setState(prev => ({
      ...prev,
      selectedFeature: feature,
      showForm: !exists
    }));
  }

  private async checkFeatureExists(feature: Feature<Polygon>): Promise<boolean> {
    if (!this.existingFeatures) {
      const fields = await getFields();
      if (!fields) return false;
      this.existingFeatures = fields;
    }

    return this.existingFeatures.features.some(
      (existingFeature) =>
        existingFeature.geometry.type === feature.geometry.type &&
        JSON.stringify(existingFeature.geometry.coordinates) ===
          JSON.stringify(feature.geometry.coordinates)
    );
  }

  async saveFeature(data: { name: string; description: string; feature: Feature<Polygon> }): Promise<void> {
    try {
      const responseData = await saveField({
        name: data.name,
        description: data.description,
        geojson: data.feature,
      });

      const savedField = responseData.field;
      const featureId = this.getFeatureId(data.feature);

      const updatedFeature = {
        ...data.feature,
        properties: {
          ...data.feature.properties,
          id: responseData.field.id,
          name: savedField.name,
          description: savedField.description,
        },
      };

      this.setState(prev => ({
        ...prev,
        polygons: [...prev.polygons, updatedFeature],
        layerVisibility: { ...prev.layerVisibility, [featureId]: true },
        showForm: false,
        selectedFeature: updatedFeature
      }));

      await this.loadExistingFeatures();
    } catch (error) {
      console.error('Error saving feature:', error);
      throw error;
    }
  }

  private async deleteFeature(featureId: string): Promise<void> {
    try {
      await deleteField(featureId);
      this.setState(prev => ({ ...prev, selectedFeature: null }));
    } catch (error) {
      console.error('Error deleting polygon from database:', error);
    }
  }

  updateBasemap(newBasemap: BasemapType): void {
    if (!this.map || !this.draw) return;

    const existingPolygons = this.draw.getAll() as FeatureCollection<Polygon>;
    const selectedIds = this.draw.preserveSelection();

    try {
      this.map.removeControl(this.draw);
    } catch {}

    this.map.setStyle(BASEMAPS[newBasemap]);

    this.map.once('styledata', () => {
      if (!this.map || !this.draw) return;

      this.map.addControl(this.draw);

      if (existingPolygons?.features?.length) {
        this.draw.set(existingPolygons);
        this.draw.restoreSelection(selectedIds);
      }
    });
  }

  updateFeatureVisibility(polygons: Feature<Polygon>[], layerVisibility: { [key: string]: boolean }): void {
    if (!this.draw || !polygons.length) return;

    const visibleFeatures = polygons.filter((feature) => {
      const featureId = this.getFeatureId(feature);
      return layerVisibility[featureId] !== false;
    });

    this.draw.set(featureCollection(visibleFeatures));
  }

  private updateDrawControl(featureCollection: FeatureCollection<Polygon>): void {
    if (this.draw) {
      this.draw.set(featureCollection);
    }
  }

  destroy(): void {
    this.map?.remove();
  }
}