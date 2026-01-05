const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const ejs = require('ejs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Helper function to check if voting is currently open
function isVotingOpen() {
  const now = new Date();
  return false; // Placeholder
}

const app = express();
const port = process.env.PORT || 3000;

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});
// System configuration helper (reads and caches `system_config` table)
const createSystemConfig = require('./lib/systemConfig');
const systemConfig = createSystemConfig(pool);

// Helper to log admin actions to the `admin_audit_log` table
async function logAdminAction(adminId, action, target = null, details = null, req = null) {
  try {
    const ip = req ? (req.headers['x-forwarded-for'] || req.connection.remoteAddress || null) : null;
    const userAgent = req ? req.headers['user-agent'] || null : null;
    // Map to actual columns in admin_audit_log: table_name, record_id, old_values, new_values
    const tableName = target || null;
    const recordId = null;
    const newValues = details || null;
    await pool.query(
      `INSERT INTO admin_audit_log (
        admin_id, action, table_name, record_id, old_values, new_values, ip_address, user_agent, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [adminId, action, tableName, recordId, null, newValues, ip, userAgent]
    );
  } catch (err) {
    console.error('Failed to log admin action:', err);
  }
}

// Helper to log voter activity to the `voter_activity_log` table
async function logVoterActivity(voterId, action, details = null, req = null) {
  try {
    const ip = req ? (req.headers['x-forwarded-for'] || req.connection.remoteAddress || null) : null;
    const userAgent = req ? req.headers['user-agent'] || null : null;
    const payload = details || null;
    await pool.query(
      `INSERT INTO voter_activity_log (voter_id, action, details, ip_address, user_agent, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [voterId, action, payload, ip, userAgent]
    );
  } catch (err) {
    console.error('Failed to log voter activity:', err);
  }
}

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.set('trust proxy', 1); // Required for sessions to work on Render
app.use(session({
  // This looks for the variable you just added to Render
  secret: process.env.SESSION_SECRET || 'local_development_secret', 
  resave: false,
  saveUninitialized: false,
  cookie: { 
    // This ensures cookies only work over HTTPS when live
    secure: process.env.NODE_ENV === 'production' 
  }
}));
app.set('view engine', 'ejs');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'public', 'uploads');
    // Create uploads directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    // Check if file is an image
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Middleware to check admin authentication
function requireAdmin(req, res, next) {
  if (req.session.isAdmin) {
    return next();
  } else {
    return res.redirect('/admin/login');
  }
}

// Middleware to check super admin authentication
function requireSuperAdmin(req, res, next) {
  if (req.session.isAdmin && req.session.adminRole === 'super_admin') {
    return next();
  } else {
    return res.send('Access denied. Super admin privileges required.');
  }
}

// Middleware to check original super admin authentication (id = 1)
function requireOriginalSuperAdmin(req, res, next) {
  if (req.session.isAdmin && req.session.adminRole === 'super_admin' && req.session.adminId === 1) {
    return next();
  } else {
    return res.send('Access denied. Only the original super admin can perform this action.');
  }
}

// Parties
const parties = [
  'Prosperity Party (ብልጽግና ፓርቲ)',
  'Ethiopian Citizens for Social Justice - EZEMA (የኢትዮጵያ ዜጎች ለማኅበራዊ ፍትህ(ኢዜማ))',
  'National Movement of Amhara (NaMA) የአማራ ብሔራዊ ንቅናቄ(አብን)',
  'Oromo Federalist Congress (OFC) ኦሮሞ ፌዴራሊስት ኮንግረስ(ኦፌኮ)'
];

// Routes
app.get('/', (req, res) => {
  (async () => {
    try {
      const result = await pool.query('SELECT registration_start_date, registration_end_date, registration_open FROM admin_settings WHERE id = 1');
      const settings = result.rows[0] || {};
      const now = new Date();

      // Consider registration open if admin explicitly set the flag OR current time falls inside the date window
      const dateWindowOpen = settings.registration_start_date && settings.registration_end_date &&
        now >= new Date(settings.registration_start_date) && now <= new Date(settings.registration_end_date);
      const registrationPeriodOpen = (settings.registration_open === true) || Boolean(dateWindowOpen);

      const registrationStartDate = settings.registration_start_date ? new Date(settings.registration_start_date).toLocaleString() : '';
      const registrationEndDate = settings.registration_end_date ? new Date(settings.registration_end_date).toLocaleString() : '';
      const isSuperAdmin = req.session.isAdmin && req.session.adminRole === 'super_admin';
      res.render('index', { isSuperAdmin, registrationPeriodOpen, registrationStartDate, registrationEndDate });
    } catch (err) {
      console.error('Error fetching registration settings for home page:', err);
      const isSuperAdmin = req.session.isAdmin && req.session.adminRole === 'super_admin';
      res.render('index', { isSuperAdmin, registrationPeriodOpen: false, registrationStartDate: '', registrationEndDate: '' });
    }
  })();
});

app.get('/admin/login', async (req, res) => {
  if (req.session.isAdmin) {
    try {
      const result = await pool.query('SELECT election_start_date, election_end_date, registration_start_date, registration_end_date FROM admin_settings WHERE id = 1');
      const settings = result.rows[0] || {};
      const now = new Date();
      const votePeriodOpen = settings.election_start_date && settings.election_end_date &&
                            now >= new Date(settings.election_start_date) &&
                            now <= new Date(settings.election_end_date);
      const registrationPeriodOpen = settings.registration_start_date && settings.registration_end_date &&
                            now >= new Date(settings.registration_start_date) &&
                            now <= new Date(settings.registration_end_date);
      res.render('admin_login', { isLoggedIn: true, votePeriodOpen, registrationPeriodOpen, adminRole: req.session.adminRole || 'admin', adminId: req.session.adminId });
    } catch (err) {
      console.error(err);
      res.render('admin_login', { isLoggedIn: true, votePeriodOpen: false, registrationPeriodOpen: false, adminRole: req.session.adminRole || 'admin', adminId: req.session.adminId });
    }
  } else {
    res.render('admin_login', { isLoggedIn: false });
  }
});

app.post('/admin/login', async (req, res) => {
  const { username, password } = req.body;
  console.log('Admin login attempt:', { username, password: password ? '[HIDDEN]' : 'empty' });

  try {
    // First check if database connection works
    const testConnection = await pool.query('SELECT 1');
    console.log('Database connection test:', testConnection.rows);

    const result = await pool.query('SELECT * FROM admins WHERE username = $1', [username]);
    console.log('Admin query result:', result.rows.length, 'rows found');

    if (result.rows.length > 0) {
      const admin = result.rows[0];
      console.log('Found admin:', { id: admin.id, username: admin.username, passwordHash: admin.password.substring(0, 20) + '...' });

      const isValidPassword = await bcrypt.compare(password, admin.password);
      console.log('Password validation result:', isValidPassword);

      if (isValidPassword) {
        req.session.isAdmin = true;
        req.session.adminId = admin.id;
        req.session.adminRole = admin.role;
        console.log('Admin login successful for user:', username, 'Role:', admin.role);
        try {
          await logAdminAction(admin.id, 'admin_login_success', 'admins', { username: username }, req);
        } catch (err) {
          console.error('Audit log error (login):', err);
        }
        res.redirect('/admin/login');
      } else {
        console.log('Invalid password for admin:', username);
        res.redirect('/admin/login');
      }
    } else {
      console.log('Admin user not found:', username);
      res.redirect('/admin/login');
    }
  } catch (err) {
    console.error('Admin login error:', err);
    res.send('Database Error: ' + err.message);
  }
});

app.get('/login', (req, res) => {
  res.render('login');
});

app.post('/login', async (req, res) => {
  const { finnumber, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM voters WHERE finnumber = $1', [finnumber]);
    if (result.rows.length === 0) {
      return res.redirect('/login');
    }

    const voter = result.rows[0];

    // Fetch config values (with sensible defaults)
    const maxAttemptsRaw = await systemConfig.getSystemConfig('max_login_attempts');
    const lockDurationRaw = await systemConfig.getSystemConfig('lock_duration_minutes');
    const maxAttempts = Number(maxAttemptsRaw) || 5;
    const lockMinutes = Number(lockDurationRaw) || 30;

    const now = new Date();
    if (voter.locked_until && new Date(voter.locked_until) > now) {
      const remainingMs = new Date(voter.locked_until) - now;
      const remainingMinutes = Math.ceil(remainingMs / 60000);
      return res.render('voter_locked', { remainingMinutes, unlockAt: voter.locked_until });
    }

    const isValidPassword = await bcrypt.compare(password, voter.password);
    if (isValidPassword) {
      // reset attempts and clear lock
      try {
        await pool.query('UPDATE voters SET login_attempts = 0, locked_until = NULL WHERE id = $1', [voter.id]);
      } catch (err) {
        console.error('Failed to reset voter login attempts:', err);
      }
      req.session.voterId = voter.id;
      try {
        await logVoterActivity(voter.id, 'login', { finnumber: finnumber }, req);
      } catch (err) {
        console.error('Voter activity log error (login):', err);
      }
      if (!voter.has_changed_password) {
        res.redirect('/change-password');
      } else {
        res.redirect('/vote');
      }
    } else {
      // increment attempts
      const attempts = (voter.login_attempts || 0) + 1;
      if (attempts >= maxAttempts) {
        const unlockAt = new Date(Date.now() + lockMinutes * 60000);
        await pool.query('UPDATE voters SET login_attempts = 0, locked_until = $1 WHERE id = $2', [unlockAt, voter.id]);
        try {
          await logVoterActivity(voter.id, 'locked_out', { attempts, lock_minutes: lockMinutes }, req);
        } catch (err) {
          console.error('Voter activity log error (locked_out):', err);
        }
        const remainingMinutes = lockMinutes;
        return res.render('voter_locked', { remainingMinutes, unlockAt });
      } else {
        await pool.query('UPDATE voters SET login_attempts = $1 WHERE id = $2', [attempts, voter.id]);
        return res.redirect('/login');
      }
    }
  } catch (err) {
    console.error(err);
    res.send('Error');
  }
});

app.get('/change-password', (req, res) => {
  if (!req.session.voterId) {
    return res.redirect('/login');
  }
  res.render('change_password');
});

app.post('/change-password', async (req, res) => {
  const { newPassword, confirmPassword } = req.body;
  if (newPassword !== confirmPassword) {
    return res.send('Passwords do not match');
  }
  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE voters SET password = $1, has_changed_password = TRUE WHERE id = $2', [hashedPassword, req.session.voterId]);

    // Check vote period status
    const result = await pool.query('SELECT election_start_date, election_end_date FROM admin_settings WHERE id = 1');
    const settings = result.rows[0];
    const now = new Date();
    const votePeriodOpen = settings.election_start_date && settings.election_end_date &&
                          now >= new Date(settings.election_start_date) &&
                          now <= new Date(settings.election_end_date);

    if (votePeriodOpen) {
      res.redirect('/vote');
    } else {
      res.render('password_changed', { votePeriodOpen });
    }
    try {
      await logVoterActivity(req.session.voterId, 'change_password', null, req);
    } catch (err) {
      console.error('Voter activity log error (change-password):', err);
    }
  } catch (err) {
    console.error(err);
    res.send('Error');
  }
});

app.get('/vote', async (req, res) => {
  if (!req.session.voterId) {
    return res.redirect('/login');
  }
  try {
    const result = await pool.query('SELECT election_start_date, election_end_date FROM admin_settings WHERE id = 1');
    const settings = result.rows[0];
    const now = new Date();
    const votePeriodOpen = settings.election_start_date && settings.election_end_date &&
                          now >= new Date(settings.election_start_date) &&
                          now <= new Date(settings.election_end_date);
    if (!votePeriodOpen) {
      return res.send('Vote period is closed');
    }
    const voteCheck = await pool.query('SELECT * FROM votes WHERE voter_id = $1', [req.session.voterId]);
    if (voteCheck.rows.length > 0) {
      return res.send('You have already voted');
    }
    // Fetch active parties from database
    const partiesResult = await pool.query('SELECT * FROM parties WHERE is_active = TRUE ORDER BY name_english');
    // Create display names for parties
    const parties = partiesResult.rows.map(party => ({
      ...party,
      displayName: party.name_english + ' (' + party.name_amharic + ')'
    }));

    // Check if user is the original super admin (id = 1)
    const isOriginalSuperAdmin = req.session.isAdmin && req.session.adminRole === 'super_admin' && req.session.adminId === 1;

    res.render('vote', { parties, isOriginalSuperAdmin });
  } catch (err) {
    console.error(err);
    res.send('Error');
  }
});

app.post('/vote', async (req, res) => {
  const { party } = req.body;
  try {
    // Check if voter has already voted
    const voteCheck = await pool.query('SELECT * FROM votes WHERE voter_id = $1', [req.session.voterId]);
    if (voteCheck.rows.length > 0) {
      return res.send('You have already voted you cannot vote again. to view results go to the results page.');

    }

    await pool.query('INSERT INTO votes (voter_id, party) VALUES ($1, $2)', [req.session.voterId, party]);
    try {
      await logVoterActivity(req.session.voterId, 'vote_cast', { party: party }, req);
    } catch (err) {
      console.error('Voter activity log error (vote):', err);
    }
    res.render('vote_submitted', { party });
  } catch (err) {
    console.error(err);
    res.send('Error');
  }
});

app.get('/results', async (req, res) => {
  try {
    const result = await pool.query('SELECT party, COUNT(*) as votes FROM votes GROUP BY party');
    const settingsResult = await pool.query('SELECT election_start_date, election_end_date FROM admin_settings WHERE id = 1');
    const votersResult = await pool.query('SELECT COUNT(*) as total_voters FROM voters WHERE is_active = TRUE');
    const partiesResult = await pool.query('SELECT COUNT(*) as total_parties FROM parties WHERE is_active = TRUE');
    const settings = settingsResult.rows[0] || {};
    const totalVoters = parseInt(votersResult.rows[0].total_voters);
    const totalParties = parseInt(partiesResult.rows[0].total_parties);

    // Prepare data for client-side JavaScript
    const resultsData = {
      results: result.rows,
      electionStartDate: settings.election_start_date || null,
      electionEndDate: settings.election_end_date || null,
      totalVoters: totalVoters
    };

    res.render('results', {
      results: result.rows,
      electionStartDate: settings.election_start_date || null,
      electionEndDate: settings.election_end_date || null,
      totalParties: totalParties,
      totalVoters: totalVoters,
      resultsDataJson: JSON.stringify(resultsData)
    });
  } catch (err) {
    console.error(err);
    const fallbackData = { results: [], electionStartDate: null, electionEndDate: null, totalVoters: 0 };
    res.render('results', {
      results: [],
      electionStartDate: null,
      electionEndDate: null,
      totalParties: 0,
      totalVoters: 0,
      resultsDataJson: JSON.stringify(fallbackData)
    });
  }
});

app.get('/admin/register', requireAdmin, (req, res) => {
  res.render('register');
});

app.post('/admin/register', requireAdmin, async (req, res) => {
  const { fullname, age, sex, region, zone, woreda, city_kebele, phone_number, finnumber } = req.body;
  try {
    // Check registration and election periods
    const settingsResult = await pool.query('SELECT election_start_date, election_end_date, registration_start_date, registration_end_date FROM admin_settings WHERE id = 1');
    const settings = settingsResult.rows[0];
    const now = new Date();

    // Check if currently in election period
    if (settings.election_start_date && settings.election_end_date &&
        now >= new Date(settings.election_start_date) &&
        now <= new Date(settings.election_end_date)) {
      return res.render('registration_error', { errorMessage: 'Voter registration is not allowed during election period' });
    }

    // Check if registration period is set and current time is within it
    // Require registration to be explicitly open (treat NULL/undefined as closed)
    if (settings.registration_open !== true) {
      return res.render('registration_error', { errorMessage: 'Voter registration is currently closed by administrators' });
    }

    // Check if registration period is set and current time is within it
    if (settings.registration_start_date && settings.registration_end_date) {
      if (now < new Date(settings.registration_start_date) || now > new Date(settings.registration_end_date)) {
        return res.render('registration_error', { errorMessage: 'Voter registration is only allowed during the specified registration period' });
      }
    }

    // Validate FIN number format: 1234-1234-1234 (12 digits with dashes)
    const finRegex = /^\d{4}-\d{4}-\d{4}$/;
    if (!finRegex.test(finnumber)) {
      return res.send('FIN number must be in the format xxxx-xxxx-xxxx with exactly 12 digits');
    }

    const existingVoter = await pool.query('SELECT * FROM voters WHERE finnumber = $1', [finnumber]);
    if (existingVoter.rows.length > 0) {
      return res.send('FIN number already exists');
    }

    // Check phone number uniqueness if provided
    if (phone_number && phone_number.trim() !== '') {
      const existingPhone = await pool.query('SELECT * FROM voters WHERE phone_number = $1', [phone_number.trim()]);
      if (existingPhone.rows.length > 0) {
        return res.send('Phone number already exists');
      }
    }

    if (age < 18) {
      return res.send('Voter must be 18 years or older');
    }
    if (!region || !zone || !woreda || !city_kebele || region.trim() === '' || zone.trim() === '' || woreda.trim() === '' || city_kebele.trim() === '') {
      return res.send('All address fields (Region, Zone, Woreda, City/Kebele) are required');
    }
    const defaultPassword = 'default123';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);
    await pool.query('INSERT INTO voters (fullname, age, sex, region, zone, woreda, city_kebele, phone_number, finnumber, password) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
                     [fullname, age, sex, region.trim(), zone.trim(), woreda.trim(), city_kebele.trim(), phone_number ? phone_number.trim() : null, finnumber, hashedPassword]);

    // Log admin action
    console.log(`Admin ${req.session.adminId} registered voter: ${finnumber}`);
    try {
      await logAdminAction(req.session.adminId, 'register_voter', 'voters', { finnumber: finnumber }, req);
    } catch (err) {
      console.error('Audit log error (register voter):', err);
    }

    res.render('voter_registered');
  } catch (err) {
    console.error(err);
    res.send('Error');
  }
});

app.get('/admin/toggle', requireOriginalSuperAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT election_start_date, election_end_date FROM admin_settings WHERE id = 1');
    const settings = result.rows[0];
    const now = new Date();
    const isVotingOpen = settings.election_start_date && settings.election_end_date &&
                        now >= new Date(settings.election_start_date) &&
                        now <= new Date(settings.election_end_date);
    res.render('toggle', {
      electionStartDate: settings.election_start_date ? new Date(settings.election_start_date).toISOString().slice(0, 16) : '',
      electionEndDate: settings.election_end_date ? new Date(settings.election_end_date).toISOString().slice(0, 16) : '',
      isVotingOpen
    });
  } catch (err) {
    console.error(err);
    res.render('toggle', { electionStartDate: '', electionEndDate: '', isVotingOpen: false });
  }
});

app.post('/admin/toggle', requireOriginalSuperAdmin, async (req, res) => {
  const { election_start_date, election_end_date } = req.body;

  // Validate that both dates are provided
  if (!election_start_date || !election_end_date) {
    return res.send('Both start and end dates are required.');
  }

  // Validate that start date is before end date
  const startDate = new Date(election_start_date);
  const endDate = new Date(election_end_date);
  if (startDate >= endDate) {
    return res.send('Start date must be before end date.');
  }

  try {
    // Log the admin action for audit trail
    console.log(`Admin ${req.session.adminId} setting election period from ${election_start_date} to ${election_end_date} at ${new Date().toISOString()}`);

    // Update the election dates
    await pool.query('UPDATE admin_settings SET election_start_date = $1, election_end_date = $2 WHERE id = 1', [startDate, endDate]);

    // Log the successful action
    console.log(`Election period set by admin ${req.session.adminId} from ${startDate} to ${endDate}`);
    try {
      await logAdminAction(req.session.adminId, 'set_election_period', 'admin_settings', { startDate: startDate.toISOString(), endDate: endDate.toISOString() }, req);
    } catch (err) {
      console.error('Audit log error (set election):', err);
    }

    res.redirect('/admin/login');
  } catch (err) {
    console.error('Error setting election period:', err);
    res.send('Error updating election period');
  }
});

// Close election period (clear dates)
app.post('/admin/toggle/close', requireOriginalSuperAdmin, async (req, res) => {
  try {
    console.log(`Admin ${req.session.adminId} closing election period at ${new Date().toISOString()}`);
    await pool.query('UPDATE admin_settings SET election_start_date = NULL, election_end_date = NULL WHERE id = 1');
    try {
      await logAdminAction(req.session.adminId, 'close_election_period', 'admin_settings', { action: 'close' }, req);
    } catch (err) {
      console.error('Audit log error (close election):', err);
    }
    res.redirect('/admin/login');
  } catch (err) {
    console.error('Error closing election period:', err);
    res.send('Error closing election period');
  }
});

// Registration Period Management Routes
app.get('/admin/registration-period', requireOriginalSuperAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT registration_start_date, registration_end_date FROM admin_settings WHERE id = 1');
    const settings = result.rows[0];
    res.render('registration_period', {
      registrationStartDate: settings.registration_start_date ? new Date(settings.registration_start_date).toISOString().slice(0, 16) : '',
      registrationEndDate: settings.registration_end_date ? new Date(settings.registration_end_date).toISOString().slice(0, 16) : ''
    });
  } catch (err) {
    console.error(err);
    res.render('registration_period', { registrationStartDate: '', registrationEndDate: '' });
  }
});

app.post('/admin/registration-period', requireOriginalSuperAdmin, async (req, res) => {
  const { registration_start_date, registration_end_date } = req.body;

  // Validate that both dates are provided
  if (!registration_start_date || !registration_end_date) {
    return res.send('Both start and end dates are required.');
  }

  // Validate that start date is before end date
  const startDate = new Date(registration_start_date);
  const endDate = new Date(registration_end_date);
  if (startDate >= endDate) {
    return res.send('Start date must be before end date.');
  }

  try {
    // Log the admin action for audit trail
    console.log(`Admin ${req.session.adminId} setting registration period from ${registration_start_date} to ${registration_end_date} at ${new Date().toISOString()}`);

    // Update the registration dates
    await pool.query('UPDATE admin_settings SET registration_start_date = $1, registration_end_date = $2 WHERE id = 1', [startDate, endDate]);

    // Log the successful action
    console.log(`Registration period set by admin ${req.session.adminId} from ${startDate} to ${endDate}`);
    try {
      await logAdminAction(req.session.adminId, 'set_registration_period', 'admin_settings', { startDate: startDate.toISOString(), endDate: endDate.toISOString() }, req);
    } catch (err) {
      console.error('Audit log error (set registration):', err);
    }

    res.redirect('/admin/login');
  } catch (err) {
    console.error('Error setting registration period:', err);
    res.send('Error updating registration period');
  }
});

// Reset registration period (clear dates)
app.post('/admin/registration-period/reset', requireOriginalSuperAdmin, async (req, res) => {
  try {
    console.log(`Admin ${req.session.adminId} resetting registration period at ${new Date().toISOString()}`);
    await pool.query('UPDATE admin_settings SET registration_start_date = NULL, registration_end_date = NULL WHERE id = 1');
    try {
      await logAdminAction(req.session.adminId, 'reset_registration_period', 'admin_settings', { action: 'reset' }, req);
    } catch (err) {
      console.error('Audit log error (reset registration):', err);
    }
    res.redirect('/admin/registration-period');
  } catch (err) {
    console.error('Error resetting registration period:', err);
    res.send('Error resetting registration period');
  }
});

// Super Admin Routes for managing admins
app.get('/admin/manage-admins', requireSuperAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, username, role, created_at, created_by FROM admins ORDER BY created_at DESC');
    const message = req.query.message;
    res.render('manage_admins', {
      admins: result.rows,
      currentAdminRole: req.session.adminRole,
      message: message
    });
  } catch (err) {
    console.error(err);
    res.send('Error loading admin management page');
  }
});

// Admin Audit Log viewer
app.get('/admin/audit', requireOriginalSuperAdmin, async (req, res) => {
  try {
    console.log('/admin/audit requested by adminId=', req.session && req.session.adminId);
    const { admin_id, action, table_name, from, to } = req.query;
    let sql = `SELECT id, admin_id, action, table_name, record_id, old_values, new_values, ip_address, user_agent, created_at
               FROM admin_audit_log WHERE 1=1`;
    const params = [];
    if (admin_id) {
      params.push(admin_id);
      sql += ` AND admin_id = $${params.length}`;
    }
    if (action) {
      params.push(`%${action}%`);
      sql += ` AND action ILIKE $${params.length}`;
    }
    if (table_name) {
      params.push(table_name);
      sql += ` AND table_name = $${params.length}`;
    }
    if (from) {
      params.push(new Date(from));
      sql += ` AND created_at >= $${params.length}`;
    }
    if (to) {
      params.push(new Date(to));
      sql += ` AND created_at <= $${params.length}`;
    }
    sql += ` ORDER BY created_at DESC LIMIT 500`;

    const result = await pool.query(sql, params);
    res.render('admin_audit', {
      audits: result.rows,
      filters: { admin_id: admin_id || '', action: action || '', table_name: table_name || '', from: from || '', to: to || '' }
    });
  } catch (err) {
    console.error('Error loading admin audit log:', err);
    res.send('Error loading audit log');
  }
});

// Register Admin Routes
app.get('/admin/register-admin', requireSuperAdmin, (req, res) => {
  res.render('register_admin');
});

app.post('/admin/register-admin', requireSuperAdmin, async (req, res) => {
  const { username, password, confirmPassword, role } = req.body;

  // Validate passwords match
  if (password !== confirmPassword) {
    return res.render('register_admin', { error: 'Passwords do not match' });
  }

  // Validate role
  if (!['admin', 'super_admin'].includes(role)) {
    return res.render('register_admin', { error: 'Invalid role specified' });
  }

  try {
    // Check if username already exists
    const existingAdmin = await pool.query('SELECT * FROM admins WHERE username = $1', [username]);
    if (existingAdmin.rows.length > 0) {
      return res.render('register_admin', { error: 'Username already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new admin
    await pool.query('INSERT INTO admins (username, password, role, created_by) VALUES ($1, $2, $3, $4)',
                     [username, hashedPassword, role, req.session.adminId]);

    console.log(`Super admin ${req.session.adminId} registered new ${role}: ${username}`);
    try {
      await logAdminAction(req.session.adminId, 'register_admin', 'admins', { username: username, role: role }, req);
    } catch (err) {
      console.error('Audit log error (register admin):', err);
    }
    res.redirect('/admin/manage-admins?message=Admin registered successfully');
  } catch (err) {
    console.error('Error registering admin:', err);
    res.render('register_admin', { error: 'Error registering admin' });
  }
});

app.post('/admin/create-admin', requireSuperAdmin, async (req, res) => {
  const { username, password, role } = req.body;

  // Validate role
  if (!['admin', 'super_admin'].includes(role)) {
    return res.send('Invalid role specified');
  }

  try {
    // Check if username already exists
    const existingAdmin = await pool.query('SELECT * FROM admins WHERE username = $1', [username]);
    if (existingAdmin.rows.length > 0) {
      return res.send('Username already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new admin
    await pool.query('INSERT INTO admins (username, password, role, created_by) VALUES ($1, $2, $3, $4)',
                     [username, hashedPassword, role, req.session.adminId]);

    console.log(`Super admin ${req.session.adminId} created new ${role}: ${username}`);
    try {
      await logAdminAction(req.session.adminId, 'create_admin', 'admins', { username: username, role: role }, req);
    } catch (err) {
      console.error('Audit log error (create admin):', err);
    }
    res.redirect('/admin/manage-admins');
  } catch (err) {
    console.error('Error creating admin:', err);
    res.send('Error creating admin');
  }
});

app.post('/admin/delete-admin/:id', requireSuperAdmin, async (req, res) => {
  const adminId = req.params.id;

  // Prevent deleting yourself
  if (parseInt(adminId) === req.session.adminId) {
    return res.send('Cannot delete your own account');
  }

  try {
    // Check if admin exists
    const admin = await pool.query('SELECT * FROM admins WHERE id = $1', [adminId]);
    if (admin.rows.length === 0) {
      return res.send('Admin not found');
    }

    // Allow all super admins to delete other admins, but prevent deleting yourself

    // Delete admin
    await pool.query('DELETE FROM admins WHERE id = $1', [adminId]);

    console.log(`Super admin ${req.session.adminId} deleted admin ${adminId}`);
    try {
      await logAdminAction(req.session.adminId, 'delete_admin', 'admins', { deleted_admin_id: adminId }, req);
    } catch (err) {
      console.error('Audit log error (delete admin):', err);
    }
    res.redirect('/admin/manage-admins');
  } catch (err) {
    console.error('Error deleting admin:', err);
    res.send('Error deleting admin');
  }
});

// Party Management Routes
app.get('/admin/parties', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM parties WHERE is_active = TRUE ORDER BY created_at DESC');
    res.render('admin_parties', { parties: result.rows, isOriginalSuperAdmin: req.session.adminId === 1 });
  } catch (err) {
    console.error(err);
    res.send('Error loading parties');
  }
});

app.get('/admin/parties/add', requireOriginalSuperAdmin, (req, res) => {
  res.render('add_party');
});

app.post('/admin/parties/add', requireOriginalSuperAdmin, upload.fields([
  { name: 'leader_image_file', maxCount: 1 },
  { name: 'logo_file', maxCount: 1 }
]), async (req, res) => {
  const {
    name_english, name_amharic, leader_name_english, leader_name_amharic,
    ideology, description_english, description_amharic, logo_url, leader_image_url
  } = req.body;

  try {
    // Handle image uploads - prioritize uploaded files over URLs
    let finalLeaderImageUrl = leader_image_url || null;
    let finalLogoUrl = logo_url || null;

    // If files were uploaded, use the uploaded file paths
    if (req.files) {
      if (req.files.leader_image_file && req.files.leader_image_file[0]) {
        finalLeaderImageUrl = '/uploads/' + req.files.leader_image_file[0].filename;
      }
      if (req.files.logo_file && req.files.logo_file[0]) {
        finalLogoUrl = '/uploads/' + req.files.logo_file[0].filename;
      }
    }

    await pool.query(`
      INSERT INTO parties (
        name_english, name_amharic, leader_name_english, leader_name_amharic,
        ideology, description_english, description_amharic, logo_url, leader_image_url, is_active, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `, [
      name_english, name_amharic, leader_name_english, leader_name_amharic,
      ideology, description_english, description_amharic, finalLogoUrl, finalLeaderImageUrl, true, req.session.adminId
    ]);

    console.log(`Original super admin ${req.session.adminId} added new party: ${name_english}`);
    try {
      await logAdminAction(req.session.adminId, 'add_party', 'parties', { name_english: name_english }, req);
    } catch (err) {
      console.error('Audit log error (add party):', err);
    }
    res.redirect('/admin/parties');
  } catch (err) {
    console.error('Error adding party:', err);
    res.send('Error adding party');
  }
});

app.get('/admin/parties/edit/:id', requireOriginalSuperAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM parties WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.send('Party not found');
    }
    res.render('edit_party', { party: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.send('Error loading party');
  }
});

app.post('/admin/parties/edit/:id', requireOriginalSuperAdmin, upload.fields([
  { name: 'leader_image_file', maxCount: 1 },
  { name: 'logo_file', maxCount: 1 }
]), async (req, res) => {
  const {
    name_english, name_amharic, leader_name_english, leader_name_amharic,
    ideology, description_english, description_amharic, logo_url, leader_image_url
  } = req.body;

  try {
    // Get current party data to preserve existing images if not being updated
    const currentParty = await pool.query('SELECT logo_url, leader_image_url FROM parties WHERE id = $1', [req.params.id]);
    if (currentParty.rows.length === 0) {
      return res.send('Party not found');
    }

    // Handle image uploads - prioritize uploaded files over URLs, keep existing if neither provided
    let finalLeaderImageUrl = currentParty.rows[0].leader_image_url;
    let finalLogoUrl = currentParty.rows[0].logo_url;

    // If URL is provided and not empty, use it
    if (leader_image_url && leader_image_url.trim() !== '') {
      finalLeaderImageUrl = leader_image_url.trim();
    }
    if (logo_url && logo_url.trim() !== '') {
      finalLogoUrl = logo_url.trim();
    }

    // If files were uploaded, use the uploaded file paths (takes priority)
    if (req.files) {
      if (req.files.leader_image_file && req.files.leader_image_file[0]) {
        finalLeaderImageUrl = '/uploads/' + req.files.leader_image_file[0].filename;
      }
      if (req.files.logo_file && req.files.logo_file[0]) {
        finalLogoUrl = '/uploads/' + req.files.logo_file[0].filename;
      }
    }

    await pool.query(`
      UPDATE parties SET
        name_english = $1, name_amharic = $2, leader_name_english = $3, leader_name_amharic = $4,
        ideology = $5, description_english = $6, description_amharic = $7,
        logo_url = $8, leader_image_url = $9, updated_at = CURRENT_TIMESTAMP
      WHERE id = $10
    `, [
      name_english, name_amharic, leader_name_english, leader_name_amharic,
      ideology, description_english, description_amharic, finalLogoUrl, finalLeaderImageUrl, req.params.id
    ]);

    console.log(`Original super admin ${req.session.adminId} updated party: ${name_english}`);
    try {
      await logAdminAction(req.session.adminId, 'edit_party', 'parties', { party_id: req.params.id, name_english: name_english }, req);
    } catch (err) {
      console.error('Audit log error (edit party):', err);
    }
    res.redirect('/admin/parties');
  } catch (err) {
    console.error('Error updating party:', err);
    res.send('Error updating party');
  }
});

app.post('/admin/parties/delete/:id', requireOriginalSuperAdmin, async (req, res) => {
  try {
    // Check if party exists
    const party = await pool.query('SELECT * FROM parties WHERE id = $1', [req.params.id]);
    if (party.rows.length === 0) {
      return res.send('Party not found');
    }

    // Delete the party
    await pool.query('DELETE FROM parties WHERE id = $1', [req.params.id]);

    console.log(`Original super admin ${req.session.adminId} deleted party: ${party.rows[0].name_english}`);
    try {
      await logAdminAction(req.session.adminId, 'delete_party', 'parties', { party_id: req.params.id, name_english: party.rows[0].name_english }, req);
    } catch (err) {
      console.error('Audit log error (delete party):', err);
    }
    res.redirect('/admin/parties');
  } catch (err) {
    console.error('Error deleting party:', err);
    res.send('Error deleting party');
  }
});

// Database Reset Route - Only for Original Super Admin
app.get('/admin/reset-database', requireOriginalSuperAdmin, async (req, res) => {
  try {
    // Check if voting period is currently open
    const result = await pool.query('SELECT election_start_date, election_end_date FROM admin_settings WHERE id = 1');
    const settings = result.rows[0];
    const now = new Date();
    const votePeriodOpen = settings && settings.election_start_date && settings.election_end_date &&
                          now >= new Date(settings.election_start_date) &&
                          now <= new Date(settings.election_end_date);

    if (votePeriodOpen) {
      return res.render('reset_error');
    }

    res.render('reset_database');
  } catch (err) {
    console.error('Error checking voting period:', err);
    res.send('Error checking voting period status');
  }
});

app.post('/admin/reset-database', requireOriginalSuperAdmin, async (req, res) => {
  const { confirm_reset } = req.body;

  if (confirm_reset !== 'RESET_ALL_DATA') {
    return res.send('Invalid confirmation code. Database reset cancelled.');
  }

  try {
    // Start transaction
    await pool.query('BEGIN');

    // Clear all data except original super admin
    await pool.query('DELETE FROM votes');
    await pool.query('DELETE FROM voter_activity_log');
    await pool.query('DELETE FROM voters');
    await pool.query('DELETE FROM parties');
    await pool.query('DELETE FROM admin_audit_log');
    await pool.query('DELETE FROM admins WHERE id != 1');
    await pool.query('DELETE FROM admin_settings');
    await pool.query('DELETE FROM system_config');

    // Reset sequences
    await pool.query('ALTER SEQUENCE voters_id_seq RESTART WITH 1');
    await pool.query('ALTER SEQUENCE parties_id_seq RESTART WITH 1');
    await pool.query('ALTER SEQUENCE votes_id_seq RESTART WITH 1');
    await pool.query('ALTER SEQUENCE admins_id_seq RESTART WITH 2');
    await pool.query('ALTER SEQUENCE admin_settings_id_seq RESTART WITH 1');
    await pool.query('ALTER SEQUENCE system_config_id_seq RESTART WITH 1');
    await pool.query('ALTER SEQUENCE admin_audit_log_id_seq RESTART WITH 1');
    await pool.query('ALTER SEQUENCE voter_activity_log_id_seq RESTART WITH 1');

    // Re-insert initial data
    await pool.query('INSERT INTO admin_settings (registration_open) VALUES (TRUE)');

    await pool.query(`
      INSERT INTO parties (name_english, name_amharic, leader_name_english, leader_name_amharic, ideology, description_english, description_amharic, is_active, created_by) VALUES
      ('Prosperity Party', 'ብልጽግና ፓርቲ', 'Abiy Ahmed', 'አብይ አህመድ', 'Development and Prosperity', 'The Prosperity Party is committed to transforming Ethiopia through sustainable development, economic growth, and national unity.', 'ብልጽግና ፓርቲ ኢትዮጵያን በማለሳለስ ኢኮኖሚ እድገት እና ብሔራዊ አንድነት በመላክ ለመለወጥ ተለያዩበታል።', true, 1),
      ('Ethiopian Citizens for Social Justice - EZEMA', 'የኢትዮጵያ ዜጎች ለማኅበራዊ ፍትህ(ኢዜማ)', 'Berhanu Nega', 'ብርሃኑ ነጋ', 'Social Justice and Democracy', 'EZEMA focuses on promoting social justice, democratic values, and equal opportunities for all Ethiopian citizens.', 'ኢዜማ ማኅበራዊ ፍትህን ለማሳደግ፣ ዲሞክራሲያዊ እሴቶችን ለማሳደግ እና ለሁሉም ኢትዮጵያ ዜጎች እኩል እድሎችን ለማሳደግ ያተኮራል።', true, 1),
      ('National Movement of Amhara (NaMA)', 'የአማራ ብሔራዊ ንቅናቄ(አብን)', 'Demeke Mekonnen', 'ደመቀ መኮንን', 'Regional Autonomy and Rights', 'NaMA advocates for the rights and autonomy of the Amhara people while promoting national unity and development.', 'አብን የአማራ ህዝብ መብቶችን እና ራሱን ለማስተያየት ብሔራዊ አንድነትን እና እድገትን በማሳደግ ያተኮራል።', true, 1),
      ('Oromo Federalist Congress (OFC)', 'ኦሮሞ ፌዴራሊስት ኮንግረስ(ኦፌኮ)', 'Merera Gudina', 'መራራ ጉዲና', 'Federalism and Self-Determination', 'OFC promotes federalist principles, self-determination for the Oromo people, and democratic governance.', 'ኦፌኮ ፌዴራሊስት መርሆችን ለማሳደግ፣ ለኦሮሞ ህዝብ ራሱን ለማስተያየት እና ዲሞክራሲያዊ አስተያየት ለማሳደግ ያተኮራል።', true, 1)
    `);

    await pool.query(`
      INSERT INTO system_config (config_key, config_value, description) VALUES
      ('system_name', '"Ethiopian Voting System"', 'Name of the voting system'),
      ('version', '"1.0.0"', 'Current system version'),
      ('max_login_attempts', '5', 'Maximum failed login attempts before account lock'),
      ('lock_duration_minutes', '30', 'Account lock duration in minutes')
    `);

    // Commit transaction
    await pool.query('COMMIT');

    console.log(`Original super admin ${req.session.adminId} performed complete database reset`);

    try {
      await logAdminAction(req.session.adminId, 'reset_database', 'system', { scope: 'all' }, req);
    } catch (err) {
      console.error('Audit log error (reset database):', err);
    }

    res.render('reset_success');
  } catch (err) {
    // Rollback on error
    await pool.query('ROLLBACK');
    console.error('Error resetting database:', err);
    res.send('Error resetting database: ' + err.message);
  }
});

// Public parties page
app.get('/parties', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM parties WHERE is_active = TRUE ORDER BY name_english');
    res.render('parties', { parties: result.rows });
  } catch (err) {
    console.error(err);
    res.render('parties', { parties: [] });
  }
});

// About parties page (dynamic version of party.html)
app.get('/party.html', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM parties WHERE is_active = TRUE ORDER BY name_english');
    res.render('party_dynamic', { parties: result.rows });
  } catch (err) {
    console.error(err);
    // Fallback to static file if database fails
    res.sendFile(path.join(__dirname, 'public', 'party.html'));
  }
});

app.get('/admin/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error(err);
      res.send('Error logging out');
    } else {
      res.redirect('/admin/login');
    }
  });
});

// Static files middleware (placed after routes to allow dynamic routes to take precedence)
app.use(express.static('public'));

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
