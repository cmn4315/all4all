// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import supertest from "supertest";

// Mock the database module before importing the app
vi.mock("../__mocks__/db.js");
import { pool } from "../../__mocks__/db.js";
import app from "../backend/server.js";

const request = supertest(app);

// Reset all mocks between tests so they don't bleed into each other
beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Helper: mock a pool.connect() client ─────────────────────────────────────
function mockClient(...queryResults) {
  const client = { query: vi.fn(), release: vi.fn() };
  queryResults.forEach(result => client.query.mockResolvedValueOnce(result));
  pool.connect.mockResolvedValueOnce(client);
  return client;
}

// ─── Auth & Registration ──────────────────────────────────────────────────────

describe("POST /api/registerVolunteer", () => {
  it("creates a new volunteer successfully", async () => {
    const client = mockClient(
      { rows: [] },                        // BEGIN
      { rows: [{ id: 1 }] },              // INSERT into users
      { rows: [{ id: 10 }] },             // INSERT into volunteers
      { rows: [] }                         // COMMIT
    );

    const res = await request.post("/api/registerVolunteer").send({
      username: "janedoe",
      email: "jane@test.com",
      password: "password123",
      firstName: "Jane",
      lastName: "Doe",
      phone: "5855550001",
    });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("id", 10);
    expect(client.release).toHaveBeenCalled();
  });

  it("returns 400 when required fields are missing", async () => {
    const res = await request.post("/api/registerVolunteer").send({
      email: "missing@test.com",
      password: "password123",
    });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error", "Missing required fields");
  });

  it("returns 409 when username/email already exists", async () => {
    const client = mockClient({ rows: [] }); // BEGIN
    client.query.mockRejectedValueOnce({ code: "23505" }); // duplicate key

    const res = await request.post("/api/registerVolunteer").send({
      username: "janedoe",
      email: "jane@test.com",
      password: "password123",
      firstName: "Jane",
      lastName: "Doe",
      phone: "5855550001",
    });

    expect(res.status).toBe(409);
    expect(res.body).toHaveProperty("error", "User already exists");
  });
});

describe("POST /api/registerOrg", () => {
  it("creates a new organization successfully", async () => {
    const client = mockClient(
      { rows: [] },                        // BEGIN
      { rows: [{ id: 2 }] },              // INSERT into users
      { rows: [{ id: 20 }] },             // INSERT into organizations
      { rows: [] }                         // COMMIT
    );

    const res = await request.post("/api/registerOrg").send({
      username: "testorg",
      name: "Test Org",
      email: "org@test.com",
      phone: "5855550002",
      description: "A great org",
      password: "password123",
      category_id: 1,
      zip_code: "14604",
      address: "123 Main St",
      brand_colors: ["#15803d"],
    });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("id", 20);
    expect(client.release).toHaveBeenCalled();
  });

  it("returns 409 when org email already exists", async () => {
    const client = mockClient({ rows: [] }); // BEGIN
    client.query.mockRejectedValueOnce({ code: "23505" });

    const res = await request.post("/api/registerOrg").send({
      username: "testorg",
      name: "Test Org",
      email: "org@test.com",
      password: "password123",
      category_id: 1,
      zip_code: "14604",
    });

    expect(res.status).toBe(409);
    expect(res.body).toHaveProperty("error", "Email already exists");
  });
});

describe("POST /api/login", () => {
  it("returns 401 when user is not found", async () => {
    pool.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });

    const res = await request.post("/api/login").send({
      username: "nobody",
      password: "password123",
    });

    expect(res.status).toBe(401);
  });

  it("returns 401 when password is wrong", async () => {
    // bcrypt.compare will return false for a non-matching hash
    pool.query.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ id: 1, email: "jane@test.com", password_hash: "badhash", role: "VOLUNTEER" }],
    });

    const res = await request.post("/api/login").send({
      username: "janedoe",
      password: "wrongpassword",
    });

    expect(res.status).toBe(401);
  });
});

describe("GET /api/checkEmail", () => {
  it("returns available: true for an unused email", async () => {
    pool.query.mockResolvedValueOnce({ rowCount: 0 });

    const res = await request.get("/api/checkEmail").query({ email: "new@test.com" });
    expect(res.status).toBe(200);
    expect(res.body.available).toBe(true);
  });

  it("returns available: false for a taken email", async () => {
    pool.query.mockResolvedValueOnce({ rowCount: 1 });

    const res = await request.get("/api/checkEmail").query({ email: "taken@test.com" });
    expect(res.status).toBe(200);
    expect(res.body.available).toBe(false);
  });

  it("returns 400 when email param is missing", async () => {
    const res = await request.get("/api/checkEmail");
    expect(res.status).toBe(400);
  });
});

// ─── Events ───────────────────────────────────────────────────────────────────

describe("GET /api/events", () => {
  it("returns an array of published events", async () => {
    pool.query.mockResolvedValueOnce({
      rows: [
        { id: 1, name: "Cleanup Day", status: "PUBLISHED", tags: [], organization_name: "Test Org" },
        { id: 2, name: "Food Drive",  status: "PUBLISHED", tags: [], organization_name: "Food Org" },
      ],
    });

    const res = await request.get("/api/events");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].name).toBe("Cleanup Day");
  });

  it("returns an empty array when no events are published", async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request.get("/api/events");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe("POST /api/events", () => {
  it("creates a new draft event", async () => {
    const client = mockClient({ rows: [{ id: 42 }] });

    const res = await request.post("/api/events").send({
      organization_id: 1,
      name: "Test Cleanup Day",
      description: "A test event",
      start_time: "2026-06-01T09:00:00",
      end_time: "2026-06-01T12:00:00",
      address: "123 Main St",
      city: "Rochester",
      state: "NY",
      zip_code: "14604",
      color: "#15803d",
    });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("id", 42);
    expect(client.release).toHaveBeenCalled();
  });

  it("returns 400 when required fields are missing", async () => {
    const res = await request.post("/api/events").send({ name: "Incomplete Event" });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error", "Missing required fields");
  });
});

describe("PUT /api/events/:id", () => {
  it("updates an existing event", async () => {
    pool.query.mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 1 }] });

    const res = await request.put("/api/events/1").send({
      name: "Updated Event",
      description: "Updated description",
      start_time: "2026-06-01T09:00:00",
      end_time: "2026-06-01T12:00:00",
      address: "456 Oak Ave",
      city: "Rochester",
      state: "NY",
      zip_code: "14604",
      color: "#1d4ed8",
      recurrence: "weekly",
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("returns 404 when event is not found", async () => {
    pool.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });

    const res = await request.put("/api/events/999").send({
      name: "Ghost Event",
      description: "Doesn't exist",
      start_time: "2026-06-01T09:00:00",
      end_time: "2026-06-01T12:00:00",
      zip_code: "14604",
    });

    expect(res.status).toBe(404);
  });
});

describe("PUT /api/events/:id/publish", () => {
  it("publishes a draft event", async () => {
    pool.query.mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 1 }] });

    const res = await request.put("/api/events/1/publish");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("returns 404 when event is not found", async () => {
    pool.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });

    const res = await request.put("/api/events/999/publish");
    expect(res.status).toBe(404);
  });
});

describe("PUT /api/events/:id/cancel", () => {
  it("cancels an event", async () => {
    pool.query.mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 1 }] });

    const res = await request.put("/api/events/1/cancel");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("returns 404 when event is not found", async () => {
    pool.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });

    const res = await request.put("/api/events/999/cancel");
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/events/:id", () => {
  it("deletes an event", async () => {
    pool.query.mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 1 }] });

    const res = await request.delete("/api/events/1");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("returns 404 when event is not found", async () => {
    pool.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });

    const res = await request.delete("/api/events/999");
    expect(res.status).toBe(404);
  });
});

// ─── Event Registrations ──────────────────────────────────────────────────────

describe("POST /api/events/:id/register", () => {
  it("registers a volunteer for a published event", async () => {
    pool.query
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ status: "PUBLISHED" }] }) // event check
      .mockResolvedValueOnce({ rows: [] });                                     // INSERT

    const res = await request.post("/api/events/1/register").send({ volunteer_id: 10 });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("returns 400 when event is not published", async () => {
    pool.query.mockResolvedValueOnce({ rowCount: 1, rows: [{ status: "DRAFT" }] });

    const res = await request.post("/api/events/1/register").send({ volunteer_id: 10 });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error", "Event is not open for registration");
  });

  it("returns 404 when event does not exist", async () => {
    pool.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });

    const res = await request.post("/api/events/999/register").send({ volunteer_id: 10 });
    expect(res.status).toBe(404);
  });

  it("returns 409 when volunteer is already registered", async () => {
    pool.query
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ status: "PUBLISHED" }] })
      .mockRejectedValueOnce({ code: "23505" });

    const res = await request.post("/api/events/1/register").send({ volunteer_id: 10 });
    expect(res.status).toBe(409);
    expect(res.body).toHaveProperty("error", "Volunteer already registered");
  });
});

describe("DELETE /api/events/:id/register", () => {
  it("unregisters a volunteer from an event", async () => {
    pool.query.mockResolvedValueOnce({ rowCount: 1 });

    const res = await request.delete("/api/events/1/register").send({ volunteer_id: 10 });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("returns 404 when registration does not exist", async () => {
    pool.query.mockResolvedValueOnce({ rowCount: 0 });

    const res = await request.delete("/api/events/1/register").send({ volunteer_id: 999 });
    expect(res.status).toBe(404);
  });
});

describe("GET /api/events/:id/registrations", () => {
  it("returns list of registrants for an event", async () => {
    pool.query.mockResolvedValueOnce({
      rows: [
        { volunteer_id: 10, full_name: "Jane Doe", email: "jane@test.com", attended: false },
      ],
    });

    const res = await request.get("/api/events/1/registrations");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].full_name).toBe("Jane Doe");
  });
});

describe("GET /api/events/:id/registrations/count", () => {
  it("returns a numeric total count", async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ total: "5" }] });

    const res = await request.get("/api/events/1/registrations/count");
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(5);
  });
});

describe("POST /api/events/:id/checkin", () => {
  it("checks in a volunteer", async () => {
    const client = mockClient({ rows: [] });

    const res = await request.post("/api/events/1/checkin").send({
      volunteer_id: 10,
      time_in: "2026-06-01T09:05:00",
      time_out: null,
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(client.release).toHaveBeenCalled();
  });
});

// ─── Event Roles ──────────────────────────────────────────────────────────────

describe("POST /api/events/:id/roles", () => {
  it("saves roles for an event", async () => {
    const client = mockClient(
      { rows: [] }, // DELETE existing
      { rows: [] }, // INSERT role 1
      { rows: [] }  // INSERT role 2
    );

    const res = await request.post("/api/events/1/roles").send({
      roles: [
        { name: "Trail Cleaner", spots: 5 },
        { name: "Team Lead",     spots: 2 },
      ],
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(client.release).toHaveBeenCalled();
  });
});

describe("GET /api/events/:id/roles", () => {
  it("returns roles with filled spot counts", async () => {
    pool.query.mockResolvedValueOnce({
      rows: [
        { id: 1, name: "Trail Cleaner", spots: 5, filled: "2" },
        { id: 2, name: "Team Lead",     spots: 2, filled: "0" },
      ],
    });

    const res = await request.get("/api/events/1/roles");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0]).toHaveProperty("name", "Trail Cleaner");
    expect(res.body[0]).toHaveProperty("filled");
  });
});

describe("POST /api/roles/:id/register", () => {
  it("registers a volunteer for a role with available spots", async () => {
    const client = mockClient(
      { rows: [{ spots: 5, filled: "2" }] }, // spot check
      { rows: [] }                            // INSERT
    );

    const res = await request.post("/api/roles/1/register").send({ volunteer_id: 10 });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(client.release).toHaveBeenCalled();
  });

  it("returns 400 when no spots are available", async () => {
    mockClient({ rows: [{ spots: 2, filled: "2" }] }); // all spots full

    const res = await request.post("/api/roles/1/register").send({ volunteer_id: 10 });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error", "No spots available");
  });

  it("returns 404 when role does not exist", async () => {
    mockClient({ rows: [] }); // no role found

    const res = await request.post("/api/roles/999/register").send({ volunteer_id: 10 });
    expect(res.status).toBe(404);
  });

  it("returns 409 when volunteer is already registered for role", async () => {
    const client = mockClient({ rows: [{ spots: 5, filled: "1" }] }); // spot check passes
    client.query.mockRejectedValueOnce({ code: "23505" });

    const res = await request.post("/api/roles/1/register").send({ volunteer_id: 10 });
    expect(res.status).toBe(409);
  });
});

describe("DELETE /api/roles/:id/register", () => {
  it("unregisters a volunteer from a role", async () => {
    pool.query.mockResolvedValueOnce({ rowCount: 1 });

    const res = await request.delete("/api/roles/1/register").send({ volunteer_id: 10 });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("returns 404 when registration does not exist", async () => {
    pool.query.mockResolvedValueOnce({ rowCount: 0 });

    const res = await request.delete("/api/roles/1/register").send({ volunteer_id: 999 });
    expect(res.status).toBe(404);
  });
});

describe("GET /api/roles/:id/volunteers", () => {
  it("returns volunteers signed up for a role", async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 10, full_name: "Jane Doe", email: "jane@test.com" }],
    });

    const res = await request.get("/api/roles/1/volunteers");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].full_name).toBe("Jane Doe");
  });
});

// ─── Event Tags & Badges ──────────────────────────────────────────────────────

describe("POST /api/events/:id/tags", () => {
  it("saves tags for an event", async () => {
    const client = mockClient(
      { rows: [] },               // DELETE existing links
      { rows: [{ id: 1 }] },     // SELECT category id
      { rows: [] }                // INSERT link
    );

    const res = await request.post("/api/events/1/tags").send({ tags: ["Environment"] });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(client.release).toHaveBeenCalled();
  });
});

describe("GET /api/events/:id/tags", () => {
  it("returns tags linked to an event", async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 1, name: "Environment" }],
    });

    const res = await request.get("/api/events/1/tags");
    expect(res.status).toBe(200);
    expect(res.body[0].name).toBe("Environment");
  });
});

describe("GET /api/badges", () => {
  it("returns all badges", async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 1, name: "Top Volunteer", description: "Best volunteer", image_url: null }],
    });

    const res = await request.get("/api/badges");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].name).toBe("Top Volunteer");
  });
});

describe("POST /api/events/:id/badges", () => {
  it("assigns badges to an event", async () => {
    const client = mockClient(
      { rows: [] }, // DELETE existing
      { rows: [] }, // INSERT badge 1
      { rows: [] }  // INSERT badge 2
    );

    const res = await request.post("/api/events/1/badges").send({ badge_ids: [1, 2] });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(client.release).toHaveBeenCalled();
  });
});

describe("GET /api/events/:id/badges", () => {
  it("returns badges linked to an event", async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 1, name: "Top Volunteer", description: "Best", image_url: null }],
    });

    const res = await request.get("/api/events/1/badges");
    expect(res.status).toBe(200);
    expect(res.body[0].name).toBe("Top Volunteer");
  });
});

// ─── Volunteer Routes ─────────────────────────────────────────────────────────

describe("GET /api/volunteers/:id", () => {
  it("returns volunteer profile", async () => {
    pool.query.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ id: 10, full_name: "Jane Doe", email: "jane@test.com", phone_number: "5855550001" }],
    });

    const res = await request.get("/api/volunteers/1");
    expect(res.status).toBe(200);
    expect(res.body.full_name).toBe("Jane Doe");
  });

  it("returns 404 when volunteer is not found", async () => {
    pool.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });

    const res = await request.get("/api/volunteers/999");
    expect(res.status).toBe(404);
  });
});

describe("GET /api/volunteers/:id/badges", () => {
  it("returns badges earned by a volunteer", async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ name: "Top Volunteer", description: "Best", image_url: null, earned_at: "2026-01-01" }],
    });

    const res = await request.get("/api/volunteers/10/badges");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].name).toBe("Top Volunteer");
  });
});

describe("POST /api/volunteers/:id/badges", () => {
  it("awards a badge to a volunteer", async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request.post("/api/volunteers/10/badges").send({ badge_id: 1 });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe("GET /api/volunteers/:id/registrations", () => {
  it("returns events a volunteer is registered for", async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 1, name: "Cleanup Day", status: "PUBLISHED" }],
    });

    const res = await request.get("/api/volunteers/1/registrations");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe("GET /api/volunteers/:id/past-events", () => {
  it("returns past events for a volunteer", async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 1, name: "Old Cleanup", attended: true }],
    });

    const res = await request.get("/api/volunteers/1/past-events");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe("GET /api/volunteers/:id/service-hours", () => {
  it("returns service hour records for a volunteer", async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ event_id: 1, event_name: "Cleanup Day", hours: 3.0, attended: true }],
    });

    const res = await request.get("/api/volunteers/1/service-hours");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0]).toHaveProperty("hours");
  });
});

describe("GET /api/volunteers/zip_code", () => {
  it("returns zip code for a volunteer", async () => {
    pool.query.mockResolvedValueOnce({ rowCount: 1, rows: [{ zip_code: "14604" }] });

    const res = await request.get("/api/volunteers/zip_code").query({ user_id: 1 });
    expect(res.status).toBe(200);
    expect(res.body.zip_code).toBe("14604");
  });

  it("returns 400 when user_id is missing", async () => {
    const res = await request.get("/api/volunteers/zip_code");
    expect(res.status).toBe(400);
  });

  it("returns 404 when volunteer is not found", async () => {
    pool.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });

    const res = await request.get("/api/volunteers/zip_code").query({ user_id: 999 });
    expect(res.status).toBe(404);
  });
});

describe("PUT /api/volunteers/profile", () => {
  it("updates a volunteer profile", async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request.put("/api/volunteers/profile").send({
      user_id: 1,
      firstName: "Jane",
      lastName: "Updated",
      zip_code: "14620",
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe("GET /api/events/:id/volunteer-role/:volunteerId", () => {
  it("returns the role_id for a volunteer in an event", async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ role_id: 3 }] });

    const res = await request.get("/api/events/1/volunteer-role/10");
    expect(res.status).toBe(200);
    expect(res.body.role_id).toBe(3);
  });

  it("returns null role_id when volunteer has no role", async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request.get("/api/events/1/volunteer-role/10");
    expect(res.status).toBe(200);
    expect(res.body.role_id).toBeNull();
  });
});

// ─── Organization Routes ──────────────────────────────────────────────────────

describe("GET /api/organizations/:id", () => {
  it("returns an organization by id", async () => {
    pool.query.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ id: 20, name: "Test Org", description: "A great org" }],
    });

    const res = await request.get("/api/organizations/20");
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Test Org");
  });

  it("returns 404 when organization is not found", async () => {
    pool.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });

    const res = await request.get("/api/organizations/999");
    expect(res.status).toBe(404);
  });
});

describe("GET /api/organizations/by-user/:userId", () => {
  it("returns organization for a valid user", async () => {
    pool.query.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ id: 20, name: "Test Org" }],
    });

    const res = await request.get("/api/organizations/by-user/2");
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Test Org");
  });

  it("returns 404 when no org is found for user", async () => {
    pool.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });

    const res = await request.get("/api/organizations/by-user/999");
    expect(res.status).toBe(404);
  });
});

describe("GET /api/organizations/:id/events", () => {
  it("returns all events for an organization", async () => {
    pool.query.mockResolvedValueOnce({
      rows: [
        { id: 1, name: "Cleanup Day", status: "DRAFT",     tags: [] },
        { id: 2, name: "Food Drive",  status: "PUBLISHED", tags: [] },
      ],
    });

    const res = await request.get("/api/organizations/20/events");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  it("returns only published events when publishedOnly=true", async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 2, name: "Food Drive", status: "PUBLISHED", tags: [] }],
    });

    const res = await request.get("/api/organizations/20/events").query({ publishedOnly: "true" });
    expect(res.status).toBe(200);
    for (const ev of res.body) {
      expect(ev.status).toBe("PUBLISHED");
    }
  });
});

describe("GET /api/organizations/:id/event-stats", () => {
  it("returns event stats with volunteer counts and hours", async () => {
    pool.query.mockResolvedValueOnce({
      rows: [
        { id: 1, name: "Cleanup Day", volunteer_count: "5", total_hours: "12.5", status: "PUBLISHED" },
      ],
    });

    const res = await request.get("/api/organizations/20/event-stats");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0]).toHaveProperty("volunteer_count");
    expect(res.body[0]).toHaveProperty("total_hours");
  });
});

describe("GET /api/organizations/zip_code", () => {
  it("returns zip code for an organization", async () => {
    pool.query.mockResolvedValueOnce({ rowCount: 1, rows: [{ zip_code: "14604" }] });

    const res = await request.get("/api/organizations/zip_code").query({ user_id: 2 });
    expect(res.status).toBe(200);
    expect(res.body.zip_code).toBe("14604");
  });

  it("returns 400 when user_id is missing", async () => {
    const res = await request.get("/api/organizations/zip_code");
    expect(res.status).toBe(400);
  });

  it("returns 404 when org is not found", async () => {
    pool.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });

    const res = await request.get("/api/organizations/zip_code").query({ user_id: 999 });
    expect(res.status).toBe(404);
  });
});

describe("PUT /api/organizations/profile", () => {
  it("updates an organization profile", async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request.put("/api/organizations/profile").send({
      user_id: 2,
      name: "Updated Org",
      address: "789 Elm St",
      zip_code: "14604",
      motto: "Helping the community",
      brand_colors: ["#15803d"],
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ─── Misc / Lookup Routes ─────────────────────────────────────────────────────

describe("GET /api/orgCategories", () => {
  it("returns all org categories", async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 1, name: "Environment" }, { id: 2, name: "Food" }],
    });

    const res = await request.get("/api/orgCategories");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].name).toBe("Environment");
  });
});

describe("GET /api/eventCategories", () => {
  it("returns all event categories", async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 1, name: "Cleanup" }, { id: 2, name: "Tutoring" }],
    });

    const res = await request.get("/api/eventCategories");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe("GET /api/full_name", () => {
  it("returns full name for a volunteer user", async () => {
    pool.query.mockResolvedValueOnce({ rowCount: 1, rows: [{ full_name: "Jane Doe" }] });

    const res = await request.get("/api/full_name").query({ user_id: 1 });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Jane Doe");
  });

  it("returns name for an org user when volunteer lookup fails", async () => {
    pool.query
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })                       // no volunteer
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ name: "Test Org" }] }); // org hit

    const res = await request.get("/api/full_name").query({ user_id: 2 });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Test Org");
  });

  it("returns 404 when user is not found", async () => {
    pool.query
      .mockResolvedValueOnce({ rowCount: 0, rows: [] }) // no volunteer
      .mockResolvedValueOnce({ rowCount: 0, rows: [] }); // no org

    const res = await request.get("/api/full_name").query({ user_id: 999 });
    expect(res.status).toBe(404);
  });
});

describe("GET /api/phone", () => {
  it("returns phone number for a valid user", async () => {
    pool.query.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ phone_number: "5855550001" }],
    });

    const res = await request.get("/api/phone").query({ user_id: 1 });
    expect(res.status).toBe(200);
    expect(res.body.phone).toBe("5855550001");
  });

  it("returns 404 when user is not found", async () => {
    pool.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });

    const res = await request.get("/api/phone").query({ user_id: 999 });
    expect(res.status).toBe(404);
  });
});