import dotenv from 'dotenv';
import express from "express";
import bcrypt from "bcrypt";
import { pool } from "./db.js";
import jwt from "jsonwebtoken";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import fs, { existsSync, readdirSync } from "fs";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ─── Shared Helpers ───────────────────────────────────────────────────────────

function handleError(res, err) {
  console.error(err);
  if (err.code === "23505") return res.status(409).json({ error: "Already exists" });
  res.status(500).send("Database error");
}

async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

// Returns a single row or 404
async function queryOne(res, sql, params, notFoundMsg = "Not found") {
  try {
    const result = await pool.query(sql, params);
    if (result.rowCount === 0) return res.status(404).json({ error: notFoundMsg });
    res.json(result.rows[0]);
  } catch (err) {
    handleError(res, err);
  }
}

// Returns all rows as array
async function queryMany(res, sql, params = []) {
  try {
    const result = await pool.query(sql, params);
    res.json(result.rows);
  } catch (err) {
    handleError(res, err);
  }
}

// Mutates (UPDATE/DELETE) and returns { success: true } or 404
async function mutateOne(res, sql, params, notFoundMsg = "Not found") {
  try {
    const result = await pool.query(sql, params);
    if (result.rowCount === 0) return res.status(404).json({ error: notFoundMsg });
    res.json({ success: true });
  } catch (err) {
    handleError(res, err);
  }
}

// Acquires a client, runs fn(client), always releases, responds { success: true }
async function withClient(res, fn) {
  const client = await pool.connect();
  try {
    await fn(client);
    res.json({ success: true });
  } catch (err) {
    handleError(res, err);
  } finally {
    client.release();
  }
}

// Returns zip_code for a table keyed by user_id
const ALLOWED_TABLES = new Set(["volunteers", "organizations"]);

async function getZipCode(res, table, user_id) {
  if (!ALLOWED_TABLES.has(table)) return res.status(400).json({ zip_code: null });
  try {
    if (!user_id) return res.status(400).json({ zip_code: null });
    const result = await pool.query(`SELECT zip_code FROM ${table} WHERE user_id = $1`, [user_id]);
    if (result.rowCount === 0) return res.status(404).json({ zip_code: null });
    res.json({ zip_code: result.rows[0].zip_code ?? null });
  } catch (err) {
    handleError(res, err);
  }
}

// ─── Multer Setup ─────────────────────────────────────────────────────────────

const ALLOWED_UPLOAD_TYPES = new Set(["user", "badge"]);
const ALLOWED_IMAGE_EXTS   = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp"]);

function safeExt(originalname) {
  const ext = path.extname(originalname).toLowerCase();
  return ALLOWED_IMAGE_EXTS.has(ext) ? ext : ".bin";
}

const imageUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const { uploadType, userId } = req.body;

      if (!ALLOWED_UPLOAD_TYPES.has(uploadType)) {
        return cb(new Error("Invalid upload type"));
      }

      // Use trusted folder name, same as the read route
      const safeFolder = TYPE_TO_FOLDER[uploadType];
      if (!safeFolder) return cb(new Error("Invalid upload type"));

      const safeUserId = String(userId).replace(/[^0-9]/g, "");
      if (!safeUserId) return cb(new Error("Invalid user ID"));

      const base = path.resolve(__dirname, "uploads");
      const dir  = path.resolve(base, safeFolder, safeUserId);

      if (!dir.startsWith(base + path.sep)) {
        return cb(new Error("Invalid upload path"));
      }

      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => cb(null, `image_${Date.now()}${safeExt(file.originalname)}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
});

const profileUpload = multer({
  storage: multer.diskStorage({
    destination: "uploads/profiles/",
    filename: (req, file, cb) => cb(null, `profile_${Date.now()}${safeExt(file.originalname)}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
});

const badgeUpload = multer({
  storage: multer.diskStorage({
    destination: "uploads/badges/",
    filename: (req, file, cb) => cb(null, `badge_${Date.now()}${safeExt(file.originalname)}`),
  }),
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "image/png") cb(null, true);
    else cb(new Error("Only PNG files are allowed"));
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

// ─── User / Auth ──────────────────────────────────────────────────────────────

async function createUser(client, username, email, password, phone, role) {
  const hashed = await bcrypt.hash(password, 10);
  const result = await client.query(
    "INSERT INTO users(username,email,password_hash,phone_number,role) VALUES($1,$2,$3,$4,$5) RETURNING id",
    [username, email, hashed, phone, role]
  );
  return result.rows[0].id;
}

app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const result = await pool.query(
      "SELECT id, email, password_hash, role FROM users WHERE username = $1 LIMIT 1",
      [username]
    );
    if (result.rowCount === 0 || !(await bcrypt.compare(password, result.rows[0].password_hash))) {
      return res.status(401).send("Invalid email or password.");
    }
    const { id, email, role } = result.rows[0];
    const token = jwt.sign({ id, email, role }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, user: { id, username, email, role } });
  } catch (err) {
    handleError(res, err);
  }
});

app.get("/api/checkEmail", async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: "Email required" });
    const result = await pool.query("SELECT 1 FROM users WHERE email = $1 LIMIT 1", [email]);
    res.json({ available: result.rowCount === 0 });
  } catch (err) {
    handleError(res, err);
  }
});

// ─── Volunteer Registration & Profile ─────────────────────────────────────────

app.post("/api/registerVolunteer", async (req, res) => {
  const { username, email, password, firstName, lastName, phone } = req.body;
  if (!username || !email || !password || !firstName || !lastName) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  try {
    const { volunteerId, userId } = await withTransaction(async (client) => {
      const user_id = await createUser(client, username, email, password, phone, "VOLUNTEER");
      const result = await client.query(
        "INSERT INTO volunteers(user_id,full_name) VALUES($1,$2) RETURNING id",
        [user_id, `${firstName} ${lastName}`]
      );
      return { volunteerId: result.rows[0].id, userId: user_id };
    });
    res.json({ id: volunteerId, user_id: userId });
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "User already exists" });
    handleError(res, err);
  }
});

app.get("/api/volunteers/zip_code", (req, res) =>
  getZipCode(res, "volunteers", req.query.user_id)
);

app.get("/api/volunteers/:id/registrations", (req, res) =>
  queryMany(res,
    `SELECT e.* FROM events e
     JOIN event_registrations er ON er.event_id = e.id
     JOIN volunteers v ON v.id = er.volunteer_id
     WHERE v.user_id = $1
     ORDER BY e.start_time`,
    [req.params.id]
  )
);

app.get("/api/volunteers/:id/past-events", (req, res) =>
  queryMany(res,
    `SELECT e.*, er.attended, er.time_in, er.time_out
     FROM events e
     JOIN event_registrations er ON er.event_id = e.id
     JOIN volunteers v ON v.id = er.volunteer_id
     WHERE v.user_id = $1 AND e.end_time < NOW()
     ORDER BY e.start_time DESC`,
    [req.params.id]
  )
);

app.get("/api/volunteers/:id/badges", (req, res) =>
  queryMany(res,
    `SELECT b.name, b.description, b.image_url, vb.earned_at
     FROM volunteer_badges vb
     JOIN badges b ON b.id = vb.badge_id
     WHERE vb.volunteer_id = $1
     ORDER BY vb.earned_at DESC`,
    [req.params.id]
  )
);

app.post("/api/volunteers/:id/badges", async (req, res) => {
  try {
    const { badge_id } = req.body;
    await pool.query(
      "INSERT INTO volunteer_badges(volunteer_id, badge_id) VALUES($1,$2) ON CONFLICT DO NOTHING",
      [req.params.id, badge_id]
    );
    res.json({ success: true });
  } catch (err) {
    handleError(res, err);
  }
});

app.get("/api/volunteers/:id/service-hours", (req, res) =>
  queryMany(res,
    `SELECT e.id AS event_id, e.name AS event_name, e.start_time, e.end_time,
            o.name AS organization_name,
            COALESCE(json_agg(DISTINCT ec.name) FILTER (WHERE ec.name IS NOT NULL), '[]') AS tags,
            er.attended, er.time_in, er.time_out,
            CASE
              WHEN er.time_in IS NOT NULL AND er.time_out IS NOT NULL
              THEN EXTRACT(EPOCH FROM (er.time_out - er.time_in)) / 3600
              WHEN e.start_time IS NOT NULL AND e.end_time IS NOT NULL AND er.attended
              THEN EXTRACT(EPOCH FROM (e.end_time - e.start_time)) / 3600
              ELSE 0
            END AS hours
     FROM event_registrations er
     JOIN events e ON e.id = er.event_id
     JOIN organizations o ON o.id = e.organization_id
     JOIN volunteers v ON v.id = er.volunteer_id
     LEFT JOIN event_category_links ecl ON ecl.event_id = e.id
     LEFT JOIN event_categories ec ON ec.id = ecl.event_category_id
     WHERE v.user_id = $1
     GROUP BY e.id, e.name, e.start_time, e.end_time, o.name, er.attended, er.time_in, er.time_out
     ORDER BY e.start_time DESC`,
    [req.params.id]
  )
);

// NOTE: keep AFTER all static-segment /api/volunteers/... routes
app.get("/api/volunteers/:id", (req, res) =>
  queryOne(res,
    `SELECT v.id, v.full_name, u.email, u.phone_number
     FROM volunteers v
     JOIN users u ON u.id = v.user_id
     WHERE v.user_id = $1`,
    [req.params.id],
    "Volunteer not found"
  )
);

app.put("/api/volunteers/profile", async (req, res) => {
  try {
    const { user_id, firstName, lastName, zip_code } = req.body;
    await pool.query(
      "UPDATE volunteers SET full_name = $1, zip_code = $2 WHERE user_id = $3",
      [`${firstName} ${lastName}`, zip_code, user_id]
    );
    res.json({ success: true });
  } catch (err) {
    handleError(res, err);
  }
});

// ─── Organization Registration & Profile ──────────────────────────────────────

app.post("/api/registerOrg", async (req, res) => {
  try {
    const { username, name, email, phone, description, password, category_id, zip_code, address, brand_colors } = req.body;
    const orgId = await withTransaction(async (client) => {
      const user_id = await createUser(client, username, email, password, phone, "ORGANIZATION");
      const result = await client.query(
        "INSERT INTO organizations(user_id, name, description, category_id, zip_code, address, brand_colors) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id",
        [user_id, name, description, category_id, zip_code, address, brand_colors]
      );
      return result.rows[0].id;
    });
    res.json({ id: orgId });
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "Email already exists" });
    handleError(res, err);
  }
});

app.get("/api/organizations/zip_code", (req, res) =>
  getZipCode(res, "organizations", req.query.user_id)
);

app.get("/api/organizations/address", async (req, res) => {
  try {
    const { user_id } = req.query;
    const result = await pool.query("SELECT address FROM organizations WHERE user_id = $1", [user_id]);
    if (result.rowCount === 0) return res.status(404).json({ address: null });
    res.json({ address: result.rows[0].address });
  } catch (err) {
    handleError(res, err);
  }
});

app.get("/api/organizations/motto", async (req, res) => {
  try {
    const { user_id } = req.query;
    const result = await pool.query("SELECT description FROM organizations WHERE user_id = $1", [user_id]);
    if (result.rowCount === 0) return res.status(404).json({ motto: null });
    res.json({ motto: result.rows[0].description });
  } catch (err) {
    handleError(res, err);
  }
});

app.get("/api/organizations/brand_colors", async (req, res) => {
  try {
    const { user_id } = req.query;
    const result = await pool.query("SELECT brand_colors FROM organizations WHERE user_id = $1", [user_id]);
    if (result.rowCount === 0) return res.status(404).json({ colors: [] });
    res.json({ colors: result.rows[0]?.brand_colors || [] });
  } catch (err) {
    handleError(res, err);
  }
});

app.get("/api/organizations/profile", async (req, res) => {
  try {
    const { user_id } = req.query;
    if (!user_id) return res.status(400).json({ error: "user_id required" });
    const result = await pool.query(
      "SELECT name, address, zip_code, description AS motto, brand_colors FROM organizations WHERE user_id = $1",
      [user_id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: "Organization not found" });
    res.json(result.rows[0]);
  } catch (err) {
    handleError(res, err);
  }
});

app.put("/api/organizations/profile", async (req, res) => {
  try {
    const { user_id, name, address, zip_code, motto, brand_colors } = req.body;
    await pool.query(
      "UPDATE organizations SET name=$1, address=$2, zip_code=$3, description=$4, brand_colors=$5 WHERE user_id=$6",
      [name, address, zip_code, motto, brand_colors, user_id]
    );
    res.json({ success: true });
  } catch (err) {
    handleError(res, err);
  }
});

app.get("/api/organizations/by-user/:userId", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM organizations WHERE user_id = $1", [req.params.userId]);
    if (result.rowCount === 0) return res.status(404).send("Not found");
    res.json(result.rows[0]);
  } catch (err) {
    handleError(res, err);
  }
});

app.get("/api/organizations/:id/event-stats", (req, res) =>
  queryMany(res,
    `SELECT e.id, e.name, e.start_time, e.end_time, e.status,
            COALESCE(json_agg(DISTINCT ec.name) FILTER (WHERE ec.name IS NOT NULL), '[]') AS tags,
            COUNT(DISTINCT er.volunteer_id) AS volunteer_count,
            COALESCE(SUM(
              CASE
                WHEN er.time_in IS NOT NULL AND er.time_out IS NOT NULL
                THEN EXTRACT(EPOCH FROM (er.time_out - er.time_in)) / 3600
                WHEN er.attended THEN EXTRACT(EPOCH FROM (e.end_time - e.start_time)) / 3600
                ELSE 0
              END
            ), 0) AS total_hours
     FROM events e
     LEFT JOIN event_registrations er ON er.event_id = e.id
     LEFT JOIN event_category_links ecl ON ecl.event_id = e.id
     LEFT JOIN event_categories ec ON ec.id = ecl.event_category_id
     WHERE e.organization_id = $1
     GROUP BY e.id, e.name, e.start_time, e.end_time, e.status
     ORDER BY e.start_time DESC`,
    [req.params.id]
  )
);

// NOTE: keep AFTER all static-segment /api/organizations/... routes
app.get("/api/organizations/:id/events", async (req, res) => {
  try {
    const { publishedOnly } = req.query;
    let query = `
      SELECT e.*, o.name AS organization_name,
             COALESCE(json_agg(DISTINCT ec.name) FILTER (WHERE ec.name IS NOT NULL), '[]') AS tags
      FROM events e
      LEFT JOIN organizations o ON o.id = e.organization_id
      LEFT JOIN event_category_links ecl ON ecl.event_id = e.id
      LEFT JOIN event_categories ec ON ec.id = ecl.event_category_id
      WHERE e.organization_id = $1
    `;
    const params = [req.params.id];
    if (publishedOnly === "true") query += " AND e.status = 'PUBLISHED'";
    query += " GROUP BY e.id, o.name ORDER BY e.start_time";
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    handleError(res, err);
  }
});

// NOTE: keep AFTER all static-segment /api/organizations/... routes
app.get("/api/organizations/:id", (req, res) =>
  queryOne(res,
    "SELECT * FROM organizations WHERE id = $1",
    [req.params.id],
    "Organization not found"
  )
);

app.get("/api/orgCategories", (req, res) =>
  queryMany(res, "SELECT * FROM org_categories")
);

// ─── Shared Profile Helpers ───────────────────────────────────────────────────

app.get("/api/full_name", async (req, res) => {
  try {
    const { user_id } = req.query;
    let result = await pool.query("SELECT full_name AS name FROM volunteers WHERE user_id = $1", [user_id]);
    if (result.rowCount === 0) {
      result = await pool.query("SELECT name FROM organizations WHERE user_id = $1", [user_id]);
    }
    if (result.rowCount === 0) return res.status(404).send("User ID not found.");
    res.json({ name: result.rows[0].name });
  } catch (err) {
    handleError(res, err);
  }
});

app.get("/api/phone", async (req, res) => {
  try {
    const { user_id } = req.query;
    const result = await pool.query("SELECT phone_number FROM users WHERE id = $1", [user_id]);
    if (result.rowCount === 0) return res.status(404).send("User not found.");
    res.json({ phone: result.rows[0].phone_number });
  } catch (err) {
    handleError(res, err);
  }
});

app.post("/api/users/:id/avatar", profileUpload.single("image"), async (req, res) => {
  try {
    const image_url = `/uploads/profiles/${req.file.filename}`;
    await pool.query("UPDATE users SET image_url = $1 WHERE id = $2", [image_url, req.params.id]);
    res.json({ image_url });
  } catch (err) {
    handleError(res, err);
  }
});

app.post("/api/upload_image", imageUpload.single("file"), (req, res) => {
  try {
    const { uploadType, userId } = req.body;
    const safeFolder = TYPE_TO_FOLDER[uploadType];
    const safeUserId = String(userId).replace(/[^0-9]/g, "");
    const fileUrl = `/uploads/${safeFolder}/${safeUserId}/${req.file.filename}`;
    res.json({ url: fileUrl });
  } catch (err) {
    handleError(res, err);
  }
});

// ─── Events ───────────────────────────────────────────────────────────────────

app.post("/api/events", async (req, res) => {
  const { organization_id, name, description, start_time, end_time, address, city, state, zip_code, color, recurrence } = req.body;
  if (!organization_id || !name || !description || !start_time || !end_time || !zip_code) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  if (new Date(end_time) <= new Date(start_time)) {
    return res.status(400).json({ error: "end_time must be after start_time" });
  }
  const client = await pool.connect();
  try {
    const result = await client.query(
      `INSERT INTO events (organization_id, name, description, start_time, end_time, address, city, state, zip_code, color, recurrence)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
      [organization_id, name, description, start_time, end_time, address, city, state, zip_code, color ?? "#15803d", recurrence || null]
    );
    res.json({ id: result.rows[0].id });
  } catch (err) {
    handleError(res, err);
  } finally {
    client.release();
  }
});

app.put("/api/events/:id", async (req, res) => {
  try {
    const { name, description, start_time, end_time, address, city, state, zip_code, color, recurrence } = req.body;
    const result = await pool.query(
      `UPDATE events SET name=$1, description=$2, start_time=$3, end_time=$4,
       address=$5, city=$6, state=$7, zip_code=$8, color=$9, recurrence=$10 WHERE id=$11 RETURNING id`,
      [name, description, start_time, end_time, address, city, state, zip_code, color, recurrence || null, req.params.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: "Event not found" });
    res.json({ success: true });
  } catch (err) {
    handleError(res, err);
  }
});

app.delete("/api/events/:id", (req, res) =>
  mutateOne(res, "DELETE FROM events WHERE id = $1 RETURNING id", [req.params.id], "Event not found")
);

app.get("/api/events", (req, res) =>
  queryMany(res,
    `SELECT e.*,
            o.name AS organization_name,
            COALESCE(json_agg(DISTINCT ec.name) FILTER (WHERE ec.name IS NOT NULL), '[]') AS tags,
            COUNT(DISTINCT er.id) AS volunteer_count
     FROM events e
     LEFT JOIN organizations o ON o.id = e.organization_id
     LEFT JOIN event_category_links ecl ON ecl.event_id = e.id
     LEFT JOIN event_categories ec ON ec.id = ecl.event_category_id
     LEFT JOIN event_registrations er ON er.event_id = e.id
     WHERE e.status = 'PUBLISHED'
     GROUP BY e.id, o.name
     ORDER BY e.start_time`
  )
);

app.put("/api/events/:id/publish", (req, res) =>
  mutateOne(res, "UPDATE events SET status = 'PUBLISHED' WHERE id = $1 RETURNING id", [req.params.id], "Event not found")
);

app.put("/api/events/:id/cancel", (req, res) =>
  mutateOne(res, "UPDATE events SET status = 'CANCELLED' WHERE id = $1 RETURNING id", [req.params.id], "Event not found")
);

// ─── Event Registrations ──────────────────────────────────────────────────────

app.post("/api/events/:id/register", async (req, res) => {
  try {
    const { volunteer_id } = req.body;
    const event_id = req.params.id;
    const eventResult = await pool.query("SELECT status FROM events WHERE id = $1", [event_id]);
    if (eventResult.rowCount === 0) return res.status(404).json({ error: "Event not found" });
    if (eventResult.rows[0].status !== "PUBLISHED") {
      return res.status(400).json({ error: "Event is not open for registration" });
    }
    await pool.query(
      "INSERT INTO event_registrations(event_id, volunteer_id) VALUES ($1, $2)",
      [event_id, volunteer_id]
    );
    res.json({ success: true });
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "Volunteer already registered" });
    handleError(res, err);
  }
});

app.delete("/api/events/:id/register", (req, res) =>
  mutateOne(res,
    "DELETE FROM event_registrations WHERE event_id = $1 AND volunteer_id = $2",
    [req.params.id, req.body.volunteer_id],
    "Registration not found"
  )
);

app.get("/api/events/:id/registrations", (req, res) =>
  queryMany(res,
    `SELECT v.id AS volunteer_id, v.full_name, u.email, u.phone_number,
            er.registered_at, er.attended, er.time_in, er.time_out
     FROM event_registrations er
     JOIN volunteers v ON v.id = er.volunteer_id
     JOIN users u ON u.id = v.user_id
     WHERE er.event_id = $1
     ORDER BY er.registered_at`,
    [req.params.id]
  )
);

app.get("/api/events/:id/registrations/count", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT COUNT(*) AS total FROM event_registrations WHERE event_id = $1",
      [req.params.id]
    );
    res.json({ total: parseInt(result.rows[0].total) });
  } catch (err) {
    handleError(res, err);
  }
});

app.post("/api/events/:id/checkin", (req, res) =>
  withClient(res, async (client) => {
    const { volunteer_id, time_in, time_out } = req.body;
    await client.query(
      `UPDATE event_registrations
       SET attended = true, time_in = $1, time_out = $2
       WHERE event_id = $3 AND volunteer_id = $4`,
      [time_in, time_out, req.params.id, volunteer_id]
    );
  })
);

// ─── Event Roles ──────────────────────────────────────────────────────────────

app.post("/api/events/:id/roles", (req, res) =>
  withClient(res, async (client) => {
    const event_id = req.params.id;
    await client.query("DELETE FROM event_roles WHERE event_id = $1", [event_id]);
    for (const role of req.body.roles) {
      if (!role.name?.trim()) continue;
      await client.query(
        "INSERT INTO event_roles(event_id, name, spots) VALUES($1, $2, $3)",
        [event_id, role.name.trim(), parseInt(role.spots) || 0]
      );
    }
  })
);

app.get("/api/events/:id/roles", (req, res) =>
  queryMany(res,
    `SELECT er.id, er.name, er.spots,
            COUNT(err.id) AS filled
     FROM event_roles er
     LEFT JOIN event_role_registrations err ON err.role_id = er.id
     WHERE er.event_id = $1
     GROUP BY er.id
     ORDER BY er.id`,
    [req.params.id]
  )
);

app.get("/api/events/:id/volunteer-role/:volunteerId", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT err.role_id FROM event_role_registrations err
       JOIN event_roles er ON er.id = err.role_id
       WHERE er.event_id = $1 AND err.volunteer_id = $2
       LIMIT 1`,
      [req.params.id, req.params.volunteerId]
    );
    res.json({ role_id: result.rows[0]?.role_id ?? null });
  } catch (err) {
    handleError(res, err);
  }
});

app.post("/api/roles/:id/register", async (req, res) => {
  const client = await pool.connect();
  try {
    const { volunteer_id } = req.body;
    const role_id = req.params.id;

    if (!Number.isInteger(Number(role_id)) || isNaN(Number(role_id))) {
      return res.status(404).json({ error: "Role not found" });
    }

    const roleResult = await client.query(
      `SELECT er.spots, COUNT(err.id) AS filled
       FROM event_roles er
       LEFT JOIN event_role_registrations err ON err.role_id = er.id
       WHERE er.id = $1
       GROUP BY er.id`,
      [role_id]
    );

    if (roleResult.rowCount === 0 || roleResult.rows.length === 0) {
      return res.status(404).json({ error: "Role not found" });
    }

    const { spots, filled } = roleResult.rows[0];
    if (parseInt(filled) >= parseInt(spots)) {
      return res.status(400).json({ error: "No spots available" });
    }

    await client.query(
      "INSERT INTO event_role_registrations(role_id, volunteer_id) VALUES($1, $2)",
      [role_id, volunteer_id]
    );
    res.json({ success: true });
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "Already registered for this role" });
    if (err.code === "22P02") return res.status(404).json({ error: "Role not found" });
    handleError(res, err);
  } finally {
    client.release();
  }
});

app.delete("/api/roles/:id/register", (req, res) =>
  mutateOne(res,
    "DELETE FROM event_role_registrations WHERE role_id = $1 AND volunteer_id = $2",
    [req.params.id, req.body.volunteer_id],
    "Registration not found"
  )
);

app.get("/api/roles/:id/volunteers", (req, res) =>
  queryMany(res,
    `SELECT v.id, v.full_name, u.email, u.phone_number
     FROM event_role_registrations err
     JOIN volunteers v ON v.id = err.volunteer_id
     JOIN users u ON u.id = v.user_id
     WHERE err.role_id = $1`,
    [req.params.id]
  )
);

// ─── Event Tags ───────────────────────────────────────────────────────────────

app.post("/api/events/:id/tags", (req, res) =>
  withClient(res, async (client) => {
    const event_id = req.params.id;
    await client.query("DELETE FROM event_category_links WHERE event_id = $1", [event_id]);
    for (const tagName of req.body.tags) {
      const catResult = await client.query(
        "SELECT id FROM event_categories WHERE name = $1", [tagName]
      );
      if (catResult.rowCount > 0) {
        await client.query(
          "INSERT INTO event_category_links(event_id, event_category_id) VALUES($1,$2)",
          [event_id, catResult.rows[0].id]
        );
      }
    }
  })
);

app.get("/api/events/:id/tags", (req, res) =>
  queryMany(res,
    `SELECT ec.id, ec.name FROM event_category_links ecl
     JOIN event_categories ec ON ec.id = ecl.event_category_id
     WHERE ecl.event_id = $1`,
    [req.params.id]
  )
);

app.get("/api/eventCategories", (req, res) =>
  queryMany(res, "SELECT * FROM event_categories ORDER BY name")
);

// ─── Badges ───────────────────────────────────────────────────────────────────

app.post("/api/badges", (req, res, next) => {
  badgeUpload.single("image")(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: "Image file is required" });
    next();
  });
}, async (req, res) => {
  try {
    const { name, description } = req.body;
    const image_url = `/uploads/badges/${req.file.filename}`;
    const result = await pool.query(
      "INSERT INTO badges(name, description, image_url) VALUES($1,$2,$3) RETURNING *",
      [name, description, image_url]
    );
    res.json(result.rows[0]);
  } catch (err) {
    handleError(res, err);
  }
});

app.get("/api/badges", (req, res) =>
  queryMany(res, "SELECT * FROM badges ORDER BY id")
);

app.post("/api/events/:id/badges", (req, res) =>
  withClient(res, async (client) => {
    const event_id = req.params.id;
    await client.query("DELETE FROM event_badges WHERE event_id = $1", [event_id]);
    for (const badge_id of req.body.badge_ids) {
      await client.query(
        "INSERT INTO event_badges(event_id, badge_id) VALUES($1, $2)",
        [event_id, badge_id]
      );
    }
  })
);

app.get("/api/events/:id/badges", (req, res) =>
  queryMany(res,
    `SELECT b.id, b.name, b.description, b.image_url
     FROM event_badges eb
     JOIN badges b ON b.id = eb.badge_id
     WHERE eb.event_id = $1`,
    [req.params.id]
  )
);

// ─── Images ───────────────────────────────────────────────────────────────────

const TYPE_TO_FOLDER = {
  user:  "user",
  badge: "badge",
};

app.get("/api/images/:type/:userId", (req, res) => {
  try {
    const { type, userId } = req.params;

    if (!ALLOWED_UPLOAD_TYPES.has(type)) {
      return res.status(400).json({ error: "Invalid image type" });
    }

    // Resolve folder name from trusted lookup FIRST, before any path construction
    const safeFolder = TYPE_TO_FOLDER[type];
    if (!safeFolder) return res.status(400).json({ error: "Invalid image type" });

    const safeUserId = userId.replace(/[^0-9]/g, "");
    if (!safeUserId) return res.status(400).json({ error: "Invalid user ID" });

    // Build path using safeFolder (trusted) instead of type (user-controlled)
    const base    = join(__dirname, "uploads");
    const dirPath = join(base, safeFolder, safeUserId);
    if (!dirPath.startsWith(base + path.sep)) {
      return res.status(400).json({ error: "Invalid path" });
    }

    if (!existsSync(dirPath)) {
      return res.status(404).json({ error: "No images found" });
    }

    const imageFiles = readdirSync(dirPath).filter(f => !f.startsWith("."));
    const fileUrls   = imageFiles.map(f => `/uploads/${safeFolder}/${safeUserId}/${f}`);

    res.json({ images: fileUrls });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to retrieve images" });
  }
});

export default app;