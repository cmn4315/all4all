import request from "supertest";
import { describe, it, expect } from "vitest";
import app from "../backend/server";
import { randomUUID } from "crypto";

/**
 * Tests endpoint for creating events
 * /api/events
 * Creates a test organization first
 */
describe("Event creation", () => {
  it("should create an event in DRAFT status", async () => {
    const unique = randomUUID();

    const orgRes = await request(app)
      .post("/api/registerOrg")
      .send({
        name: `org${unique}`,
        email: `org${unique}@test.com`,
        phone: "555-1111",
        description: "Test organization",
        password: "pass123",
        category_id: 1,
        zip_code: "14623"
      });

    console.log("Org:", orgRes.statusCode, orgRes.body);

    expect(orgRes.statusCode).toBe(200);
    expect(orgRes.body).toHaveProperty("id");

    const eventRes = await request(app)
      .post("/api/events")
      .send({
        organization_id: orgRes.body.id,
        name: "Community Cleanup",
        description: "Cleaning local park",
        start_time: "2026-04-01T10:00:00Z",
        end_time: "2026-04-01T12:00:00Z",
        address: "100 Main St",
        city: "Rochester",
        state: "NY",
        zip_code: "14623"
      });

    console.log("Event:", eventRes.statusCode, eventRes.body);

    expect(eventRes.statusCode).toBe(200);
    expect(eventRes.body).toHaveProperty("id");
  });

  it("should return 400 when required fields are missing", async () => {
  const res = await request(app)
    .post("/api/events")
    .send({
      name: "Incomplete Event"
    });

  console.log("Missing fields:", res.statusCode, res.body);

  expect(res.statusCode).toBe(400);
  });
});

/**
 * Tests endpoint for publishing events
 * /api/events/:id/publish
 */
describe("Event publishing", () => {
  it("should publish an event", async () => {
    const unique = randomUUID();

    // Create organization
    const orgRes = await request(app)
      .post("/api/registerOrg")
      .send({
        name: `org${unique}`,
        email: `org${unique}@test.com`,
        phone: "555-1111",
        description: "Test organization",
        password: "pass123",
        category_id: 1,
        zip_code: "14623"
      });

    expect(orgRes.statusCode).toBe(200);

    // Create event
    const eventRes = await request(app)
      .post("/api/events")
      .send({
        organization_id: orgRes.body.id,
        name: "Publish Test Event",
        description: "Testing publish",
        start_time: "2026-04-02T10:00:00Z",
        end_time: "2026-04-02T12:00:00Z",
        address: "100 Main St",
        city: "Rochester",
        state: "NY",
        zip_code: "14623"
      });

    expect(eventRes.statusCode).toBe(200);

    // Publish event
    const publishRes = await request(app)
      .put(`/api/events/${eventRes.body.id}/publish`);

    console.log("Publish:", publishRes.statusCode, publishRes.body);

    expect(publishRes.statusCode).toBe(200);
    expect(publishRes.body).toHaveProperty("success", true);
  });
  it("should return 404 when publishing a nonexistent event", async () => {
  const res = await request(app)
    .put("/api/events/999999/publish");

  console.log("Publish fail:", res.statusCode, res.body);

  expect(res.statusCode).toBe(404);
  });
});

/**
 * Tests endpoint for cancelling events
 * /api/events/:id/cancel
 */
describe("Event cancellation", () => {
  it("should cancel an event", async () => {
    const unique = randomUUID();

    // Create organization
    const orgRes = await request(app)
      .post("/api/registerOrg")
      .send({
        name: `org${unique}`,
        email: `org${unique}@test.com`,
        phone: "555-1111",
        description: "Test organization",
        password: "pass123",
        category_id: 1,
        zip_code: "14623"
      });

    expect(orgRes.statusCode).toBe(200);

    // Create event
    const eventRes = await request(app)
      .post("/api/events")
      .send({
        organization_id: orgRes.body.id,
        name: "Cancel Test Event",
        description: "Testing cancel",
        start_time: "2026-04-03T10:00:00Z",
        end_time: "2026-04-03T12:00:00Z",
        address: "100 Main St",
        city: "Rochester",
        state: "NY",
        zip_code: "14623"
      });

    expect(eventRes.statusCode).toBe(200);

    // Cancel event
    const cancelRes = await request(app)
      .put(`/api/events/${eventRes.body.id}/cancel`);

    console.log("Cancel:", cancelRes.statusCode, cancelRes.body);

    expect(cancelRes.statusCode).toBe(200);
    expect(cancelRes.body).toHaveProperty("success", true);
  });

  it("should return 404 when cancelling a nonexistent event", async () => {
    const res = await request(app)
      .put("/api/events/999999/cancel");

    console.log("Cancel fail:", res.statusCode, res.body);

    expect(res.statusCode).toBe(404);
  });
});

/**
 * Tests endpoint for updating events
 * /api/events/:id
 */
describe("Event update", () => {
  it("should update an existing event", async () => {
    const unique = randomUUID();

    // Create organization
    const orgRes = await request(app)
      .post("/api/registerOrg")
      .send({
        name: `org${unique}`,
        email: `org${unique}@test.com`,
        phone: "555-1111",
        description: "Test organization",
        password: "pass123",
        category_id: 1,
        zip_code: "14623"
      });

    expect(orgRes.statusCode).toBe(200);

    // Create event
    const eventRes = await request(app)
      .post("/api/events")
      .send({
        organization_id: orgRes.body.id,
        name: "Original Event",
        description: "Original description",
        start_time: "2026-04-04T10:00:00Z",
        end_time: "2026-04-04T12:00:00Z",
        address: "100 Main St",
        city: "Rochester",
        state: "NY",
        zip_code: "14623"
      });

    expect(eventRes.statusCode).toBe(200);

    // Update event
    const updateRes = await request(app)
      .put(`/api/events/${eventRes.body.id}`)
      .send({
        name: "Updated Event",
        description: "Updated description",
        start_time: "2026-04-04T13:00:00Z",
        end_time: "2026-04-04T15:00:00Z",
        address: "200 Main St",
        city: "Rochester",
        state: "NY",
        zip_code: "14623"
      });

    console.log("Update:", updateRes.statusCode, updateRes.body);

    expect(updateRes.statusCode).toBe(200);
    expect(updateRes.body).toHaveProperty("success", true);
  });

  it("should return 404 when updating a nonexistent event", async () => {
    const res = await request(app)
      .put("/api/events/999999")
      .send({
        name: "Updated Event",
        description: "Updated description",
        start_time: "2026-04-04T13:00:00Z",
        end_time: "2026-04-04T15:00:00Z",
        address: "200 Main St",
        city: "Rochester",
        state: "NY",
        zip_code: "14623"
      });

    console.log("Update fail:", res.statusCode, res.body);

    expect(res.statusCode).toBe(404);
  });
});

/**
 * Tests endpoint for listing organization events
 * /api/organizations/:id/events
 */
describe("Organization event listing", () => {
  it("should list events for an organization", async () => {
    const unique = randomUUID();

    // Create organization
    const orgRes = await request(app)
      .post("/api/registerOrg")
      .send({
        name: `org${unique}`,
        email: `org${unique}@test.com`,
        phone: "555-1111",
        description: "Test organization",
        password: "pass123",
        category_id: 1,
        zip_code: "14623"
      });

    expect(orgRes.statusCode).toBe(200);

    // Create event
    const eventRes = await request(app)
      .post("/api/events")
      .send({
        organization_id: orgRes.body.id,
        name: "List Test Event",
        description: "Testing organization event listing",
        start_time: "2026-04-10T10:00:00Z",
        end_time: "2026-04-10T12:00:00Z",
        address: "100 Main St",
        city: "Rochester",
        state: "NY",
        zip_code: "14623"
      });

    expect(eventRes.statusCode).toBe(200);

    // List events
    const listRes = await request(app)
      .get(`/api/organizations/${orgRes.body.id}/events`);

    console.log("List events:", listRes.statusCode, listRes.body);

    expect(listRes.statusCode).toBe(200);
    expect(Array.isArray(listRes.body)).toBe(true);
    expect(listRes.body.length).toBeGreaterThan(0);
  });

  it("should return empty array or 404 for nonexistent organization", async () => {
    const res = await request(app)
      .get("/api/organizations/999999/events");

    console.log("List fail:", res.statusCode, res.body);

    expect([200, 404]).toContain(res.statusCode);

    if (res.statusCode === 200) {
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(0);
    }
  });
  it("should return only published events when publishedOnly=true", async () => {
    const unique = randomUUID();

    // Create organization
    const orgRes = await request(app)
        .post("/api/registerOrg")
        .send({
        name: `org${unique}`,
        email: `org${unique}@test.com`,
        phone: "555-1111",
        description: "Test organization",
        password: "pass123",
        category_id: 1,
        zip_code: "14623"
        });

    expect(orgRes.statusCode).toBe(200);

    // Create draft event
    const draftRes = await request(app)
        .post("/api/events")
        .send({
        organization_id: orgRes.body.id,
        name: "Draft Event",
        description: "Should not appear",
        start_time: "2026-05-01T10:00:00Z",
        end_time: "2026-05-01T12:00:00Z",
        address: "100 Main St",
        city: "Rochester",
        state: "NY",
        zip_code: "14623"
        });

    expect(draftRes.statusCode).toBe(200);

    // Create second event
    const publishedRes = await request(app)
        .post("/api/events")
        .send({
        organization_id: orgRes.body.id,
        name: "Published Event",
        description: "Should appear",
        start_time: "2026-05-02T10:00:00Z",
        end_time: "2026-05-02T12:00:00Z",
        address: "200 Main St",
        city: "Rochester",
        state: "NY",
        zip_code: "14623"
        });

    expect(publishedRes.statusCode).toBe(200);

    // Publish second event
    await request(app)
        .put(`/api/events/${publishedRes.body.id}/publish`);

    // Request only published events
    const listRes = await request(app)
        .get(`/api/organizations/${orgRes.body.id}/events?publishedOnly=true`);

    console.log("Published only:", listRes.statusCode, listRes.body);

    expect(listRes.statusCode).toBe(200);
    expect(Array.isArray(listRes.body)).toBe(true);

    // Should contain only published event
    expect(listRes.body.some(e => e.name === "Published Event")).toBe(true);
    expect(listRes.body.some(e => e.name === "Draft Event")).toBe(false);
  });
});