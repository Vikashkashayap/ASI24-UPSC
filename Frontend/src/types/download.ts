export interface ApkVersionInfo {
  version: string;
  size: string;
  releaseDate: string;
  apk: string;
  minimumAndroid: string;
  appName: string;
  packageId?: string;
  changelog?: string[];
  features: string[];
}

export interface DownloadAnalyticsPayload {
  version: string;
  device: string;
  userAgent?: string;
  source?: string;
}
