CREATE DATABASE IF NOT EXISTS genidocbabies
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE genidocbabies;

CREATE TABLE IF NOT EXISTS genidoc_auth_users (
  genidoc_user_id INT AUTO_INCREMENT PRIMARY KEY,
  nom VARCHAR(255) NOT NULL,
  prenom VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('ADMIN','TUTEUR','PEDIATRE') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS genidoc_enfant (
  genidoc_enfant_id INT AUTO_INCREMENT PRIMARY KEY,
  nom VARCHAR(255) NOT NULL,
  prenom VARCHAR(255) NOT NULL,
  date_naissance DATE NOT NULL,
  sexe ENUM('M','F') NOT NULL,
  groupe_sanguin ENUM('A+','A-','B+','B-','AB+','AB-','O+','O-') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_enfant_naissance (date_naissance)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS genidoc_organisation (
  genidoc_org_id INT AUTO_INCREMENT PRIMARY KEY,
  org_nom VARCHAR(255) NOT NULL,
  org_type ENUM('CLINIQUE','HOPITAL','CENTRE','RESEAU') NOT NULL,
  org_ville VARCHAR(120) NOT NULL,
  org_adresse VARCHAR(255) NULL,
  org_telephone VARCHAR(30) NULL,
  org_email VARCHAR(255) NULL,
  org_code VARCHAR(30) NOT NULL UNIQUE,
  created_by_user_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_org_ville (org_ville),
  CONSTRAINT fk_org_creator FOREIGN KEY (created_by_user_id)
    REFERENCES genidoc_auth_users(genidoc_user_id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS genidoc_organisation_settings (
  genidoc_org_id INT PRIMARY KEY,
  validation_mode ENUM('OBLIGATOIRE','AUTO') NOT NULL DEFAULT 'OBLIGATOIRE',
  domaines_email VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_org_settings FOREIGN KEY (genidoc_org_id)
    REFERENCES genidoc_organisation(genidoc_org_id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS genidoc_user_organisation (
  genidoc_user_id INT PRIMARY KEY,
  genidoc_org_id INT NOT NULL,
  status ENUM('ACTIVE','PENDING','REJECTED') NOT NULL DEFAULT 'ACTIVE',
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_uo_org (genidoc_org_id),
  CONSTRAINT fk_uo_user FOREIGN KEY (genidoc_user_id)
    REFERENCES genidoc_auth_users(genidoc_user_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_uo_org FOREIGN KEY (genidoc_org_id)
    REFERENCES genidoc_organisation(genidoc_org_id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS genidoc_admin (
  genidoc_user_id INT PRIMARY KEY,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_admin_user FOREIGN KEY (genidoc_user_id)
    REFERENCES genidoc_auth_users(genidoc_user_id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS genidoc_tuteur_profile (
  genidoc_user_id INT PRIMARY KEY,
  telephone VARCHAR(30) NULL,
  ville VARCHAR(120) NULL,
  adresse VARCHAR(255) NULL,
  cin VARCHAR(30) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_tuteur_profile_user FOREIGN KEY (genidoc_user_id)
    REFERENCES genidoc_auth_users(genidoc_user_id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS genidoc_pediatre_profile (
  genidoc_user_id INT PRIMARY KEY,
  numero_ordre VARCHAR(80) NULL,
  telephone_pro VARCHAR(30) NULL,
  specialite VARCHAR(120) NULL,
  type_structure ENUM('CABINET','HOPITAL','CLINIQUE','CENTRE') NULL,
  nom_structure VARCHAR(180) NULL,
  ville VARCHAR(120) NULL,
  email_pro VARCHAR(255) NULL,
  adresse VARCHAR(255) NULL,
  validation_status ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_pediatre_profile_user FOREIGN KEY (genidoc_user_id)
    REFERENCES genidoc_auth_users(genidoc_user_id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS genidoc_onboarding (
  genidoc_user_id INT PRIMARY KEY,
  role ENUM('ADMIN','TUTEUR','PEDIATRE') NOT NULL,
  current_step TINYINT UNSIGNED NOT NULL DEFAULT 1,
  is_completed TINYINT(1) NOT NULL DEFAULT 0,
  completed_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_onboarding_user FOREIGN KEY (genidoc_user_id)
    REFERENCES genidoc_auth_users(genidoc_user_id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS genidoc_onboarding_admin (
  genidoc_user_id INT PRIMARY KEY,
  genidoc_org_id INT NULL,
  org_nom VARCHAR(255) NULL,
  org_type VARCHAR(100) NULL,
  org_ville VARCHAR(120) NULL,
  org_adresse VARCHAR(255) NULL,
  validation_mode ENUM('OBLIGATOIRE','AUTO') NULL,
  domaines_email VARCHAR(255) NULL,
  documents_uploaded TINYINT(1) NOT NULL DEFAULT 0,
  confirm_step3 TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_onb_admin_user FOREIGN KEY (genidoc_user_id)
    REFERENCES genidoc_auth_users(genidoc_user_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_onb_admin_org FOREIGN KEY (genidoc_org_id)
    REFERENCES genidoc_organisation(genidoc_org_id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS genidoc_onboarding_tuteur (
  genidoc_user_id INT PRIMARY KEY,
  carnet_mode ENUM('SCAN','NOUVEAU_NE') NULL,
  carnet_uploaded TINYINT(1) NOT NULL DEFAULT 0,
  last_enfant_id INT NULL,
  confirm_step3 TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_onb_tuteur_user FOREIGN KEY (genidoc_user_id)
    REFERENCES genidoc_auth_users(genidoc_user_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_onb_tuteur_enfant FOREIGN KEY (last_enfant_id)
    REFERENCES genidoc_enfant(genidoc_enfant_id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS genidoc_onboarding_pediatre (
  genidoc_user_id INT PRIMARY KEY,
  documents_uploaded TINYINT(1) NOT NULL DEFAULT 0,
  confirm_step3 TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_onb_pediatre_user FOREIGN KEY (genidoc_user_id)
    REFERENCES genidoc_auth_users(genidoc_user_id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS genidoc_tuteur_enfant (
  genidoc_enfant_id INT NOT NULL,
  genidoc_user_id INT NOT NULL,
  relation ENUM('mere','pere') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (genidoc_enfant_id, relation),
  INDEX idx_te_tuteur (genidoc_user_id),
  CONSTRAINT fk_te_enfant FOREIGN KEY (genidoc_enfant_id)
    REFERENCES genidoc_enfant(genidoc_enfant_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_te_tuteur FOREIGN KEY (genidoc_user_id)
    REFERENCES genidoc_auth_users(genidoc_user_id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS genidoc_pediatre_enfant (
  genidoc_enfant_id INT NOT NULL,
  genidoc_user_id INT NOT NULL,
  code_pediatrie VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (genidoc_enfant_id, genidoc_user_id),
  INDEX idx_pe_pediatre (genidoc_user_id),
  CONSTRAINT fk_pe_enfant FOREIGN KEY (genidoc_enfant_id)
    REFERENCES genidoc_enfant(genidoc_enfant_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_pe_pediatre FOREIGN KEY (genidoc_user_id)
    REFERENCES genidoc_auth_users(genidoc_user_id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS genidoc_vital_enfant (
  genidoc_vital_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  genidoc_enfant_id INT NOT NULL,
  poids_kg DECIMAL(5,2) NULL,
  taille_cm DECIMAL(5,2) NULL,
  temperature_c DECIMAL(4,2) NULL,
  frequence_cardiaque_bpm SMALLINT NULL,
  saturation_o2_pct TINYINT UNSIGNED NULL,
  tension_sys SMALLINT NULL,
  tension_dia SMALLINT NULL,
  perimetre_cranien_cm DECIMAL(5,2) NULL,
  notes TEXT NULL,
  measured_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_vital_enfant_date (genidoc_enfant_id, measured_at),
  CONSTRAINT fk_vital_enfant FOREIGN KEY (genidoc_enfant_id)
    REFERENCES genidoc_enfant(genidoc_enfant_id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS genidoc_documents (
  genidoc_document_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  owner_role ENUM('ADMIN','TUTEUR','PEDIATRE') NOT NULL,
  genidoc_user_id INT NOT NULL,
  genidoc_enfant_id INT NULL,
  genidoc_org_id INT NULL,
  input_name VARCHAR(60) NOT NULL,
  file_original_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  mime_type VARCHAR(120) NOT NULL,
  file_size_bytes BIGINT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_docs_owner (owner_role, genidoc_user_id),
  INDEX idx_docs_enfant (genidoc_enfant_id),
  INDEX idx_docs_org (genidoc_org_id),
  CONSTRAINT fk_docs_user FOREIGN KEY (genidoc_user_id)
    REFERENCES genidoc_auth_users(genidoc_user_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_docs_enfant FOREIGN KEY (genidoc_enfant_id)
    REFERENCES genidoc_enfant(genidoc_enfant_id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_docs_org FOREIGN KEY (genidoc_org_id)
    REFERENCES genidoc_organisation(genidoc_org_id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS genidoc_admin_invitation (
  genidoc_invitation_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  genidoc_user_id INT NOT NULL,
  genidoc_org_id INT NOT NULL,
  invite_email VARCHAR(255) NOT NULL,
  invite_nom VARCHAR(255) NULL,
  invite_prenom VARCHAR(255) NULL,
  invite_role ENUM('PEDIATRE') NOT NULL DEFAULT 'PEDIATRE',
  status ENUM('PENDING','SENT','ACCEPTED','CANCELLED') NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_invite_email (invite_email),
  INDEX idx_invite_org (genidoc_org_id),
  CONSTRAINT fk_inv_admin FOREIGN KEY (genidoc_user_id)
    REFERENCES genidoc_auth_users(genidoc_user_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_inv_org FOREIGN KEY (genidoc_org_id)
    REFERENCES genidoc_organisation(genidoc_org_id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS genidoc_rendezvous (
  genidoc_rdv_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  genidoc_org_id INT NOT NULL,
  genidoc_enfant_id INT NOT NULL,
  genidoc_pediatre_user_id INT NULL,
  created_by_user_id INT NOT NULL,
  start_at DATETIME NOT NULL,
  end_at DATETIME NULL,
  status ENUM('SCHEDULED','CANCELLED','DONE','NO_SHOW') NOT NULL DEFAULT 'SCHEDULED',
  motif VARCHAR(255) NULL,
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_rdv_org_date (genidoc_org_id, start_at),
  INDEX idx_rdv_pediatre_date (genidoc_pediatre_user_id, start_at),
  INDEX idx_rdv_enfant_date (genidoc_enfant_id, start_at),
  CONSTRAINT fk_rdv_org FOREIGN KEY (genidoc_org_id)
    REFERENCES genidoc_organisation(genidoc_org_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_rdv_enfant FOREIGN KEY (genidoc_enfant_id)
    REFERENCES genidoc_enfant(genidoc_enfant_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_rdv_pediatre FOREIGN KEY (genidoc_pediatre_user_id)
    REFERENCES genidoc_auth_users(genidoc_user_id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_rdv_creator FOREIGN KEY (created_by_user_id)
    REFERENCES genidoc_auth_users(genidoc_user_id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS genidoc_consultation (
  genidoc_consultation_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  genidoc_rdv_id BIGINT NULL,
  genidoc_org_id INT NOT NULL,
  genidoc_enfant_id INT NOT NULL,
  genidoc_pediatre_user_id INT NOT NULL,
  consulted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  motif VARCHAR(255) NULL,
  diagnostic TEXT NULL,
  ordonnance TEXT NULL,
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_consult_org_date (genidoc_org_id, consulted_at),
  INDEX idx_consult_pediatre_date (genidoc_pediatre_user_id, consulted_at),
  INDEX idx_consult_enfant_date (genidoc_enfant_id, consulted_at),
  CONSTRAINT fk_consult_rdv FOREIGN KEY (genidoc_rdv_id)
    REFERENCES genidoc_rendezvous(genidoc_rdv_id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_consult_org FOREIGN KEY (genidoc_org_id)
    REFERENCES genidoc_organisation(genidoc_org_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_consult_enfant FOREIGN KEY (genidoc_enfant_id)
    REFERENCES genidoc_enfant(genidoc_enfant_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_consult_pediatre FOREIGN KEY (genidoc_pediatre_user_id)
    REFERENCES genidoc_auth_users(genidoc_user_id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS genidoc_vaccin_catalog (
  genidoc_vaccin_id INT AUTO_INCREMENT PRIMARY KEY,
  vaccin_code VARCHAR(60) NOT NULL UNIQUE,
  vaccin_nom VARCHAR(255) NOT NULL,
  age_recommande_mois SMALLINT UNSIGNED NULL,
  nb_doses SMALLINT UNSIGNED NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS genidoc_vaccination_enfant (
  genidoc_vaccination_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  genidoc_enfant_id INT NOT NULL,
  genidoc_vaccin_id INT NOT NULL,
  dose_no SMALLINT UNSIGNED NULL,
  vaccinated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  lot VARCHAR(120) NULL,
  genidoc_pediatre_user_id INT NULL,
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_vacc_enfant_dose (genidoc_enfant_id, genidoc_vaccin_id, dose_no),
  INDEX idx_vacc_enfant_date (genidoc_enfant_id, vaccinated_at),
  INDEX idx_vacc_pediatre_date (genidoc_pediatre_user_id, vaccinated_at),
  CONSTRAINT fk_vacc_enfant FOREIGN KEY (genidoc_enfant_id)
    REFERENCES genidoc_enfant(genidoc_enfant_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_vacc_vaccin FOREIGN KEY (genidoc_vaccin_id)
    REFERENCES genidoc_vaccin_catalog(genidoc_vaccin_id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_vacc_pediatre FOREIGN KEY (genidoc_pediatre_user_id)
    REFERENCES genidoc_auth_users(genidoc_user_id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS genidoc_depistage_enfant (
  genidoc_depistage_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  genidoc_enfant_id INT NOT NULL,
  depistage_type VARCHAR(120) NOT NULL,
  resultat VARCHAR(255) NULL,
  depistage_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  genidoc_pediatre_user_id INT NULL,
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_dep_enfant_date (genidoc_enfant_id, depistage_at),
  CONSTRAINT fk_dep_enfant FOREIGN KEY (genidoc_enfant_id)
    REFERENCES genidoc_enfant(genidoc_enfant_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_dep_pediatre FOREIGN KEY (genidoc_pediatre_user_id)
    REFERENCES genidoc_auth_users(genidoc_user_id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS genidoc_jalon_catalog (
  genidoc_jalon_id INT AUTO_INCREMENT PRIMARY KEY,
  jalon_titre VARCHAR(255) NOT NULL,
  age_cible_mois SMALLINT UNSIGNED NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS genidoc_enfant_jalon (
  genidoc_enfant_jalon_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  genidoc_enfant_id INT NOT NULL,
  genidoc_jalon_id INT NOT NULL,
  achieved_at DATETIME NULL,
  status ENUM('PENDING','DONE','SKIPPED') NOT NULL DEFAULT 'PENDING',
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_enfant_jalon (genidoc_enfant_id, genidoc_jalon_id),
  CONSTRAINT fk_ej_enfant FOREIGN KEY (genidoc_enfant_id)
    REFERENCES genidoc_enfant(genidoc_enfant_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_ej_jalon FOREIGN KEY (genidoc_jalon_id)
    REFERENCES genidoc_jalon_catalog(genidoc_jalon_id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS genidoc_urgence (
  genidoc_urgence_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  genidoc_org_id INT NOT NULL,
  genidoc_enfant_id INT NOT NULL,
  created_by_user_id INT NOT NULL,
  assigned_pediatre_user_id INT NULL,
  severity ENUM('LOW','MEDIUM','HIGH','CRITICAL') NOT NULL DEFAULT 'MEDIUM',
  status ENUM('OPEN','IN_PROGRESS','CLOSED') NOT NULL DEFAULT 'OPEN',
  reason VARCHAR(255) NULL,
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_urg_org_status (genidoc_org_id, status),
  INDEX idx_urg_org_sev (genidoc_org_id, severity),
  CONSTRAINT fk_urg_org FOREIGN KEY (genidoc_org_id)
    REFERENCES genidoc_organisation(genidoc_org_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_urg_enfant FOREIGN KEY (genidoc_enfant_id)
    REFERENCES genidoc_enfant(genidoc_enfant_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_urg_creator FOREIGN KEY (created_by_user_id)
    REFERENCES genidoc_auth_users(genidoc_user_id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_urg_assigned FOREIGN KEY (assigned_pediatre_user_id)
    REFERENCES genidoc_auth_users(genidoc_user_id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS genidoc_dossier_task (
  genidoc_task_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  genidoc_org_id INT NOT NULL,
  genidoc_enfant_id INT NULL,
  genidoc_user_id INT NULL,
  task_type ENUM('CARNET_SCAN','DOC_PEDIATRE','VALIDATION_PEDIATRE','INFO_MANQUANTE','AUTRE') NOT NULL,
  status ENUM('PENDING','DONE','CANCELLED') NOT NULL DEFAULT 'PENDING',
  due_at DATETIME NULL,
  title VARCHAR(255) NULL,
  details TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_task_org_status (genidoc_org_id, status),
  CONSTRAINT fk_task_org FOREIGN KEY (genidoc_org_id)
    REFERENCES genidoc_organisation(genidoc_org_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_task_enfant FOREIGN KEY (genidoc_enfant_id)
    REFERENCES genidoc_enfant(genidoc_enfant_id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_task_user FOREIGN KEY (genidoc_user_id)
    REFERENCES genidoc_auth_users(genidoc_user_id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

DROP TRIGGER IF EXISTS trg_admin_role_ins;
DROP TRIGGER IF EXISTS trg_admin_role_upd;
DROP TRIGGER IF EXISTS trg_te_role_ins;
DROP TRIGGER IF EXISTS trg_te_role_upd;
DROP TRIGGER IF EXISTS trg_pe_role_ins;
DROP TRIGGER IF EXISTS trg_pe_role_upd;

DELIMITER $$

CREATE TRIGGER trg_admin_role_ins
BEFORE INSERT ON genidoc_admin
FOR EACH ROW
BEGIN
  DECLARE v_role VARCHAR(20);
  SELECT role INTO v_role FROM genidoc_auth_users WHERE genidoc_user_id = NEW.genidoc_user_id;
  IF v_role IS NULL OR v_role <> 'ADMIN' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Role must be ADMIN';
  END IF;
END$$

CREATE TRIGGER trg_admin_role_upd
BEFORE UPDATE ON genidoc_admin
FOR EACH ROW
BEGIN
  DECLARE v_role VARCHAR(20);
  SELECT role INTO v_role FROM genidoc_auth_users WHERE genidoc_user_id = NEW.genidoc_user_id;
  IF v_role IS NULL OR v_role <> 'ADMIN' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Role must be ADMIN';
  END IF;
END$$

CREATE TRIGGER trg_te_role_ins
BEFORE INSERT ON genidoc_tuteur_enfant
FOR EACH ROW
BEGIN
  DECLARE v_role VARCHAR(20);
  SELECT role INTO v_role FROM genidoc_auth_users WHERE genidoc_user_id = NEW.genidoc_user_id;
  IF v_role IS NULL OR v_role <> 'TUTEUR' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Role must be TUTEUR';
  END IF;
END$$

CREATE TRIGGER trg_te_role_upd
BEFORE UPDATE ON genidoc_tuteur_enfant
FOR EACH ROW
BEGIN
  DECLARE v_role VARCHAR(20);
  SELECT role INTO v_role FROM genidoc_auth_users WHERE genidoc_user_id = NEW.genidoc_user_id;
  IF v_role IS NULL OR v_role <> 'TUTEUR' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Role must be TUTEUR';
  END IF;
END$$

CREATE TRIGGER trg_pe_role_ins
BEFORE INSERT ON genidoc_pediatre_enfant
FOR EACH ROW
BEGIN
  DECLARE v_role VARCHAR(20);
  SELECT role INTO v_role FROM genidoc_auth_users WHERE genidoc_user_id = NEW.genidoc_user_id;
  IF v_role IS NULL OR v_role <> 'PEDIATRE' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Role must be PEDIATRE';
  END IF;
END$$

CREATE TRIGGER trg_pe_role_upd
BEFORE UPDATE ON genidoc_pediatre_enfant
FOR EACH ROW
BEGIN
  DECLARE v_role VARCHAR(20);
  SELECT role INTO v_role FROM genidoc_auth_users WHERE genidoc_user_id = NEW.genidoc_user_id;
  IF v_role IS NULL OR v_role <> 'PEDIATRE' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Role must be PEDIATRE';
  END IF;
END$$

DELIMITER ;
