import React, { useEffect } from "react";
import "./styleindex.css";

export default function DashbordPediatre() {
  useEffect(() => {
    document.title = "Tableau de bord - Pédiatre";
  }, []);

  return (
    <>
      <header>
        <img
          src="/frontend/static/Hayat.svg"
          alt="Logo officiel GeniDoc Hayat"
          className="logo-hayat"
        />
        <img
          src="/frontend/static/image.png"
          alt="Logo officiel Akdital Maroc"
          className="logo-akdital"
        />

        <h1>Tableau de bord - Pédiatre</h1>
        <hr className="separateur" />
      </header>

      <main className="dashboard">
        <aside className="sidebar">
          <section
            className="info-section"
            aria-label="Informations du médecin pédiatre - GeniDoc Hayat"
          >
            <h2>Informations</h2>

            <p className="info-row">
              <img
                src="/frontend/static/stethoscope.svg"
                alt="Icône utilisateur"
                className="icon user-icon"
              />
              <strong>Nom du médecin :</strong>
              <span id="genidoc_id1">Dr. SENHAJI Anas</span>
            </p>

            <p className="info-row">
              <img
                src="/frontend/static/hospital.svg"
                alt="Icône hôpital"
                className="icon hospital-icon"
              />
              <strong>Établissement d’affectation :</strong>
              <span id="genidoc_id1">Clinique Akdital Oasis Oncologie</span>
            </p>

            <p className="info-row">
              <img
                src="/frontend/static/blinds.svg"
                alt="Icône calendrier"
                className="icon calendar-icon"
              />
              <strong>
                <a href="/frontend/src/pages/patients.html">Mes Patients</a>
              </strong>
              <span id="genidoc_patient"></span>
            </p>

            <p className="info-row">
              <img
                src="/frontend/static/messagerie.png"
                alt="Icône calendrier"
                className="icon calendar-icon"
              />
              <strong>
                <a href="/frontend/src/pages/messagerie.html">Messagerie</a>
              </strong>
              <span id="messagerie_genidoc"></span>
            </p>

            <hr className="sep2" />
            <div className="vr"></div>

            <div className="articles_genidoc_obligatoires">
              <article className="vaccination_genidoc">
                <h3 className="vaccination_genidoc__title">Vaccination</h3>
                <p className="vaccination_genidoc__desc">Accéder</p>
                <a
                  className="vaccination_genidoc__link pro-link"
                  href="vaccination.html"
                >
                  <span className="pro-link__text">Voir</span>
                  <span className="pro-link__icon" aria-hidden="true">
                    ↗
                  </span>
                </a>
              </article>

              <article className="suivi_staturo_psychomoteur_genidoc">
                <h3 className="mini-card__title">Suivi Staturo-psycho-moteur</h3>
                <p className="mini-card__desc">
                  Courbes, mesures, jalons et historique.
                </p>

                <div className="mini-card__actions">
                  <a
                    className="mini-card__btn"
                    href="suivi_staturo_psychomoteur.html"
                  >
                    Voir
                  </a>
                </div>
              </article>

              <article className="la_prevention_et_le_depistage_genidoc">
                <h3 className="mini-card__title">Prévention & dépistage</h3>
                <p className="mini-card__desc">
                  Check-lists, rappels et dépistages recommandés.
                </p>

                <a className="mini-card__btn" href="prevention_depistage.html">
                  Ouvrir
                </a>
              </article>
            </div>

            <nav aria-label="Menu principal" className="menu">
              <a href="parametresgenidoc.html">
                <img
                  src="/frontend/static/settings-2.svg"
                  alt=""
                  width="20"
                  className="parametresgenidoc"
                />
                Paramètres
              </a>

              <a href="notificationsgenidoc.html">
                <img
                  src="/frontend/static/bell.svg"
                  alt=""
                  width="20"
                  className="notificationsgenidoc"
                />
                Notifications
              </a>

              <a href="aidegenidoc.html">
                <img
                  src="/frontend/static/badge-info.svg"
                  alt=""
                  width="20"
                  className="aidegenidoc"
                />
                Aide
              </a>

              <a href="deconnexiongenidoc.html">
                <img
                  src="/frontend/static/log-out.svg"
                  alt=""
                  width="20"
                  className="deconnexiongenidoc"
                />
                Déconnexion
              </a>
            </nav>

            <div className="langue">
              <label htmlFor="lang-select" className="langue-label">
                Langue :
              </label>
              <select id="lang-select" name="lang" defaultValue="genidoc_fr">
                <option value="genidoc_ar">العربية</option>
                <option value="genidoc_fr">Français</option>
                <option value="genidoc_en">English</option>
                <option value="genidoc_es">Español</option>
                <option value="genidoc_de">Deutsch</option>
              </select>
            </div>
          </section>
        </aside>

        <section className="cards-grid" aria-label="Résumé du jour">
          <article className="card card-1">
            <section className="card__hero">
              <header className="card__hero-header">
                <span className="card__kpi">Patients aujourd’hui</span>
                <div className="card__icon">
                  <img
                    src="/frontend/static/doctor-consultation.png"
                    alt="patient_genidoc_img"
                  />
                </div>
              </header>
              <p className="card__job-title">
                <span id="kpi-today">—</span>
              </p>
            </section>

            <footer className="card__footer">
              <div className="card__job-summary">
                <div className="card__job">
                  <p className="card__job-title-small">Consultations du jour</p>
                </div>
              </div>
              <button className="card__btn" type="button">
                Voir
              </button>
            </footer>
          </article>

          <article className="card card-2">
            <section className="card__hero card__hero--blue">
              <header className="card__hero-header">
                <span className="card__kpi">RDV à venir</span>
                <div className="card__icon">
                  <img src="/frontend/static/schedule.png" alt="rdv_genidoc_img" />
                </div>
              </header>
              <p className="card__job-title">
                <span id="kpi-upcoming">—</span>
              </p>
            </section>

            <footer className="card__footer">
              <div className="card__job-summary">
                <div className="card__job">
                  <p className="card__job-title-small">Prochains rendez-vous</p>
                </div>
              </div>
              <button className="card__btn" type="button">
                Voir
              </button>
            </footer>
          </article>

          <article className="card card-3">
            <section className="card__hero card__hero--red">
              <header className="card__hero-header">
                <span className="card__kpi">Urgences / priorités</span>
                <div className="card__icon">
                  <img src="/frontend/static/quick.png" alt="urgency_genidoc_img" />
                </div>
              </header>
              <p className="card__job-title">
                <span id="kpi-urgent">—</span>
              </p>
            </section>

            <footer className="card__footer">
              <div className="card__job-summary">
                <div className="card__job">
                  <p className="card__job-title-small">Cas à traiter</p>
                </div>
              </div>
              <button className="card__btn" type="button">
                Voir
              </button>
            </footer>
          </article>

          <article className="card card-4">
            <section className="card__hero card__hero--gray">
              <header className="card__hero-header">
                <span className="card__kpi">Dossiers en attente</span>
                <div className="card__icon">
                  <img src="/frontend/static/patient.png" alt="dossier_pending_genidoc_img" />
                </div>
              </header>
              <p className="card__job-title">
                <span id="kpi-pending">—</span>
              </p>
            </section>

            <footer className="card__footer">
              <div className="card__job-summary">
                <div className="card__job">
                  <p className="card__job-title-small">Résultats / CR / signatures</p>
                </div>
              </div>
              <button className="card__btn" type="button">
                Voir
              </button>
            </footer>
          </article>
        </section>
      </main>
    </>
  );
}
