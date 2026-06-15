import { expect, test } from '@playwright/test';

/**
 * End-to-end smoke tests for the Graph Explorer.
 *
 * These exercise the full stack: browser -> frontend -> backend (:8001) ->
 * FalkorDB `default_db` (populated with the ESG ontology). They guard against
 * regressions like the embedding-dimension mismatch that silently broke
 * semantic search.
 *
 * Prereqs: backend running on :8001, FalkorDB up with the ontology ingested.
 */

test.describe('Graph Explorer', () => {
  test('loads the app shell and the default_db graph', async ({ page }) => {
    const graphResponse = page.waitForResponse(
      (r) => r.url().includes('/api/graph') && r.status() === 200,
    );

    await page.goto('/');

    await expect(page.getByText('Graphiti Explorer')).toBeVisible();

    // default_db must be the selected group.
    await expect(page.locator('select')).toHaveValue('default_db');

    // The graph endpoint returns the ontology nodes.
    const res = await graphResponse;
    const body = await res.json();
    expect(body.nodes.length).toBeGreaterThan(100);

    // Canvas is rendered by react-force-graph.
    await expect(page.locator('canvas')).toBeVisible();

    // No error status banner.
    await expect(page.locator('.status')).toHaveCount(0);
  });

  test('text search highlights matching nodes', async ({ page }) => {
    await page.goto('/');
    await page.waitForResponse((r) => r.url().includes('/api/graph') && r.status() === 200);

    await page.getByPlaceholder('Search nodes…').fill('emission');

    // The match counter appears and reports at least one hit.
    const count = page.locator('.count');
    await expect(count).toBeVisible();
    await expect(count).toContainText(/match/);
    const text = await count.innerText();
    const n = parseInt(text, 10);
    expect(n).toBeGreaterThan(0);
  });

  test('semantic search returns ontology matches (guards embedding dims)', async ({ page, request }) => {
    // Semantic search needs a server-side embedder (OPENAI_API_KEY). Skip cleanly
    // where it isn't configured (e.g. fork CI with no secret) rather than fail.
    const apiBase = process.env.E2E_API_BASE || 'http://localhost:8001';
    const health = await (await request.get(`${apiBase}/api/health`)).json();
    test.skip(!health.semantic_search, 'semantic search not configured (no embedder)');

    await page.goto('/');
    await page.waitForResponse((r) => r.url().includes('/api/graph') && r.status() === 200);

    // Server-side node search mode (labelled "Semantic" or "Hybrid" across versions).
    await page.getByRole('button', { name: /^(Semantic|Hybrid)$/ }).click();
    await page.getByPlaceholder('Search nodes…').fill('carbon emissions reduction targets');

    const searchResponse = page.waitForResponse((r) => r.url().includes('/api/search'));
    await page.getByRole('button', { name: 'Search' }).click();
    const res = await searchResponse;

    // 200 with results — a dim mismatch would 500 / return zero and surface a
    // "Search error" status instead.
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.node_ids)).toBeTruthy();
    expect(body.node_ids.length).toBeGreaterThan(0);

    await expect(page.locator('.count')).toContainText(/match/);
  });
});
