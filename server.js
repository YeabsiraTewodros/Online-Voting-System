const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const ejs = require('ejs');
require('dotenv').config();

// Helper function to check if voting is currently open
function isVotingOpen() {
  const now = new Date();
  // This will be replaced with database query in routes
  return false; // Placeholder
}

const app = express();
const port = process.env.PORT || 3000;

// PostgreSQL connection
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
}));
app.use(express.static('public'));
app.set('view engine', 'ejs');

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
  const isSuperAdmin = req.session.isAdmin && req.session.adminRole === 'super_admin';
  res.render('index', { isSuperAdmin });
});

app.get('/admin/login', async (req, res) => {
  if (req.session.isAdmin) {
    try {
      const result = await pool.query('SELECT election_start_date, election_end_date FROM admin_settings WHERE id = 1');
      const settings = result.rows[0];
      const now = new Date();
      const votePeriodOpen = settings.election_start_date && settings.election_end_date &&
                            now >= new Date(settings.election_start_date) &&
                            now <= new Date(settings.election_end_date);
      res.render('admin_login', { isLoggedIn: true, votePeriodOpen, adminRole: req.session.adminRole || 'admin', adminId: req.session.adminId });
    } catch (err) {
      console.error(err);
      res.render('admin_login', { isLoggedIn: true, votePeriodOpen: false, adminRole: req.session.adminRole || 'admin', adminId: req.session.adminId });
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
        res.redirect('/admin/login');
      } else {
        console.log('Invalid password for admin:', username);
        res.send('Invalid admin credentials');
      }
    } else {
      console.log('Admin user not found:', username);
      res.send('Invalid admin credentials');
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
    if (result.rows.length > 0) {
      const voter = result.rows[0];
      const isValidPassword = await bcrypt.compare(password, voter.password);
      if (isValidPassword) {
        req.session.voterId = voter.id;
        if (!voter.has_changed_password) {
          res.redirect('/change-password');
        } else {
          res.redirect('/vote');
        }
      } else {
        res.send('Invalid credentials');
      }
    } else {
      res.send('Invalid credentials');
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
    res.render('vote', { parties });
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
    const settings = settingsResult.rows[0] || {};
    const totalVoters = parseInt(votersResult.rows[0].total_voters);

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
      totalParties: parties.length,
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
      totalParties: parties.length,
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

    res.redirect('/admin/login');
  } catch (err) {
    console.error('Error setting election period:', err);
    res.send('Error updating election period');
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
    res.redirect('/admin/manage-admins');
  } catch (err) {
    console.error('Error deleting admin:', err);
    res.send('Error deleting admin');
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

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
