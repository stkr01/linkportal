import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import { prisma } from '../db';

export type HealthStatus = 'UP' | 'DOWN' | 'UNKNOWN';

export interface HealthResult {
  status: HealthStatus;
  statusCode?: number;
  latencyMs?: number;
}

// Default-portar per schema (BLUEPRINT 14.2).
const DEFAULT_PORTS: Record<string, number> = {
  'http:': 80,
  'https:': 443,
  'rdp:': 3389,
  'ssh:': 22,
};

// Värdar som aldrig får testas (SSRF-skydd – BLUEPRINT 14.8).
// Interna IP är medvetet tillåtna; bara molnens metadata-endpoint och loopback blockeras.
const BLOCKED_HOSTS = new Set(['169.254.169.254', '127.0.0.1', 'localhost', '::1', '[::1]']);

function isBlocked(hostname: string): boolean {
  return BLOCKED_HOSTS.has(hostname.toLowerCase());
}

// HTTP HEAD/GET: vilket svar som helst räknas som UP. Bara nätfel/timeout = DOWN.
function testHttp(url: URL, timeoutMs: number): Promise<HealthResult> {
  return new Promise((resolve) => {
    const lib = url.protocol === 'https:' ? https : http;
    const started = Date.now();
    let settled = false;
    const done = (result: HealthResult) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    const req = lib.request(
      url,
      {
        method: 'HEAD',
        timeout: timeoutMs,
        // Följ inte redirects, läs ingen body, skicka inga credentials.
        headers: { 'User-Agent': 'LinkPortal-HealthCheck' },
        // Acceptera självsignerade interna cert utan att läcka data.
        ...(url.protocol === 'https:' ? { rejectUnauthorized: false } : {}),
      },
      (res) => {
        const latencyMs = Date.now() - started;
        res.resume(); // kasta body
        done({ status: 'UP', statusCode: res.statusCode, latencyMs });
      }
    );

    req.on('timeout', () => {
      req.destroy();
      done({ status: 'DOWN', latencyMs: Date.now() - started });
    });
    req.on('error', () => {
      done({ status: 'DOWN', latencyMs: Date.now() - started });
    });
    req.end();
  });
}

// TCP-portkoll (motsvarar Test-NetConnection -Port). Port öppen = UP.
function testTcp(host: string, port: number, timeoutMs: number): Promise<HealthResult> {
  return new Promise((resolve) => {
    const started = Date.now();
    let settled = false;
    const done = (result: HealthResult) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    const socket = new net.Socket();
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => {
      const latencyMs = Date.now() - started;
      socket.destroy();
      done({ status: 'UP', latencyMs });
    });
    socket.once('timeout', () => {
      socket.destroy();
      done({ status: 'DOWN', latencyMs: Date.now() - started });
    });
    socket.once('error', () => {
      socket.destroy();
      done({ status: 'DOWN', latencyMs: Date.now() - started });
    });
    socket.connect(port, host);
  });
}

/**
 * Testa en URL och returnera status enligt BLUEPRINT 14.2.
 * - http/https → HTTP HEAD (vilket svar som helst = UP)
 * - rdp/ssh    → TCP-portkoll
 * - annat      → UNKNOWN
 */
export async function testUrl(rawUrl: string, timeoutMs: number): Promise<HealthResult> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { status: 'UNKNOWN' };
  }

  const hostname = url.hostname;
  if (!hostname || isBlocked(hostname)) {
    return { status: 'UNKNOWN' };
  }

  const scheme = url.protocol;
  const explicitPort = url.port ? Number(url.port) : undefined;

  if (scheme === 'http:' || scheme === 'https:') {
    return testHttp(url, timeoutMs);
  }

  if (scheme === 'rdp:' || scheme === 'ssh:') {
    const port = explicitPort ?? DEFAULT_PORTS[scheme];
    return testTcp(hostname, port, timeoutMs);
  }

  return { status: 'UNKNOWN' };
}

/**
 * Kör ett test mot en länk, uppdatera dess status och spara en historikrad.
 * UNKNOWN-resultat sparas inte i historiken (bara på själva länken).
 */
export async function runCheck(
  link: { id: number; url: string },
  timeoutSec: number
): Promise<HealthResult> {
  const result = await testUrl(link.url, timeoutSec * 1000);

  // Tidigare status behövs för att upptäcka övergången UP -> DOWN (Monitor Alerts).
  const prev = await prisma.link.findUnique({
    where: { id: link.id },
    select: { healthStatus: true, alertActive: true },
  });

  let alertActive = prev?.alertActive ?? false;
  if (result.status === 'UP') {
    alertActive = false; // återhämtad – nollställ larmet
  } else if (result.status === 'DOWN' && prev?.healthStatus === 'UP') {
    alertActive = true; // var grön, blev röd
  }

  await prisma.link.update({
    where: { id: link.id },
    data: {
      healthStatus: result.status,
      lastCheckedAt: new Date(),
      lastStatusCode: result.statusCode ?? null,
      lastLatencyMs: result.latencyMs ?? null,
      alertActive,
    },
  });

  if (result.status === 'UP' || result.status === 'DOWN') {
    await prisma.healthCheck.create({
      data: {
        linkId: link.id,
        status: result.status,
        statusCode: result.statusCode ?? null,
        latencyMs: result.latencyMs ?? null,
      },
    });
  }

  return result;
}

// Testa flera länkar sekventiellt så vi inte stormar nätet.
export async function runChecks(
  links: { id: number; url: string }[],
  timeoutSec: number
): Promise<void> {
  for (const link of links) {
    try {
      await runCheck(link, timeoutSec);
    } catch {
      // En trasig länk ska inte stoppa svepet.
    }
  }
}
