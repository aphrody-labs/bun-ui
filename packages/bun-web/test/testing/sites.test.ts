// SPDX-License-Identifier: Apache-2.0
// oxlint-disable-next-line import/no-unassigned-import -- side effect: starts the shared test engine on import
import "./setup.ts";

/**
 * Unit tests for site testing helpers and presets in @aphrody/bun-web/testing/sites:
 * - Aphrody UI / Next.js (M3 design token compliance, RSC hydration errors, instant benchmark)
 */

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { BunCdpPage } from "../../src/testing/cdp.ts";
import type { CdpSend } from "../../src/testing/next/index.ts";
import {
  auditM3DesignTokens,
  detectHydrationErrors,
  benchmarkInstantNavigation,
} from "../../src/testing/sites/index.ts";

describe("Aphrody UI / Next.js site helpers", () => {
  let page: BunCdpPage;

  beforeEach(async () => {
    page = await BunCdpPage.connect();
  });

  afterEach(async () => {
    await page.close();
  });

  test("auditM3DesignTokens audits standard M3 token definitions", async () => {
    const validM3Styles = {
      "--md-sys-color-primary": "#6750A4",
      "--md-sys-color-surface": "#FEF7FF",
      "--md-sys-color-on-surface": "#1D1B20",
      "--md-sys-color-secondary": "#625B71",
      "--md-sys-color-outline": "#79747E",
      "--md-sys-shape-corner-none": "0px",
      "--md-sys-shape-corner-small": "8px",
      "--md-sys-shape-corner-medium": "12px",
      "--md-sys-shape-corner-large": "16px",
      "--md-sys-elevation-level1": "1",
      "--md-sys-motion-duration-short1": "50ms",
      "--md-sys-typescale-body-large-size": "16px",
    };

    const audit = await auditM3DesignTokens(validM3Styles);
    expect(audit.compliant).toBe(true);
    expect(audit.score).toBeGreaterThanOrEqual(70);
    expect(audit.categories.color).toBe(true);
    expect(audit.categories.shape).toBe(true);
    expect(audit.categories.elevation).toBe(true);
    expect(audit.categories.motion).toBe(true);
    expect(audit.categories.typescale).toBe(true);
    expect(audit.violations).toHaveLength(0);
    expect(audit.missingTokens).toHaveLength(0);
  });

  test("auditM3DesignTokens flags non-standard shape radii violations", async () => {
    const invalidStyles = {
      "--md-sys-color-primary": "#6750A4",
      "--md-sys-shape-corner-medium": "7px", // violation: not in standard scale
    };

    const audit = await auditM3DesignTokens(invalidStyles);
    expect(audit.compliant).toBe(false);
    expect(audit.violations.length).toBeGreaterThan(0);
    expect(audit.violations[0]).toContain("Non-standard M3 shape radius");
    expect(audit.missingTokens.length).toBeGreaterThan(0);
  });

  test("detectHydrationErrors catches React 18/19 and Next.js hydration issues", async () => {
    const logsWithHydration = [
      "Info: app loaded",
      "Error: Text content does not match server-rendered HTML.",
      "Warning: react-error #418 - Hydration failed because the initial UI does not match what was rendered on the server.",
    ];

    const check = await detectHydrationErrors(logsWithHydration);
    expect(check.hasHydrationError).toBe(true);
    expect(check.errorCount).toBe(2);
    expect(check.details.map(d => d.type)).toContain("text_mismatch");
    expect(check.details.map(d => d.type)).toContain("minified_react_hydration");

    // Clean logs
    const cleanCheck = await detectHydrationErrors(["Ready on http://localhost:3000", "GET / 200"]);
    expect(cleanCheck.hasHydrationError).toBe(false);
    expect(cleanCheck.errorCount).toBe(0);

    // RSC error fallback comment detection in HTML
    const rscHtml = "<div><!--$!--><template data-msg='SSR bailout'></template><!--/$--></div>";
    const rscCheck = await detectHydrationErrors(rscHtml);
    expect(rscCheck.hasHydrationError).toBe(true);
    expect(rscCheck.details[0].type).toBe("rsc_error_fallback");
  });

  test("benchmarkInstantNavigation measures instant navigation iterations", async () => {
    const pwTarget = { url: () => "http://localhost:3000", _cdp: page as unknown as CdpSend };

    let actionsRun = 0;
    const benchmark = await benchmarkInstantNavigation(
      pwTarget,
      async () => {
        actionsRun++;
      },
      { runs: 2 },
    );

    expect(actionsRun).toBe(2);
    expect(benchmark.runs).toBe(2);
    expect(benchmark.timings).toHaveLength(2);
    expect(benchmark.cachedRendered).toBe(true);
    expect(benchmark.averageMs).toBeGreaterThanOrEqual(0);
  });
});
