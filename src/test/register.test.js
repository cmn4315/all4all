import request from "supertest";
import { describe, it, expect } from "vitest";
import app from "../backend/server";
import { randomUUID } from "crypto";
import { vi, afterEach, beforeEach } from "vitest";
import { pool } from "../backend/db.js";
import fs from "fs";
import path from "path";
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
    const unique = randomUUID();
    const uniqueEmail = `test${unique}@test.com`;
    const uniqueUsername = `test${unique}`;

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

  it("should fail to register a volunteer", async () => {
    const unique = randomUUID();
    const uniqueUsername = `test${unique}`;

    //Send all required registration arguments in a post request and await response
    const res = await request(app)
      .post("/api/registerVolunteer")
      .send({
        username: uniqueUsername,
        password: "pass123",
        firstName: "Jane",
        lastName: "Doe",
      });

    //Log status and response contents for debugging
    console.log(res.statusCode, res.body);

    //Should return a success code and the record id that was created
    expect(res.statusCode).toBe(400);
  });

  it("should block registering a duplicate volunteer", async () => {
    const unique = randomUUID();
    const uniqueEmail = `test${unique}@test.com`;
    const uniqueUsername = `test${unique}`;

    //Send all required registration arguments in a post request and await response
    let res = await request(app)
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

    //Send all required registration arguments in a post request and await response
    res = await request(app)
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
    expect(res.statusCode).toBe(409);
  });
});

describe("Organization registration", () => {
  it("should register an organization user", async () => {
    const unique = randomUUID();
    const uniqueEmail = `test${unique}@test.com`;
    const uniqueUsername = `test${unique}`;

    //Send all required registration arguments in a post request and await response
    const res = await request(app)
      .post("/api/registerOrg")
      .send({
        name: uniqueUsername,
        email: uniqueEmail,
        password: "pass123",
        category_id: 1,
        zip_code: 14623,
        description: "description",
        phone: "555-1234"
      });

    //Log status and response contents for debugging
    console.log(res.statusCode, res.body);

    //Should return a success code and the record id that was created
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("id");
  });

  it("should create a database error", async () => {
    const unique = randomUUID();
    const uniqueEmail = `test${unique}@test.com`;
    const uniqueUsername = `test${unique}`;

    //Send all required registration arguments in a post request and await response
    const res = await request(app)
      .post("/api/registerOrg")
      .send({
        username: uniqueUsername,
        email: uniqueEmail,
        password: "pass123",
        category_id: 1,
        zip_code: 14623,
        description: "description",
        phone: "555-1234"
      });

    //Log status and response contents for debugging
    console.log(res.statusCode, res.body);

    //Should return a success code and the record id that was created
    expect(res.statusCode).toBe(500);
  });

  it("should fail to register user with used email", async () => {
    const unique = randomUUID();
    const uniqueEmail = `test${unique}@test.com`;
    const uniqueUsername = `test${unique}`;

    //Send all required registration arguments in a post request and await response
    let res = await request(app)
      .post("/api/registerOrg")
      .send({
        name: uniqueUsername,
        email: uniqueEmail,
        password: "pass123",
        category_id: 1,
        zip_code: 14623,
        description: "description",
        phone: "555-1234"
      });

    //Log status and response contents for debugging
    console.log(res.statusCode, res.body);

    res = await request(app)
      .post("/api/registerOrg")
      .send({
        name: uniqueUsername,
        email: uniqueEmail,
        password: "pass123",
        category_id: 1,
        zip_code: 14623,
        description: "description",
        phone: "555-1234"
      });

    expect(res.statusCode).toBe(409);
  });
});

/**
 * Tests endpoint for registering volunteers from events
 * /api/events/:id/register
 */
describe("Volunteer event register", () => {
  it("should register a volunteer for an event", async () => {
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

    const unique = randomUUID();
    const uniqueEmail = `test${unique}@test.com`;
    const uniqueUsername = `test${unique}`;

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
    const unique = randomUUID();
    const uniqueUsername = `test${unique}`;

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

describe("upload_image", () => {
  const testFilePath = path.join(__dirname, "test-image.jpg");

  beforeEach(() => {
    // create dummy file
    fs.writeFileSync(testFilePath, "fake image");
  });

  afterEach(() => {
    // cleanup uploaded files
    if (fs.existsSync("./uploads")) {
      fs.rmSync("./uploads", { recursive: true, force: true });
    }

    // cleanup temp file
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
  });

  it("uploads user image successfully", async () => {

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
      .post("/api/upload_image")
      .field("uploadType", "user")
      .field("userId", regRes.body.user_id)
      .attach("file", testFilePath);

    expect(res.status).toBe(200);
    expect(res.text).toMatch(/uploaded/i);

    const uploadPath = `./uploads/user/${regRes.body.user_id}`;
    expect(fs.existsSync(uploadPath)).toBe(true);

    const files = fs.readdirSync(uploadPath);
    expect(files.length).toBe(1);
  });

  it("uploads badge image successfully", async () => {
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

    const badgeRes = await request(app)
      .post("/api/createBadge")
      .send({
        badge_name: "Test Badge",
        description: "A test badge",
        user_id: regRes.body.user_id
      });

    expect(badgeRes.status).toBe(200);
    expect(badgeRes.body).toHaveProperty("id");

    const res = await request(app)
      .post("/api/upload_image")
      .field("uploadType", "badge")
      .field("userId", regRes.body.user_id)
      .field("badgeId", badgeRes.body.id)
      .attach("file", testFilePath);

    expect(res.status).toBe(200);
    expect(res.text).toMatch(/uploaded/i);

    const uploadPath = `./uploads/badge/${regRes.body.user_id}`;
    expect(fs.existsSync(uploadPath)).toBe(true);

    const files = fs.readdirSync(uploadPath);
    expect(files.length).toBe(1);
  });

  it("returns 400 for unsupported uploadType", async () => {
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

    const res = await request(app)
      .post("/api/upload_image")
      .field("uploadType", "invalid")
      .field("userId", regRes.body.user_id)
      .attach("file", testFilePath);

    expect(res.status).toBe(400);
    expect(res.text).toMatch(/unsupported/i);
  });

  it("returns 404 when user update affects 0 rows", async () => {
    const res = await request(app)
      .post("/api/upload_image")
      .field("uploadType", "user")
      .field("userId", "999999")
      .attach("file", testFilePath);

    expect(res.status).toBe(404);
    expect(res.text).toMatch(/not found/i);
  });

  it("returns 404 when badge update affects 0 rows", async () => {
    const res = await request(app)
      .post("/api/upload_image")
      .field("uploadType", "badge")
      .field("userId", "1")
      .field("badgeId", "999999")
      .attach("file", testFilePath);

    expect(res.status).toBe(404);
    expect(res.text).toMatch(/not found/i);
  });

  it("fails when no file is uploaded", async () => {
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
    const res = await request(app)
      .post("/api/upload_image")
      .field("uploadType", "user")
      .field("userId", regRes.body.user_id);

    // could be 400 or 500 depending on how multer behaves
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});

describe("GET /api/images/:type/:userId", () => {
  const testFilePath = path.join(__dirname, "test-image.jpg");

  beforeEach(() => {
    fs.writeFileSync(testFilePath, "fake image content");
  });

  afterEach(() => {
    if (fs.existsSync("./uploads")) {
      fs.rmSync("./uploads", { recursive: true, force: true });
    }
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
  });

  it("returns uploaded image URL", async () => {

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
    // upload image first
    await request(app)
      .post("/api/upload_image")
      .field("uploadType", "user")
      .field("userId", regRes.body.user_id)
      .attach("file", testFilePath);

    // then retrieve
    const res = await request(app)
      .get(`/api/images/user/${regRes.body.user_id}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.images)).toBe(true);
    expect(res.body.images.length).toBeGreaterThan(0);
    expect(res.body.images[0]).toMatch(/\/uploads\/user\//);
  });

  it("returns 400 for invalid image type", async () => {
    const res = await request(app)
      .get("/api/images/invalid/123");

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid image type/i);
  });

  it("returns 404 when no images exist", async () => {
    const res = await request(app)
      .get("/api/images/user/999999");

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/no images/i);
  });
});

/**
 * Database error mocking tests
 */
describe("Database error mocking - Register endpoints", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should return 500 on GET /api/checkEmail database error", async () => {
    const _querySpy = vi.spyOn(pool, 'query').mockRejectedValue(new Error("Database error"));

    const res = await request(app).get("/api/checkEmail?email=test@test.com");

    expect(res.statusCode).toBe(500);
  });

  it("should return 500 on GET /api/orgCategories database error", async () => {
    const _querySpy = vi.spyOn(pool, 'query').mockRejectedValue(new Error("Database error"));

    const res = await request(app).get("/api/orgCategories");

    expect(res.statusCode).toBe(500);
  });

});
