import 'leaflet';

declare module 'leaflet' {
  namespace PM {
    // Minimal definitions to satisfy TypeScript without bringing full typings
    interface Toolbar {
      copyDrawControl(type: string, name: string): void;
    }

    interface Map extends L.Evented {
      addControls(options?: Record<string, unknown>): void;
      setLang(locale: string): void;
      Toolbar: Toolbar;
    }

    interface Layer extends L.Evented {
      enable(options?: Record<string, unknown>): void;
      disable(): void;
      enableLayerDrag(): void;
      disableLayerDrag(): void;
      setOptions(options?: Record<string, unknown>): void;
    }
  }

  interface Map {
    pm: PM.Map;
  }

  interface Layer {
    pm: PM.Layer;
  }

  interface Polygon {
    pm: PM.Layer;
  }
}
