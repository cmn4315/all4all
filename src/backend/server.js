import express from "express";
import bcrypt from "bcrypt";
import { pool } from "./db.js";
import jwt from "jsonwebtoken";

// For using env variables (i.e. JWT_SECRET for tokens)
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(express.json());

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

    res.json({ id: volunteerResult.rows[0].id });

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
    const { user_id } = req.body;
    const org = false;
    const result = await pool.query(
      "SELECT full_name FROM volunteers WHERE user_id = $1",
      [user_id]
    );
    if (result.rowCount === 0) {
      org = true
      result = await pool.query(
        "SELECT full_name FROM organizations WHERE user_id = $1",
        [user_id]
      );
    }

    if (result.rowCount === 0) {
      res.status(404).send("User ID not found.");
    }

    // if we get here, we're good
    const name = null;
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

export default app;
