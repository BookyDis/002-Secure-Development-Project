CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    mfa_secret TEXT,
    mfa_verified BOOLEAN DEFAULT FALSE
);
