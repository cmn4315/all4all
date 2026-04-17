import express from "express";
import bcrypt from "bcrypt";
import { pool } from "./db.js";
import jwt from "jsonwebtoken";
import multer from "multer";
import { mkdirSync, readdirSync, existsSync } from "fs";
import { resolve, join } from "path";

// For using env variables (i.e. JWT_SECRET for tokens)
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(express.json());
app.use("/uploads", express.static(join(__dirname, "uploads"))); // serve upload folder so image file links work in browser

/*
  Create a base user account 
  The base user table handles overlapping login logic between the volunteers and organizations
*/
async function createUser(client, username, email, password, phone, role) {
  const hashed = await bcrypt.hash(password, 10);

  const result = await client.query(
    "INSERT INTO users(username,email,password_hash,phone_number,role) VALUES($1,$2,$3,$4,$5) RETURNING id",
    [username, email, hashed, phone, role]
  );

  return result.rows[0].id;
}

/*
  Register a volunteer (with an associated base user account)
  Volunteer account needs email, password, firstName, lastName, and phone
*/
app.post("/api/registerVolunteer", async (req, res) => {
  const client = await pool.connect();
  let transactionStarted = false;


  try {
    const { username, email, password, firstName, lastName, phone } = req.body;

    if (!username || !email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    await client.query("BEGIN");
    transactionStarted = true;

    const user_id = await createUser(client, username, email, password, phone, "VOLUNTEER");

    const full_name = `${firstName} ${lastName}`;

    const volunteerResult = await client.query(
      "INSERT INTO volunteers(user_id,full_name) VALUES($1,$2) RETURNING id",
      [user_id, full_name]
    );

    await client.query("COMMIT");
    transactionStarted = false;

    res.json({ id: volunteerResult.rows[0].id, user_id });

  } catch (err) {
    if (transactionStarted) {
      await client.query("ROLLBACK");
    }

    if (err.code === "23505") {
      return res.status(409).json({ error: "User already exists" });
    }

    console.error(err);
    res.status(500).send("Database error");

  } finally {
    client.release();
  }
});


/*
* Get OrgCategories, to show in the dropdown on accound creation page
*/
app.get("/api/orgCategories", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM org_categories"
    );

    res.json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(500).send("Database error");
  }
});

/*
  Register an organization (with an associated base user account)
  Org needs name, email, phone, password, and a category id 
*/
app.post("/api/registerOrg", async (req, res) => {
  const client = await pool.connect();
  let transactionStarted = false;

  try {
    const { name, email, phone, description, password, category_id, zip_code } = req.body;

    await client.query("BEGIN");
    transactionStarted = true;

    const user_id = await createUser(client, name, email, password, phone, "ORGANIZATION");

    const orgResult = await client.query(
      `INSERT INTO organizations(user_id,name,description,category_id,zip_code) VALUES($1,$2,$3,$4,$5) RETURNING id`,
      [user_id, name, description, category_id, zip_code]
    );

    await client.query("COMMIT");
    transactionStarted = false;

    res.json({ id: orgResult.rows[0].id });

  } catch (err) {
    if (transactionStarted) {
      await client.query("ROLLBACK");
    }

    if (err.code === "23505") {
      return res.status(409).json({ error: "Email already exists" });
    }

    console.error(err);
    res.status(500).send("Database error");

  } finally {
    client.release();
  }
});

/*
  Check if email is already registered
*/
app.get("/api/checkEmail", async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({ error: "Email required" });
    }

    const result = await pool.query(
      "SELECT 1 FROM users WHERE email = $1 LIMIT 1",
      [email]
    );

    res.json({ available: result.rowCount === 0 });

  } catch (err) {
    console.error(err);
    res.status(500).send("Database error");
  }
});

/*
  Register a new event (available for any organization account to do)
  Create all new events as DRAFT first, user must explicitly set a different status later (PUBLISH, etc.)
*/
app.post("/api/events", async (req, res) => {
  const client = await pool.connect();

  try {
    const { organization_id, name, description, start_time, end_time, address, city, state, zip_code } = req.body;

    if (!organization_id || !name || !description || !start_time || !end_time || !zip_code) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const result = await client.query(
      `INSERT INTO events (organization_id,name,description,start_time,end_time,address,city,state,zip_code) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
      [organization_id, name, description, start_time, end_time, address, city, state, zip_code]
    );

    res.json({ id: result.rows[0].id });

  } catch (err) {
    console.error(err);
    res.status(500).send("Database error");
  } finally {
    client.release();
  }
});

/*
  Update the details of an existing event
  Can be used by organizations to update any and all details of their event, other than the organization id associated with it
*/
app.put("/api/events/:id", async (req, res) => {
  try {
    const { name, description, start_time, end_time, address, city, state, zip_code } = req.body;

    const result = await pool.query(
      `UPDATE events SET name = $1, description = $2, start_time = $3, end_time = $4, address = $5, city = $6, state = $7, zip_code = $8 WHERE id = $9 RETURNING id`,
      [name, description, start_time, end_time, address, city, state, zip_code, req.params.id]
    );

    //Specified event id not found
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Event not found" });
    }

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).send("Database error");
  }
});

/*
  Get all events with a PUBLISHED status
  This is used for volunteer users to be able to view all events they could register for 
*/
app.get("/api/events", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM events WHERE status = 'PUBLISHED' ORDER BY start_time"
    );

    res.json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(500).send("Database error");
  }
});

/*
  Get a specific event by its ID 
  This is meant for viewing the details of one specific event for both volunteers and organizations
*/
app.get("/api/events/:id", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM events WHERE id = $1",
      [req.params.id]
    );

    //Specified event does not exist in the db
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Event not found" });
    }

    res.json(result.rows[0]);

  } catch (err) {
    console.error(err);
    res.status(500).send("Database error");
  }
});

/* Get all of the events linked to the specified organization id
  publishedOnly = false (default): Used for organizations to view all of their own events 
  publishedOnly = true: Used for volunteers to view all published events for a specific organization (filter)

  Examples:
  Org 1:                          GET /api/organizations/1/events
  Volunteer (filter for org 1):   GET /api/organizations/1/events?publishedOnly=true
*/
app.get("/api/organizations/:id/events", async (req, res) => {
  try {
    const { publishedOnly } = req.query;

    let query = `SELECT * FROM events WHERE organization_id = $1`;

    const params = [req.params.id];

    //Only get published events (for volunteers to view)
    if (publishedOnly === "true") {
      query += ` AND status = 'PUBLISHED'`;
    }

    query += ` ORDER BY start_time`;

    const result = await pool.query(query, params);

    res.json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(500).send("Database error");
  }
});

/*
  Move the specified event's status from DRAFT (or other state) to PUBLISHED
  PUBLISHED events can be viewed by volunteer users
*/
app.put("/api/events/:id/publish", async (req, res) => {
  try {
    const result = await pool.query(
      "UPDATE events SET status = 'PUBLISHED' WHERE id = $1 RETURNING id",
      [req.params.id]
    );

    //Specified event does not exist in the db
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Event not found" });
    }

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).send("Database error");
  }
});

/*
  Cancel a specific event by its id
*/
app.put("/api/events/:id/cancel", async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE events SET status = 'CANCELLED' WHERE id = $1 RETURNING id`,
      [req.params.id]
    );

    //Specified event was not found in the db
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Event not found" });
    }

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).send("Database error");
  }
});

/*
  Allows a volunteer to register for a specific event provided that they have been able to view the event (to get its id)
  For a volunteer to register for an event, the event must be PUBLISHED at the time of registration
*/
app.post("/api/events/:id/register", async (req, res) => {
  try {
    const { volunteer_id } = req.body;
    const event_id = req.params.id;

    //Check event exists and is published
    const eventResult = await pool.query(
      "SELECT status FROM events WHERE id = $1",
      [event_id]
    );

    //Specified event not found
    if (eventResult.rowCount === 0) {
      return res.status(404).json({ error: "Event not found" });
    }

    //Event's status is any other than PUBLISHED
    if (eventResult.rows[0].status !== "PUBLISHED") {
      return res.status(400).json({ error: "Event is not open for registration" });
    }

    //Register volunteer
    await pool.query(
      `INSERT INTO event_registrations(event_id, volunteer_id) VALUES ($1, $2)`,
      [event_id, volunteer_id]
    );

    res.json({ success: true });

  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "Volunteer already registered" });
    }

    console.error(err);
    res.status(500).send("Database error");
  }
});

/*
  Allows volunteer users to be unregistered for an event
  Volunteers can choose to remove a registration, or organizations could remove a volunteer from an event
*/
app.delete("/api/events/:id/register", async (req, res) => {
  try {
    const { volunteer_id } = req.body;

    const result = await pool.query(
      `DELETE FROM event_registrations WHERE event_id = $1 AND volunteer_id = $2`,
      [req.params.id, volunteer_id]
    );

    //No record of the volunteer being registered for the specified event
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Registration not found" });
    }

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).send("Database error");
  }
});

/*
* login the user, returning a token or 401 on invalid credentials
*/
app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const result = await pool.query(
      "SELECT id, email, password_hash, role FROM users WHERE username = $1 LIMIT 1",
      [username]
    );

    if (result.rowCount === 0 || !(await bcrypt.compare(password, result.rows[0].password_hash))) {
      res.status(401).send("Invalid username or password.");
    } else {
      const user_role = result.rows[0].role;
      const user_id = result.rows[0].id;
      const token = jwt.sign(
        { id: user_id, role: user_role },
        // eslint-disable-next-line no-undef
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );


      res.json({
        token,
        user: {
          id: user_id,
          username: username,
          email: result.rows[0].email,
          role: user_role
        }
      });
    }

  } catch (err) {
    console.error(err);
    res.status(500).send("Database error");
  }
});

/* Get number of registered volunteers for an event
 */
app.get("/api/events/:id/count", async (req, res) => {
  try {
    const event_id = req.params.id;

    // Check event exists
    const eventResult = await pool.query(
      "SELECT status, organization_id FROM events WHERE id = $1",
      [event_id]
    );

    if (eventResult.rowCount === 0) {
      return result.status(404).send("Event not found");
    }

    let query = `SELECT COUNT(*) FROM event_registrations WHERE event_id = $1`;

    const params = [req.params.id];

    const result = await pool.query(query, params);
    const count = parseInt(result.rows[0].count, 10);
    res.json({ count });

  } catch (err) {
    console.error(err);
    res.status(500).send("Database error");
  }
});

app.get("/api/full_name", async (req, res) => {
  try {
    const user_id = req.query.user_id;
    let org = false;
    let result = await pool.query(
      "SELECT full_name FROM volunteers WHERE user_id = $1",
      [user_id]
    );
    if (result.rowCount === 0) {
      org = true
      result = await pool.query(
        "SELECT name FROM organizations WHERE user_id = $1",
        [user_id]
      );
    }

    if (result.rowCount === 0) {
      return res.status(404).send("User ID not found.");
    }

    // if we get here, we're good
    let name = null;
    if (org) {
      name = result.rows[0].name;
    } else {
      name = result.rows[0].full_name;
    }
    res.json({ name });


  } catch (err) {
    console.error(err);
    res.status(500).send("Database error");
  }
});

// Associate a badge with an event, insert into the appropriate table
// The event needs to be created before hitting this endpoint, so in order
// for it to be used. The event_id has to already exist in the events table
// the badge_id also needs to already exist, so the badge has to be created already
app.post("/api/event_badges", async (req, res) => {
  try {
    const { event_id, badge_id } = req.body;

    if (!event_id || !badge_id) {
      return res.status(400).send("event_id and badge_id are required.");
    }

    await pool.query(
      "INSERT INTO event_badges (event_id, badge_id) VALUES ($1, $2)",
      [event_id, badge_id]
    );

    res.status(201).send("Badge attached to event successfully.");
  } catch (err) {
    console.error(err);
    res.status(500).send("Database error");
  }
});

// Get all of the badges associated with a particular event
app.get("/api/event_badges", async (req, res) => {
  try {
    const { event_id } = req.query;

    if (!event_id) {
      return res.status(400).send("event_id is required.");
    }

    const result = await pool.query(
      `SELECT badges.* FROM badges
       JOIN event_badges ON badges.id = event_badges.badge_id
       WHERE event_badges.event_id = $1`,
      [event_id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Database error");
  }
});

// create an event category, to later be added to an event
app.post("/api/event_categories", async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      console.log("No name for category")
      return res.status(400).send("name is required.");
    }

    const result = await pool.query(
      "INSERT INTO event_categories (name) VALUES ($1) RETURNING id",
      [name]
    );

    res.json({ id: result.rows[0].id });
  } catch (err) {

    if (err.code === "23505") {
      return res.status(400).send("Name must be unique")
    }
    console.error(err);
    res.status(500).send("Database error");
  }
});

// Retrieve all existing event categories
app.get("/api/event_categories/:filter", async (req, res) => {
  try {
    const { filter } = req.params;

    const result = await pool.query(
      "SELECT * FROM event_categories WHERE name LIKE $1",
      [`%${filter}%`]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Database error");
  }
});

// Associate a category with an event, insert into the appropriate table
// The event needs to be created before hitting this endpoint, so in order
// for it to be used. The event_id has to already exist in the events table
// the category_id also needs to already exist, so the badge has to be created already

app.post("/api/event/add_categories", async (req, res) => {
  try {
    const { event_id, event_category_id } = req.body;

    if (!event_id || !event_category_id) {
      return res.status(400).send("event_id and event_category_id are required.");
    }

    await pool.query(
      "INSERT INTO event_category_links (event_id, event_category_id) VALUES ($1, $2)",
      [event_id, event_category_id]
    );

    res.status(201).send("Category attached to event successfully.");
  } catch (err) {
    console.error(err);
    res.status(500).send("Database error");
  }
});

// Get all events in a particular zip code
app.get("/api/events_by_zip/:zip_code", async (req, res) => {
  try {
    const { zip_code } = req.params;

    const result = await pool.query(
      `SELECT * FROM events WHERE zip_code = $1`,
      [zip_code]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Database error");
  }
});

// Get all events associated with a particular category
app.get("/api/events_by_cat/:category_id", async (req, res) => {
  try {
    const { category_id } = req.params;

    const result = await pool.query(
      `SELECT events.* FROM events 
       JOIN event_category_links ON events.id = event_category_links.event_id
       WHERE event_category_links.event_category_id = $1`,
      [category_id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Database error");
  }
});

// Reward badges to those who came to the event, Gets the event_id
// and gets all of the volunteers that came to the event, gets all of the badges
// associated with the event. Give the badges to those who came
app.post("/api/volunteer_badges/award", async (req, res) => {
  try {
    const { event_id } = req.body;

    if (!event_id) {
      return res.status(400).send("event_id is required.");
    }

    // Get all volunteers who attended the event
    const volunteers = await pool.query(
      "SELECT volunteer_id FROM event_registrations WHERE event_id = $1 AND attended = TRUE",
      [event_id]
    );

    // Get all badges attached to the event
    const badges = await pool.query(
      "SELECT badge_id FROM event_badges WHERE event_id = $1",
      [event_id]
    );

    if (volunteers.rowCount === 0 || badges.rowCount === 0) {
      return res.status(404).send("No attended volunteers or no badges found for this event.");
    }

    // Award every badge to every attended volunteer
    for (const volunteer of volunteers.rows) {
      for (const badge of badges.rows) {
        await pool.query(
          `INSERT INTO volunteer_badges (volunteer_id, badge_id)
           VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [volunteer.volunteer_id, badge.badge_id]
        );
      }
    }

    res.status(201).send("Badges awarded successfully.");
  } catch (err) {
    console.error(err);
    res.status(500).send("Database error");
  }
});

// get all of the badges for a particular volunteer
app.get("/api/volunteer_badges", async (req, res) => {
  try {
    const { volunteer_id } = req.query;

    if (!volunteer_id) {
      return res.status(400).send("volunteer_id is required.");
    }

    const result = await pool.query(
      `SELECT badges.*, volunteer_badges.earned_at FROM badges
       JOIN volunteer_badges ON badges.id = volunteer_badges.badge_id
       WHERE volunteer_badges.volunteer_id = $1`,
      [volunteer_id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Database error");
  }
});

// set upload directory and filename callbacks for multer
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const rawType = Array.isArray(req.body.uploadType) ? req.body.uploadType[0] : req.body.uploadType;
    const rawId = Array.isArray(req.body.userId) ? req.body.userId[0] : req.body.userId;

    const strType = String(rawType || '');
    const strId = String(rawId || '');

    // 1. Validate 'type' and throw a 400 if invalid
    const allowedTypes = { 'user': 'user', 'badge': 'badge' };
    const safeType = allowedTypes[strType];

    if (!safeType) {
      const err = new Error('Unsupported uploadType');
      err.status = 400; // Forces Express error handler to return 400 instead of 500
      return cb(err);
    }

    // 2. Validate 'id' and throw a 400 if invalid
    const match = strId.match(/^[a-zA-Z0-9-]+$/);
    const safeId = match ? match : null;

    if (!safeId) {
      const err = new Error('Invalid user ID');
      err.status = 400;
      return cb(err);
    }

    let basePath = resolve('./uploads');
    if (Array.isArray(basePath)) basePath = basePath[0];

    try {
      const uploadPath = join(String(basePath), String(safeType), String(safeId));

      if (!uploadPath.startsWith(String(basePath))) {
        const err = new Error('Path traversal attempt detected.');
        err.status = 400;
        return cb(err);
      }

      mkdirSync(uploadPath, { recursive: true });
      cb(null, uploadPath);
    } catch (err) {
      cb(err);
    }
  },
  filename: function(req, file, cb) {
    cb(null, file.originalname);
  }
});

const upload = multer({ storage: storage })

app.post("/api/upload_image", upload.single("file"), async (req, res) => {
  try {
    // TODO: Add token verification here so you can only change your own picture
    let result;
    switch (req.body.uploadType) {
      case "user":
        result = await pool.query(
          "UPDATE users SET image_url=$1 WHERE id=$2",
          [`/uploads/${req.body.uploadType}/${req.body.userId}/${req.file.fieldname}`, req.body.userId]
        );
        console.log("user update finished");
        if (result.rowCount === 0) {
          return res.status(404).send("Failed to update the database, userId not found");
        }
        break;
      case "badge":
        result = await pool.query(
          "UPDATE badges SET image_url=$1 WHERE id=$2 AND user_id=$3",
          [`/uploads/${req.body.uploadType}/${req.body.userId}/${req.file.fieldname}`, req.body.badgeId, req.body.userId]
        );
        console.log("badge upload done");
        if (result.rowCount === 0) {
          return res.status(404).send("Failed to update the database, matching badge entry not found");
        }
        break;
      default:
        return res.status(400).send("Unsupported upload type.");
    }
    console.log("sending success msg");
    res.send('File uploaded successfully');
  } catch (err) {
    console.error(err);
    res.status(500).send("Database Error");
  }
});

/*
  Create a new entry in the badges table
  Badges need name, description, and uploading user_id 
  This assumes that a separate call will be made to /api/upload_image to add a photo
*/
app.post("/api/createBadge", async (req, res) => {
  const client = await pool.connect();
  let transactionStarted = false;


  try {
    // TODO: get user id from token rather than body
    const { badge_name, description, user_id } = req.body;

    if (!badge_name || !description || !user_id) {
      console.log(`missing req fields: ${badge_name},${description},${user_id}`)
      return res.status(400).json({ error: "Missing required fields" });
    }

    await client.query("BEGIN");
    transactionStarted = true;

    const badgeResult = await client.query(
      "INSERT INTO badges(user_id,name,description) VALUES($1,$2,$3) RETURNING id",
      [user_id, badge_name, description]
    );
    if (badgeResult.rowCount === 0) {
      console.log("error updating db")
      return res.status(400).json({ error: "Error updating database" })
    }

    console.log("done with insert query")

    await client.query("COMMIT");
    transactionStarted = false;

    res.json({ id: badgeResult.rows[0].id });

  } catch (err) {
    if (transactionStarted) {
      await client.query("ROLLBACK");
    }

    if (err.code === "23503") {
      return res.status(400).json({ error: "User id doesn't exist" });
    }

    console.error(err);
    res.status(500).send("Database error");

  } finally {
    client.release();
  }
});

app.get("/api/images/:type/:userId", (req, res) => {
  try {
    const { type, userId } = req.params;

    if (!["user", "badge"].includes(type)) {
      return res.status(400).json({ error: "Invalid image type" });
    }

    let basePath = resolve('./uploads');
    const dirPath = join(basePath, type, userId);
    console.log(`${dirPath}`);

    if (!existsSync(dirPath)) {
      console.log("Dir doesn't exist");
      return res.status(404).json({ error: "No images found" });
    }

    const files = readdirSync(dirPath);

    // filter dotfiles
    const imageFiles = files.filter(file => !file.startsWith("."));

    const fileUrls = imageFiles.map(file =>
      `/uploads/${type}/${userId}/${file}`
    );

    res.json({ images: fileUrls });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to retrieve images" });
  }
});

export default app;
