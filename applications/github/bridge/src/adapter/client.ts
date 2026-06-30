/**
 * Credential Adapter HTTP client.
 * Submits Action Packages to the MPAS Credential Adapter running on localhost.
 * The adapter evaluates policy and either auto-approves or signals that
 * additional approvals are required.
 */

import type { ActionPackage, ActionResponse } from "../core/types.js";

export interface AdapterClientConfig {
  /** Base URL of the Credential Adapter (e.g., "http://127.0.0.1:7544") */
  url: string;
  /** Timeout in ms for adapter requests */
  timeoutMs?: number;
}

export class AdapterClient {
  private readonly url: string;
  private readonly timeoutMs: number;

  constructor(config: AdapterClientConfig) {
    this.url = config.url.replace(/\/$/, "");
    this.timeoutMs = config.timeoutMs ?? 30_000;
  }

  /**
   * Submit an Action Package to the Credential Adapter.
   * Returns the ActionResponse which indicates the outcome:
   * - "executed": action was auto-approved and dispatched
   * - "additionalApprovalsRequired": approval workflow is needed
   * - "rejected": action was denied by policy
   * - "pending": action was previously submitted and is still in-flight
   */
  async submit(actionPackage: ActionPackage): Promise<ActionResponse> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.url}/mpas/v1/action`, {
        method: "POST",
        headers: { "content-type": "application/mpas+json" },
        body: JSON.stringify(actionPackage),
        signal: controller.signal,
      });

      if (!response.ok && response.status >= 500) {
        throw new Error(`Adapter returned HTTP ${response.status}`);
      }

      return (await response.json()) as ActionResponse;
    } finally {
      clearTimeout(timer);
    }
  }

  /** Health check — confirms the adapter is reachable. */
  async health(): Promise<{ status: string }> {
    const response = await fetch(`${this.url}/mpas/v1/health`);
    return (await response.json()) as { status: string };
  }
}
