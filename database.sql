-- Ethiopian Voting System Database Schema

-- ENUM TYPES

-- Gender enumeration
CREATE TYPE gender_type AS ENUM ('Male', 'Female', 'Other');
CREATE TYPE admin_role AS ENUM ('admin', 'super_admin');
CREATE TYPE vote_status AS ENUM ('pending', 'confirmed', 'cancelled');
-- CORE TABLES
CREATE TABLE admins (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL CHECK (LENGTH(TRIM(username)) > 0),
  password VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  role admin_role DEFAULT 'admin' NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMP,
  login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER REFERENCES admins(id),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE parties (
  id SERIAL PRIMARY KEY,
  name_english VARCHAR(255) NOT NULL UNIQUE CHECK (LENGTH(TRIM(name_english)) > 0),
  name_amharic VARCHAR(255) NOT NULL UNIQUE CHECK (LENGTH(TRIM(name_amharic)) > 0),
  leader_name_english VARCHAR(255) NOT NULL CHECK (LENGTH(TRIM(leader_name_english)) > 0),
  leader_name_amharic VARCHAR(255) NOT NULL CHECK (LENGTH(TRIM(leader_name_amharic)) > 0),
  ideology TEXT NOT NULL CHECK (LENGTH(TRIM(ideology)) > 0),
  description_english TEXT NOT NULL CHECK (LENGTH(TRIM(description_english)) > 0),
  description_amharic TEXT NOT NULL CHECK (LENGTH(TRIM(description_amharic)) > 0),
  logo_url VARCHAR(500),
  leader_image_url VARCHAR(500),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER REFERENCES admins(id)
);

CREATE TABLE voters (
  id SERIAL PRIMARY KEY,
  fullname VARCHAR(255) NOT NULL CHECK (LENGTH(TRIM(fullname)) > 0),
  age INTEGER NOT NULL CHECK (age >= 18 AND age <= 120),
  sex gender_type NOT NULL,
  region VARCHAR(100) NOT NULL CHECK (LENGTH(TRIM(region)) > 0),
  zone VARCHAR(100) NOT NULL CHECK (LENGTH(TRIM(zone)) > 0),
  woreda VARCHAR(100) NOT NULL CHECK (LENGTH(TRIM(woreda)) > 0),
  city_kebele VARCHAR(100) NOT NULL CHECK (LENGTH(TRIM(city_kebele)) > 0),
  phone_number VARCHAR(20) CHECK (phone_number IS NULL OR LENGTH(TRIM(phone_number)) >= 10),
  finnumber VARCHAR(50) UNIQUE NOT NULL CHECK (LENGTH(TRIM(finnumber)) > 0),
  password VARCHAR(255) NOT NULL,
  has_changed_password BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE votes (
  id SERIAL PRIMARY KEY,
  voter_id INTEGER NOT NULL REFERENCES voters(id) ON DELETE CASCADE,
  party VARCHAR(255) NOT NULL CHECK (LENGTH(TRIM(party)) > 0),
  status vote_status DEFAULT 'confirmed',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ADMINISTRATION TABLES

-- Admin settings with system configuration
CREATE TABLE admin_settings (
  id SERIAL PRIMARY KEY,
  election_start_date TIMESTAMP,
  election_end_date TIMESTAMP,
  registration_open BOOLEAN DEFAULT TRUE,
  registration_start_date TIMESTAMP,
  registration_end_date TIMESTAMP,
  max_votes_per_day INTEGER DEFAULT 1000,
  system_maintenance BOOLEAN DEFAULT FALSE,
  maintenance_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AUDIT AND LOGGING TABLES

-- Admin actions audit log
CREATE TABLE admin_audit_log (
  id SERIAL PRIMARY KEY,
  admin_id INTEGER REFERENCES admins(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  table_name VARCHAR(50),
  record_id INTEGER,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Voter activity log
CREATE TABLE voter_activity_log (
  id SERIAL PRIMARY KEY,
  voter_id INTEGER REFERENCES voters(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- SYSTEM TABLES

-- System configuration
CREATE TABLE system_config (
  id SERIAL PRIMARY KEY,
  config_key VARCHAR(100) UNIQUE NOT NULL,
  config_value JSONB,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- INDEXES FOR PERFORMANCE

-- Parties table indexes
CREATE INDEX idx_parties_name_english ON parties(name_english);
CREATE INDEX idx_parties_name_amharic ON parties(name_amharic);
CREATE INDEX idx_parties_is_active ON parties(is_active);
CREATE INDEX idx_parties_created_by ON parties(created_by);

-- Voters table indexes
CREATE INDEX idx_voters_finnumber ON voters(finnumber);
CREATE INDEX idx_voters_region ON voters(region);
CREATE INDEX idx_voters_age ON voters(age);
CREATE INDEX idx_voters_is_active ON voters(is_active);

-- Votes table indexes
CREATE INDEX idx_votes_voter_id ON votes(voter_id);
CREATE INDEX idx_votes_party ON votes(party);
CREATE INDEX idx_votes_created_at ON votes(created_at);
CREATE INDEX idx_votes_status ON votes(status);

-- Admins table indexes
CREATE INDEX idx_admins_username ON admins(username);
CREATE INDEX idx_admins_role ON admins(role);
CREATE INDEX idx_admins_is_active ON admins(is_active);

-- Audit log indexes
CREATE INDEX idx_admin_audit_admin_id ON admin_audit_log(admin_id);
CREATE INDEX idx_admin_audit_created_at ON admin_audit_log(created_at);
CREATE INDEX idx_voter_activity_voter_id ON voter_activity_log(voter_id);
CREATE INDEX idx_voter_activity_created_at ON voter_activity_log(created_at);

-- TRIGGERS FOR AUTOMATIC UPDATES

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to relevant tables
CREATE TRIGGER update_voters_updated_at BEFORE UPDATE ON voters FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_votes_updated_at BEFORE UPDATE ON votes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_admin_settings_updated_at BEFORE UPDATE ON admin_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_admins_updated_at BEFORE UPDATE ON admins FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_system_config_updated_at BEFORE UPDATE ON system_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- INITIAL DATA

-- Insert default admin setting
INSERT INTO admin_settings (registration_open, registration_start_date, registration_end_date) VALUES (TRUE, NULL, NULL);

-- Insert default super admin user
INSERT INTO admins (username, password, role, email) VALUES
('admin', '$2a$10$w3PBAjh/IdaLdVZfSvfWBeAgyYCrRd7gJIfx1AOzxeABlLQFwzQ8u', 'super_admin', 'admin@ethiopianvote.et');

-- Insert initial party data
INSERT INTO parties (name_english, name_amharic, leader_name_english, leader_name_amharic, ideology, description_english, description_amharic, created_by) VALUES
('Prosperity Party', 'ብልጽግና ፓርቲ', 'Abiy Ahmed', 'አብይ አህመድ', 'Development and Prosperity', 'The Prosperity Party is committed to transforming Ethiopia through sustainable development, economic growth, and national unity.', 'ብልጽግና ፓርቲ ኢትዮጵያን በማለሳለስ ኢኮኖሚ እድገት እና ብሔራዊ አንድነት በመላክ ለመለወጥ ተለያዩበታል።', 1),
('Ethiopian Citizens for Social Justice - EZEMA', 'የኢትዮጵያ ዜጎች ለማኅበራዊ ፍትህ(ኢዜማ)', 'Berhanu Nega', 'ብርሃኑ ነጋ', 'Social Justice and Democracy', 'EZEMA focuses on promoting social justice, democratic values, and equal opportunities for all Ethiopian citizens.', 'ኢዜማ ማኅበራዊ ፍትህን ለማሳደግ፣ ዲሞክራሲያዊ እሴቶችን ለማሳደግ እና ለሁሉም ኢትዮጵያ ዜጎች እኩል እድሎችን ለማሳደግ ያተኮራል።', 1),
('National Movement of Amhara (NaMA)', 'የአማራ ብሔራዊ ንቅናቄ(አብን)', 'Demeke Mekonnen', 'ደመቀ መኮንን', 'Regional Autonomy and Rights', 'NaMA advocates for the rights and autonomy of the Amhara people while promoting national unity and development.', 'አብን የአማራ ህዝብ መብቶችን እና ራሱን ለማስተያየት ብሔራዊ አንድነትን እና እድገትን በማሳደግ ያተኮራል።', 1),
('Oromo Federalist Congress (OFC)', 'ኦሮሞ ፌዴራሊስት ኮንግረስ(ኦፌኮ)', 'Merera Gudina', 'መራራ ጉዲና', 'Federalism and Self-Determination', 'OFC promotes federalist principles, self-determination for the Oromo people, and democratic governance.', 'ኦፌኮ ፌዴራሊስት መርሆችን ለማሳደግ፣ ለኦሮሞ ህዝብ ራሱን ለማስተያየት እና ዲሞክራሲያዊ አስተያየት ለማሳደግ ያተኮራል።', 1);

-- Insert system configuration defaults
INSERT INTO system_config (config_key, config_value, description) VALUES
('system_name', '"Ethiopian Voting System"', 'Name of the voting system'),
('version', '"1.0.0"', 'Current system version'),
('max_login_attempts', '5', 'Maximum failed login attempts before account lock'),
('lock_duration_minutes', '30', 'Account lock duration in minutes');
-- VIEWS FOR EASY QUERYING

-- View for voter details with full address
CREATE VIEW voter_details AS
SELECT
  v.id,
  v.fullname,
  v.age,
  v.sex,
  CONCAT(v.region, ', ', v.zone, ', ', v.woreda, ', ', v.city_kebele) AS full_address,
  v.region,
  v.zone,
  v.woreda,
  v.city_kebele,
  v.phone_number,
  v.finnumber,
  v.has_changed_password,
  v.is_active,
  v.created_at,
  v.updated_at
FROM voters v;

-- View for vote statistics
CREATE VIEW vote_statistics AS
SELECT
  party,
  COUNT(*) as total_votes,
  COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed_votes,
  COUNT(*) FILTER (WHERE status = 'pending') as pending_votes,
  COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_votes
FROM votes
GROUP BY party
ORDER BY total_votes DESC;
-- FUNCTIONS

-- Function to get voter count by region
CREATE OR REPLACE FUNCTION get_voter_count_by_region()
RETURNS TABLE(region_name VARCHAR, voter_count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT v.region, COUNT(*)::BIGINT
  FROM voters v
  WHERE v.is_active = TRUE
  GROUP BY v.region
  ORDER BY COUNT(*) DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to check if voter has already voted
CREATE OR REPLACE FUNCTION has_voter_voted(voter_fin VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
  vote_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO vote_count
  FROM votes v
  JOIN voters vr ON v.voter_id = vr.id
  WHERE vr.finnumber = voter_fin AND v.status = 'confirmed';

  RETURN vote_count > 0;
END;
$$ LANGUAGE plpgsql;

-- PERMISSIONS AND SECURITY

-- Grant permissions (adjust as needed for your application)
-- GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO voting_app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO voting_app_user;

-- COMMENTS

COMMENT ON TABLE parties IS 'Contains detailed information about political parties';
COMMENT ON TABLE voters IS 'Contains information about registered voters';
COMMENT ON TABLE votes IS 'Records all votes cast in the system';
COMMENT ON TABLE admins IS 'Administrative users with different access levels';
COMMENT ON TABLE admin_settings IS 'System-wide configuration settings';
COMMENT ON TABLE admin_audit_log IS 'Audit trail for admin actions';
COMMENT ON TABLE voter_activity_log IS 'Log of voter activities';
COMMENT ON TABLE system_config IS 'Key-value system configuration';
