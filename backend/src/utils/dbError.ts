import type { Response } from 'express';

type ErrorResponse = {
  status: number;
  body: {
    error: string;
    code?: string;
  };
};

const asMessage = (error: unknown): string => {
  if (!error) return '';
  if (typeof error === 'string') return error;
  if (typeof error === 'object' && 'message' in error) {
    return String((error as { message?: unknown }).message || '');
  }
  return String(error);
};

const isDbAuthError = (error: unknown, message: string): boolean => {
  const knownCode = typeof error === 'object' && error !== null && 'code' in error
    ? String((error as { code?: unknown }).code || '')
    : '';

  return (
    knownCode === 'P1000' ||
    message.includes('SCRAM failure: bad auth') ||
    message.includes('Authentication failed') ||
    message.includes('bad auth')
  );
};

const isDbUnavailableError = (error: unknown, message: string): boolean => {
  const knownCode = typeof error === 'object' && error !== null && 'code' in error
    ? String((error as { code?: unknown }).code || '')
    : '';

  return (
    knownCode === 'P1001' ||
    knownCode === 'P1002' ||
    message.includes('Server selection timeout') ||
    message.includes('connect ECONNREFUSED') ||
    message.includes('ENOTFOUND')
  );
};

export const mapDbError = (error: unknown, fallbackError = 'Internal server error'): ErrorResponse => {
  const message = asMessage(error);

  if (isDbAuthError(error, message)) {
    return {
      status: 503,
      body: {
        error: 'Database authentication failed. Check Atlas username/password in DATABASE_URL.',
        code: 'DB_AUTH_FAILED',
      },
    };
  }

  if (isDbUnavailableError(error, message)) {
    return {
      status: 503,
      body: {
        error: 'Database is unavailable. Check Atlas cluster status and Network Access allowlist.',
        code: 'DB_UNAVAILABLE',
      },
    };
  }

  return {
    status: 500,
    body: {
      error: fallbackError,
    },
  };
};

export const sendDbError = (res: Response, error: unknown, fallbackError = 'Internal server error') => {
  const mapped = mapDbError(error, fallbackError);
  return res.status(mapped.status).json(mapped.body);
};

