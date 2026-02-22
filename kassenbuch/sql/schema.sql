CREATE TABLE IF NOT EXISTS transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    invoice_no VARCHAR(50) NOT NULL,
    type ENUM('income', 'expense') NOT NULL,
    description VARCHAR(255) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    date DATE NOT NULL,
    created_by VARCHAR(100) NOT NULL,
    status ENUM('active', 'cancelled') NOT NULL DEFAULT 'active',
    cancelled_at TIMESTAMP NULL DEFAULT NULL,
    cancelled_by VARCHAR(100) NULL,
    cancel_reason VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_transactions_date (date),
    INDEX idx_transactions_status (status)
);

INSERT INTO transactions (invoice_no, type, description, amount, date, created_by, status) VALUES
('FW-2026-001', 'income', 'Mitgliedsbeiträge Q1', 2500.00, '2026-01-10', 'Kassier A', 'active'),
('FW-2026-002', 'expense', 'Fahrzeugreparatur', 420.50, '2026-01-11', 'Kassier A', 'active'),
('FW-2026-003', 'income', 'Förderung Gemeinde', 1780.00, '2026-01-12', 'Kommando', 'active'),
('FW-2026-004', 'expense', 'Miete Lagerhalle', 950.00, '2026-01-13', 'Verwaltung', 'active'),
('FW-2026-005', 'income', 'Veranstaltungs-Erlös', 1300.00, '2026-01-14', 'Kassier B', 'active');
