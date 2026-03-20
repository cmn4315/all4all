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

  try {
    const { username, email, password, firstName, lastName, phone } = req.body;

    if (!username || !email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    await client.query("BEGIN");

    const user_id = await createUser(client, username, email, password, phone, "VOLUNTEER");

    const full_name = `${firstName} ${lastName}`;

    await client.query(
      "INSERT INTO volunteers(user_id,full_name) VALUES($1,$2)",
      [user_id, full_name]
    );

    await client.query("COMMIT");

    res.json({ id: user_id });

  } catch (err) {
    await client.query("ROLLBACK");

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

  try {
    // TODO: Differentiate between username and group name. name here is username
    const { name, email, phone, description, password, category_id } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    await client.query("BEGIN");

    const user_id = await createUser(client, name, email, password, "ORGANIZATION");

    await client.query(
      "INSERT INTO organizations(user_id,name,phone_number,description,category_id) VALUES($1,$2,$3,$4,$5)",
      [user_id, name, phone, description, category_id]
    );

    await client.query("COMMIT");

    res.json({ id: user_id });

  } catch (err) {
    await client.query("ROLLBACK");

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

/*
  Move the specified event's status from DRAFT (or other state) to PUBLISHED
  PUBLISHED events can be viewed by volunteer users
*/
app.patch("/api/events/:id/publish", async (req, res) => {
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

export default app;
