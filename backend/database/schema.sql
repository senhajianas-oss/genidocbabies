-- schema.sql for Cloudflare D1 (SQLite)

CREATE TABLE IF NOT EXISTS genidoc_auth_users (
  genidoc_user_id INTEGER PRIMARY KEY AUTOINCREMENT,
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL, -- ADMIN, TUTEUR, PEDIATRE
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS genidoc_enfant (
  genidoc_enfant_id INTEGER PRIMARY KEY AUTOINCREMENT,
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  date_naissance TEXT NOT NULL,
  sexe TEXT NOT NULL, -- M, F
  groupe_sanguin TEXT, -- A+, A-, etc.
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS genidoc_organisation (
  genidoc_org_id INTEGER PRIMARY KEY AUTOINCREMENT,
  org_nom TEXT NOT NULL,
  org_type TEXT NOT NULL, -- CLINIQUE, HOPITAL, etc.
  org_ville TEXT NOT NULL,
  org_adresse TEXT NULL,
  org_telephone TEXT NULL,
  org_email TEXT NULL,
  org_code TEXT NOT NULL UNIQUE,
  created_by_user_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by_user_id) REFERENCES genidoc_auth_users(genidoc_user_id)
);

CREATE TABLE IF NOT EXISTS genidoc_organisation_settings (
  genidoc_org_id INTEGER PRIMARY KEY,
  validation_mode TEXT NOT NULL DEFAULT 'OBLIGATOIRE',
  domaines_email TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (genidoc_org_id) REFERENCES genidoc_organisation(genidoc_org_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS genidoc_user_organisation (
  genidoc_user_id INTEGER PRIMARY KEY,
  genidoc_org_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (genidoc_user_id) REFERENCES genidoc_auth_users(genidoc_user_id) ON DELETE CASCADE,
  FOREIGN KEY (genidoc_org_id) REFERENCES genidoc_organisation(genidoc_org_id)
);

CREATE TABLE IF NOT EXISTS genidoc_onboarding (
  genidoc_user_id INTEGER PRIMARY KEY,
  role TEXT NOT NULL,
  current_step INTEGER NOT NULL DEFAULT 1,
  is_completed INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (genidoc_user_id) REFERENCES genidoc_auth_users(genidoc_user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS genidoc_pediatre_profile (
  genidoc_user_id INTEGER PRIMARY KEY,
  numero_ordre TEXT NULL,
  telephone_pro TEXT NULL,
  specialite TEXT NULL,
  type_structure TEXT NULL,
  nom_structure TEXT NULL,
  ville TEXT NULL,
  email_pro TEXT NULL,
  adresse TEXT NULL,
  validation_status TEXT NOT NULL DEFAULT 'PENDING',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (genidoc_user_id) REFERENCES genidoc_auth_users(genidoc_user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS genidoc_tuteur_profile (
  genidoc_user_id INTEGER PRIMARY KEY,
  telephone TEXT NULL,
  ville TEXT NULL,
  adresse TEXT NULL,
  cin TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (genidoc_user_id) REFERENCES genidoc_auth_users(genidoc_user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS genidoc_pediatre_enfant (
  genidoc_enfant_id INTEGER NOT NULL,
  genidoc_user_id INTEGER NOT NULL,
  code_pediatrie TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (genidoc_enfant_id, genidoc_user_id),
  FOREIGN KEY (genidoc_enfant_id) REFERENCES genidoc_enfant(genidoc_enfant_id) ON DELETE CASCADE,
  FOREIGN KEY (genidoc_user_id) REFERENCES genidoc_auth_users(genidoc_user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS genidoc_vital_enfant (
  genidoc_vital_id INTEGER PRIMARY KEY AUTOINCREMENT,
  genidoc_enfant_id INTEGER NOT NULL,
  poids_kg REAL NULL,
  taille_cm REAL NULL,
  temperature_c REAL NULL,
  frequence_cardiaque_bpm INTEGER NULL,
  saturation_o2_pct INTEGER NULL,
  notes TEXT NULL,
  measured_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (genidoc_enfant_id) REFERENCES genidoc_enfant(genidoc_enfant_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS genidoc_consultation (
  genidoc_consultation_id INTEGER PRIMARY KEY AUTOINCREMENT,
  genidoc_org_id INTEGER NOT NULL,
  genidoc_enfant_id INTEGER NOT NULL,
  genidoc_pediatre_user_id INTEGER NOT NULL,
  consulted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  motif TEXT NULL,
  diagnostic TEXT NULL,
  ordonnance TEXT NULL,
  notes TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (genidoc_org_id) REFERENCES genidoc_organisation(genidoc_org_id),
  FOREIGN KEY (genidoc_enfant_id) REFERENCES genidoc_enfant(genidoc_enfant_id),
  FOREIGN KEY (genidoc_pediatre_user_id) REFERENCES genidoc_auth_users(genidoc_user_id)
);

CREATE TABLE IF NOT EXISTS genidoc_vaccin_catalog (
  genidoc_vaccin_id INTEGER PRIMARY KEY AUTOINCREMENT,
  vaccin_code TEXT NOT NULL UNIQUE,
  vaccin_nom TEXT NOT NULL,
  age_recommande_mois INTEGER NULL,
  nb_doses INTEGER NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS genidoc_vaccination_enfant (
  genidoc_vaccination_id INTEGER PRIMARY KEY AUTOINCREMENT,
  genidoc_enfant_id INTEGER NOT NULL,
  genidoc_vaccin_id INTEGER NOT NULL,
  dose_no INTEGER NULL,
  vaccinated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  lot TEXT NULL,
  genidoc_pediatre_user_id INTEGER NULL,
  notes TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (genidoc_enfant_id) REFERENCES genidoc_enfant(genidoc_enfant_id),
  FOREIGN KEY (genidoc_vaccin_id) REFERENCES genidoc_vaccin_catalog(genidoc_vaccin_id)
);

-- Seed Initial Data
INSERT INTO genidoc_organisation (org_nom, org_type, org_ville, org_code, created_by_user_id) 
VALUES ('Clinique Hayat', 'CLINIQUE', 'Casablanca', 'V8H5CLPX', 1);

-- Test Pediatrician: Dr. Badreddine Lahlou (password: password123)
-- Hash generated for 'password123'
INSERT INTO genidoc_auth_users (nom, prenom, email, password_hash, role) 
VALUES ('Lahlou', 'Badreddine', 'dr.lahlou@genidoc.ma', '$2a$10$D68O97hW/A.L6Dgh88K.p.fEIs3X.X8QJ2yTmW/Ew6D6zD6zD6zD6', 'PEDIATRE');

-- Test Patient: Anas Senhaji
INSERT INTO genidoc_enfant (nom, prenom, date_naissance, sexe, groupe_sanguin) 
VALUES ('Senhaji', 'Anas', '2023-05-15', 'M', 'A+');

-- Link Patient to Doctor
INSERT INTO genidoc_pediatre_enfant (genidoc_enfant_id, genidoc_user_id, code_pediatrie) 
VALUES (1, 2);

INSERT INTO genidoc_vaccin_catalog (vaccin_code, vaccin_nom, age_recommande_mois, nb_doses) VALUES 
('BCG', 'Tuberculose', 0, 1),
('VHB', 'Hépatite B', 0, 3),
('DTC', 'Diphtérie, Tétanos, Coqueluche', 2, 3),
('VPI', 'Polio', 2, 3);
