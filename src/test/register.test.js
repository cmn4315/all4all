import request from "supertest";
import { describe, it, expect } from "vitest";
import { setTimeout } from 'node:timers/promises';
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
 * Tests endpoint for registering volunteers from events
 * /api/events/:id/register
 */
describe("Volunteer event register", () => {
  it("should register a volunteer for an event", async () => {
    const unique = Date.now();

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
        name: "Unregister Test Event",
        description: "Testing unregister",
        start_time: "2026-04-05T10:00:00Z",
        end_time: "2026-04-05T12:00:00Z",
        address: "100 Main St",
        city: "Rochester",
        state: "NY",
        zip_code: "14623"
      });

    expect(eventRes.statusCode).toBe(200);

    // Publish event
    await request(app)
      .put(`/api/events/${eventRes.body.id}/publish`);

    // Register volunteer
    const regRes = await request(app)
      .post(`/api/events/${eventRes.body.id}/register`)
      .send({
        volunteer_id: volunteerRes.body.id
      });

    expect(regRes.statusCode).toBe(200);
  });

  it("should fail when the event is unpublished", async () => {
    await setTimeout(1);
    const unique = Date.now();

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
        name: "Unregister Test Event",
        description: "Testing unregister",
        start_time: "2026-04-05T10:00:00Z",
        end_time: "2026-04-05T12:00:00Z",
        address: "100 Main St",
        city: "Rochester",
        state: "NY",
        zip_code: "14623"
      });

    expect(eventRes.statusCode).toBe(200);

    // Register volunteer
    const regRes = await request(app)
      .post(`/api/events/${eventRes.body.id}/register`)
      .send({
        volunteer_id: volunteerRes.body.id
      });

    expect(regRes.statusCode).toBe(400);
  });

  it("should fail when no such event exists", async () => {
    // delay to (possibly) fix an error i got
    await setTimeout(1);
    const unique = Date.now();

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

    // Register volunteer
    const regRes = await request(app)
      .post(`/api/events/99999/register`)
      .send({
        volunteer_id: volunteerRes.body.id
      });

    expect(regRes.statusCode).toBe(404);
  });
});

/**
 * Tests endpoint for unregistering volunteers from events
 * /api/events/:id/register
 */
describe("Volunteer unregister", () => {
  it("should unregister a volunteer from an event", async () => {
    await setTimeout(1);
    const unique = Date.now();

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
        name: "Unregister Test Event",
        description: "Testing unregister",
        start_time: "2026-04-05T10:00:00Z",
        end_time: "2026-04-05T12:00:00Z",
        address: "100 Main St",
        city: "Rochester",
        state: "NY",
        zip_code: "14623"
      });

    expect(eventRes.statusCode).toBe(200);

    // Publish event
    await request(app)
      .put(`/api/events/${eventRes.body.id}/publish`);

    // Register volunteer
    await request(app)
      .post(`/api/events/${eventRes.body.id}/register`)
      .send({
        volunteer_id: volunteerRes.body.id
      });

    // Unregister volunteer
    const unregisterRes = await request(app)
      .delete(`/api/events/${eventRes.body.id}/register`)
      .send({
        volunteer_id: volunteerRes.body.id
      });

    console.log("Unregister:", unregisterRes.statusCode, unregisterRes.body);

    expect(unregisterRes.statusCode).toBe(200);
    expect(unregisterRes.body).toHaveProperty("success", true);
  });

  it("should return 404 when unregistering nonexistent registration", async () => {
    const res = await request(app)
      .delete("/api/events/999999/register")
      .send({
        volunteer_id: 999999
      });

    console.log("Unregister fail:", res.statusCode, res.body);

    expect(res.statusCode).toBe(404);
  });
});

/**
 * Tests endpoint for counting registered volunteers from events
 * /api/events/:id/count
 */
describe("Event Headcount", () => {
  it("should return 1 when a volunteer is registered for an event", async () => {
    await setTimeout(1);
    const unique = Date.now();

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
        name: "Unregister Test Event",
        description: "Testing unregister",
        start_time: "2026-04-05T10:00:00Z",
        end_time: "2026-04-05T12:00:00Z",
        address: "100 Main St",
        city: "Rochester",
        state: "NY",
        zip_code: "14623"
      });

    expect(eventRes.statusCode).toBe(200);

    // Publish event
    await request(app)
      .put(`/api/events/${eventRes.body.id}/publish`);

    // Register volunteer
    const regRes = await request(app)
      .post(`/api/events/${eventRes.body.id}/register`)
      .send({
        volunteer_id: volunteerRes.body.id
      });

    expect(regRes.statusCode).toBe(200);

    const countRes = await request(app)
      .get(`/api/events/${eventRes.body.id}/count`);

    expect(countRes.statusCode).toBe(200);
    expect(countRes.body).toHaveProperty("count");
    expect(countRes.body.count).toBe(1);
  });

  it("should return 0 when no volunteer is registered for an event", async () => {
    await setTimeout(1);
    const unique = Date.now();

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
        name: "Unregister Test Event",
        description: "Testing unregister",
        start_time: "2026-04-05T10:00:00Z",
        end_time: "2026-04-05T12:00:00Z",
        address: "100 Main St",
        city: "Rochester",
        state: "NY",
        zip_code: "14623"
      });

    expect(eventRes.statusCode).toBe(200);

    // Publish event
    await request(app)
      .put(`/api/events/${eventRes.body.id}/publish`);

    const countRes = await request(app)
      .get(`/api/events/${eventRes.body.id}/count`);

    expect(countRes.statusCode).toBe(200);
    expect(countRes.body).toHaveProperty("count");
    expect(countRes.body.count).toBe(0);
  });

  it("should return 0 when no volunteer is registered for an event", async () => {
    await setTimeout(1);
    const unique = Date.now();

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
        name: "Unregister Test Event",
        description: "Testing unregister",
        start_time: "2026-04-05T10:00:00Z",
        end_time: "2026-04-05T12:00:00Z",
        address: "100 Main St",
        city: "Rochester",
        state: "NY",
        zip_code: "14623"
      });

    expect(eventRes.statusCode).toBe(200);

    // Publish event
    await request(app)
      .put(`/api/events/${eventRes.body.id}/publish`);

    const countRes = await request(app)
      .get(`/api/events/${eventRes.body.id}/count`);

    expect(countRes.statusCode).toBe(200);
    expect(countRes.body).toHaveProperty("count");
    expect(countRes.body.count).toBe(0);
  });

  it("should return 0 when unpublished", async () => {
    await setTimeout(1);
    const unique = Date.now();

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
        name: "Unregister Test Event",
        description: "Testing unregister",
        start_time: "2026-04-05T10:00:00Z",
        end_time: "2026-04-05T12:00:00Z",
        address: "100 Main St",
        city: "Rochester",
        state: "NY",
        zip_code: "14623"
      });

    expect(eventRes.statusCode).toBe(200);

    const countRes = await request(app)
      .get(`/api/events/${eventRes.body.id}/count`);

    expect(countRes.statusCode).toBe(200);
    expect(countRes.body).toHaveProperty("count");
    expect(countRes.body.count).toBe(0);
  });
});

/**
 * Tests endpoint for login api
 * /api/login
 * Requires docker container of SQL database for tests to run (docker compose up)
 */
describe("Login", () => {
  /**
   * Successful login of a registered volunteer
   * Given a successfully created volunteer account, login succeeds and returns the correct data
   */
  it("should login a registered volunteer", async () => {
    // The following is borrowed from the volunteer registration test, to create a volunteer for login
    // Would be better to use a fixture, but I don't know how to do that with vitest :)

    await setTimeout(1);
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
    console.log("Account Creation repsonse:", res.statusCode, res.body);

    const new_res = await request(app).post("/api/login").send({
      username: uniqueUsername,
      password: "pass123"
    });

    console.log("Login Response:", new_res.statusCode, new_res.body);
    expect(new_res.statusCode).toBe(200);
    expect(new_res.body).toHaveProperty("token");
    expect(new_res.body).toHaveProperty("user");
  });

  /**
   * Successful volunteer registration with all required arguments
   * Username and email must be unique, all other fields have no such validation
   * Successfull volunteer registration returns the generated record id
   */
  it("should return 401 when credentials are incorrect", async () => {
    //Uses Date.now() to ensure that email and username are always unique
    await setTimeout(1);
    const uniqueUsername = `test${Date.now()}`;

    const new_res = await request(app).post("/api/login").send({
      username: uniqueUsername,
      password: "pass123"
    });

    console.log("Login Response:", new_res.statusCode, new_res.text);

    expect(new_res.statusCode).toBe(401);
    expect(new_res.text).toBe("Invalid username or password.")
  });
});


/**
 * Tests endpoint for orgCategories
 * /api/orgCategories
 * Requires docker container of SQL database for tests to run (docker compose up)
 */
describe("orgCategories", () => {
  /**
   * /api/orgCategories returns a list of the correct length
   */
  it("should return the correct categories", async () => {

    //Send all required registration arguments in a post request and await response
    const res = await request(app)
      .get("/api/orgCategories");

    //Log status and response contents for debugging
    console.log("OrgCategories repsonse:", res.statusCode, res.body);

    expect(res.statusCode).toBe(200);

    // TODO: Not sure if this is the best thing to test -- if we add any more categories, test will need to change
    expect(res.body).toHaveProperty("length");
    expect(res.body.length).toBe(12);
  });
});
