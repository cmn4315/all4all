import express from "express";
import bcrypt from "bcrypt";
import { pool } from "./db.js";
// import jwt from "jsonwebtoken";

// For using env variables (i.e. JWT_SECRET for tokens)
// import dotenv from "dotenv";
// dotenv.config();

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
* Fetch a user, based on login credentials
*/
// app.get("/api/login", async (req, res) => {
//   try {
//     const { username, password } = req.query;

//     const result = await pool.query(
//       "SELECT id, email, password_hash, user_role FROM users WHERE username = $1 LIMIT 1",
//       [username]
//     );

//     if (result.rowCount === 0 || !(await bcrypt.compare(password, result.rows[0].password_hash))) {
//       res.status(401).send("Invalid email or password.");
//     }
//     const user_role = result.rows[0].user_role;
//     const user_id = result.rows[0].id;
//     const token = jwt.sign(
//       { id: user_id, email: email, role: user_role },
//       process.env.JWT_SECRET,
//       { expiresIn: "7d" }
//     );

//     res.json({
//       token,
//       user: {
//         id: user_id,
//         username: username,
//         email: result.rows[0].email,
//         role: user_role
//       }
//     });

//   } catch (err) {
//     console.error(err);
//     res.status(500).send("Database error");
//   }
// });

export default app;