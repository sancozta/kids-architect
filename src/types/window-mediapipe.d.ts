declare global {
  interface Window {
    Hands?: new (config: { locateFile: (file: string) => string }) => {
      close: () => void;
      onResults: (callback: (results: { multiHandLandmarks?: Array<Array<{ x: number; y: number; z?: number }>> }) => void) => void;
      send: (payload: { image: HTMLVideoElement }) => Promise<void>;
      setOptions: (options: Record<string, unknown>) => void;
    };
  }
}

export {};
