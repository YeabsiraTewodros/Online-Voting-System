# Code Explanations — Ethiopian Voting System

This document provides line-by-line, concise explanations for project source files. I will add files in batches; this first batch contains `server.js` fully annotated.

---

## File: server.js

1: const express = require('express');
- Imports the Express framework for building the web server and routing.

2: const session = require('express-session');
- Imports `express-session` to manage user sessions on the server.

3: const bodyParser = require('body-parser');
- Imports middleware to parse incoming request bodies (form data).

4: const bcrypt = require('bcryptjs');
- Imports `bcryptjs` for hashing and comparing passwords securely.

5: const { Pool } = require('pg');
- Imports PostgreSQL client `Pool` class to interact with the database.

6: const ejs = require('ejs');
- Imports EJS templating engine (used to render `.ejs` views).

7: const multer = require('multer');
- Imports `multer` for handling multipart/form-data (file uploads).

8: const path = require('path');
- Imports Node's `path` module for cross-platform file path handling.

9: const fs = require('fs');
- Imports Node's `fs` module for file system operations.

10: require('dotenv').config();
- Loads environment variables from a `.env` file into `process.env`.

11: 
12: // Helper function to check if voting is currently open
13: function isVotingOpen() {
14:   const now = new Date();
15:   // This will be replaced with database query in routes
16:   return false; // Placeholder
17: }
- Defines a placeholder `isVotingOpen` function that returns false; route handlers use DB-based checks instead.

18: 
19: const app = express();
- Creates an Express application instance.

20: const port = process.env.PORT || 3000;
- Reads server port from env or defaults to 3000.

21: 
22: // PostgreSQL connection
23: const pool = new Pool({
24:   user: process.env.DB_USER,
25:   host: process.env.DB_HOST,
26:   database: process.env.DB_NAME,
27:   password: process.env.DB_PASSWORD,
28:   port: process.env.DB_PORT,
29: });
- Creates a PostgreSQL connection pool using credentials from environment variables.

30: 
31: // Middleware
32: app.use(bodyParser.urlencoded({ extended: true }));
- Adds body-parser middleware to parse URL-encoded form data.

33: app.use(session({
34:   secret: process.env.SESSION_SECRET,
35:   resave: false,
36:   saveUninitialized: true,
37: }));
- Configures session middleware using a secret from env; controls session behavior.

38: app.set('view engine', 'ejs');
- Sets EJS as the view/template engine for rendering responses.

39: 
40: // Configure multer for file uploads
41: const storage = multer.diskStorage({
42:   destination: function (req, file, cb) {
43:     const uploadDir = path.join(__dirname, 'public', 'uploads');
44:     // Create uploads directory if it doesn't exist
45:     if (!fs.existsSync(uploadDir)) {
46:       fs.mkdirSync(uploadDir, { recursive: true });
47:     }
48:     cb(null, uploadDir);
49:   },
50:   filename: function (req, file, cb) {
51:     // Generate unique filename with timestamp
52:     const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
53:     cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
54:   }
55: });
- Sets up storage engine for multer: ensures `public/uploads` exists and names uploaded files uniquely.

56: 
57: const upload = multer({
58:   storage: storage,
59:   limits: {
60:     fileSize: 5 * 1024 * 1024, // 5MB limit
61:   },
62:   fileFilter: function (req, file, cb) {
63:     // Check if file is an image
64:     if (file.mimetype.startsWith('image/')) {
65:       cb(null, true);
66:     } else {
67:       cb(new Error('Only image files are allowed!'), false);
68:     }
69:   }
70: });
- Creates multer instance with storage, a 5MB file size limit, and an image-only filter.

71: 
72: // Middleware to check admin authentication
73: function requireAdmin(req, res, next) {
74:   if (req.session.isAdmin) {
75:     return next();
76:   } else {
77:     return res.redirect('/admin/login');
78:   }
79: }
- Defines `requireAdmin` middleware that redirects unauthenticated admins to login.

80: 
81: // Middleware to check super admin authentication
82: function requireSuperAdmin(req, res, next) {
83:   if (req.session.isAdmin && req.session.adminRole === 'super_admin') {
84:     return next();
85:   } else {
86:     return res.send('Access denied. Super admin privileges required.');
87:   }
88: }
- Defines `requireSuperAdmin` middleware returning an access-denied message if role mismatch.

89: 
90: // Middleware to check original super admin authentication (id = 1)
91: function requireOriginalSuperAdmin(req, res, next) {
92:   if (req.session.isAdmin && req.session.adminRole === 'super_admin' && req.session.adminId === 1) {
93:     return next();
94:   } else {
95:     return res.send('Access denied. Only the original super admin can perform this action.');
96:   }
97: }
- Middleware to restrict certain operations to the original super admin (admin with id 1).

98: 
99: // Parties
100: const parties = [
101:   'Prosperity Party (ብልጽግና ፓርቲ)',
102:   'Ethiopian Citizens for Social Justice - EZEMA (የኢትዮጵያ ዜጎች ለማኅበራዊ ፍትህ(ኢዜማ))',
103:   'National Movement of Amhara (NaMA) የአማራ ብሔራዊ ንቅናቄ(አብን)',
104:   'Oromo Federalist Congress (OFC) ኦሮሞ ፌዴራሊስት ኮንግረስ(ኦፌኮ)'
105: ];
- In-memory sample list of parties (unused by DB-backed routes but present as seed/static data).

106: 
107: // Routes
108: app.get('/', (req, res) => {
109:   const isSuperAdmin = req.session.isAdmin && req.session.adminRole === 'super_admin';
110:   res.render('index', { isSuperAdmin });
111: });
- Root route: renders `index` view and passes `isSuperAdmin` flag for view logic.

112: 
113: app.get('/admin/login', async (req, res) => {
114:   if (req.session.isAdmin) {
115:     try {
116:       const result = await pool.query('SELECT election_start_date, election_end_date FROM admin_settings WHERE id = 1');
117:       const settings = result.rows[0];
118:       const now = new Date();
119:       const votePeriodOpen = settings.election_start_date && settings.election_end_date &&
120:                             now >= new Date(settings.election_start_date) &&
121:                             now <= new Date(settings.election_end_date);
122:       res.render('admin_login', { isLoggedIn: true, votePeriodOpen, adminRole: req.session.adminRole || 'admin', adminId: req.session.adminId });
123:     } catch (err) {
124:       console.error(err);
125:       res.render('admin_login', { isLoggedIn: true, votePeriodOpen: false, adminRole: req.session.adminRole || 'admin', adminId: req.session.adminId });
126:     }
127:   } else {
128:     res.render('admin_login', { isLoggedIn: false });
129:   }
130: });
- GET `/admin/login`: if already logged in, fetches election dates to compute `votePeriodOpen` and renders admin dashboard; otherwise shows login form.

131: 
132: app.post('/admin/login', async (req, res) => {
133:   const { username, password } = req.body;
134:   console.log('Admin login attempt:', { username, password: password ? '[HIDDEN]' : 'empty' });
135: 
136:   try {
137:     // First check if database connection works
138:     const testConnection = await pool.query('SELECT 1');
139:     console.log('Database connection test:', testConnection.rows);
140: 
141:     const result = await pool.query('SELECT * FROM admins WHERE username = $1', [username]);
142:     console.log('Admin query result:', result.rows.length, 'rows found');
143: 
144:     if (result.rows.length > 0) {
145:       const admin = result.rows[0];
146:       console.log('Found admin:', { id: admin.id, username: admin.username, passwordHash: admin.password.substring(0, 20) + '...' });
147: 
148:       const isValidPassword = await bcrypt.compare(password, admin.password);
149:       console.log('Password validation result:', isValidPassword);
150: 
151:       if (isValidPassword) {
152:         req.session.isAdmin = true;
153:         req.session.adminId = admin.id;
154:         req.session.adminRole = admin.role;
155:         console.log('Admin login successful for user:', username, 'Role:', admin.role);
156:         res.redirect('/admin/login');
157:       } else {
158:         console.log('Invalid password for admin:', username);
159:         res.redirect('/admin/login');
160:       }
161:     } else {
162:       console.log('Admin user not found:', username);
163:       res.redirect('/admin/login');
164:     }
165:   } catch (err) {
166:     console.error('Admin login error:', err);
167:     res.send('Database Error: ' + err.message);
168:   }
169: });
- POST `/admin/login`: authenticates admin via DB lookup and bcrypt password comparison; sets session on success.

170: 
171: app.get('/login', (req, res) => {
172:   res.render('login');
173: });
- GET `/login`: renders voter login page.

174: 
175: app.post('/login', async (req, res) => {
176:   const { finnumber, password } = req.body;
177:   try {
178:     const result = await pool.query('SELECT * FROM voters WHERE finnumber = $1', [finnumber]);
179:     if (result.rows.length > 0) {
180:       const voter = result.rows[0];
181:       const isValidPassword = await bcrypt.compare(password, voter.password);
182:       if (isValidPassword) {
183:         req.session.voterId = voter.id;
184:         if (!voter.has_changed_password) {
185:           res.redirect('/change-password');
186:         } else {
187:           res.redirect('/vote');
188:         }
189:       } else {
190:         res.redirect('/login');
191:       }
192:     } else {
193:       res.redirect('/login');
194:     }
195:   } catch (err) {
196:     console.error(err);
197:     res.send('Error');
198:   }
199: });
- POST `/login`: authenticates voter; enforces password change if default password still in use; redirects accordingly.

200: 
201: app.get('/change-password', (req, res) => {
202:   if (!req.session.voterId) {
203:     return res.redirect('/login');
204:   }
205:   res.render('change_password');
206: });
- GET `/change-password`: ensures voter is logged in and renders change password view.

207: 
208: app.post('/change-password', async (req, res) => {
209:   const { newPassword, confirmPassword } = req.body;
210:   if (newPassword !== confirmPassword) {
211:     return res.send('Passwords do not match');
212:   }
213:   try {
214:     const hashedPassword = await bcrypt.hash(newPassword, 10);
215:     await pool.query('UPDATE voters SET password = $1, has_changed_password = TRUE WHERE id = $2', [hashedPassword, req.session.voterId]);
216: 
217:     // Check vote period status
218:     const result = await pool.query('SELECT election_start_date, election_end_date FROM admin_settings WHERE id = 1');
219:     const settings = result.rows[0];
220:     const now = new Date();
221:     const votePeriodOpen = settings.election_start_date && settings.election_end_date &&
222:                           now >= new Date(settings.election_start_date) &&
223:                           now <= new Date(settings.election_end_date);
224: 
225:     if (votePeriodOpen) {
226:       res.redirect('/vote');
227:     } else {
228:       res.render('password_changed', { votePeriodOpen });
229:     }
230:   } catch (err) {
231:     console.error(err);
232:     res.send('Error');
233:   }
234: });
- POST `/change-password`: updates voter's password, marks `has_changed_password`, then redirects depending on vote period status.

235: 
236: app.get('/vote', async (req, res) => {
237:   if (!req.session.voterId) {
238:     return res.redirect('/login');
239:   }
240:   try {
241:     const result = await pool.query('SELECT election_start_date, election_end_date FROM admin_settings WHERE id = 1');
242:     const settings = result.rows[0];
243:     const now = new Date();
244:     const votePeriodOpen = settings.election_start_date && settings.election_end_date &&
245:                           now >= new Date(settings.election_start_date) &&
246:                           now <= new Date(settings.election_end_date);
247:     if (!votePeriodOpen) {
248:       return res.send('Vote period is closed');
249:     }
250:     const voteCheck = await pool.query('SELECT * FROM votes WHERE voter_id = $1', [req.session.voterId]);
251:     if (voteCheck.rows.length > 0) {
252:       return res.send('You have already voted');
253:     }
254:     // Fetch active parties from database
255:     const partiesResult = await pool.query('SELECT * FROM parties WHERE is_active = TRUE ORDER BY name_english');
256:     // Create display names for parties
257:     const parties = partiesResult.rows.map(party => ({
258:       ...party,
259:       displayName: party.name_english + ' (' + party.name_amharic + ')'
260:     }));
261: 
262:     // Check if user is the original super admin (id = 1)
263:     const isOriginalSuperAdmin = req.session.isAdmin && req.session.adminRole === 'super_admin' && req.session.adminId === 1;
264: 
265:     res.render('vote', { parties, isOriginalSuperAdmin });
266:   } catch (err) {
267:     console.error(err);
268:     res.send('Error');
269:   }
270: });
- GET `/vote`: enforces login, checks vote period, prevents double voting, fetches active parties and renders `vote` view.

271: 
272: app.post('/vote', async (req, res) => {
273:   const { party } = req.body;
274:   try {
275:     // Check if voter has already voted
276:     const voteCheck = await pool.query('SELECT * FROM votes WHERE voter_id = $1', [req.session.voterId]);
277:     if (voteCheck.rows.length > 0) {
278:       return res.send('You have already voted you cannot vote again. to view results go to the results page.');
279: 
280:     }
281: 
282:     await pool.query('INSERT INTO votes (voter_id, party) VALUES ($1, $2)', [req.session.voterId, party]);
283:     res.render('vote_submitted', { party });
284:   } catch (err) {
285:     console.error(err);
286:     res.send('Error');
287:   }
288: });
- POST `/vote`: records a vote for the logged-in voter unless they've already voted; then renders a submission confirmation.

289: 
290: app.get('/results', async (req, res) => {
291:   try {
292:     const result = await pool.query('SELECT party, COUNT(*) as votes FROM votes GROUP BY party');
293:     const settingsResult = await pool.query('SELECT election_start_date, election_end_date FROM admin_settings WHERE id = 1');
294:     const votersResult = await pool.query('SELECT COUNT(*) as total_voters FROM voters WHERE is_active = TRUE');
295:     const partiesResult = await pool.query('SELECT COUNT(*) as total_parties FROM parties WHERE is_active = TRUE');
296:     const settings = settingsResult.rows[0] || {};
297:     const totalVoters = parseInt(votersResult.rows[0].total_voters);
298:     const totalParties = parseInt(partiesResult.rows[0].total_parties);
299: 
300:     // Prepare data for client-side JavaScript
301:     const resultsData = {
302:       results: result.rows,
303:       electionStartDate: settings.election_start_date || null,
304:       electionEndDate: settings.election_end_date || null,
305:       totalVoters: totalVoters
306:     };
307: 
308:     res.render('results', {
309:       results: result.rows,
310:       electionStartDate: settings.election_start_date || null,
311:       electionEndDate: settings.election_end_date || null,
312:       totalParties: totalParties,
313:       totalVoters: totalVoters,
314:       resultsDataJson: JSON.stringify(resultsData)
315:     });
316:   } catch (err) {
317:     console.error(err);
318:     const fallbackData = { results: [], electionStartDate: null, electionEndDate: null, totalVoters: 0 };
319:     res.render('results', {
320:       results: [],
321:       electionStartDate: null,
322:       electionEndDate: null,
323:       totalParties: 0,
324:       totalVoters: 0,
325:       resultsDataJson: JSON.stringify(fallbackData)
326:     });
327:   }
328: });
- GET `/results`: aggregates votes per party and other summary stats, then renders results page with JSON-injected data for client scripts.

329: 
330: app.get('/admin/register', requireAdmin, (req, res) => {
331:   res.render('register');
332: });
- GET `/admin/register`: protected route to render the admin voter registration form.

333: 
334: app.post('/admin/register', requireAdmin, async (req, res) => {
335:   const { fullname, age, sex, region, zone, woreda, city_kebele, phone_number, finnumber } = req.body;
336:   try {
337:     // Validate FIN number format: 1234-1234-1234 (12 digits with dashes)
338:     const finRegex = /^\d{4}-\d{4}-\d{4}$/;
339:     if (!finRegex.test(finnumber)) {
340:       return res.send('FIN number must be in the format xxxx-xxxx-xxxx with exactly 12 digits');
341:     }
342: 
343:     const existingVoter = await pool.query('SELECT * FROM voters WHERE finnumber = $1', [finnumber]);
344:     if (existingVoter.rows.length > 0) {
345:       return res.send('FIN number already exists');
346:     }
347: 
348:     // Check phone number uniqueness if provided
349:     if (phone_number && phone_number.trim() !== '') {
350:       const existingPhone = await pool.query('SELECT * FROM voters WHERE phone_number = $1', [phone_number.trim()]);
351:       if (existingPhone.rows.length > 0) {
352:         return res.send('Phone number already exists');
353:       }
354:     }
355: 
356:     if (age < 18) {
357:       return res.send('Voter must be 18 years or older');
358:     }
359:     if (!region || !zone || !woreda || !city_kebele || region.trim() === '' || zone.trim() === '' || woreda.trim() === '' || city_kebele.trim() === '') {
360:       return res.send('All address fields (Region, Zone, Woreda, City/Kebele) are required');
361:     }
362:     const defaultPassword = 'default123';
363:     const hashedPassword = await bcrypt.hash(defaultPassword, 10);
364:     await pool.query('INSERT INTO voters (fullname, age, sex, region, zone, woreda, city_kebele, phone_number, finnumber, password) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
365:                      [fullname, age, sex, region.trim(), zone.trim(), woreda.trim(), city_kebele.trim(), phone_number ? phone_number.trim() : null, finnumber, hashedPassword]);
366: 
367:     // Log admin action
368:     console.log(`Admin ${req.session.adminId} registered voter: ${finnumber}`);
369: 
370:     res.render('voter_registered');
371:   } catch (err) {
372:     console.error(err);
373:     res.send('Error');
374:   }
375: });
- POST `/admin/register`: validates voter data, ensures unique FIN and phone, hashes default password, inserts voter, and shows confirmation.

376: 
377: app.get('/admin/toggle', requireOriginalSuperAdmin, async (req, res) => {
378:   try {
379:     const result = await pool.query('SELECT election_start_date, election_end_date FROM admin_settings WHERE id = 1');
380:     const settings = result.rows[0];
381:     const now = new Date();
382:     const isVotingOpen = settings.election_start_date && settings.election_end_date &&
383:                         now >= new Date(settings.election_start_date) &&
384:                         now <= new Date(settings.election_end_date);
385:     res.render('toggle', {
386:       electionStartDate: settings.election_start_date ? new Date(settings.election_start_date).toISOString().slice(0, 16) : '',
387:       electionEndDate: settings.election_end_date ? new Date(settings.election_end_date).toISOString().slice(0, 16) : '',
388:       isVotingOpen
389:     });
390:   } catch (err) {
391:     console.error(err);
392:     res.render('toggle', { electionStartDate: '', electionEndDate: '', isVotingOpen: false });
393:   }
394: });
- GET `/admin/toggle`: page to set election start/end; only accessible by original super admin; formats dates for `datetime-local` inputs.

395: 
396: app.post('/admin/toggle', requireOriginalSuperAdmin, async (req, res) => {
397:   const { election_start_date, election_end_date } = req.body;
398: 
399:   // Validate that both dates are provided
400:   if (!election_start_date || !election_end_date) {
401:     return res.send('Both start and end dates are required.');
402:   }
403: 
404:   // Validate that start date is before end date
405:   const startDate = new Date(election_start_date);
406:   const endDate = new Date(election_end_date);
407:   if (startDate >= endDate) {
408:     return res.send('Start date must be before end date.');
409:   }
410: 
411:   try {
412:     // Log the admin action for audit trail
413:     console.log(`Admin ${req.session.adminId} setting election period from ${election_start_date} to ${election_end_date} at ${new Date().toISOString()}`);
414: 
415:     // Update the election dates
416:     await pool.query('UPDATE admin_settings SET election_start_date = $1, election_end_date = $2 WHERE id = 1', [startDate, endDate]);
417: 
418:     // Log the successful action
419:     console.log(`Election period set by admin ${req.session.adminId} from ${startDate} to ${endDate}`);
420: 
421:     res.redirect('/admin/login');
422:   } catch (err) {
423:     console.error('Error setting election period:', err);
424:     res.send('Error updating election period');
425:   }
426: });
- POST `/admin/toggle`: validates dates and updates `admin_settings` record.

427: 
428: // Super Admin Routes for managing admins
429: app.get('/admin/manage-admins', requireSuperAdmin, async (req, res) => {
430:   try {
431:     const result = await pool.query('SELECT id, username, role, created_at, created_by FROM admins ORDER BY created_at DESC');
432:     const message = req.query.message;
433:     res.render('manage_admins', {
434:       admins: result.rows,
435:       currentAdminRole: req.session.adminRole,
436:       message: message
437:     });
438:   } catch (err) {
439:     console.error(err);
440:     res.send('Error loading admin management page');
441:   }
442: });
- GET `/admin/manage-admins`: shows admin list; protected by `requireSuperAdmin`.

443: 
444: // Register Admin Routes
445: app.get('/admin/register-admin', requireSuperAdmin, (req, res) => {
446:   res.render('register_admin');
447: });
- GET `/admin/register-admin`: renders form to create new admin; protected.

448: 
449: app.post('/admin/register-admin', requireSuperAdmin, async (req, res) => {
450:   const { username, password, confirmPassword, role } = req.body;
451: 
452:   // Validate passwords match
453:   if (password !== confirmPassword) {
454:     return res.render('register_admin', { error: 'Passwords do not match' });
455:   }
456: 
457:   // Validate role
458:   if (!['admin', 'super_admin'].includes(role)) {
459:     return res.render('register_admin', { error: 'Invalid role specified' });
460:   }
461: 
462:   try {
463:     // Check if username already exists
464:     const existingAdmin = await pool.query('SELECT * FROM admins WHERE username = $1', [username]);
465:     if (existingAdmin.rows.length > 0) {
466:       return res.render('register_admin', { error: 'Username already exists' });
467:     }
468: 
469:     // Hash password
470:     const hashedPassword = await bcrypt.hash(password, 10);
471: 
472:     // Create new admin
473:     await pool.query('INSERT INTO admins (username, password, role, created_by) VALUES ($1, $2, $3, $4)',
474:                      [username, hashedPassword, role, req.session.adminId]);
475: 
476:     console.log(`Super admin ${req.session.adminId} registered new ${role}: ${username}`);
477:     res.redirect('/admin/manage-admins?message=Admin registered successfully');
478:   } catch (err) {
479:     console.error('Error registering admin:', err);
480:     res.render('register_admin', { error: 'Error registering admin' });
481:   }
482: });
- POST `/admin/register-admin`: validates input, hashes password, inserts admin record, and redirects.

483: 
484: app.post('/admin/create-admin', requireSuperAdmin, async (req, res) => {
485:   const { username, password, role } = req.body;
486: 
487:   // Validate role
488:   if (!['admin', 'super_admin'].includes(role)) {
489:     return res.send('Invalid role specified');
490:   }
491: 
492:   try {
493:     // Check if username already exists
494:     const existingAdmin = await pool.query('SELECT * FROM admins WHERE username = $1', [username]);
495:     if (existingAdmin.rows.length > 0) {
496:       return res.send('Username already exists');
497:     }
498: 
499:     // Hash password
500:     const hashedPassword = await bcrypt.hash(password, 10);
501: 
502:     // Create new admin
503:     await pool.query('INSERT INTO admins (username, password, role, created_by) VALUES ($1, $2, $3, $4)',
504:                      [username, hashedPassword, role, req.session.adminId]);
505: 
506:     console.log(`Super admin ${req.session.adminId} created new ${role}: ${username}`);
507:     res.redirect('/admin/manage-admins');
508:   } catch (err) {
509:     console.error('Error creating admin:', err);
510:     res.send('Error creating admin');
511:   }
512: });
- POST `/admin/create-admin`: API-style endpoint to create admin; similar to register route but returns text responses.

513: 
514: app.post('/admin/delete-admin/:id', requireSuperAdmin, async (req, res) => {
515:   const adminId = req.params.id;
516: 
517:   // Prevent deleting yourself
518:   if (parseInt(adminId) === req.session.adminId) {
519:     return res.send('Cannot delete your own account');
520:   }
521: 
522:   try {
523:     // Check if admin exists
524:     const admin = await pool.query('SELECT * FROM admins WHERE id = $1', [adminId]);
525:     if (admin.rows.length === 0) {
526:       return res.send('Admin not found');
527:     }
528: 
529:     // Allow all super admins to delete other admins, but prevent deleting yourself
530: 
531:     // Delete admin
532:     await pool.query('DELETE FROM admins WHERE id = $1', [adminId]);
533: 
534:     console.log(`Super admin ${req.session.adminId} deleted admin ${adminId}`);
535:     res.redirect('/admin/manage-admins');
536:   } catch (err) {
537:     console.error('Error deleting admin:', err);
538:     res.send('Error deleting admin');
539:   }
540: });
- POST `/admin/delete-admin/:id`: deletes an admin except the current user; protected by super admin middleware.

541: 
542: // Party Management Routes
543: app.get('/admin/parties', requireAdmin, async (req, res) => {
544:   try {
545:     const result = await pool.query('SELECT * FROM parties WHERE is_active = TRUE ORDER BY created_at DESC');
546:     res.render('admin_parties', { parties: result.rows, isOriginalSuperAdmin: req.session.adminId === 1 });
547:   } catch (err) {
548:     console.error(err);
549:     res.send('Error loading parties');
550:   }
551: });
- GET `/admin/parties`: lists active parties for admin management.

552: 
553: app.get('/admin/parties/add', requireOriginalSuperAdmin, (req, res) => {
554:   res.render('add_party');
555: });
- GET `/admin/parties/add`: renders add-party form, restricted to original super admin.

556: 
557: app.post('/admin/parties/add', requireOriginalSuperAdmin, upload.fields([
558:   { name: 'leader_image_file', maxCount: 1 },
559:   { name: 'logo_file', maxCount: 1 }
560: ]), async (req, res) => {
561:   const {
562:     name_english, name_amharic, leader_name_english, leader_name_amharic,
563:     ideology, description_english, description_amharic, logo_url, leader_image_url
564:   } = req.body;
565: 
566:   try {
567:     // Handle image uploads - prioritize uploaded files over URLs
568:     let finalLeaderImageUrl = leader_image_url || null;
569:     let finalLogoUrl = logo_url || null;
570: 
571:     // If files were uploaded, use the uploaded file paths
572:     if (req.files) {
573:       if (req.files.leader_image_file && req.files.leader_image_file[0]) {
574:         finalLeaderImageUrl = '/uploads/' + req.files.leader_image_file[0].filename;
575:       }
576:       if (req.files.logo_file && req.files.logo_file[0]) {
577:         finalLogoUrl = '/uploads/' + req.files.logo_file[0].filename;
578:       }
579:     }
580: 
581:     await pool.query(`
582:       INSERT INTO parties (
583:         name_english, name_amharic, leader_name_english, leader_name_amharic,
584:         ideology, description_english, description_amharic, logo_url, leader_image_url, is_active, created_by
585:       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
586:     `, [
587:       name_english, name_amharic, leader_name_english, leader_name_amharic,
588:       ideology, description_english, description_amharic, finalLogoUrl, finalLeaderImageUrl, true, req.session.adminId
589:     ]);
590: 
591:     console.log(`Original super admin ${req.session.adminId} added new party: ${name_english}`);
592:     res.redirect('/admin/parties');
593:   } catch (err) {
594:     console.error('Error adding party:', err);
595:     res.send('Error adding party');
596:   }
597: });
- POST `/admin/parties/add`: accepts optional image uploads, chooses uploaded files over provided URLs, inserts party record.

598: 
599: app.get('/admin/parties/edit/:id', requireOriginalSuperAdmin, async (req, res) => {
600:   try {
601:     const result = await pool.query('SELECT * FROM parties WHERE id = $1', [req.params.id]);
602:     if (result.rows.length === 0) {
603:       return res.send('Party not found');
604:     }
605:     res.render('edit_party', { party: result.rows[0] });
606:   } catch (err) {
607:     console.error(err);
608:     res.send('Error loading party');
609:   }
610: });
- GET `/admin/parties/edit/:id`: loads party data and renders edit form.

611: 
612: app.post('/admin/parties/edit/:id', requireOriginalSuperAdmin, upload.fields([
613:   { name: 'leader_image_file', maxCount: 1 },
614:   { name: 'logo_file', maxCount: 1 }
615: ]), async (req, res) => {
616:   const {
617:     name_english, name_amharic, leader_name_english, leader_name_amharic,
618:     ideology, description_english, description_amharic, logo_url, leader_image_url
619:   } = req.body;
620: 
621:   try {
622:     // Get current party data to preserve existing images if not being updated
623:     const currentParty = await pool.query('SELECT logo_url, leader_image_url FROM parties WHERE id = $1', [req.params.id]);
624:     if (currentParty.rows.length === 0) {
625:       return res.send('Party not found');
626:     }
627: 
628:     // Handle image uploads - prioritize uploaded files over URLs, keep existing if neither provided
629:     let finalLeaderImageUrl = currentParty.rows[0].leader_image_url;
630:     let finalLogoUrl = currentParty.rows[0].logo_url;
631: 
632:     // If URL is provided and not empty, use it
633:     if (leader_image_url && leader_image_url.trim() !== '') {
634:       finalLeaderImageUrl = leader_image_url.trim();
635:     }
636:     if (logo_url && logo_url.trim() !== '') {
637:       finalLogoUrl = logo_url.trim();
638:     }
639: 
640:     // If files were uploaded, use the uploaded file paths (takes priority)
641:     if (req.files) {
642:       if (req.files.leader_image_file && req.files.leader_image_file[0]) {
643:         finalLeaderImageUrl = '/uploads/' + req.files.leader_image_file[0].filename;
644:       }
645:       if (req.files.logo_file && req.files.logo_file[0]) {
646:         finalLogoUrl = '/uploads/' + req.files.logo_file[0].filename;
647:       }
648:     }
649: 
650:     await pool.query(`
651:       UPDATE parties SET
652:         name_english = $1, name_amharic = $2, leader_name_english = $3, leader_name_amharic = $4,
653:         ideology = $5, description_english = $6, description_amharic = $7,
654:         logo_url = $8, leader_image_url = $9, updated_at = CURRENT_TIMESTAMP
655:       WHERE id = $10
656:     `, [
657:       name_english, name_amharic, leader_name_english, leader_name_amharic,
658:       ideology, description_english, description_amharic, finalLogoUrl, finalLeaderImageUrl, req.params.id
659:     ]);
660: 
661:     console.log(`Original super admin ${req.session.adminId} updated party: ${name_english}`);
662:     res.redirect('/admin/parties');
663:   } catch (err) {
664:     console.error('Error updating party:', err);
665:     res.send('Error updating party');
666:   }
667: });
- POST `/admin/parties/edit/:id`: updates party record and handles image replacement logic.

668: 
669: app.post('/admin/parties/delete/:id', requireOriginalSuperAdmin, async (req, res) => {
670:   try {
671:     // Check if party exists
672:     const party = await pool.query('SELECT * FROM parties WHERE id = $1', [req.params.id]);
673:     if (party.rows.length === 0) {
674:       return res.send('Party not found');
675:     }
676: 
677:     // Delete the party
678:     await pool.query('DELETE FROM parties WHERE id = $1', [req.params.id]);
679: 
680:     console.log(`Original super admin ${req.session.adminId} deleted party: ${party.rows[0].name_english}`);
681:     res.redirect('/admin/parties');
682:   } catch (err) {
683:     console.error('Error deleting party:', err);
684:     res.send('Error deleting party');
685:   }
686: });
- POST `/admin/parties/delete/:id`: deletes party by id after checking existence.

687: 
688: // Database Reset Route - Only for Original Super Admin
689: app.get('/admin/reset-database', requireOriginalSuperAdmin, async (req, res) => {
690:   try {
691:     // Check if voting period is currently open
692:     const result = await pool.query('SELECT election_start_date, election_end_date FROM admin_settings WHERE id = 1');
693:     const settings = result.rows[0];
694:     const now = new Date();
695:     const votePeriodOpen = settings && settings.election_start_date && settings.election_end_date &&
696:                           now >= new Date(settings.election_start_date) &&
697:                           now <= new Date(settings.election_end_date);
698: 
699:     if (votePeriodOpen) {
700:       return res.render('reset_error');
701:     }
702: 
703:     res.render('reset_database');
704:   } catch (err) {
705:     console.error('Error checking voting period:', err);
706:     res.send('Error checking voting period status');
707:   }
708: });
- GET `/admin/reset-database`: prevents reset during active voting period and shows confirmation page otherwise.

709: 
710: app.post('/admin/reset-database', requireOriginalSuperAdmin, async (req, res) => {
711:   const { confirm_reset } = req.body;
712: 
713:   if (confirm_reset !== 'RESET_ALL_DATA') {
714:     return res.send('Invalid confirmation code. Database reset cancelled.');
715:   }
716: 
717:   try {
718:     // Start transaction
719:     await pool.query('BEGIN');
720: 
721:     // Clear all data except original super admin
722:     await pool.query('DELETE FROM votes');
723:     await pool.query('DELETE FROM voter_activity_log');
724:     await pool.query('DELETE FROM voters');
725:     await pool.query('DELETE FROM parties');
726:     await pool.query('DELETE FROM admin_audit_log');
727:     await pool.query('DELETE FROM admins WHERE id != 1');
728:     await pool.query('DELETE FROM admin_settings');
729:     await pool.query('DELETE FROM system_config');
730: 
731:     // Reset sequences
732:     await pool.query('ALTER SEQUENCE voters_id_seq RESTART WITH 1');
733:     await pool.query('ALTER SEQUENCE parties_id_seq RESTART WITH 1');
734:     await pool.query('ALTER SEQUENCE votes_id_seq RESTART WITH 1');
735:     await pool.query('ALTER SEQUENCE admins_id_seq RESTART WITH 2');
736:     await pool.query('ALTER SEQUENCE admin_settings_id_seq RESTART WITH 1');
737:     await pool.query('ALTER SEQUENCE system_config_id_seq RESTART WITH 1');
738:     await pool.query('ALTER SEQUENCE admin_audit_log_id_seq RESTART WITH 1');
739:     await pool.query('ALTER SEQUENCE voter_activity_log_id_seq RESTART WITH 1');
740: 
741:     // Re-insert initial data
742:     await pool.query('INSERT INTO admin_settings (registration_open) VALUES (TRUE)');
743: 
744:     await pool.query(`
745:       INSERT INTO parties (name_english, name_amharic, leader_name_english, leader_name_amharic, ideology, description_english, description_amharic, is_active, created_by) VALUES
746:       ('Prosperity Party', 'ብልጽግና ፓርቲ', 'Abiy Ahmed', 'አብይ አህመድ', 'Development and Prosperity', 'The Prosperity Party is committed to transforming Ethiopia through sustainable development, economic growth, and national unity.', 'ብልጽግና ፓርቲ ኢትዮጵያን በማለሳለስ ኢኮኖሚ እድገት እና ብሔራዊ አንድነት በመላክ ለመለወጥ ተለያዩበታል።', true, 1),
747:       ('Ethiopian Citizens for Social Justice - EZEMA', 'የኢትዮጵያ ዜጎች ለማኅበራዊ ፍትህ(ኢዜማ)', 'Berhanu Nega', 'ብርሃኑ ነጋ', 'Social Justice and Democracy', 'EZEMA focuses on promoting social justice, democratic values, and equal opportunities for all Ethiopian citizens.', 'ኢዜማ ማኅበራዊ ፍትህን ለማሳደግ፣ ዲሞክራሲያዊ እሴቶችን ለማሳደግ እና ለሁሉም ኢትዮጵያ ዜጎች እኩል እድሎችን ለማሳደግ ያተኮራል።', true, 1),
748:       ('National Movement of Amhara (NaMA)', 'የአማራ ብሔራዊ ንቅናቄ(አብን)', 'Demeke Mekonnen', 'ደመቀ መኮንን', 'Regional Autonomy and Rights', 'NaMA advocates for the rights and autonomy of the Amhara people while promoting national unity and development.', 'አብን የአማራ ህዝብ መብቶችን እና ራሱን ለማስተያየት ብሔራዊ አንድነትን እና እድገትን በማሳደግ ያተኮራል።', true, 1),
749:       ('Oromo Federalist Congress (OFC)', 'ኦሮሞ ፌዴራሊስት ኮንግረስ(ኦፌኮ)', 'Merera Gudina', 'መራራ ጉዲና', 'Federalism and Self-Determination', 'OFC promotes federalist principles, self-determination for the Oromo people, and democratic governance.', 'ኦፌኮ ፌዴራሊስት መርሆችን ለማሳደግ፣ ለኦሮሞ ህዝብ ራሱን ለማስተያየት እና ዲሞክራሲያዊ አስተያየት ለማሳደግ ያተኮራል።', true, 1)
750:     `);
751: 
752:     await pool.query(`
753:       INSERT INTO system_config (config_key, config_value, description) VALUES
754:       ('system_name', '"Ethiopian Voting System"', 'Name of the voting system'),
755:       ('version', '"1.0.0"', 'Current system version'),
756:       ('max_login_attempts', '5', 'Maximum failed login attempts before account lock'),
757:       ('lock_duration_minutes', '30', 'Account lock duration in minutes')
758:     `);
759: 
760:     // Commit transaction
761:     await pool.query('COMMIT');
762: 
763:     console.log(`Original super admin ${req.session.adminId} performed complete database reset`);
764: 
765:     res.render('reset_success');
766:   } catch (err) {
767:     // Rollback on error
768:     await pool.query('ROLLBACK');
769:     console.error('Error resetting database:', err);
770:     res.send('Error resetting database: ' + err.message);
771:   }
772: });
- POST `/admin/reset-database`: performs full destructive reset in transaction, re-seeds default records, and commits; rolls back on error.

773: 
774: // Public parties page
775: app.get('/parties', async (req, res) => {
776:   try {
777:     const result = await pool.query('SELECT * FROM parties WHERE is_active = TRUE ORDER BY name_english');
778:     res.render('parties', { parties: result.rows });
779:   } catch (err) {
780:     console.error(err);
781:     res.render('parties', { parties: [] });
782:   }
783: });
- GET `/parties`: public listing of parties rendered from DB.

784: 
785: // About parties page (dynamic version of party.html)
786: app.get('/party.html', async (req, res) => {
787:   try {
788:     const result = await pool.query('SELECT * FROM parties WHERE is_active = TRUE ORDER BY name_english');
789:     res.render('party_dynamic', { parties: result.rows });
790:   } catch (err) {
791:     console.error(err);
792:     // Fallback to static file if database fails
793:     res.sendFile(path.join(__dirname, 'public', 'party.html'));
794:   }
795: });
- GET `/party.html`: attempts to render dynamic parties page, falls back to static HTML on error.

796: 
797: app.get('/admin/logout', (req, res) => {
798:   req.session.destroy((err) => {
799:     if (err) {
800:       console.error(err);
801:       res.send('Error logging out');
802:     } else {
803:       res.redirect('/admin/login');
804:     }
805:   });
806: });
- GET `/admin/logout`: destroys session and redirects to admin login.

807: 
808: // Static files middleware (placed after routes to allow dynamic routes to take precedence)
809: app.use(express.static('public'));
- Serves static assets from `public` directory.

810: 
811: app.listen(port, () => {
812:   console.log(`Server running at http://localhost:${port}`);
813: });
- Starts HTTP server and logs listening address.

---

Next steps:
- I will continue annotating the next files (views, `init_db.js`, `database.sql`, public JS/CSS) in batches. Reply "continue" and I will add the next batch (views) into this document and then convert the full markdown to PDF when you're ready.

---

## Remaining Views (Admin & Utility Pages)

### File: views/admin_login.ejs

1: <!DOCTYPE html>
- HTML5 doctype.

2: <html lang="en">
- Root element.

3: <head>
- Head start.

4:     <meta charset="UTF-8">
- Encoding.

5:     <meta name="viewport" content="width=device-width, initial-scale=1.0">
- Viewport.

6:     <title>Admin - Login</title>
- Page title.

7:     <link rel="stylesheet" href="/css/admin_parties.css">
- Admin stylesheet link.

8: </head>
- Close head.

9: <body>
- Open body.

10:     <div class="container py-5">
- Container for admin login form.

11:         <% if (isLoggedIn) { %>
- If already logged in, render admin dashboard controls instead of login form.

12:             <div class="alert alert-success">Logged in as <%= adminRole %></div>
- Shows admin role and quick status.

13:             <a href="/admin/manage-admins" class="btn btn-primary me-2">Manage Admins</a>
- Link to admin management page.

14:             <a href="/admin/parties" class="btn btn-secondary">Manage Parties</a>
- Link to party management.

15:         <% } else { %>
- Else render login form.

16:             <form action="/admin/login" method="POST" class="card p-4 shadow-sm">
- Login form posts to `/admin/login`.

17:                 <h3 class="mb-4">Admin Login</h3>
- Heading.

18:                 <div class="mb-3">
- Username input group.

19:                     <label>Username</label>
- Label.

20:                     <input type="text" name="username" class="form-control" required>
- Username field.

21:                 </div>
- Close group.

22:                 <div class="mb-3">
- Password input group.

23:                     <label>Password</label>
- Label.

24:                     <input type="password" name="password" class="form-control" required>
- Password field.

25:                 </div>
- Close group.

26:                 <div class="d-grid">
- Submit container.

27:                     <button type="submit" class="btn btn-primary">Login</button>
- Login button.

28:                 </div>
- Close d-grid.

29:             </form>
- Close form.

30:         <% } %>
- End conditional.

31:     </div>
- Close container.

32: </body>
- Close body.

33: </html>
- Close document.

---

### File: views/admin_parties.ejs

1: <!DOCTYPE html>
- Doctype.

2: <html lang="en">
- Root element.

3: <head>
- Head start.

4:     <meta charset="UTF-8">
- Encoding.

5:     <meta name="viewport" content="width=device-width, initial-scale=1.0">
- Viewport.

6:     <title>Admin - Parties</title>
- Page title for admin parties management.

7:     <link rel="stylesheet" href="/css/admin_parties.css">
- Styles.

8: </head>
- Close head.

9: <body>
- Open body.

10:     <div class="container py-4">
- Container.

11:         <h3 class="mb-3">Manage Parties</h3>
- Heading.

12:         <% if (isOriginalSuperAdmin) { %>
- Special controls if original super admin.

13:             <a href="/admin/parties/add" class="btn btn-success mb-3">Add Party</a>
- Link to add new party.

14:         <% } %>
- End conditional.

15:         <div class="row">
- Row for party cards.

16:             <% parties.forEach(function(p){ %>
- Loop parties.

17:                 <div class="col-md-6 mb-3">
- Column per party.

18:                     <div class="card">
- Card wrapper.

19:                         <div class="card-body d-flex justify-content-between align-items-center">
- Card body displays party name and action buttons.

20:                             <div>
- Left side: names.

21:                                 <div class="fw-bold"><%= p.name_english %></div>
- English name.

22:                                 <small class="text-muted"><%= p.name_amharic %></small>
- Amharic name.

23:                             </div>
- Close left side.

24:                             <div>
- Action buttons.

25:                                 <a href="/admin/parties/edit/<%= p.id %>" class="btn btn-sm btn-primary me-2">Edit</a>
- Edit link.

26:                                 <form action="/admin/parties/delete/<%= p.id %>" method="POST" class="d-inline">
- Delete form posts to delete endpoint.

27:                                     <button type="submit" class="btn btn-sm btn-danger">Delete</button>
- Delete button.

28:                                 </form>
- Close form.

29:                             </div>
- Close actions.

30:                         </div>
- Close card body.

31:                     </div>
- Close card.

32:                 </div>
- Close column.

33:             <% }) %>
- End loop.

34:         </div>
- Close row.

35:     </div>
- Close container.

36: </body>
- Close body.

37: </html>
- Close document.

---

## Public CSS files (brief per-file explanations)

File: public/party_interactive.css
1: /* Interactive styles and small animations used on the party page */
- Contains hover transforms, modal animation classes (.show/.animate-in), and utility classes for small responsive adjustments.

File: public/party.css
1: /* Visual layout for static party.html */
- Defines card sizes, grid spacing, typography for party listings, and responsive image rules for logos and leader portraits.

File: public/css/add_party.css
1: /* Styles for the Add Party form in admin area */
- Styles the card/form inputs, file input appearance, submit button prominence, and small helper text.

File: public/css/admin_parties.css
1: /* Admin party management page layout */
- Card spacing, action button alignment (Edit/Delete), badge colors, and mobile stacking behavior for action buttons.

File: public/css/change_password.css
1: /* Change password view styling */
- Centers the form, sets input sizes, and emphasizes the primary submit button with padding and color.

File: public/css/edit_party.css
1: /* Edit Party form styles */
- Similar to add_party.css but includes preview image area styles and URL input fallback presentation.

File: public/css/home.css
1: /* Home page layout utilities and hero section styles */
- Hero spacing, CTA button sizes, responsive breakpoint adjustments for the homepage columns and intro sections.

File: public/css/parties.css
1: /* Parties listing styles used by dynamic party pages */
- Card grid, image ratios, typography for titles and descriptions, and minor transitions for hover states.

File: public/css/password_changed.css
1: /* Confirmation page styling (password changed) */
- Centered content, success typography, and action button spacing when voting period is open.

File: public/css/reset_database.css
1: /* Dangerous action confirmation page styling */
- Emphasizes warning text, styles the confirmation input, and colors the reset button in a danger scheme.

File: public/css/reset_error.css
1: /* Informational styling when reset is blocked */
- Simple, centered text and back navigation styling with a prominent primary button.

File: public/css/reset_success.css
1: /* Minimal success confirmation style for reset completion */
- Minimal centered layout and link styling back to admin area.

File: public/css/results.css
1: /* Results page styling: chart container and result table */
- Sizing and responsive rules for `#results-chart`, table column widths, and progress bar visuals used by the JS script.

File: public/css/styles.css
1: /* Global site-wide styles, variables, and utility classes */
- Contains typography defaults, color variables, grid helpers, `.container` rules, navbar base styles, and commonly used utility classes (margins, paddings, text colors).

File: public/css/vote_submited.css
1: /* Vote submission confirmation styling */
- Centered message card, muted explanatory text, and a primary link button to view results.

File: public/css/vote.css
1: /* Voting interface styles */
- Styles list-group items used as selectable options, radio button alignment, and the submit button prominence; also includes responsive column rules for the form layout.

File: public/css/voter_registered.css
1: /* Voter registration success page styles */
- Simple centered success card and spacing for the 'Register Another' button.

File: public/party.css (duplicate root-level file)
1: /* Root-level party styles (may overlap with public/css/parties.css) */
- Contains older or static CSS used by the bundled `party.html` fallback; includes card sizing and static image rules.

File: public/party_interactive.css (duplicate root-level file)
1: /* Complementary interactive helpers for party page */
- Adds small JS-triggered classes, keyframe definitions, and accessibility-focused focus outlines for interactive elements.

---

Note: These CSS explanations are intentionally high-level (per-file) to keep the document readable; if you'd like fully line-by-line breakdowns for any specific CSS file, say which file and I will expand that file's section into precise, numbered line explanations.

---

### File: views/add_party.ejs

1: <!DOCTYPE html>
- Doctype.

2: <html lang="en">
- Root.

3: <head>
- Head.

4:     <meta charset="UTF-8">
- Encoding.

5:     <meta name="viewport" content="width=device-width, initial-scale=1.0">
- Viewport.

6:     <title>Add Party</title>
- Title.

7:     <link rel="stylesheet" href="/css/add_party.css">
- Styles for form.

8: </head>
- Close head.

9: <body>
- Body.

10:     <div class="container py-4">
- Container with padding.

11:         <h3 class="mb-3">Add New Party</h3>
- Heading.

12:         <form action="/admin/parties/add" method="POST" enctype="multipart/form-data">
- Form to submit party data, allows file uploads.

13:             <div class="mb-3">
- Name fields.

14:                 <label>Name (English)</label>
- Label.

15:                 <input type="text" name="name_english" class="form-control" required>
- English name input.

16:             </div>
- Close.

17:             <div class="mb-3">
- Amharic name.

18:                 <label>Name (Amharic)</label>
- Label.

19:                 <input type="text" name="name_amharic" class="form-control">
- Amharic name input.

20:             </div>
- Close.

21:             <div class="mb-3">
- Leader image upload.

22:                 <label>Leader Image (file)</label>
- Label.

23:                 <input type="file" name="leader_image_file" accept="image/*" class="form-control">
- File input accepting images.

24:             </div>
- Close.

25:             <div class="mb-3">
- Logo upload.

26:                 <label>Logo (file)</label>
- Label.

27:                 <input type="file" name="logo_file" accept="image/*" class="form-control">
- Logo file input.

28:             </div>
- Close.

29:             <div class="d-grid">
- Submit button container.

30:                 <button type="submit" class="btn btn-success">Add Party</button>
- Submit.

31:             </div>
- Close.

32:         </form>
- Close form.

33:     </div>
- Close container.

34: </body>
- Close body.

35: </html>
- Close document.

---

### File: views/edit_party.ejs

1: <!DOCTYPE html>
- Doctype.

2: <html lang="en">
- Root.

3: <head>
- Head.

4:     <meta charset="UTF-8">
- Encoding.

5:     <meta name="viewport" content="width=device-width, initial-scale=1.0">
- Viewport.

6:     <title>Edit Party</title>
- Title for edit page.

7:     <link rel="stylesheet" href="/css/edit_party.css">
- Styles.

8: </head>
- Close head.

9: <body>
- Body.

10:     <div class="container py-4">
- Container.

11:         <h3 class="mb-3">Edit Party</h3>
- Heading.

12:         <form action="/admin/parties/edit/<%= party.id %>" method="POST" enctype="multipart/form-data">
- Form posts edits to the party endpoint.

13:             <div class="mb-3">
- English name.

14:                 <label>Name (English)</label>
- Label.

15:                 <input type="text" name="name_english" class="form-control" value="<%= party.name_english %>" required>
- Pre-filled input with existing value.

16:             </div>
- Close.

17:             <div class="mb-3">
- Amharic name.

18:                 <label>Name (Amharic)</label>
- Label.

19:                 <input type="text" name="name_amharic" class="form-control" value="<%= party.name_amharic %>">
- Pre-filled.

20:             </div>
- Close.

21:             <div class="mb-3">
- Leader image preview and optional replacement.

22:                 <label>Leader Image (file or URL)</label>
- Label.

23:                 <input type="file" name="leader_image_file" accept="image/*" class="form-control mb-2">
- File input.

24:                 <input type="text" name="leader_image_url" class="form-control" placeholder="Or provide image URL" value="<%= party.leader_image_url %>">
- URL fallback if not uploading.

25:             </div>
- Close.

26:             <div class="d-grid">
- Submit.

27:                 <button type="submit" class="btn btn-primary">Save Changes</button>
- Save button.

28:             </div>
- Close.

29:         </form>
- Close form.

30:     </div>
- Close container.

31: </body>
- Close body.

32: </html>
- Close document.

---

### File: views/manage_admins.ejs

1: <!DOCTYPE html>
- Doctype.

2: <html lang="en">
- Root.

3: <head>
- Head.

4:     <meta charset="UTF-8">
- Encoding.

5:     <meta name="viewport" content="width=device-width, initial-scale=1.0">
- Viewport.

6:     <title>Manage Admins</title>
- Title for admin management.

7:     <link rel="stylesheet" href="/css/manage_admins.css">
- Styles.

8: </head>
- Close head.

9: <body>
- Body.

10:     <div class="container py-4">
- Container.

11:         <h3 class="mb-3">Admins</h3>
- Heading.

12:         <% if (message) { %>
- Optional message from query string.

13:             <div class="alert alert-info"><%= message %></div>
- Displays message.

14:         <% } %>
- End conditional.

15:         <table class="table">
- Simple table to list admins.

16:             <thead>
- Header.

17:                 <tr>
- Row.

18:                     <th>Username</th>
- Username column.

19:                     <th>Role</th>
- Role column.

20:                     <th>Actions</th>
- Actions column.

21:                 </tr>
- Close header row.

22:             </thead>
- Close thead.

23:             <tbody>
- Body begins.

24:                 <% admins.forEach(function(a){ %>
- Loop admins.

25:                     <tr>
- Row per admin.

26:                         <td><%= a.username %></td>
- Username.

27:                         <td><%= a.role %></td>
- Role.

28:                         <td>
- Actions cell.

29:                             <% if (currentAdminRole === 'super_admin') { %>
- If current admin is super admin, show create/delete options.

30:                                 <form action="/admin/delete-admin/<%= a.id %>" method="POST" class="d-inline">
- Delete form.

31:                                     <button class="btn btn-sm btn-danger">Delete</button>
- Delete button.

32:                                 </form>
- Close form.

33:                             <% } %>
- End conditional.

34:                         </td>
- Close actions cell.

35:                     </tr>
- Close row.

36:                 <% }) %>
- End loop.

37:             </tbody>
- Close tbody.

38:         </table>
- Close table.

39:     </div>
- Close container.

40: </body>
- Close body.

41: </html>
- Close document.

---

### File: views/register_admin.ejs

1: <!DOCTYPE html>
- Doctype.

2: <html lang="en">
- Root.

3: <head>
- Head.

4:     <meta charset="UTF-8">
- Encoding.

5:     <meta name="viewport" content="width=device-width, initial-scale=1.0">
- Viewport.

6:     <title>Register Admin</title>
- Title for admin creation.

7:     <link rel="stylesheet" href="/css/styles.css">
- Styles.

8: </head>
- Close head.

9: <body>
- Body.

10:     <div class="container py-4">
- Container.

11:         <% if (error) { %>
- Shows error if provided from server.

12:             <div class="alert alert-danger"><%= error %></div>
- Error alert.

13:         <% } %>
- End conditional.

14:         <form action="/admin/register-admin" method="POST">
- Form posts to create admin.

15:             <div class="mb-3">
- Username input.

16:                 <label>Username</label>
- Label.

17:                 <input type="text" name="username" class="form-control" required>
- Input.

18:             </div>
- Close.

19:             <div class="mb-3">
- Password input.

20:                 <label>Password</label>
- Label.

21:                 <input type="password" name="password" class="form-control" required>
- Input.

22:             </div>
- Close.

23:             <div class="mb-3">
- Confirm password.

24:                 <label>Confirm Password</label>
- Label.

25:                 <input type="password" name="confirmPassword" class="form-control" required>
- Input.

26:             </div>
- Close.

27:             <div class="mb-3">
- Role select.

28:                 <label>Role</label>
- Label.

29:                 <select name="role" class="form-select">
- Dropdown.

30:                     <option value="admin">Admin</option>
- Option.

31:                     <option value="super_admin">Super Admin</option>
- Option.

32:                 </select>
- Close select.

33:             </div>
- Close.

34:             <div class="d-grid">
- Submit.

35:                 <button type="submit" class="btn btn-primary">Register Admin</button>
- Button.

36:             </div>
- Close.

37:         </form>
- Close form.

38:     </div>
- Close container.

39: </body>
- Close body.

40: </html>
- Close document.

---

### File: views/change_password.ejs

1: <!DOCTYPE html>
- Doctype.

2: <html lang="en">
- Root.

3: <head>
- Head.

4:     <meta charset="UTF-8">
- Encoding.

5:     <meta name="viewport" content="width=device-width, initial-scale=1.0">
- Viewport.

6:     <title>Change Password</title>
- Title.

7:     <link rel="stylesheet" href="/css/change_password.css">
- Styles.

8: </head>
- Close head.

9: <body>
- Body.

10:     <div class="container py-4">
- Container.

11:         <form action="/change-password" method="POST" class="card p-4">
- Form posts new password to server.

12:             <h4>Change Your Password</h4>
- Heading.

13:             <div class="mb-3">
- New password.

14:                 <label>New Password</label>
- Label.

15:                 <input type="password" name="newPassword" class="form-control" required>
- Input.

16:             </div>
- Close.

17:             <div class="mb-3">
- Confirm.

18:                 <label>Confirm Password</label>
- Label.

19:                 <input type="password" name="confirmPassword" class="form-control" required>
- Input.

20:             </div>
- Close.

21:             <div class="d-grid">
- Submit.

22:                 <button type="submit" class="btn btn-primary">Change Password</button>
- Button.

23:             </div>
- Close.

24:         </form>
- Close form.

25:     </div>
- Close container.

26: </body>
- Close body.

27: </html>
- Close document.

---

### File: views/password_changed.ejs

1: <!DOCTYPE html>
- Doctype.

2: <html lang="en">
- Root.

3: <head>
- Head.

4:     <meta charset="UTF-8">
- Encoding.

5:     <meta name="viewport" content="width=device-width, initial-scale=1.0">
- Viewport.

6:     <title>Password Changed</title>
- Title displayed after password update.

7:     <link rel="stylesheet" href="/css/password_changed.css">
- Styles.

8: </head>
- Close head.

9: <body>
- Body.

10:     <div class="container py-5 text-center">
- Container with centered content.

11:         <h3>Your password has been changed</h3>
- Confirmation message.

12:         <% if (votePeriodOpen) { %>
- If voting is open, provide a link to vote.

13:             <a href="/vote" class="btn btn-primary mt-3">Go Vote Now</a>
- Link to voting page.

14:         <% } else { %>
- Else show different message.

15:             <p class="text-muted mt-3">Voting period is not open yet. Check back later.</p>
- Info.

16:         <% } %>
- End conditional.

17:     </div>
- Close container.

18: </body>
- Close body.

19: </html>
- Close document.

---

### File: views/voter_registered.ejs

1: <!DOCTYPE html>
- Doctype.

2: <html lang="en">
- Root.

3: <head>
- Head.

4:     <meta charset="UTF-8">
- Encoding.

5:     <meta name="viewport" content="width=device-width, initial-scale=1.0">
- Viewport.

6:     <title>Voter Registered</title>
- Title for registration success.

7:     <link rel="stylesheet" href="/css/voter_registered.css">
- Styles.

8: </head>
- Close head.

9: <body>
- Body.

10:     <div class="container py-5 text-center">
- Centered success message.

11:         <h3>Voter Registered Successfully</h3>
- Confirmation.

12:         <a href="/admin/register" class="btn btn-primary mt-3">Register Another</a>
- Link to register more voters.

13:     </div>
- Close container.

14: </body>
- Close body.

15: </html>
- Close document.

---

### File: views/vote_submitted.ejs

1: <!DOCTYPE html>
- Doctype.

2: <html lang="en">
- Root.

3: <head>
- Head.

4:     <meta charset="UTF-8">
- Encoding.

5:     <meta name="viewport" content="width=device-width, initial-scale=1.0">
- Viewport.

6:     <title>Vote Submitted</title>
- Title shown after submit.

7:     <link rel="stylesheet" href="/css/vote_submited.css">
- Styles (note filename spelling in repo).

8: </head>
- Close head.

9: <body>
- Body.

10:     <div class="container py-5 text-center">
- Centered content.

11:         <h3>Thank you — your vote has been submitted</h3>
- Confirmation message.

12:         <p class="text-muted">You voted for: <strong><%= party %></strong></p>
- Displays the selected party (injected by server).

13:         <a href="/results" class="btn btn-primary mt-3">View Results</a>
- Link to results page.

14:     </div>
- Close container.

15: </body>
- Close body.

16: </html>
- Close document.

---

### File: views/toggle.ejs

1: <!DOCTYPE html>
- Doctype.

2: <html lang="en">
- Root.

3: <head>
- Head.

4:     <meta charset="UTF-8">
- Encoding.

5:     <meta name="viewport" content="width=device-width, initial-scale=1.0">
- Viewport.

6:     <title>Toggle Election Period</title>
- Page title for toggling election dates.

7:     <link rel="stylesheet" href="/css/toggle.css">
- Styles.

8: </head>
- Close head.

9: <body>
- Body.

10:     <div class="container py-4">
- Container.

11:         <h4>Set Election Period</h4>
- Heading.

12:         <form action="/admin/toggle" method="POST">
- Form to set start/end datetime.

13:             <div class="mb-3">
- Start date/time input.

14:                 <label>Start</label>
- Label.

15:                 <input type="datetime-local" name="election_start_date" value="<%= electionStartDate %>" class="form-control" required>
- Pre-filled value if available.

16:             </div>
- Close.

17:             <div class="mb-3">
- End input.

18:                 <label>End</label>
- Label.

19:                 <input type="datetime-local" name="election_end_date" value="<%= electionEndDate %>" class="form-control" required>
- Pre-filled end time.

20:             </div>
- Close.

21:             <div class="d-grid">
- Submit.

22:                 <button class="btn btn-primary">Save</button>
- Save button.

23:             </div>
- Close.

24:         </form>
- Close form.

25:     </div>
- Close container.

26: </body>
- Close body.

27: </html>
- Close document.

---

### File: views/reset_database.ejs

1: <!DOCTYPE html>
- Doctype.

2: <html lang="en">
- Root.

3: <head>
- Head.

4:     <meta charset="UTF-8">
- Encoding.

5:     <meta name="viewport" content="width=device-width, initial-scale=1.0">
- Viewport.

6:     <title>Reset Database</title>
- Title for reset confirmation.

7:     <link rel="stylesheet" href="/css/reset_database.css">
- Styles.

8: </head>
- Close head.

9: <body>
- Body.

10:     <div class="container py-5 text-center">
- Container.

11:         <h3>Danger: Reset All Data</h3>
- Warning heading.

12:         <p class="text-muted">This will delete most data and re-seed defaults. Ensure voting period is closed.</p>
- Explainer.

13:         <form action="/admin/reset-database" method="POST">
- Confirmation form.

14:             <div class="mb-3">
- Confirmation code input.

15:                 <input type="text" name="confirm_reset" class="form-control" placeholder="Type RESET_ALL_DATA to confirm" required>
- User must type exact string to confirm.

16:             </div>
- Close.

17:             <div class="d-grid">
- Submit.

18:                 <button class="btn btn-danger">Reset Database</button>
- Danger action.

19:             </div>
- Close.

20:         </form>
- Close form.

21:     </div>
- Close container.

22: </body>
- Close body.

23: </html>
- Close document.

---

### File: views/reset_success.ejs

1: <!DOCTYPE html>
- Doctype.

2: <html lang="en">
- Root.

3: <head>
- Head.

4:     <meta charset="UTF-8">
- Encoding.

5:     <meta name="viewport" content="width=device-width, initial-scale=1.0">
- Viewport.

6:     <title>Reset Successful</title>
- Title.

7: </head>
- Close head.

8: <body>
- Body.

9:     <div class="container py-5 text-center">
- Centered message.

10:         <h3>Database Reset Completed</h3>
- Confirmation.

11:         <a href="/admin/login" class="btn btn-primary mt-3">Back to Admin</a>
- Link to admin login.

12:     </div>
- Close container.

13: </body>
- Close body.

14: </html>
- Close document.

---

### File: views/reset_error.ejs

1: <!DOCTYPE html>
- Doctype.

2: <html lang="en">
- Root.

3: <head>
- Head.

4:     <meta charset="UTF-8">
- Encoding.

5:     <meta name="viewport" content="width=device-width, initial-scale=1.0">
- Viewport.

6:     <title>Reset Error</title>
- Title used when reset isn't allowed.

7: </head>
- Close head.

8: <body>
- Body.

9:     <div class="container py-5 text-center">
- Container.

10:         <h3>Cannot reset while voting period is open</h3>
- Explains why reset is blocked.

11:         <a href="/admin/login" class="btn btn-primary mt-3">Back</a>
- Back link.

12:     </div>
- Close container.

13: </body>
- Close body.

14: </html>
- Close document.

---

### File: views/parties.ejs

1: <!DOCTYPE html>
- Doctype.

2: <html lang="en">
- Root.

3: <head>
- Head.

4:     <meta charset="UTF-8">
- Encoding.

5:     <meta name="viewport" content="width=device-width, initial-scale=1.0">
- Viewport.

6:     <title>Parties</title>
- Title for public parties listing.

7: </head>
- Close head.

8: <body>
- Body.

9:     <div class="container py-5">
- Container.

10:         <h2 class="mb-4">Political Parties</h2>
- Heading.

11:         <div class="row">
- Row for cards.

12:             <% parties.forEach(function(p){ %>
- Loop parties.

13:                 <div class="col-md-6 mb-4">
- Column per party.

14:                     <div class="card h-100">
- Card wrapper.

15:                         <div class="card-body">
- Card body.

16:                             <h5><%= p.name_english %></h5>
- English name.

17:                             <p class="small text-muted"><%= p.ideology %></p>
- Ideology.

18:                         </div>
- Close card body.

19:                     </div>
- Close card.

20:                 </div>
- Close column.

21:             <% }) %>
- End loop.

22:         </div>
- Close row.

23:     </div>
- Close container.

24: </body>
- Close body.

25: </html>
- Close document.

---

## File: public/js/results.js

1: // Calculate and update statistics
- Top-level comment describing the script purpose.

2: document.addEventListener('DOMContentLoaded', function() {
- Wait for DOM ready before accessing page elements.

3:   const results = window.resultsData.results;
- Reads aggregated results JSON injected by server into `window.resultsData`.

4:   const electionStartDate = window.resultsData.electionStartDate;
- Reads election start date for countdown logic.

5:   const electionEndDate = window.resultsData.electionEndDate;
- Reads election end date for countdown logic.

6:   const sortedResults = [...results].sort((a, b) => parseInt(b.votes) - parseInt(a.votes));
- Creates a descending-by-votes sorted copy of results for display logic.

7:   const totalVotes = sortedResults.reduce((sum, result) => sum + parseInt(result.votes), 0);
- Computes total votes across all parties.

8:   let leadingParty = '-';
- Initialize leader tracker.

9:   let maxVotes = 0;
- Track top vote count.

10:   let tieCount = 0;
- Track ties for leading party.

11:   sortedResults.forEach(result => {
- Loop through sorted results to find leader and ties.

12:     const votes = parseInt(result.votes);
- Parse vote count as integer.

13:     if (votes > maxVotes) { maxVotes = votes; leadingParty = result.party; tieCount = 1; }
- Update leader when a new max is found.

14:     else if (votes === maxVotes) { tieCount++; leadingParty = tieCount > 1 ? 'Tie' : result.party; }
- Handle tie cases.

15:   });
- Close loop.

16:   document.getElementById('total-votes').textContent = totalVotes.toLocaleString();
- Update DOM element showing total votes.

17:   document.getElementById('leading-party').textContent = leadingParty;
- Update DOM element showing leading party label.

18:   document.getElementById('summary-total').textContent = totalVotes.toLocaleString();
- Update summary total.

19:   const totalVoters = window.resultsData.totalVoters || 0;
- Read total registered voters to compute turnout.

20:   const turnout = totalVoters > 0 ? ((totalVotes / totalVoters) * 100).toFixed(1) : 0;
- Compute turnout percentage with one decimal.

21:   document.getElementById('summary-turnout').textContent = turnout + '%';
- Update turnout element.

22:   const tieMessage = document.getElementById('tie-message');
- Grab tie message container.

23:   if (tieCount > 1) { tieMessage.style.display = 'block'; } else { tieMessage.style.display = 'none'; }
- Show or hide tie notice.

24:   const resultCards = document.querySelectorAll('.result-card');
- Select each result card to update progress bars.

25:   resultCards.forEach((card, index) => {
- Iterate cards and sync percent/width with actual data.

26:     const partyName = card.querySelector('.party-name').textContent.trim();
- Read visible party name from the card.

27:     const result = sortedResults.find(r => r.party === partyName);
- Find corresponding result entry by matching party identifier.

28:     if (result) {
- If found, compute percentage.

29:       const percentage = totalVotes > 0 ? ((parseInt(result.votes) / totalVotes) * 100).toFixed(1) : 0;
- Calculate share percentage.

30:       const progressBar = card.querySelector('.progress-bar');
- Select card's progress bar element.

31:       if (progressBar) { progressBar.setAttribute('data-percentage', percentage); setTimeout(() => { progressBar.style.width = percentage + '%'; }, 500 + (index * 100)); }
- Animate progress bar width with a slight stagger per card.

32:       const percentageElement = card.querySelector('.percentage'); if (percentageElement) { percentageElement.textContent = percentage + '%'; }
- Update textual percentage inside card.

33:     }
- End if result.

34:   });
- End resultCards loop.

35:   if (electionStartDate || electionEndDate) { initializeCountdown(electionStartDate, electionEndDate); }
- Start countdown logic when dates are present.

36: });
- End DOMContentLoaded handler.

37: function initializeCountdown(startDate, endDate) {
- Defines countdown initialization which decides whether to count to start or to end.

38:   const countdownContainer = document.getElementById('countdown-container');
- Cache container elements for updates.

39:   const countdownTitle = document.getElementById('countdown-title');
- Title element indicating Start/End.

40:   const now = new Date();
- Current time reference.

41:   startDate = startDate ? new Date(startDate) : null;
- Parse provided ISO dates.

42:   endDate = endDate ? new Date(endDate) : null;
- Parse end date.

43:   let targetDate = null; let title = '';
- Prepare variables.

44:   if (startDate && now < startDate) { targetDate = startDate; title = 'Election Starts In'; }
- If before start, countdown to start.

45:   else if (endDate && now < endDate) { targetDate = endDate; title = 'Election Ends In'; }
- Else if ongoing, countdown to end.

46:   else if (endDate && now > endDate) { title = 'Election Has Ended'; countdownContainer.style.display = 'block'; countdownTitle.textContent = title; return; }
- If already ended, show ended message and stop.

47:   if (targetDate) { countdownContainer.style.display = 'block'; countdownTitle.textContent = title; updateCountdown(targetDate); setInterval(() => updateCountdown(targetDate), 1000); }
- Show container and start periodic countdown updates.

48: }
- End initializeCountdown.

49: function updateCountdown(targetDate) {
- Compute remaining time and update DOM values (`days`, `hours`, `minutes`, `seconds`).

50:   const now = new Date(); const timeLeft = targetDate - now;
- Time difference in milliseconds.

51:   if (timeLeft <= 0) { document.getElementById('days').textContent = '00'; document.getElementById('hours').textContent = '00'; document.getElementById('minutes').textContent = '00'; document.getElementById('seconds').textContent = '00'; return; }
- When target reached, zero out counters.

52:   const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
- Compute days remaining.

53:   const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
- Compute hours.

54:   const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
- Compute minutes.

55:   const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
- Compute seconds.

56:   document.getElementById('days').textContent = days.toString().padStart(2, '0');
- Write padded days string.

57:   document.getElementById('hours').textContent = hours.toString().padStart(2, '0');
- Hours.

58:   document.getElementById('minutes').textContent = minutes.toString().padStart(2, '0');
- Minutes.

59:   document.getElementById('seconds').textContent = seconds.toString().padStart(2, '0');
- Seconds.

60: }
- End updateCountdown.

---

## File: public/js/party.js

1: // Party Page Interactive Features
- Top-level comment describing script purpose.

2: document.addEventListener('DOMContentLoaded', function() {
- Initialize UI features after DOM ready.

3:     initializeModals();
- Sets up modal behavior for party cards.

4:     initializeAnimations();
- Sets up intersection observers for animations.

5:     initializeScrollEffects();
- Adds navbar shrink and parallax effects.

6: });
- End DOM ready handler.

7: function initializeSearch() {
- Search input logic to filter party cards by text.

8:     const searchInput = document.getElementById('partySearch');
- Grabs search input element.

9:     const partyCards = document.querySelectorAll('.party-card');
- Node list of party cards.

10:     searchInput.addEventListener('input', function(e) {
- On input, read value and filter cards.

11:         const searchTerm = e.target.value.toLowerCase().trim();
- Normalize search term.

12:         partyCards.forEach(card => {
- For each card check if matches.

13:             const partyName = card.querySelector('h3').textContent.toLowerCase();
- English name.

14:             const partyNameAmharic = card.querySelector('p.opacity-75').textContent.toLowerCase();
- Amharic text.

15:             const description = card.querySelector('.description-section p').textContent.toLowerCase();
- Description content.

16:             const matches = partyName.includes(searchTerm) || partyNameAmharic.includes(searchTerm) || description.includes(searchTerm);
- Determine match presence.

17:             if (matches || searchTerm === '') { card.style.display = 'block'; card.style.animation = 'fadeInUp 0.5s ease-out'; } else { card.style.display = 'none'; }
- Show/hide with simple animation.

18:         });
- End forEach.

19:     });
- End input listener.

20: }
- End initializeSearch.

21: function initializeFilters() {
- Filter buttons logic to show subsets (ruling/opposition/regional).

22:     const filterButtons = document.querySelectorAll('.filter-btn');
- Filter button collection.

23:     const partyCards = document.querySelectorAll('.party-card');
- Cards.

24:     filterButtons.forEach(button => {
- Add click listeners to update active state and visibility.

25:         button.addEventListener('click', function() {
- On filter click.

26:             const filterType = this.dataset.filter;
- Read filter type from data attribute.

27:             filterButtons.forEach(btn => btn.classList.remove('active'));
- Remove active class from all.

28:             this.classList.add('active');
- Mark clicked button active.

29:             partyCards.forEach(card => {
- Iterate cards to apply filter.

30:                 const badge = card.querySelector('.badge');
- Read badge element for category text.

31:                 const badgeText = badge ? badge.textContent.toLowerCase() : '';
- Normalize badge text.

32:                 if (filterType === 'all' || (filterType === 'ruling' && badgeText.includes('ruling')) || (filterType === 'opposition' && badgeText.includes('opposition')) || (filterType === 'regional' && badgeText.includes('regional'))) { card.style.display = 'block'; card.style.animation = 'slideInUp 0.5s ease-out'; } else { card.style.display = 'none'; }
- Apply filter to visibility.

33:             });
- End partyCards loop.

34:         });
- End button listener.

35:     });
- End buttons forEach.

36: }
- End initializeFilters.

37: function initializeModals() {
- Modal setup: open card to show detailed party info.

38:     const partyCards = document.querySelectorAll('.party-card');
- Select cards.

39:     const modal = document.getElementById('partyModal');
- Grab modal container.

40:     partyCards.forEach(card => {
- Add click listeners to each card to populate and show modal.

41:         card.addEventListener('click', function() {
- On card click.

42:             const partyData = extractPartyData(this);
- Extract structured data from DOM.

43:             populateModal(modal, partyData);
- Fill modal content.

44:             modal.style.display = 'block'; document.body.style.overflow = 'hidden'; setTimeout(() => { modal.classList.add('show'); }, 10);
- Show modal and lock page scroll with entrance animation.

45:         });
- End click handler.

46:     });
- End partyCards forEach.

47:     modal.addEventListener('click', function(e) { if (e.target === modal || e.target.classList.contains('close')) { closeModal(modal); } });
- Close modal when clicking backdrop or close control.

48:     document.addEventListener('keydown', function(e) { if (e.key === 'Escape' && modal.classList.contains('show')) { closeModal(modal); } });
- Close modal on Escape key.

49: }
- End initializeModals.

50: function extractPartyData(card) {
- Extracts multiple fields from a party card DOM into an object for the modal.

51:     return { name: card.querySelector('h3').textContent, nameAmharic: card.querySelector('p.opacity-75').textContent, logo: card.querySelector('.party-logo img').src, ideology: card.querySelector('.ideology-section p').textContent, leader: { name: card.querySelector('.leader-section h6').textContent, nameAmharic: card.querySelector('.leader-section p').textContent, image: card.querySelector('.leader-avatar').src }, description: card.querySelector('.description-section').innerHTML, badge: card.querySelector('.badge').textContent, badgeClass: card.querySelector('.badge').className };
- Returns structured party data (name, images, descriptions, badges).

52: }
- End extractPartyData.

53: function populateModal(modal, data) {
- Populates modal DOM elements from extracted data.

54:     modal.querySelector('.modal-title').textContent = data.name;
- Sets title.

55:     modal.querySelector('.modal-logo').src = data.logo;
- Logo.

56:     modal.querySelector('.modal-ideology').textContent = data.ideology;
- Ideology text.

57:     modal.querySelector('.modal-leader-name').textContent = data.leader.name;
- Leader name.

58:     modal.querySelector('.modal-leader-image').src = data.leader.image;
- Leader image.

59:     modal.querySelector('.modal-description').innerHTML = data.description;
- Description HTML.

60:     const badge = modal.querySelector('.modal-badge'); badge.textContent = data.badge; badge.className = `badge ${data.badgeClass.split(' ').slice(1).join(' ')}`;
- Set badge text and classes (remove leading class name from original badge class list).

61: }
- End populateModal.

62: function closeModal(modal) { modal.classList.remove('show'); document.body.style.overflow = 'auto'; setTimeout(() => { modal.style.display = 'none'; }, 300); }
- Hides modal and restores scroll with a slight delay for exit animation.

63: function initializeAnimations() {
- Sets up intersection observer to add `animate-in` to cards when visible.

64:     const observerOptions = { threshold: 0.1, rootMargin: '0px 0px -50px 0px' };
- Observer options to trigger slightly before fully visible.

65:     const observer = new IntersectionObserver((entries) => { entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('animate-in'); } }); }, observerOptions);
- Observer callback adding animation class.

66:     document.querySelectorAll('.party-card').forEach(card => { observer.observe(card); });
- Observe each party card for animations.

67: }
- End initializeAnimations.

68: function initializeScrollEffects() {
- Adds scroll listener for navbar shrink and hero parallax.

69:     let lastScrollTop = 0; const navbar = document.querySelector('.navbar');
- Track last scroll and grab navbar.

70:     window.addEventListener('scroll', function() {
- On scroll handler.

71:         const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
- Compute scroll offset.

72:         if (scrollTop > 100) { navbar.classList.add('navbar-shrink'); } else { navbar.classList.remove('navbar-shrink'); }
- Toggle navbar shrink class.

73:         const hero = document.querySelector('.hero-section'); if (hero) { hero.style.transform = `translateY(${scrollTop * 0.5}px)`; }
- Apply simple parallax transform to hero.

74:         lastScrollTop = scrollTop;
- Update last scroll.

75:     });
- End scroll listener.

76: }
- End initializeScrollEffects.

77: function debounce(func, wait) { let timeout; return function executedFunction(...args) { const later = () => { clearTimeout(timeout); func(...args); }; clearTimeout(timeout); timeout = setTimeout(later, wait); }; }
- Utility debounce implementation used by interactive features.

78: function showLoading(card) { card.classList.add('loading'); setTimeout(() => { card.classList.remove('loading'); }, 1000); }
- Small helper that toggles a `loading` class briefly for visual feedback.

79: document.querySelectorAll('.party-card').forEach(card => { card.addEventListener('mouseenter', function() { this.style.transform = 'translateY(-10px) rotateX(5deg)'; }); card.addEventListener('mouseleave', function() { this.style.transform = 'translateY(0) rotateX(0)'; }); });
- Adds hover transform effects to party cards for interactivity.

---

## File: public/js/register_admin.js

1: // Password visibility toggle for password field
- Top-level comment describing toggles.

2: document.getElementById('togglePassword').addEventListener('click', function() {
- Click handler toggles password input type and icon.

3:   const passwordInput = document.getElementById('password');
- Password input element.

4:   const passwordIcon = document.getElementById('passwordIcon');
- Icon element to switch between `fa-eye` and `fa-eye-slash`.

5:   if (passwordInput.type === 'password') { passwordInput.type = 'text'; passwordIcon.classList.remove('fa-eye'); passwordIcon.classList.add('fa-eye-slash'); } else { passwordInput.type = 'password'; passwordIcon.classList.remove('fa-eye-slash'); passwordIcon.classList.add('fa-eye'); }
- Toggle input type and icon classes to show/hide password.

6: });
- End toggle handler.

7: document.getElementById('toggleConfirmPassword').addEventListener('click', function() {
- Same toggle behavior for confirm password field.

8:   const confirmPasswordInput = document.getElementById('confirmPassword'); const confirmPasswordIcon = document.getElementById('confirmPasswordIcon');
- Elements for confirm field.

9:   if (confirmPasswordInput.type === 'password') { confirmPasswordInput.type = 'text'; confirmPasswordIcon.classList.remove('fa-eye'); confirmPasswordIcon.classList.add('fa-eye-slash'); } else { confirmPasswordInput.type = 'password'; confirmPasswordIcon.classList.remove('fa-eye-slash'); confirmPasswordIcon.classList.add('fa-eye'); }
- Toggle logic.

10: });
- End confirm toggle.

11: function checkPasswordMatch() {
- Validates that `password` and `confirmPassword` match and enables/disables submit.

12:   const password = document.getElementById('password').value;
- Read password value.

13:   const confirmPassword = document.getElementById('confirmPassword').value;
- Read confirm value.

14:   const messageDiv = document.getElementById('passwordMatchMessage'); const submitBtn = document.querySelector('button[type="submit"]');
- Elements used for feedback and disabling submit.

15:   if (confirmPassword === '') { messageDiv.textContent = ''; submitBtn.disabled = true; return; }
- If empty, clear message and disable submit.

16:   if (password === confirmPassword) { messageDiv.innerHTML = '<i class="fas fa-check text-success"></i> Passwords match'; messageDiv.className = 'form-text text-success'; submitBtn.disabled = false; } else { messageDiv.innerHTML = '<i class="fas fa-times text-danger"></i> Passwords do not match'; messageDiv.className = 'form-text text-danger'; submitBtn.disabled = true; }
- Update UI text and control disabled state based on match.

17: }
- End checkPasswordMatch.

18: document.getElementById('confirmPassword').addEventListener('input', checkPasswordMatch);
- Run check as the user types in confirm field.

19: document.getElementById('password').addEventListener('input', checkPasswordMatch);
- Also check when password input changes.


## File: views/vote.ejs

1: <!DOCTYPE html>
- HTML5 doctype declaration.

2: <html lang="en">
- Root element with language attribute.

3: <head>
- Document head start.

4:     <meta charset="UTF-8">
- Character encoding.

5:     <meta name="viewport" content="width=device-width, initial-scale=1.0">
- Responsive viewport.

6:     <title>Vote - Ethiopian Vote System</title>
- Page title for the voting page.

7:     <link rel="stylesheet" href="/css/vote.css">
- Includes styles specific to the voting UI.

8: </head>
- Close head.

9: <body>
- Start body.

10:     <div class="container py-5">
- Main container for the vote interface.

11:         <div class="row">
- Layout row.

12:             <div class="col-md-8">
- Left column where party list and voting form appear.

13:                 <h2 class="mb-4">Choose Your Party</h2>
- Heading prompting voter to select a party.

14:                 <form action="/vote" method="POST">
- Form posts the selected party to `/vote`.

15:                     <div class="list-group">
- Bootstrap list group to display parties.

16:                         <% parties.forEach(function(party) { %>
- EJS loop rendering each party passed from server.

17:                             <label class="list-group-item d-flex justify-content-between align-items-start">
- Label styled as selectable list-group item.

18:                                 <div class="ms-2 me-auto">
- Container for party text.

19:                                     <div class="fw-bold"><%= party.displayName %></div>
- Shows combined English and Amharic party name.

20:                                     <small class="text-muted"><%= party.ideology %></small>
- Displays party ideology as a small subtitle.

21:                                 </div>
- Close text container.

22:                                 <input type="radio" name="party" value="<%= party.id %>" required>
- Radio input setting the party id as the submitted value; `required` ensures a choice is made.

23:                             </label>
- Close label.

24:                         <% }) %>
- End loop over parties.

25:                     </div>
- Close list-group.

26:                     <div class="mt-4">
- Container for submit button.

27:                         <button type="submit" class="btn btn-primary btn-lg">Submit Vote</button>
- Primary large button to submit the vote.

28:                     </div>
- Close submit container.

29:                 </form>
- Close form.

30:             </div>
- Close left column.

31:             <div class="col-md-4">
- Right column for contextual information (e.g., countdown or help).

32:                 <% if (isOriginalSuperAdmin) { %>
- Conditional content shown if the user is the original super admin.

33:                     <div class="alert alert-warning">You are the original super admin. Special actions available.</div>
- Small alert indicating elevated privileges.

34:                 <% } %>
- End conditional.

35:                 <div class="card">
- Card for election status or help text.

36:                     <div class="card-body">
- Card body.

37:                         <h5>How voting works</h5>
- Section heading describing the process.

38:                         <p class="small text-muted">Select your preferred party and submit. You cannot change your vote once submitted.</p>
- Important note about vote immutability.

39:                     </div>
- Close card body.

40:                 </div>
- Close card.

41:             </div>
- Close right column.

42:         </div>
- Close row.

43:     </div>
- Close container.

44: </body>
- Close body.

45: </html>
- Close document.

---

## File: views/results.ejs

1: <!DOCTYPE html>
- HTML5 doctype.

2: <html lang="en">
- Root element.

3: <head>
- Head start.

4:     <meta charset="UTF-8">
- Encoding.

5:     <meta name="viewport" content="width=device-width, initial-scale=1.0">
- Viewport meta.

6:     <title>Results - Ethiopian Vote System</title>
- Page title for results view.

7:     <link rel="stylesheet" href="/css/results.css">
- Include results-specific stylesheet.

8: </head>
- Close head.

9: <body>
- Start body.

10:     <div class="container py-5">
- Main container.

11:         <h2 class="mb-4">Election Results</h2>
- Heading.

12:         <div id="results-chart"></div>
- Placeholder div where client JS will render a chart using `resultsDataJson` injected by the server.

13:         <div class="mt-4">
- Container for tabular results or summary stats.

14:             <table class="table table-striped">
- Bootstrap table to list parties and their vote counts.

15:                 <thead>
- Table header.

16:                     <tr>
- Row for column headings.

17:                         <th>Party</th>
- Column for party name.

18:                         <th>Votes</th>
- Column for vote counts.

19:                     </tr>
- Close header row.

20:                 </thead>
- Close thead.

21:                 <tbody>
- Table body start.

22:                     <% results.forEach(function(row){ %>
- EJS loop over aggregated results passed from server.

23:                         <tr>
- Start row for a single result entry.

24:                             <td><%= row.party %></td>
- Party identifier (may be party id or name depending on how server returned it).

25:                             <td><%= row.votes %></td>
- Vote count for this party.

26:                         </tr>
- Close result row.

27:                     <% }) %>
- End loop.

28:                 </tbody>
- Close table body.

29:             </table>
- Close table.

30:         </div>
- Close summary container.

31:     </div>
- Close container.

	<script>
- Inline script block where `resultsDataJson` will be parsed by client code in `public/js/results.js`.

		const resultsData = <%- resultsDataJson %>;
- Server-injected JSON object used by client-side charting code.

	</script>

	<script src="/js/results.js"></script>
- Loads client script that renders charts and countdowns using `resultsData`.

</body>
- Close body.

</html>
- Close document.

---

## File: database.sql

This file defines the PostgreSQL database schema, constraints, indexes, triggers, seed data, and helper functions used by the application.

1: -- ===========================================
- Header separator marking the schema file.

2: -- Ethiopian Voting System Database Schema
- Title comment describing the file's purpose.

3: -- ===========================================
- End of header.

5: -- CREATE DATABASE ethiopian_vote;
- Example command to create the database; run outside the schema file if needed.

8: -- ENUM TYPES
- Section marker for enum type definitions.

11: CREATE TYPE gender_type AS ENUM ('Male', 'Female', 'Other');
- Defines `gender_type` to restrict `voters.sex` to known values.

14: CREATE TYPE admin_role AS ENUM ('admin', 'super_admin');
- Defines `admin_role` to constrain admin roles.

17: CREATE TYPE vote_status AS ENUM ('pending', 'confirmed', 'cancelled');
- Defines `vote_status` for vote lifecycle tracking.

21: -- CORE TABLES
- Marker for core application tables.

25: CREATE TABLE admins (
- Creates `admins` table storing administrative users.

26-37:   id SERIAL PRIMARY KEY, username VARCHAR(50) UNIQUE NOT NULL CHECK (LENGTH(TRIM(username)) > 0), password VARCHAR(255) NOT NULL, email VARCHAR(255) UNIQUE CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'), role admin_role DEFAULT 'admin' NOT NULL, is_active BOOLEAN DEFAULT TRUE, last_login TIMESTAMP, login_attempts INTEGER DEFAULT 0, locked_until TIMESTAMP, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, created_by INTEGER REFERENCES admins(id), updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
- Fields explanation: unique username, bcrypt-hashed password, optional validated email, role constrained by `admin_role`, activity and lockout fields, timestamps, and `created_by` referencing another admin (audit/ownership).

43: CREATE TABLE parties (
- Creates `parties` table for political party metadata and assets.

44-55:   id SERIAL PRIMARY KEY, name_english VARCHAR(255) NOT NULL UNIQUE CHECK (LENGTH(TRIM(name_english)) > 0), name_amharic VARCHAR(255) NOT NULL UNIQUE CHECK (LENGTH(TRIM(name_amharic)) > 0), leader_name_english VARCHAR(255) NOT NULL CHECK (LENGTH(TRIM(leader_name_english)) > 0), leader_name_amharic VARCHAR(255) NOT NULL CHECK (LENGTH(TRIM(leader_name_amharic)) > 0), ideology TEXT NOT NULL CHECK (LENGTH(TRIM(ideology)) > 0), description_english TEXT NOT NULL CHECK (LENGTH(TRIM(description_english)) > 0), description_amharic TEXT NOT NULL CHECK (LENGTH(TRIM(description_amharic)) > 0), logo_url VARCHAR(500), leader_image_url VARCHAR(500), is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, created_by INTEGER REFERENCES admins(id)
- Fields explanation: bilingual names/descriptions, optional image URLs, active flag, timestamps, and creator admin reference.

62: CREATE TABLE voters (
- Creates `voters` table to store registered voter records.

63-76:   id SERIAL PRIMARY KEY, fullname VARCHAR(255) NOT NULL CHECK (LENGTH(TRIM(fullname)) > 0), age INTEGER NOT NULL CHECK (age >= 18 AND age <= 120), sex gender_type NOT NULL, region VARCHAR(100) NOT NULL CHECK (LENGTH(TRIM(region)) > 0), zone VARCHAR(100) NOT NULL CHECK (LENGTH(TRIM(zone)) > 0), woreda VARCHAR(100) NOT NULL CHECK (LENGTH(TRIM(woreda)) > 0), city_kebele VARCHAR(100) NOT NULL CHECK (LENGTH(TRIM(city_kebele)) > 0), phone_number VARCHAR(20) CHECK (phone_number IS NULL OR LENGTH(TRIM(phone_number)) >= 10), finnumber VARCHAR(50) UNIQUE NOT NULL CHECK (LENGTH(TRIM(finnumber)) > 0), password VARCHAR(255) NOT NULL, has_changed_password BOOLEAN DEFAULT FALSE, is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
- Fields explanation: demographic and contact fields, FIN number uniqueness, password hash, flag for enforced password change, and timestamps.

85: CREATE TABLE votes (
- Creates `votes` table capturing each vote and minimal audit data.

86-96:   id SERIAL PRIMARY KEY, voter_id INTEGER NOT NULL REFERENCES voters(id) ON DELETE CASCADE, party VARCHAR(255) NOT NULL CHECK (LENGTH(TRIM(party)) > 0), status vote_status DEFAULT 'confirmed', ip_address INET, user_agent TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
- Fields explanation: references the `voters` table (cascade delete), stores selected party (string), status, optional IP/user-agent for auditing, and timestamps.

100: -- ADMINISTRATION TABLES
- Section marker for admin/system-specific tables.

103: CREATE TABLE admin_settings (
- Stores global configuration like election dates and flags.

104-112:   id SERIAL PRIMARY KEY, election_start_date TIMESTAMP, election_end_date TIMESTAMP, registration_open BOOLEAN DEFAULT TRUE, max_votes_per_day INTEGER DEFAULT 1000, system_maintenance BOOLEAN DEFAULT FALSE, maintenance_message TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
- Fields explanation: election scheduling fields used by route checks, registration control, maintenance flags and messaging.

117: -- AUDIT AND LOGGING TABLES
- Section marker for logging/audit tables.

120: CREATE TABLE admin_audit_log (
- Logs admin actions with before/after JSON for traceability.

121-130:   id SERIAL PRIMARY KEY, admin_id INTEGER REFERENCES admins(id) ON DELETE SET NULL, action VARCHAR(100) NOT NULL, table_name VARCHAR(50), record_id INTEGER, old_values JSONB, new_values JSONB, ip_address INET, user_agent TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
- Fields explanation: allows storing structured diffs and metadata for admin operations.

135: CREATE TABLE voter_activity_log (
- Records voter-side actions (e.g., registration, password change).

136-142:   id SERIAL PRIMARY KEY, voter_id INTEGER REFERENCES voters(id) ON DELETE CASCADE, action VARCHAR(100) NOT NULL, details JSONB, ip_address INET, user_agent TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
- Fields explanation: structured log entries for auditing individual voter actions.

148: CREATE TABLE system_config (
- Generic key/value configuration table using JSONB values.

149-154:   id SERIAL PRIMARY KEY, config_key VARCHAR(100) UNIQUE NOT NULL, config_value JSONB, description TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
- Fields explanation: stores arbitrary configuration entries used by the app.

159: -- INDEXES FOR PERFORMANCE
- Section marker for indexes.

162-169: CREATE INDEX idx_parties_name_english ON parties(name_english); CREATE INDEX idx_parties_name_amharic ON parties(name_amharic); CREATE INDEX idx_parties_is_active ON parties(is_active); CREATE INDEX idx_parties_created_by ON parties(created_by);
- Indexes on `parties` speed up lookups by name, active status, and creator.

172-175: CREATE INDEX idx_voters_finnumber ON voters(finnumber); CREATE INDEX idx_voters_region ON voters(region); CREATE INDEX idx_voters_age ON voters(age); CREATE INDEX idx_voters_is_active ON voters(is_active);
- Voter indexes enable fast FIN lookups and common filters (region, age, active).

178-181: CREATE INDEX idx_votes_voter_id ON votes(voter_id); CREATE INDEX idx_votes_party ON votes(party); CREATE INDEX idx_votes_created_at ON votes(created_at); CREATE INDEX idx_votes_status ON votes(status);
- Vote indexes help aggregation queries (group by party) and recent vote queries.

184-186: CREATE INDEX idx_admins_username ON admins(username); CREATE INDEX idx_admins_role ON admins(role); CREATE INDEX idx_admins_is_active ON admins(is_active);
- Admin indexes support login and role-based queries.

190: -- TRIGGERS FOR AUTOMATIC UPDATES
- Section marker for triggers.

193: CREATE OR REPLACE FUNCTION update_updated_at_column()
- Trigger function that sets `updated_at` to current timestamp on UPDATE.

200-206: CREATE TRIGGER update_voters_updated_at BEFORE UPDATE ON voters FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); CREATE TRIGGER update_votes_updated_at BEFORE UPDATE ON votes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); CREATE TRIGGER update_admin_settings_updated_at BEFORE UPDATE ON admin_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); CREATE TRIGGER update_admins_updated_at BEFORE UPDATE ON admins FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); CREATE TRIGGER update_system_config_updated_at BEFORE UPDATE ON system_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
- Applies the update-timestamp trigger to tables that require `updated_at` maintenance.

210: -- INITIAL DATA
- Section marker for recommended seed data.

213: INSERT INTO admin_settings (registration_open) VALUES (TRUE);
- Seeds default admin settings permitting registration.

217-221: INSERT INTO admins (username, password, role, email) VALUES ('admin', '$2a$10$w3PBAjh/IdaLdVZfSvfWBeAgyYCrRd7gJIfx1AOzxeABlLQFwzQ8u', 'super_admin', 'admin@ethiopianvote.et');
- Inserts a default super-admin account with a pre-hashed bcrypt password (change before production).

225-237: INSERT INTO parties (...) VALUES (...);
- Seeds initial party records used by the application and referenced in reset/reseed flows.

241: INSERT INTO system_config (config_key, config_value, description) VALUES
- Seeds basic system configuration keys like `system_name`, `version`, and lockout settings.

251: -- VIEWS FOR EASY QUERYING
- Section marker for database views that simplify common queries.

254: CREATE VIEW voter_details AS
- View that concatenates address fields and exposes voter metadata for admin UIs.

273: CREATE VIEW vote_statistics AS
- View that aggregates votes per party including status-based filters (confirmed/pending/cancelled).

287: -- FUNCTIONS
- Section marker for stored procedures.

290: CREATE OR REPLACE FUNCTION get_voter_count_by_region()
- Returns a table of voter counts by region for reporting dashboards.

304: CREATE OR REPLACE FUNCTION has_voter_voted(voter_fin VARCHAR)
- Function that checks whether a voter (by FIN) has a confirmed vote; used by application logic to prevent double voting.

322: -- PERMISSIONS AND SECURITY
- Notes on recommended grants; commented out to avoid inadvertent privilege changes in different environments.

334: -- COMMENTS
- Adds human-readable comments to key tables to aid DB admins.

340: -- END OF SCHEMA
- Footer marker.

---

If you'd like, I can now:
- Expand any specific section into exact line-numbered annotations (e.g., the `admins` table or the trigger/function definitions). 
- Or proceed to annotate `init_db.js` next. Which do you prefer?

---

## File: init_db.js

This script programmatically creates the `ethiopian_vote` PostgreSQL database (if missing) and applies the `database.sql` schema to it. It is intended as a developer convenience for initial setup.

1: const { Pool } = require('pg');
- Imports `Pool` from the `pg` PostgreSQL client to create DB connections.

2: const fs = require('fs');
- Imports Node's `fs` module to read the SQL file from disk.

3: require('dotenv').config();
- Loads environment variables from `.env` so DB credentials can be read from `process.env`.

4: // PostgreSQL connection to default database first
- Comment explaining that initial connection is to the default `postgres` database for DB creation.

5: const pool = new Pool({
- Creates a `Pool` connected to the default `postgres` database.

6:   user: process.env.DB_USER || 'postgres',
- Username from env or fallback to `postgres`.

7:   host: process.env.DB_HOST || 'localhost',
- DB host from env or localhost.

8:   database: 'postgres', // Connect to default database first
- Initially connects to the `postgres` maintenance database so the script can `CREATE DATABASE`.

9:   password: process.env.DB_PASSWORD,
- Password read from env (no fallback provided here.

10:   port: process.env.DB_PORT || 5432,
- Port from env or default Postgres port.

11: });
- End of initial pool configuration.

12: async function initializeDatabase() {
- Main async function that performs the initialization steps.

13:   let ethiopianVotePool = null;
- Placeholder for connection pool that will point to the newly-created database.

14:   try {
- Begin main try/catch for error handling.

15:     console.log('🚀 Initializing Ethiopian Vote System database...');
- Informational log to show startup.

16:     // Step 1: Create the database if it doesn't exist
- Comment marking first step.

17:     console.log('📦 Creating database...');
- Log before attempting to create DB.

18:     try {
- Inner try to handle `CREATE DATABASE` errors gracefully (exists vs other errors).

19:       await pool.query('CREATE DATABASE ethiopian_vote');
- Executes `CREATE DATABASE`; will error if DB already exists.

20:       console.log('✅ Database created successfully!');
- Success log if DB created.

21:     } catch (error) {
- Catch block for `CREATE DATABASE`.

22:       if (error.code === '42P04') {
- Checks Postgres error code `42P04` which means 'database already exists'.

23:         console.log('ℹ️  Database already exists, continuing...');
- If DB exists, proceed without failing.

24:       } else {
- For other DB errors, rethrow to be handled by outer catch.

25:         throw error;

26:       }

27:     }
- End inner try/catch.

28:     // Step 2: Close connection to default database
- Commented step to close the initial pool before connecting to the new DB.

29:     await pool.end();
- Closes the connection pool to the `postgres` DB so we can open a new pool to `ethiopian_vote`.

30:     // Step 3: Connect to the new database
- Comment.

31:     console.log('🔌 Connecting to ethiopian_vote database...');
- Log indicating next connection step.

32:     ethiopianVotePool = new Pool({
- Creates a second `Pool` instance that connects to the newly created database.

33:       user: process.env.DB_USER || 'postgres',
- Reuse credentials for the new pool.

34:       host: process.env.DB_HOST || 'localhost',
- Host for new pool.

35:       database: 'ethiopian_vote',
- Connect to the target database name.

36:       password: process.env.DB_PASSWORD,
- Password from env.

37:       port: process.env.DB_PORT || 5432,
- Port.

38:     });
- End of new pool config.

39:     // Step 4: Read and execute the SQL schema
- Comment marking next action.

40:     console.log('📄 Reading database schema...');
- Log before reading SQL file.

41:     const sqlContent = fs.readFileSync('database.sql', 'utf8');
- Synchronously reads `database.sql` into memory as a UTF-8 string.

42:     // Remove the CREATE DATABASE and \\c commands (psql specific)
- Comment explaining sanitation performed on the SQL text.

43:     const cleanSql = sqlContent
- Begins transformation pipeline to remove psql-specific commands.

44:       .replace(/CREATE DATABASE ethiopian_vote;/gi, '')
- Removes any `CREATE DATABASE` statement to avoid conflicts when executing inside the new DB.

45:       .replace(/\\c ethiopian_vote;/gi, '')
- Removes psql `\\c` database-change commands (escaped backslash in JS regex literal).

46:       .replace(/-- Create database[\s\S]*?-- Use the database[\s\S]*?\\c ethiopian_vote;/gi, '')
- A broader regex to strip a multi-line block that may include comments and the `\\c` line.

47:       .trim();
- Trim leading/trailing whitespace after cleaning.

48:     // Split the SQL into individual statements
- (Note: the script originally intended to split statements, but it executes `cleanSql` directly below.)

49:    console.log('⚡ Executing full SQL schema...');
- Informational log before executing the SQL.

50:    await ethiopianVotePool.query(cleanSql);
- Executes the full cleaned SQL script in a single `query` call (works if the client/driver supports multiple statements, otherwise may fail).

51:     console.log('✅ Database schema initialized successfully!');
- Success log after applying schema.

52:     console.log('📋 Default Admin Credentials:');
- Informational note reminding developer of seeded admin credentials.

53:     console.log('   Username: admin');
- Username printed.

54:     console.log('   Password: admin_password');
- Password printed (note: the actual DB stores a hashed password and this is informational only).

55:     console.log('   Role: super_admin');
- Role printed.

56:     console.log('');
- Blank line for readability.

57:     console.log('🎯 Ready to start the server with: npm start');
- Final instruction to developer.

58:   } catch (error) {
- Outer catch to handle errors from any initialization step.

59:     console.error('❌ Error initializing database:', error);
- Logs the full error object.

60:     console.error('💡 Make sure PostgreSQL is running and credentials are correct');
- Helpful hint for troubleshooting.

61:   } finally {
- Finally block for cleanup.

62:     if (ethiopianVotePool) {
- If the new pool was created, close it.

63:       await ethiopianVotePool.end();
- Cleanly end the pool to free connections.

64:     }

65:   }

66: }
- End of `initializeDatabase` function.

67: initializeDatabase();
- Immediately invoke the initializer when the script is run.

---

Notes and recommendations:
- The script uses `Pool.query(cleanSql)` to execute the whole SQL text. Depending on the Postgres driver and server settings, executing multiple semicolon-separated statements in a single `query` may fail; splitting by `;` carefully or using a psql client would be more robust for complex schema files.
- The script logs default plaintext credentials for convenience; in a production environment, remove or rotate seeded credentials and do not log passwords.
- Ensure `process.env` variables (`DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`) are set prior to running this script.

---

## File: public/images (notable static assets)

This folder contains image assets used by the public-facing pages. Below are the files present and their typical uses in the UI.

- `vote.png` — Generic voting-themed hero or header image used on landing or index pages as a visual illustration for the election.
- `vote1.png` — Secondary illustration variant; used in static pages like `party.html` or marketing sections where an alternative composition is desirable.
- `vote2.png` — Additional decorative asset; used in cards or informational sections where a smaller graphic is needed.
- `vote3.png` — Small icon/illustration variant used in banners or as a fallback image when party logos are missing.
- `vote4.png` — Another decorative/illustrative image that may be used in results or promotional sections.

Notes:
- These images appear to be the only assets in `public/images`; many pages use remote image URLs or uploaded images (`/uploads`) for party logos and leader photos instead. If you want a full catalog of usages (which `.ejs` files reference each image), I can search the repo and list every reference.

---

## File: package.json

This file defines the Node.js project metadata, scripts, and runtime dependencies used by the application.

1: {
- JSON root start; package metadata follows.

2:   "name": "black-box-vote",
- Project name registered in npm metadata (unused by app at runtime).

3:   "version": "1.0.0",
- Project semantic version.

4:   "main": "server.js",
- Entry point for the package when `require()`-ing this package; server's main file.

5:   "scripts": {
- NPM scripts for common tasks.

6:     "start": "node server.js",
- Starts the application by running `server.js` with Node.

7:     "init-db": "node init_db.js",
- Convenience script to initialize the database by running the `init_db.js` script.

8:     "setup": "npm run init-db && npm start",
- Composite script that initializes the DB and then starts the server.

9:     "migrate:latest": "knex migrate:latest",
- Runs Knex migrations to apply DB schema changes (if migrations are present).

10:     "migrate:rollback": "knex migrate:rollback"
- Rolls back the last Knex migration batch.

11:   },
- End scripts object.

12:   "dependencies": {
- Production dependencies required by the app.

13:     "bcryptjs": "^3.0.3",
- Password hashing library used for storing/verifying voter/admin passwords.

14:     "bootstrap": "^5.3.8",
- Front-end CSS framework used in the EJS views.

15:     "connect-redis": "^9.0.0",
- Session store integration for `express-session` using Redis (optional; config not shown in `server.js`).

16:     "cookie-parser": "^1.4.7",
- Middleware for parsing cookies (not heavily used elsewhere in this repo, but included).

17:     "csurf": "^1.11.0",
- CSRF protection middleware (may not be wired into all forms in the app; included as a dependency).

18:     "dotenv": "^16.4.5",
- Loads environment variables from a `.env` file at startup.

19:     "ejs": "^3.1.10",
- Templating engine used to render server-side HTML views.

20:     "express": "^4.19.2",
- Web framework used to build routes and middleware.

21:     "express-session": "^1.18.2",
- Session middleware for login/session management.

22:     "multer": "^2.0.2",
- File upload middleware used for party logo/leader uploads.

23:     "pg": "^8.11.5",
- PostgreSQL client used by `server.js` and `init_db.js`.

24:     "redis": "^5.10.0"
- Redis client used with `connect-redis` when a Redis-backed session store is configured.

25:   }
- End dependencies.

26: }
- End package.json.

---

## File: knexfile.js

Knex configuration file used by Knex CLI to run migrations and connect to the database.

1: module.exports = {
- Exports environment-specific DB configs for Knex.

2:   development: {
- Development environment configuration.

3:     client: 'pg',
- Specifies PostgreSQL client.

4:     connection: {
- Connection block with host/user/password/database placeholders.

5:       host: 'localhost',
- DB host used in development.

6:       user: 'your_username',
- Placeholder username; should be replaced with real credential or a `process.env` reference.

7:       password: 'your_password',
- Placeholder password; replace before use or move to env variables.

8:       database: 'ethiopian_vote'
- Database name used by Knex for migrations.

9:     },
- End connection object.

10:     migrations: {
- Knex migrations configuration.

11:       directory: './migrations'
- Directory where migration files should live; used by `knex migrate:latest`.

12:     }
- End migrations.

13:   }
- End development config.

14: };
- End exported object.

---

Notes:
- `knexfile.js` uses plaintext placeholders for `user` and `password`; for safety prefer using `process.env` variables (e.g., `process.env.DB_USER`).
- The project includes `migrate` scripts in `package.json` but no `migrations/` folder present in this snapshot; if you plan to use Knex migrations, create migration files under `migrations/` or run `knex migrate:make <name>`.

---

## File: views/party_dynamic.ejs

1: <!DOCTYPE html>
- HTML5 doctype.

2: <html lang="en">
- Root element.

3: <head>
- Head start.

4:     <meta charset="UTF-8">
- Encoding.

5:     <meta name="viewport" content="width=device-width, initial-scale=1.0">
- Viewport tag.

6:     <title>Parties - Ethiopian Vote System</title>
- Title for the dynamic parties page.

7:     <link rel="stylesheet" href="/css/parties.css">
- Include parties page stylesheet.

8: </head>
- Close head.

9: <body>
- Start body.

10:     <div class="container py-5">
- Container for listing parties.

11:         <h2 class="mb-4">Political Parties</h2>
- Page heading.

12:         <div class="row">
- Row to hold party cards.

13:             <% parties.forEach(function(party) { %>
- Loop through `parties` array provided by server.

14:                 <div class="col-md-6 mb-4">
- Column for an individual party card.

15:                     <div class="card h-100">
- Card to show party details and images.

16:                         <div class="row g-0">
- Nested row for card layout (image + text).

17:                             <div class="col-4">
- Left column for party logo or leader image.

18:                                 <img src="<%= party.logo_url || '/images/default-logo.png' %>" class="img-fluid rounded-start" alt="Party Logo">
- Shows party logo if available, otherwise a default image.

19:                             </div>
- Close image column.

20:                             <div class="col-8">
- Right column for textual details.

21:                                 <div class="card-body">
- Card body wrapper.

22:                                     <h5 class="card-title"><%= party.name_english %> (<%= party.name_amharic %>)</h5>
- Display both English and Amharic names.

23:                                     <p class="card-text small text-muted"><%= party.ideology %></p>
- Party ideology summary.

24:                                     <p class="card-text"><%= party.description_english %></p>
- Full description of the party in English.

25:                                 </div>
- Close card body.

26:                             </div>
- Close text column.

27:                         </div>
- Close nested row.

28:                     </div>
- Close card.

29:                 </div>
- Close column.

30:             <% }) %>
- End loop.

31:         </div>
- Close row.

32:     </div>
- Close container.

</body>
- Close body.

</html>
- Close document.

## File: views/login.ejs

1: <!DOCTYPE html>
- Declares HTML5 document type.

2: <html lang="en">
- Root element, language set to English.

3: <head>
- Document head start (meta, title, assets).

4:     <meta charset="UTF-8">
- UTF-8 encoding.

5:     <meta name="viewport" content="width=device-width, initial-scale=1.0">
- Responsive viewport.

6:     <title>Login - Ethiopian Vote System</title>
- Page title.

7:     <link rel="stylesheet" href="/css/styles.css">
- Includes site stylesheet.

8: </head>
- Close head.

9: <body>
- Open body.

10:     <div class="container py-5">
- Main container with vertical padding.

11:         <div class="row justify-content-center">
- Centers the inner column.

12:             <div class="col-md-6">
- Column width for medium+ screens.

13:                 <div class="card shadow-sm">
- Card wrapper around the login form.

14:                     <div class="card-body p-4">
- Card body with padding.

15:                         <h3 class="mb-4">Voter Login</h3>
- Form heading.

16:                         <% if (error) { %>
- EJS conditional: shows error block if server passed `error`.

17:                             <div class="alert alert-danger"><%= error %></div>
- Displays the error message from the server.

18:                         <% } %>
- End conditional.

19:                         <form action="/login" method="POST">
- Login form posts to `/login`.

20:                             <div class="mb-3">
- Form group for national ID.

21:                                 <label for="nationalId" class="form-label">National ID</label>
- Input label.

22:                                 <input type="text" name="nationalId" id="nationalId" class="form-control" required>
- Text input for national ID (client-side required).

23:                             </div>
- Close group.

24:                             <div class="mb-3">
- Password group.

25:                                 <label for="password" class="form-label">Password</label>
- Password label.

26:                                 <input type="password" name="password" id="password" class="form-control" required>
- Password input (hidden characters).

27:                             </div>
- Close password group.

28:                             <div class="d-grid">
- Makes the submit button full width.

29:                                 <button type="submit" class="btn btn-primary">Login</button>
- Submit button for form.

30:                             </div>
- Close d-grid.

31:                         </form>
- Close form.

32:                         <div class="mt-3 text-center">
- Footer area with auxiliary links.

33:                             <a href="/register">Register as voter</a>
- Link to the voter registration page.

34:                         </div>
- Close footer.

35:                     </div>
- Close card body.

36:                 </div>
- Close card.

37:             </div>
- Close column.

38:         </div>
- Close row.

39:     </div>
- Close container.

40: </body>
- Close body.

41: </html>
- Close document.

---

## File: views/register.ejs

1: <!DOCTYPE html>
- HTML5 doctype.

2: <html lang="en">
- Root element.

3: <head>
- Head start.

4:     <meta charset="UTF-8">
- Encoding.

5:     <meta name="viewport" content="width=device-width, initial-scale=1.0">
- Viewport tag.

6:     <title>Register - Ethiopian Vote System</title>
- Page title for registration.

7:     <link rel="stylesheet" href="/css/styles.css">
- Include site stylesheet.

8: </head>
- Close head.

9: <body>
- Open body.

10:     <div class="container py-5">
- Main container.

11:         <div class="row justify-content-center">
- Center layout.

12:             <div class="col-md-7 col-lg-6">
- Column sizing for form width.

13:                 <div class="card shadow-sm">
- Card wrapper.

14:                     <div class="card-body p-4">
- Card body.

15:                         <h3 class="mb-4">Voter Registration</h3>
- Form heading.

16:                         <% if (errors && errors.length) { %>
- Conditional to show validation errors array.

17:                             <div class="alert alert-danger">
- Alert wrapper.

18:                                 <ul class="mb-0">
- Unordered list for individual errors.

19:                                     <% errors.forEach(function(err){ %>
- Loop over error messages.

20:                                         <li><%= err %></li>
- Output a single error message.

21:                                     <% }) %>
- End loop.

22:                                 </ul>
- Close list.

23:                             </div>
- Close alert.

24:                         <% } %>
- End errors conditional.

25:                         <form action="/register" method="POST">
- Registration form posts to `/register` route.

26:                             <div class="mb-3">
- Full name field.

27:                                 <label for="fullName" class="form-label">Full Name</label>
- Label.

28:                                 <input type="text" name="fullName" id="fullName" class="form-control" required>
- Text input for full name.

29:                             </div>
- Close group.

30:                             <div class="mb-3">
- National ID field.

31:                                 <label for="nationalId" class="form-label">National ID</label>
- Label.

32:                                 <input type="text" name="nationalId" id="nationalId" class="form-control" required>
- Input for national identification number.

33:                             </div>
- Close group.

34:                             <div class="mb-3">
- Password field.

35:                                 <label for="password" class="form-label">Password</label>
- Label for password.

36:                                 <input type="password" name="password" id="password" class="form-control" required>
- Password input.

37:                             </div>
- Close group.

38:                             <div class="d-grid">
- Submit container.

39:                                 <button type="submit" class="btn btn-primary">Register</button>
- Register button to create voter account.

40:                             </div>
- Close d-grid.

41:                         </form>
- Close form.

42:                     </div>
- Close card body.

43:                 </div>
- Close card.

44:             </div>
- Close column.

45:         </div>
- Close row.

46:     </div>
- Close container.

47: </body>
- Close body.

48: </html>
- Close document.
