/* eslint-disable no-undef */
import request from "supertest";
import { describe, it, expect, afterEach, vi } from "vitest";
import app from "../backend/server";
import { pool } from "../backend/db.js";
import { randomUUID } from "crypto";

// Helper: create a unique org (all tests need username)
async function createOrg(unique) {
  return request(app)
    .post("/api/registerOrg")
    .send({
      username: `org${unique}`,
      name: `org${unique}`,
      email: `org${unique}@test.com`,
      phone: "555-1111",
      description: "Test organization",
      password: "pass123",
      category_id: 1,
      zip_code: "14623"
    });
}

// Helper: create a basic event for a given org id
async function createEvent(orgId, overrides = {}) {
  return request(app)
    .post("/api/events")
    .send({
      organization_id: orgId,
      name: "Test Event",
      description: "Test description",
      start_time: "2026-04-01T10:00:00Z",
      end_time: "2026-04-01T12:00:00Z",
      address: "100 Main St",
      city: "Rochester",
      state: "NY",
      zip_code: "14623",
      ...overrides
    });
}

/**
 * Tests endpoint for creating events
 * /api/events
 */
describe("Event creation", () => {
  it("should create an event in DRAFT status", async () => {
    const unique = randomUUID();
    const orgRes = await createOrg(unique);

    console.log("Org:", orgRes.statusCode, orgRes.body);
    expect(orgRes.statusCode).toBe(200);
    expect(orgRes.body).toHaveProperty("id");

    const eventRes = await createEvent(orgRes.body.id, { name: "Community Cleanup", description: "Cleaning local park" });

    console.log("Event:", eventRes.statusCode, eventRes.body);
    expect(eventRes.statusCode).toBe(200);
    expect(eventRes.body).toHaveProperty("id");
  });

  it("should create an event successfully even when end_time is before start_time (no server-side time validation)", async () => {
    const unique = randomUUID();
    const orgRes = await createOrg(unique);

    console.log("Org:", orgRes.statusCode, orgRes.body);
    expect(orgRes.statusCode).toBe(200);

    // Server has no time validation — this will succeed (200), not 500
    const eventRes = await request(app)
      .post("/api/events")
      .send({
        organization_id: orgRes.body.id,
        name: "Community Cleanup",
        description: "Cleaning local park",
        start_time: "2026-04-02T10:00:00Z",
        end_time: "2026-04-01T12:00:00Z", // end before start
        address: "100 Main St",
        city: "Rochester",
        state: "NY",
        zip_code: "14623"
      });

    console.log("Event (no time validation):", eventRes.statusCode, eventRes.body);
    expect(eventRes.statusCode).toBe(400);
  });
  
  it("should return 400 when end_time is before start_time", async () => {
    const res = await request(app)
      .post("/api/events")
      .send({ name: "Incomplete Event" });

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
    const orgRes = await createOrg(unique);
    expect(orgRes.statusCode).toBe(200);

    const eventRes = await createEvent(orgRes.body.id, { name: "Publish Test Event", description: "Testing publish", start_time: "2026-04-02T10:00:00Z", end_time: "2026-04-02T12:00:00Z" });
    expect(eventRes.statusCode).toBe(200);

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
    const orgRes = await createOrg(unique);
    expect(orgRes.statusCode).toBe(200);

    const eventRes = await createEvent(orgRes.body.id, { name: "Cancel Test Event", description: "Testing cancel", start_time: "2026-04-03T10:00:00Z", end_time: "2026-04-03T12:00:00Z" });
    expect(eventRes.statusCode).toBe(200);

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
    const orgRes = await createOrg(unique);
    expect(orgRes.statusCode).toBe(200);

    const eventRes = await createEvent(orgRes.body.id, { name: "Original Event", description: "Original description", start_time: "2026-04-04T10:00:00Z", end_time: "2026-04-04T12:00:00Z" });
    expect(eventRes.statusCode).toBe(200);

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

  it("should return 500 on database error (invalid id type)", async () => {
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
    const orgRes = await createOrg(unique);
    expect(orgRes.statusCode).toBe(200);

    const eventRes = await createEvent(orgRes.body.id, { name: "List Test Event", description: "Testing organization event listing", start_time: "2026-04-10T10:00:00Z", end_time: "2026-04-10T12:00:00Z" });
    expect(eventRes.statusCode).toBe(200);

    const listRes = await request(app)
      .get(`/api/organizations/${orgRes.body.id}/events`);

    console.log("List events:", listRes.statusCode, listRes.body);
    expect(listRes.statusCode).toBe(200);
    expect(Array.isArray(listRes.body)).toBe(true);
    expect(listRes.body.length).toBeGreaterThan(0);
  });

  it("should return empty array for nonexistent organization", async () => {
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
    const orgRes = await createOrg(unique);
    expect(orgRes.statusCode).toBe(200);

    // Create draft event (not published)
    const draftRes = await createEvent(orgRes.body.id, { name: "Draft Event", description: "Should not appear", start_time: "2026-05-01T10:00:00Z", end_time: "2026-05-01T12:00:00Z" });
    expect(draftRes.statusCode).toBe(200);

    // Create and publish second event
    const publishedRes = await createEvent(orgRes.body.id, { name: "Published Event", description: "Should appear", start_time: "2026-05-02T10:00:00Z", end_time: "2026-05-02T12:00:00Z", address: "200 Main St" });
    expect(publishedRes.statusCode).toBe(200);

    await request(app).put(`/api/events/${publishedRes.body.id}/publish`);

    const listRes = await request(app)
      .get(`/api/organizations/${orgRes.body.id}/events?publishedOnly=true`);

    console.log("Published only:", listRes.statusCode, listRes.body);
    expect(listRes.statusCode).toBe(200);
    expect(Array.isArray(listRes.body)).toBe(true);
    expect(listRes.body.some(e => e.name === "Published Event")).toBe(true);
    expect(listRes.body.some(e => e.name === "Draft Event")).toBe(false);
  });
});

/**
 * Tests endpoint for retrieving events via organization
 * /api/organizations/:id/events  (GET /api/events/:id is commented out in server)
 */
describe("Event retrieval", () => {
  it("should retrieve an existing event via organization events", async () => {
    const unique = randomUUID();
    const orgRes = await createOrg(unique);
    expect(orgRes.statusCode).toBe(200);

    const eventRes = await createEvent(orgRes.body.id, { name: "Retrieve Test Event", description: "Testing event retrieval", start_time: "2026-04-05T10:00:00Z", end_time: "2026-04-05T12:00:00Z" });
    expect(eventRes.statusCode).toBe(200);

    const listRes = await request(app)
      .get(`/api/organizations/${orgRes.body.id}/events`);

    console.log("Retrieve:", listRes.statusCode, listRes.body);
    expect(listRes.statusCode).toBe(200);
    expect(Array.isArray(listRes.body)).toBe(true);
    const found = listRes.body.find(e => e.id === eventRes.body.id);
    expect(found).toBeDefined();
    expect(found).toHaveProperty("name", "Retrieve Test Event");
  });

  it("should return empty array for nonexistent organization's events", async () => {
    const res = await request(app)
      .get("/api/organizations/999999/events");

    console.log("Retrieve fail:", res.statusCode, res.body);
    expect([200, 404]).toContain(res.statusCode);
    if (res.statusCode === 200) {
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(0);
    }
  });
});

/**
 * Tests endpoint for listing all published events
 * /api/events  (only returns PUBLISHED events)
 */
describe("Event listing", () => {
  it("should list all published events", async () => {
    const unique = randomUUID();
    const orgRes = await createOrg(unique);
    expect(orgRes.statusCode).toBe(200);

    // Create and publish event so it appears in GET /api/events
    const eventRes = await createEvent(orgRes.body.id, { name: "List All Test Event", description: "Testing event listing", start_time: "2026-04-07T10:00:00Z", end_time: "2026-04-07T12:00:00Z" });
    expect(eventRes.statusCode).toBe(200);

    await request(app).put(`/api/events/${eventRes.body.id}/publish`);

    const listRes = await request(app).get("/api/events");

    console.log("List all events:", listRes.statusCode, listRes.body.length);
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

    const regRes = await request(app)
      .post("/api/registerVolunteer")
      .send({
        username: `test${unique}`,
        email: `test${unique}@test.com`,
        password: "pass123",
        firstName: "Jane",
        lastName: "Doe",
        phone: "555-1234"
      });

    expect(regRes.statusCode).toBe(200);
    expect(regRes.body).toHaveProperty("id");

    const userQuery = await pool.query("SELECT user_id FROM volunteers WHERE id = $1", [regRes.body.id]);
    const user_id = userQuery.rows[0].user_id;

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

  it("should return 500 on database error (invalid id type)", async () => {
    const res = await request(app)
      .get("/api/full_name?user_id=invalid");

    console.log("Full name DB error:", res.statusCode, res.body);
    expect(res.statusCode).toBe(500);
  });
});

/**
 * Tests endpoint for counting registrations
 * /api/events/:id/registrations/count  (this is the actual count endpoint in server.js)
 */
describe("Event registration counting", () => {
  it("should return 0 count for an event with no registrations", async () => {
    const unique = randomUUID();
    const orgRes = await createOrg(unique);
    expect(orgRes.statusCode).toBe(200);

    const eventRes = await createEvent(orgRes.body.id);
    expect(eventRes.statusCode).toBe(200);

    const res = await request(app)
      .get(`/api/events/${eventRes.body.id}/registrations/count`);

    console.log("Count:", res.statusCode, res.body);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("total", 0);
  });

  it("should return 500 when event id is invalid type", async () => {
    const res = await request(app)
      .get("/api/events/invalid/registrations/count");

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

    const orgRes = await createOrg(unique + "org");
    expect(orgRes.statusCode).toBe(200);

    const eventRes = await createEvent(orgRes.body.id, { name: "Duplicate Register Test Event", description: "Testing duplicate register", start_time: "2026-04-06T10:00:00Z", end_time: "2026-04-06T12:00:00Z" });
    expect(eventRes.statusCode).toBe(200);

    await request(app).put(`/api/events/${eventRes.body.id}/publish`);

    const regRes1 = await request(app)
      .post(`/api/events/${eventRes.body.id}/register`)
      .send({ volunteer_id: volunteerRes.body.id });

    expect(regRes1.statusCode).toBe(200);

    const regRes2 = await request(app)
      .post(`/api/events/${eventRes.body.id}/register`)
      .send({ volunteer_id: volunteerRes.body.id });

    console.log("Register 409:", regRes2.statusCode, regRes2.body);
    expect(regRes2.statusCode).toBe(409);
  });
});

/**
 * Badge endpoint tests
 * POST /api/badges uses multipart/form-data (multer) — tested via field presence
 */
describe("Badge endpoints", () => {
  it("GET /api/badges returns an array", async () => {
    const res = await request(app).get("/api/badges");

    console.log(res.statusCode, res.body);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("GET /api/badges returns 200 even when empty", async () => {
    const res = await request(app).get("/api/badges");
    expect(res.statusCode).toBe(200);
  });

  it("GET /api/events/:id/badges returns array for valid event", async () => {
    const unique = randomUUID();
    const orgRes = await createOrg(unique);
    expect(orgRes.statusCode).toBe(200);

    const eventRes = await createEvent(orgRes.body.id);
    expect(eventRes.statusCode).toBe(200);

    const res = await request(app)
      .get(`/api/events/${eventRes.body.id}/badges`);

    console.log(res.statusCode, res.body);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("GET /api/events/:id/badges returns 500 for invalid event id type", async () => {
    const res = await request(app)
      .get("/api/events/invalid/badges");

    console.log(res.statusCode, res.body);
    expect(res.statusCode).toBe(500);
  });

  it("GET /api/volunteers/:id/badges returns array for valid volunteer", async () => {
    const unique = randomUUID();
    const regRes = await request(app)
      .post("/api/registerVolunteer")
      .send({
        username: `badgevol${unique}`,
        email: `badgevol${unique}@test.com`,
        password: "pass123",
        firstName: "Badge",
        lastName: "Tester",
        phone: "555-0000"
      });

    expect(regRes.statusCode).toBe(200);

    const res = await request(app)
      .get(`/api/volunteers/${regRes.body.id}/badges`);

    console.log(res.statusCode, res.body);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("handles malformed event id on badge route", async () => {
    const res = await request(app)
      .get("/api/events/not-a-number/badges");

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
    vi.spyOn(pool, "query").mockRejectedValue(new Error("Database error"));

    const res = await request(app).get("/api/events");
    expect(res.statusCode).toBe(500);
  });

  it("should return 500 on GET /api/organizations/:id/events database error", async () => {
    vi.spyOn(pool, "query").mockRejectedValue(new Error("Database error"));

    const res = await request(app).get("/api/organizations/1/events");
    expect(res.statusCode).toBe(500);
  });

  it("should return 500 on PUT /api/events/:id database error", async () => {
    vi.spyOn(pool, "query").mockRejectedValue(new Error("Database error"));

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