import { ConfigService } from '@nestjs/config';

export function getNumericConfigValue(
  configService: ConfigService,
  key: string,
  fallback: number,
): number;
export function getNumericConfigValue(
  configService: ConfigService,
  key: string,
): number | undefined;
export function getNumericConfigValue(
  configService: ConfigService,
  key: string,
  fallback?: number,
): number | undefined {
  const raw = configService.get<string | number | undefined>(key);
  if (raw === undefined || raw === null || raw === '') {
    return fallback;
  }

  if (typeof raw === 'number') {
    return Number.isFinite(raw) ? raw : fallback;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}
