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

describe("createBadge", () => {
  it("creates a badge successfully", async () => {
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

    console.log(regRes.statusCode, regRes.body);

    const res = await request(app)
      .post("/api/createBadge")
      .send({
        badge_name: "Test Badge",
        description: "A test badge",
        user_id: regRes.body.user_id
      });

    console.log(res.statusCode, res.body)
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("id");
  });

  it("returns 400 if required fields are missing", async () => {
    const res = await request(app)
      .post("/api/createBadge")
      .send({
        badge_name: "Incomplete Badge"
        // missing description + user_id
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/missing/i);
  });

  it("returns 500 for unexpected errors", async () => {
    // send something weird that might break query
    const res = await request(app)
      .post("/api/createBadge")
      .send({
        badge_name: null,
        description: null,
        user_id: null
      });

    // could be 400 or 500 depending on validation timing
    expect([400, 500]).toContain(res.status);
  });

  it("returns 400 when fields are missing", async () => {
    const res = await request(app)
      .post("/api/createBadge")
      .send({
        badge_name: "Only name"
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/missing/i);
  });

  it("returns 400 for invalid user_id (foreign key)", async () => {
    const res = await request(app)
      .post("/api/createBadge")
      .send({
        badge_name: "Test Badge",
        description: "Test description",
        user_id: 999999 // should not exist
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/user id/i);
  });

  it("handles malformed request body", async () => {
    const res = await request(app)
      .post("/api/createBadge")
      .send(null); // no body at all

    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});

describe("POST /api/event_categories", () => {
  it("creates category", async () => {
    const unique = randomUUID();
    const res = await request(app)
      .post("/api/event_categories")
      .send({ name: `Music${unique}` });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("id");
  });

  it("fails when category already exists", async () => {
    const unique = randomUUID();
    const res = await request(app)
      .post("/api/event_categories")
      .send({ name: `Music${unique}` });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("id");

    const secondRes = await request(app)
      .post("/api/event_categories")
      .send({ name: `Music${unique}` });

    expect(secondRes.status).toBe(400);
  });

  it("fails when name missing", async () => {
    const res = await request(app)
      .post("/api/event_categories")
      .send({});

    expect(res.status).toBe(400);
  });
});

async function create_event() {
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
  return eventRes;
}

describe("POST /api/event/add_categories", () => {
  it("attaches category to event", async () => {
    const unique = randomUUID();
    // create category
    const catRes = await request(app)
      .post("/api/event_categories")
      .send({ name: `AttachTest${unique}` });

    const categoryId = catRes.body.id;

    const eventRes = await create_event();
    const eventId = eventRes.body.id;
    console.log(`Adding Event Category, eventId = ${eventId}, catId = ${categoryId}`);

    const res = await request(app)
      .post("/api/event/add_categories")
      .send({
        event_id: eventId,
        event_category_id: categoryId
      });

    expect(res.status).toBe(201);
  });

  it("fails with either id missing", async () => {
    const unique = randomUUID();
    // create category
    const catRes = await request(app)
      .post("/api/event_categories")
      .send({ name: `AttachTest${unique}` });

    const categoryId = catRes.body.id;

    const eventRes = await create_event();
    const eventId = eventRes.body.id;
    console.log(`Adding Event Category, eventId = ${eventId}, catId = ${categoryId}`);

    const res = await request(app)
      .post("/api/event/add_categories")
      .send({
        event_category_id: categoryId
      });

    expect(res.status).toBe(400);

    const secRes = await request(app)
      .post("/api/event/add_categories")
      .send({
        event_id: eventId
      });

    expect(secRes.status).toBe(400);
  });
});

describe("GET /api/events_by_zip/:zip_code", () => {
  it("returns events for zip", async () => {
    const eventRes = await create_event();

    const res = await request(app)
      .get("/api/events_by_zip/14623"); // search for the event we made

    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it("fails with no zip", async () => {
    const eventRes = await create_event();

    const res = await request(app)
      .get("/api/events_by_zip/"); // search for the event we made

    expect(res.status).toBe(404);
  });

  it("returns empty array if none found", async () => {
    const res = await request(app)
      .get("/api/events_by_zip/00000");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe("GET /api/events_by_cat/:category_id", () => {
  it("returns events for category", async () => {
    const unique = randomUUID();
    // create category
    const catRes = await request(app)
      .post("/api/event_categories")
      .send({ name: `CatTest${unique}` });

    console.log(`Created category, ${catRes.statusCode}, ${catRes.body}`)
    const categoryId = catRes.body.id;

    const eventRes = await create_event();

    const eventId = eventRes.body.id;

    const catLinkRes = await request(app)
      .post("/api/event/add_categories")
      .send({
        event_id: eventId,
        event_category_id: categoryId
      });

    const res = await request(app)
      .get(`/api/events_by_cat/${categoryId}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it("fails with no catId", async () => {
    const eventRes = await create_event();

    const res = await request(app)
      .get("/api/events_by_cat/"); // search for the event we made

    expect(res.status).toBe(404);
  });

  it("returns empty array if no matches", async () => {
    const res = await request(app)
      .get("/api/events_by_cat/999999");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe("GET /api/event_categories/:filter", () => {
  it("returns categories matching filter", async () => {
    const unique = randomUUID();
    await request(app)
      .post("/api/event_categories")
      .send({ name: `MusicTest${unique}` });

    const res = await request(app)
      .get("/api/event_categories/Music");

    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it("returns empty array when no matches", async () => {
    const res = await request(app)
      .get("/api/event_categories/zzzzunlikely");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
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
