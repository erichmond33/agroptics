-- Create users table if it doesn't exist
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create fields table if it doesn't exist
CREATE TABLE IF NOT EXISTS fields (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL DEFAULT 1,
  name VARCHAR(20) NOT NULL,
  description VARCHAR(200),
  geojson JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Insert default user if not exists
INSERT IGNORE INTO users (id, username) VALUES (1, 'default_user');

-- Insert the init field
INSERT INTO fields (id, user_id, name, description, geojson)
VALUES
  (
    1,
    1,
    'db init field',
    'This field was created on startup.',
    '{"id": "zKVvDUfWMxb1Wm2xThQbBWXPgMS3MGdS", "type": "Feature", "geometry": {"type": "Polygon", "coordinates": [[[-104.03467356181606, 40.107930931540665], [-104.0394371974276, 40.10235076689244], [-104.0267341691305, 40.10235076689244], [-104.03467356181606, 40.107930931540665]]]}, "properties": {}}'
  ),
  (
    2,
    1,
    'init far left',
    'This is field is far left so we can see its weather is different.',
    '{"id": "FgAOYMKAFyUitdQBLO7dwTrStcEw1mG2", "type": "Feature", "geometry": {"type": "Polygon", "coordinates": [[[-109.06249176725676, 38.67487990258812], [-109.06263367009392, 38.67467847720363], [-109.06223376209846, 38.67480940376774], [-109.06249176725676, 38.67487990258812]]]}, "properties": {}}'
  );

-- Confirm execution
SELECT 'Init script executed' AS message;