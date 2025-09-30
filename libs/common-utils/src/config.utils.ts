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

export interface SqsPollingSettings {
  batchSize: number;
  waitTimeSeconds: number;
  visibilityTimeout: number;
  errorBackoffMs: number;
}

export const getSqsPollingSettings = (
  configService: ConfigService,
  defaults?: Partial<SqsPollingSettings>,
): SqsPollingSettings => {
  const batchSizeFallback = defaults?.batchSize ?? 5;
  const waitTimeFallback = defaults?.waitTimeSeconds ?? 20;
  const visibilityFallback = defaults?.visibilityTimeout ?? 60;
  const errorBackoffFallback = defaults?.errorBackoffMs ?? 1000;

  const batchSize = getNumericConfigValue(
    configService,
    'SQS_MAX_MESSAGES',
    batchSizeFallback,
  );
  const waitTimeSeconds = getNumericConfigValue(
    configService,
    'SQS_WAIT_TIME_SECONDS',
    waitTimeFallback,
  );
  const visibilityTimeout = getNumericConfigValue(
    configService,
    'SQS_VISIBILITY_TIMEOUT',
    visibilityFallback,
  );
  const errorBackoffMs = getNumericConfigValue(
    configService,
    'SQS_ERROR_BACKOFF_MS',
    errorBackoffFallback,
  );

  return {
    batchSize,
    waitTimeSeconds,
    visibilityTimeout,
    errorBackoffMs,
  };
};
