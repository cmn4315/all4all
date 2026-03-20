import request from "supertest";
import { describe, it, expect } from "vitest";
import app from "../backend/server";

/**
 * Tests endpoint for email validation
 * Ensures unique email addresses
 * /api/checkEmail
 * Requires docker container of SQL database for tests to run (docker compose up)
 */
describe("CheckEmail tests", () => {
  it("should return email availability", async () => {
    const res = await request(app).get("/api/checkEmail?email=test@test.com");

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("available");
  });

  it("should return 400 saying email is required", async () => {
    const res = await request(app).get("/api/checkEmail");

    expect(res.statusCode).toBe(400);
  });
});

/**
 * Tests endpoint for registration of new volunteer accounts
 * /api/registerVolunteer
 * Requires docker container of SQL database for tests to run (docker compose up)
 */
describe("Volunteer registration", () => {
  /**
   * Successful volunteer registration with all required arguments
   * Username and email must be unique, all other fields have no such validation
   * Successfull volunteer registration returns the generated record id
   */
  it("should register a volunteer", async () => {
    //Uses Date.now() to ensure that email and username are always unique
    const uniqueEmail = `test${Date.now()}@test.com`;
    const uniqueUsername = `test${Date.now()}`;

    //Send all required registration arguments in a post request and await response
    const res = await request(app)
      .post("/api/registerVolunteer")
      .send({
        username: uniqueUsername,
        email: uniqueEmail,
        password: "pass123",
        firstName: "Jane",
        lastName: "Doe",
        phone: "555-1234"
      });

    //Log status and response contents for debugging
    console.log(res.statusCode, res.body);

    //Should return a success code and the record id that was created
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("id");
  });
});

/**
 * Tests endpoint for creating events
 * /api/events
 * Creates a test organization first
 */
describe("Event creation", () => {
  it("should create an event in DRAFT status", async () => {
    const unique = Date.now();

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
    const unique = Date.now();

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