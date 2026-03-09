import express from "express";
import bcrypt from "bcrypt";
import { pool } from "./db.js";

const app = express();
app.use(express.json());

/*
  Create a base user account 
  The base user table handles overlapping login logic between the volunteers and organizations
*/
async function createUser(client, email, password, role) {
  const hashed = await bcrypt.hash(password, 10);

  const result = await client.query(
    "INSERT INTO users(email,password_hash,role) VALUES($1,$2,$3) RETURNING id",
    [email, hashed, role]
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
    const { email, password, firstName, lastName, phone } = req.body;

    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    await client.query("BEGIN");

    const user_id = await createUser(client, email, password, "VOLUNTEER");

    const full_name = `${firstName} ${lastName}`;

    await client.query(
      "INSERT INTO volunteers(user_id,full_name,phone_number) VALUES($1,$2,$3)",
      [user_id, full_name, phone]
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
  Register an organization (with an associated base user account)
  Org needs name, email, phone, password, and a category id 
*/
app.post("/api/registerOrg", async (req, res) => {
  const client = await pool.connect();

  try {
    const { name, email, phone, description, password, category_id } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    await client.query("BEGIN");

    const user_id = await createUser(client, email, password, "ORGANIZATION");

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

app.listen(5000, () => console.log("API running on port 5000"));