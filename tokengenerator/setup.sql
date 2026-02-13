CREATE DATABASE IF NOT EXISTS austriax_web_id_ff_intranet CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE austriax_web_id_ff_intranet;

CREATE TABLE IF NOT EXISTS tokens (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    token VARCHAR(64) NOT NULL UNIQUE,
    prefix VARCHAR(20) NOT NULL,
    created_at DATETIME NOT NULL,
    expires_at DATETIME NOT NULL,
    redeemed_at DATETIME NULL,
    INDEX idx_tokens_expires_at (expires_at)
);
