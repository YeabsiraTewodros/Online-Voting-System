# Online Voting System

A secure and anonymous voting system built with Node.js, Express, and PostgreSQL for Ethiopian political parties.

## Features

- **Secure Authentication**: Admin and voter login with bcrypt password hashing
- **Anonymous Voting**: Voters can cast votes without revealing identity
- **Admin Management**: Super admin can manage admin accounts and toggle voting periods
- **Real-time Results**: Live vote tallying and results display
- **Voter Registration**: Admin-controlled voter registration process
- **Session Management**: Secure session handling with express-session
- **Environment Configuration**: Sensitive data stored in environment variables

## Technologies Used

- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL
- **Frontend**: EJS templates, HTML, CSS, JavaScript
- **Authentication**: bcryptjs for password hashing
- **Session Management**: express-session
- **Environment Variables**: dotenv

## Prerequisites

- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

## Installation

1. **Clone the repository**:

   ```bash
   git clone <repository-url>
   cd black-box-vote
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Set up the database**:

   - Create a PostgreSQL database named `ethiopian_vote`
   - Run the database schema:

     ```bash
     psql -d ethiopian_vote -f database.sql
     ```

     or simply run
     node init_db.js

4. **Configure environment variables**:

   - Copy `.env.example` to `.env` (if available) or create `.env` file
   - Update the following variables:
     ```
     DB_USER=your_postgres_username
     DB_HOST=localhost
     DB_NAME=ethiopian_vote
     DB_PASSWORD=your_postgres_password
     DB_PORT=5432
     PORT=3000
     ```

5. **Initialize the database** (optional, for testing):
   ```bash
   node init_db.js
   ```

## Usage

1. **Start the server**:

   ```bash
   npm start
   ```

2. **Access the application**:

   - Open your browser and go to `http://localhost:3000`

3. **Admin Setup**:

   - Use `insert_admin.js` to create initial admin accounts
   - Login as admin to manage voters and voting periods

4. **Voting Process**:
   - Voters register through admin
   - Voters login and change default password
   - Cast vote during open voting period
   - View results after voting

## Project Structure

```
black-box-vote/
├── server.js                 # Main application file
├── database.sql              # Database schema
├── package.json              # Dependencies and scripts
├── .env                      # Environment variables (not in repo)
├── .gitignore                # Git ignore rules
├── views/                    # EJS templates
│   ├── index.ejs
│   ├── login.ejs
│   ├── vote.ejs
│   └── ...
├── public/                   # Static assets
│   ├── css/
│   ├── js/
│   └── images/
├── init_db.js                # Database initialization
├── insert_admin.js           # Admin creation script
└── README.md                 # This file
```

## Available Scripts

- `npm start`: Start the production server
- `npm test`: Run tests (if implemented)
- `node init_db.js`: Initialize database tables
- `node insert_admin.js`: Create admin accounts
- `node generate_hash.js`: Generate password hashes for testing

## Security Features

- Password hashing with bcrypt
- Session-based authentication
- Environment variable configuration
- Admin role-based access control
- Vote period controls
- FIN number validation for voters

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support or questions, please open an issue in the repository.

## Disclaimer

This is a demonstration project for educational purposes. In a real-world voting system, additional security measures, audits, and legal compliance would be required.
