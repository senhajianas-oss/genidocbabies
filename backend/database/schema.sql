-- schema.sql for Cloudflare D1 (SQLite)
-- Clean reset
DROP TABLE IF EXISTS genidoc_vaccination_enfant;
DROP TABLE IF EXISTS genidoc_vaccin_catalog;
DROP TABLE IF EXISTS genidoc_consultation;
DROP TABLE IF EXISTS genidoc_vital_enfant;
DROP TABLE IF EXISTS genidoc_pediatre_enfant;
DROP TABLE IF EXISTS genidoc_tuteur_profile;
DROP TABLE IF EXISTS genidoc_pediatre_profile;
DROP TABLE IF EXISTS genidoc_onboarding;
DROP TABLE IF EXISTS genidoc_user_organisation;
DROP TABLE IF EXISTS genidoc_organisation_settings;
DROP TABLE IF EXISTS genidoc_organisation;
DROP TABLE IF EXISTS genidoc_enfant;
DROP TABLE IF EXISTS genidoc_auth_users;

-- Re-create tables
CREATE TABLE genidoc_auth_users (
  genidoc_user_id INTEGER PRIMARY KEY AUTOINCREMENT,
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE genidoc_enfant (
  genidoc_enfant_id INTEGER PRIMARY KEY AUTOINCREMENT,
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  date_naissance TEXT NOT NULL,
  sexe TEXT NOT NULL,
  groupe_sanguin TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE genidoc_organisation (
  genidoc_org_id INTEGER PRIMARY KEY AUTOINCREMENT,
  org_nom TEXT NOT NULL,
  org_type TEXT NOT NULL,
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

CREATE TABLE genidoc_organisation_settings (
  genidoc_org_id INTEGER PRIMARY KEY,
  validation_mode TEXT NOT NULL DEFAULT 'OBLIGATOIRE',
  domaines_email TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (genidoc_org_id) REFERENCES genidoc_organisation(genidoc_org_id) ON DELETE CASCADE
);

CREATE TABLE genidoc_user_organisation (
  genidoc_user_id INTEGER PRIMARY KEY,
  genidoc_org_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (genidoc_user_id) REFERENCES genidoc_auth_users(genidoc_user_id) ON DELETE CASCADE,
  FOREIGN KEY (genidoc_org_id) REFERENCES genidoc_organisation(genidoc_org_id)
);

CREATE TABLE genidoc_onboarding (
  genidoc_user_id INTEGER PRIMARY KEY,
  role TEXT NOT NULL,
  current_step INTEGER NOT NULL DEFAULT 1,
  is_completed INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (genidoc_user_id) REFERENCES genidoc_auth_users(genidoc_user_id) ON DELETE CASCADE
);

CREATE TABLE genidoc_pediatre_profile (
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

CREATE TABLE genidoc_tuteur_profile (
  genidoc_user_id INTEGER PRIMARY KEY,
  telephone TEXT NULL,
  ville TEXT NULL,
  adresse TEXT NULL,
  cin TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (genidoc_user_id) REFERENCES genidoc_auth_users(genidoc_user_id) ON DELETE CASCADE
);

CREATE TABLE genidoc_pediatre_enfant (
  genidoc_enfant_id INTEGER NOT NULL,
  genidoc_user_id INTEGER NOT NULL,
  code_pediatrie TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (genidoc_enfant_id, genidoc_user_id),
  FOREIGN KEY (genidoc_enfant_id) REFERENCES genidoc_enfant(genidoc_enfant_id) ON DELETE CASCADE,
  FOREIGN KEY (genidoc_user_id) REFERENCES genidoc_auth_users(genidoc_user_id) ON DELETE CASCADE
);

CREATE TABLE genidoc_vital_enfant (
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

CREATE TABLE genidoc_consultation (
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

CREATE TABLE genidoc_vaccin_catalog (
  genidoc_vaccin_id INTEGER PRIMARY KEY AUTOINCREMENT,
  vaccin_code TEXT NOT NULL UNIQUE,
  vaccin_nom TEXT NOT NULL,
  age_recommande_mois INTEGER NULL,
  nb_doses INTEGER NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE genidoc_vaccination_enfant (
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

-- Seed Minimal Data
-- 1. Dr. Lahlou (password: password123)
INSERT INTO genidoc_auth_users (genidoc_user_id, nom, prenom, email, password_hash, role) 
VALUES (1, 'Lahlou', 'Badreddine', 'dr.lahlou@genidoc.ma', '$2a$10$7Vr4InkOncQ9zLu9IaI.Tu4Asbx2v/E4Gr90zcKSmkpZk08NEP2FC', 'PEDIATRE');

-- 2. Organisation
INSERT INTO genidoc_organisation (genidoc_org_id, org_nom, org_type, org_ville, org_code, created_by_user_id) 
VALUES (1, 'Clinique Hayat', 'CLINIQUE', 'Casablanca', 'V8H5CLPX', 1);

INSERT INTO genidoc_user_organisation (genidoc_user_id, genidoc_org_id, status) VALUES (1, 1, 'ACTIVE');

-- 3. Patient: Anas SENHAJI (ID 1)
INSERT INTO genidoc_enfant (genidoc_enfant_id, nom, prenom, date_naissance, sexe, groupe_sanguin) 
VALUES (1, 'SENHAJI', 'Anas', '2023-05-15', 'M', 'A+');

-- 4. Link Patient 1 to Doctor 1
INSERT INTO genidoc_pediatre_enfant (genidoc_enfant_id, genidoc_user_id, code_pediatrie) 
VALUES (1, 1, 'C1-PED-LAHLOU');

-- 6. Vaccins Catalog
INSERT INTO genidoc_vaccin_catalog (genidoc_vaccin_id, vaccin_code, vaccin_nom, age_recommande_mois, nb_doses) VALUES 
(1, 'BCG', 'Tuberculose', 0, 1),
(2, 'VHB', 'Hépatite B', 0, 3),
(3, 'DTC', 'Diphtérie, Tétanos, Coqueluche', 2, 3),
(4, 'VPI', 'Polio', 2, 3);

-- 7. Medical History for Anas SENHAJI (ID 1)

-- Vitals History
INSERT INTO genidoc_vital_enfant (genidoc_enfant_id, poids_kg, taille_cm, temperature_c, frequence_cardiaque_bpm, saturation_o2_pct, notes, measured_at) VALUES
(1, 3.5, 50, 36.6, 120, 99, 'Poids à la naissance', '2023-05-15 10:00:00'),
(1, 4.2, 53, 36.7, 115, 98, 'Contrôle 1 mois', '2023-06-15 09:30:00'),
(1, 5.8, 58, 36.5, 110, 100, 'Contrôle 2 mois', '2023-07-15 11:15:00'),
(1, 7.5, 65, 36.8, 105, 99, 'Contrôle 6 mois', '2023-11-15 10:45:00'),
(1, 10.2, 75, 36.6, 95, 99, 'Contrôle 12 mois', '2024-05-15 15:00:00');

-- Consultations
INSERT INTO genidoc_consultation (genidoc_org_id, genidoc_enfant_id, genidoc_pediatre_user_id, motif, diagnostic, ordonnance, notes, consulted_at) VALUES
(1, 1, 1, 'Fièvre et toux', 'Rhinopharyngite aiguë', 'Paracétamol sirop, Lavage de nez au sérum phy', 'Poumons clairs, pas de signe de détresse', '2024-01-20 14:00:00'),
(1, 1, 1, 'Bilan 1 an', 'Croissance normale', 'Continuer Vitamine D', 'Développement psychomoteur excellent', '2024-05-15 15:30:00');

-- Vaccinations Done
INSERT INTO genidoc_vaccination_enfant (genidoc_enfant_id, genidoc_vaccin_id, dose_no, vaccinated_at, lot, genidoc_pediatre_user_id, notes) VALUES
(1, 1, 1, '2023-05-15 12:00:00', 'LOT-BCG-099', 1, 'Fait à la naissance'),
(1, 2, 1, '2023-05-15 12:00:00', 'LOT-VHB-881', 1, 'Fait à la naissance'),
(1, 3, 1, '2023-07-15 11:30:00', 'LOT-DTC-772', 1, 'Légère fièvre après injection');
