/* eslint-disable no-undef */
import request from "supertest";
import { describe, it, expect } from "vitest";
import app from "../backend/server";
import { pool } from "../backend/db.js";
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

  it("should fail to create an event with error code 500", async () => {
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
        start_time: "2026-04-02T10:00:00Z",
        end_time: "2026-04-01T12:00:00Z",
        address: "100 Main St",
        city: "Rochester",
        state: "NY",
        zip_code: "14623"
      });

    console.log("Event:", eventRes.statusCode, eventRes.body);

    expect(eventRes.statusCode).toBe(500);
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

  it("should return 500 on database error", async () => {
    const res = await request(app)
      .put("/api/events/invalid")
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

    console.log("Update DB error:", res.statusCode, res.body);

    expect(res.statusCode).toBe(500);
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

/**
 * Tests endpoint for retrieving events
 * /api/events/:id
 */
describe("Event retrieval", () => {
  it("should retrieve an existing event", async () => {
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
        name: "Retrieve Test Event",
        description: "Testing event retrieval",
        start_time: "2026-04-05T10:00:00Z",
        end_time: "2026-04-05T12:00:00Z",
        address: "100 Main St",
        city: "Rochester",
        state: "NY",
        zip_code: "14623"
      });

    expect(eventRes.statusCode).toBe(200);

    // Retrieve event
    const getRes = await request(app)
      .get(`/api/events/${eventRes.body.id}`);

    console.log("Retrieve:", getRes.statusCode, getRes.body);

    expect(getRes.statusCode).toBe(200);
    expect(getRes.body).toHaveProperty("id", eventRes.body.id);
    expect(getRes.body).toHaveProperty("name", "Retrieve Test Event");
  });

  it("should return 404 when retrieving a nonexistent event", async () => {
    const res = await request(app)
      .get("/api/events/999999");

    console.log("Retrieve fail:", res.statusCode, res.body);

    expect(res.statusCode).toBe(404);
  });
});

/**
 * Tests endpoint for listing all events
 * /api/events
 */
describe("Event listing", () => {
  it("should list all events", async () => {
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
        name: "List All Test Event",
        description: "Testing event listing",
        start_time: "2026-04-07T10:00:00Z",
        end_time: "2026-04-07T12:00:00Z",
        address: "100 Main St",
        city: "Rochester",
        state: "NY",
        zip_code: "14623"
      });

    expect(eventRes.statusCode).toBe(200);

    // List all events
    const listRes = await request(app)
      .get("/api/events");

    console.log("List all events:", listRes.statusCode, listRes.body);

    expect(listRes.statusCode).toBe(200);
    expect(Array.isArray(listRes.body)).toBe(true);
    expect(listRes.body.length).toBeGreaterThan(0);
  });
});

/**
 * Tests endpoint for retrieving full name
 * /api/full_name
 */
describe("Full name retrieval", () => {
  it("should retrieve full name for an existing user", async () => {
    const unique = randomUUID();
    const uniqueEmail = `test${unique}@test.com`;
    const uniqueUsername = `test${unique}`;

    // Register volunteer
    const regRes = await request(app)
      .post("/api/registerVolunteer")
      .send({
        username: uniqueUsername,
        email: uniqueEmail,
        password: "pass123",
        firstName: "Jane",
        lastName: "Doe",
        phone: "555-1234"
      });

    expect(regRes.statusCode).toBe(200);
    expect(regRes.body).toHaveProperty("id");

    // Get user_id from volunteer id
    const userQuery = await pool.query("SELECT user_id FROM volunteers WHERE id = $1", [regRes.body.id]);
    const user_id = userQuery.rows[0].user_id;

    // Retrieve full name
    const getRes = await request(app)
      .get(`/api/full_name?user_id=${user_id}`);

    console.log("Full name:", getRes.statusCode, getRes.body);

    expect(getRes.statusCode).toBe(200);
    expect(getRes.body).toHaveProperty("name", "Jane Doe");
  });

  it("should return 404 when user id not found", async () => {
    const res = await request(app)
      .get("/api/full_name?user_id=999999");

    console.log("Full name fail:", res.statusCode, res.body);

    expect(res.statusCode).toBe(404);
  });
  it("should return 500 on database error", async () => {
    const res = await request(app)
      .get("/api/full_name?user_id=invalid");

    console.log("Full name DB error:", res.statusCode, res.body);

    expect(res.statusCode).toBe(500);
  });
});

/**
 * Tests endpoint for counting events
 * /api/events/:id/count
 */
describe("Event counting", () => {
  it("should return 500 when event not found", async () => {
    const res = await request(app)
      .get("/api/events/999999/count");

    console.log("Count 500:", res.statusCode, res.body);

    expect(res.statusCode).toBe(500);
  });
});

/**
 * Tests endpoint for duplicate volunteer registration
 * /api/events/:id/register
 */
describe("Duplicate volunteer registration", () => {
  it("should return 409 when volunteer already registered", async () => {
    const unique = randomUUID();

    // Create volunteer
    const volunteerRes = await request(app)
      .post("/api/registerVolunteer")
      .send({
        username: `vol${unique}`,
        email: `vol${unique}@test.com`,
        password: "pass123",
        firstName: "Jane",
        lastName: "Doe",
        phone: "555-1234"
      });

    expect(volunteerRes.statusCode).toBe(200);

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
        name: "Duplicate Register Test Event",
        description: "Testing duplicate register",
        start_time: "2026-04-06T10:00:00Z",
        end_time: "2026-04-06T12:00:00Z",
        address: "100 Main St",
        city: "Rochester",
        state: "NY",
        zip_code: "14623"
      });

    expect(eventRes.statusCode).toBe(200);

    // Publish event
    await request(app)
      .put(`/api/events/${eventRes.body.id}/publish`);

    // Register volunteer first time
    const regRes1 = await request(app)
      .post(`/api/events/${eventRes.body.id}/register`)
      .send({
        volunteer_id: volunteerRes.body.id
      });

    expect(regRes1.statusCode).toBe(200);

    // Register volunteer second time (duplicate)
    const regRes2 = await request(app)
      .post(`/api/events/${eventRes.body.id}/register`)
      .send({
        volunteer_id: volunteerRes.body.id
      });

    console.log("Register 409:", regRes2.statusCode, regRes2.body);

    expect(regRes2.statusCode).toBe(409);
  });
});

/**
 * Database error mocking tests
 */
describe("Database error mocking - Event endpoints", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should return 500 on GET /api/events database error", async () => {
    const _querySpy = vi.spyOn(pool, 'query').mockRejectedValue(new Error("Database error"));

    const res = await request(app).get("/api/events");

    expect(res.statusCode).toBe(500);
  });

  it("should return 500 on GET /api/events/:id database error", async () => {
    const _querySpy = vi.spyOn(pool, 'query').mockRejectedValue(new Error("Database error"));

    const res = await request(app).get("/api/events/1");

    expect(res.statusCode).toBe(500);
  });

  it("should return 500 on PUT /api/events/:id database error", async () => {
    const _querySpy = vi.spyOn(pool, 'query').mockRejectedValue(new Error("Database error"));

    const res = await request(app)
      .put("/api/events/1")
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

    expect(res.statusCode).toBe(500);
  });
});