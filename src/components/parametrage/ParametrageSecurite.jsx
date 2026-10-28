import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { apiRequest } from '../../services/api';
import { askConfirm, pushToast } from '../../services/toastBus';
import { droit, libelleDroits } from '../../data/rbacMatrix';
import SpinnerPourcentage, { LigneChargementTableau } from '../common/SpinnerPourcentage';
import { BoutonModifier, BoutonSupprimer } from '../common/BoutonsActionsTableau';

const ONGLETS = [
  ['utilisateurs', 'Utilisateurs'],
  ['par-profil', 'Utilisateurs par profil'],
  ['profils', 'Profils'],
  ['habilitations', 'Habilitations'],
  ['matrice', 'Profils → habilitations'],
];

const VIDE = { creer: false, lire: false, modifier: false, valider: false, supprimer: false };
const DRAPEAUX_GESTION = [
  ['creer', 'Créer'],
  ['lire', 'Lire'],
  ['modifier', 'Modifier'],
  ['valider', 'Valider'],
  ['supprimer', 'Supprimer'],
];

function estAcces(code) {
  return String(code || '').startsWith('ACCESS_');
}

/**
 * Liste déroulante avec la recherche dans le panneau.
 * Le panneau est affiché au-dessus du formulaire pour ne pas être coupé.
 */
function ListeChoix({ valeur, surChangement, options, texteVide }) {
  const [ouvert, setOuvert] = useState(false);
  const [recherche, setRecherche] = useState('');
  const [position, setPosition] = useState(null);
  const boutonRef = React.useRef(null);
  const panneauRef = React.useRef(null);
  const choisi = options.find((option) => String(option.value) === String(valeur));
  const filtre = recherche.trim().toLowerCase();
  const visibles = options.filter((option) => option.label.toLowerCase().includes(filtre));

  useEffect(() => {
    if (!ouvert) return undefined;
    const placer = () => {
      const cadre = boutonRef.current?.getBoundingClientRect();
      if (!cadre) return;
      const hauteur = 280;
      const bas = window.innerHeight - cadre.bottom;
      const ouvrirVersLeHaut = bas < hauteur && cadre.top > bas;
      setPosition({
        left: cadre.left,
        width: cadre.width,
        top: ouvrirVersLeHaut ? Math.max(8, cadre.top - hauteur - 4) : cadre.bottom + 4,
        maxHeight: hauteur,
      });
    };
    placer();
    const fermer = (evenement) => {
      if (boutonRef.current?.contains(evenement.target) || panneauRef.current?.contains(evenement.target)) return;
      setOuvert(false);
    };
    window.addEventListener('resize', placer);
    window.addEventListener('scroll', placer, true);
    document.addEventListener('mousedown', fermer);
    return () => {
      window.removeEventListener('resize', placer);
      window.removeEventListener('scroll', placer, true);
      document.removeEventListener('mousedown', fermer);
    };
  }, [ouvert]);

  return (
    <div>
      <button type="button" ref={boutonRef} onClick={() => { setRecherche(''); setOuvert((etat) => !etat); }} className="mt-1 w-full border border-slate-200 rounded px-2 py-1.5 text-sm bg-white text-left">
        {choisi ? choisi.label : texteVide}
      </button>
      {ouvert && position && createPortal(
        <div ref={panneauRef} className="fixed z-[200] bg-white border border-slate-200 rounded shadow-xl overflow-hidden" style={{ top: position.top, left: position.left, width: position.width, maxHeight: position.maxHeight }}>
          <div className="p-2 border-b border-slate-100">
            <input autoFocus value={recherche} onChange={(evenement) => setRecherche(evenement.target.value)} placeholder="Rechercher…" className="w-full border border-slate-200 rounded px-2 py-1.5 text-sm" />
          </div>
          <ul className="overflow-y-auto py-1" style={{ maxHeight: position.maxHeight - 52 }}>
            {visibles.length === 0 && <li className="px-2 py-1.5 text-xs text-slate-500">Aucun résultat</li>}
            {visibles.map((option) => (
              <li key={String(option.value)}>
                <button type="button" onClick={() => { surChangement(String(option.value)); setOuvert(false); }} className="w-full text-left px-2 py-1.5 text-sm hover:bg-blue-50">
                  {option.label}
                </button>
              </li>
            ))}
          </ul>
        </div>,
        document.body
      )}
    </div>
  );
}

const LIBELLES_AUTH_MODE = {
  simple: 'Simple (mot de passe)',
  otp_email: 'OTP par e-mail',
  totp: 'Google Authenticator',
};

export default function ParametrageSecurite({ utilisateur }) {
  const peutCreerUtilisateur = droit(utilisateur, 'utilisateurs', 'creer');
  const peutModifierUtilisateur = droit(utilisateur, 'utilisateurs', 'modifier');
  const peutGererParametrage = droit(utilisateur, 'parametrage', 'creer') || droit(utilisateur, 'parametrage', 'modifier');
  const codeProfilActeur = utilisateur?.profil?.code || utilisateur?.profil_code || '';
  const codeRoleActeur = utilisateur?.code_role || utilisateur?.codeRole || '';
  const peutGererAuth = ['sa', 'dsi', 'admin_metier'].includes(codeProfilActeur)
    || ['SUPER_ADMIN', 'ADMIN_METIER'].includes(codeRoleActeur);
  const [onglet, setOnglet] = useState('utilisateurs');
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [profils, setProfils] = useState([]);
  const [habilitations, setHabilitations] = useState([]);
  const [droits, setDroits] = useState({});
  const [forceRetrait, setForceRetrait] = useState({});
  const [authEnCours, setAuthEnCours] = useState(null);
  const [filtreMatrice, setFiltreMatrice] = useState('access');
  const [rechercheMatrice, setRechercheMatrice] = useState('');
  const [pageMatrice, setPageMatrice] = useState(1);
  const [tailleMatrice, setTailleMatrice] = useState(10);
  const [filtreProfil, setFiltreProfil] = useState('tous');
  const [rechercheUtilisateur, setRechercheUtilisateur] = useState('');
  const [filtreProfilListe, setFiltreProfilListe] = useState('tous');
  const [filtreEtat, setFiltreEtat] = useState('tous');
  const [filtrePoste, setFiltrePoste] = useState('tous');
  const [pageUtilisateur, setPageUtilisateur] = useState(1);
  /** Provinces, antennes et directions proposées dans la fiche utilisateur. */
  const [territoire, setTerritoire] = useState({ provinces: [], antennes: [], directions: [] });
  const [tailleUtilisateur, setTailleUtilisateur] = useState(10);
  const [message, setMessage] = useState('');
  const [erreur, setErreur] = useState('');
  const [enregistrement, setEnregistrement] = useState(false);
  /** Vrai tant que les listes du paramétrage arrivent de l'API. */
  const [chargement, setChargement] = useState(true);
  const [matricePleine, setMatricePleine] = useState(false);
  const [fiche, setFiche] = useState(null);

  /** Toutes les antennes du référentiel. La province choisie les place en tête, sans les masquer. */
  function antennesProposees(provinceId) {
    const libelle = (antenne) => {
      const lieu = antenne.ville_antenne || antenne.chef_lieu || '';
      return [antenne.code_antenne, antenne.nom, lieu].filter(Boolean).join(' — ');
    };
    const triees = [...territoire.antennes].sort((a, b) => {
      const aProvince = provinceId && String(a.province_id) === String(provinceId) ? 0 : 1;
      const bProvince = provinceId && String(b.province_id) === String(provinceId) ? 0 : 1;
      return aProvince - bProvince || String(a.nom).localeCompare(String(b.nom), 'fr');
    });
    return triees.map((antenne) => ({ value: antenne.id, label: libelle(antenne) }));
  }

  async function charger() {
    setChargement(true);
    setErreur('');
    const opts = { priority: true, timeoutMs: 25000 };
    try {
      const [uRes, pRes, hRes, lRes, tRes] = await Promise.allSettled([
        apiRequest('/parametrage/utilisateurs', opts),
        apiRequest('/parametrage/profils', opts),
        apiRequest('/parametrage/habilitations', opts),
        apiRequest('/parametrage/habilitations-profils', opts),
        apiRequest('/parametrage/territoire', opts),
      ]);

      const u = uRes.status === 'fulfilled' ? uRes.value : null;
      const p = pRes.status === 'fulfilled' ? pRes.value : null;
      const h = hRes.status === 'fulfilled' ? hRes.value : null;
      const l = lRes.status === 'fulfilled' ? lRes.value : null;
      const territoireReponse = tRes.status === 'fulfilled' ? tRes.value : null;

      if (u) setUtilisateurs(u.utilisateurs || []);
      if (p) setProfils(p.profils || []);
      if (h) setHabilitations(h.habilitations || []);
      let provinces = territoireReponse?.provinces || [];
      let antennes = territoireReponse?.antennes || [];
      let directions = territoireReponse?.directions || [];

      // Repli si /parametrage/territoire échoue ou renvoie des provinces vides.
      if (!provinces.length || !antennes.length) {
        const [refProv, refAnt] = await Promise.allSettled([
          apiRequest('/referentiel/provinces', opts),
          apiRequest('/antennes', opts),
        ]);
        if (!provinces.length && refProv.status === 'fulfilled') {
          provinces = (refProv.value.lignes || refProv.value.provinces || []).map((p) => ({
            id: p.id,
            nom: p.nom || p.libelle,
            code: p.code,
          }));
        }
        if (!antennes.length && refAnt.status === 'fulfilled') {
          antennes = refAnt.value.antennes || [];
        }
      }

      setTerritoire({ provinces, antennes, directions });
      if (!provinces.length) {
        setErreur((prev) => prev || 'Aucune province disponible. Vérifiez le référentiel provinces / antennes.');
      }

      const profils = p?.profils || [];
      const habilitations = h?.habilitations || [];
      const liaisons = l?.liaisons || [];
      if (profils.length || habilitations.length || liaisons.length) {
        const carte = {};
        profils.forEach((profil) => {
          carte[profil.id] = {};
          habilitations.forEach((habilitation) => {
            carte[profil.id][habilitation.id] = { ...VIDE };
          });
        });
        liaisons.forEach((liaison) => {
          if (!carte[liaison.profil_id]) carte[liaison.profil_id] = {};
          carte[liaison.profil_id][liaison.habilitation_id] = {
            creer: Boolean(liaison.creer),
            lire: Boolean(liaison.lire),
            modifier: Boolean(liaison.modifier),
            valider: Boolean(liaison.valider),
            supprimer: Boolean(liaison.supprimer),
          };
        });
        setDroits(carte);
      }

      const echecs = [uRes, pRes, hRes, lRes, tRes]
        .filter((r) => r.status === 'rejected')
        .map((r) => r.reason)
        .filter((err) => err && !err.backendUnavailable && !err.skipped);
      if (!u && uRes.status === 'rejected') {
        const err = uRes.reason;
        setErreur(err?.backendUnavailable || err?.skipped
          ? 'Impossible de charger les utilisateurs (serveur occupé). Réessayez.'
          : (err?.message || 'Impossible de charger les utilisateurs.'));
      } else if (echecs.length && !u) {
        setErreur(echecs[0]?.message || 'Chargement partiel des droits d\'accès.');
      }
    } finally {
      setChargement(false);
    }
  }

  useEffect(() => {
    charger().catch((err) => {
      if (err?.backendUnavailable || err?.skipped) {
        setErreur('Impossible de charger les droits d\'accès (serveur occupé). Réessayez.');
        return;
      }
      setErreur(err?.message || 'Erreur de chargement.');
    });
  }, []);

  useEffect(() => {
    if (!matricePleine) return undefined;
    const fermer = (event) => {
      if (event.key === 'Escape') setMatricePleine(false);
    };
    window.addEventListener('keydown', fermer);
    return () => window.removeEventListener('keydown', fermer);
  }, [matricePleine]);

  const lignesMatrice = useMemo(() => {
    const terme = rechercheMatrice.trim().toLowerCase();
    return habilitations.filter((item) => {
      if (filtreMatrice === 'access' && !estAcces(item.code)) return false;
      if (filtreMatrice === 'autres' && estAcces(item.code)) return false;
      if (!terme) return true;
      return `${item.code} ${item.libelle}`.toLowerCase().includes(terme);
    });
  }, [habilitations, filtreMatrice, rechercheMatrice]);
  const pagesMatrice = Math.max(1, Math.ceil(lignesMatrice.length / tailleMatrice));
  const lignesPage = lignesMatrice.slice((pageMatrice - 1) * tailleMatrice, pageMatrice * tailleMatrice);

  function majDroit(profilId, habilitationId, champ, valeur) {
    setDroits((actuel) => ({
      ...actuel,
      [profilId]: {
        ...(actuel[profilId] || {}),
        [habilitationId]: {
          ...VIDE,
          ...(actuel[profilId]?.[habilitationId] || {}),
          [champ]: valeur,
        },
      },
    }));
  }

  async function enregistrerMatrice() {
    setEnregistrement(true);
    setErreur('');
    setMessage('');
    try {
      for (const profil of profils) {
        const assignations = habilitations.map((habilitation) => {
          const flags = droits[profil.id]?.[habilitation.id] || VIDE;
          if (estAcces(habilitation.code)) {
            return { idHabilitation: habilitation.id, creer: false, lire: Boolean(flags.lire), modifier: false, valider: false, supprimer: false };
          }
          return {
            idHabilitation: habilitation.id,
            creer: Boolean(flags.creer),
            lire: Boolean(flags.lire),
            modifier: Boolean(flags.modifier),
            valider: Boolean(flags.valider),
            supprimer: Boolean(flags.supprimer),
          };
        });
        await apiRequest(`/parametrage/profils/${profil.id}/habilitations`, {
          method: 'PUT',
          body: JSON.stringify({ forceRetrait: Boolean(forceRetrait[profil.id]), assignations }),
          timeoutMs: 20000,
        });
      }
      setMessage('Matrice enregistrée.');
      pushToast('Matrice enregistrée avec succès.', 'success');
      await charger();
    } catch (err) {
      setErreur(err?.backendUnavailable ? '' : err.message);
    } finally {
      setEnregistrement(false);
    }
  }

  async function sauverFiche(event) {
    event.preventDefault();
    setErreur('');
    setMessage('');
    const etaitCreation = !fiche?.id;
    try {
      if (fiche.type === 'utilisateur') {
        if (!fiche.province_rattachement_id || !fiche.antenne_id) {
          setErreur('Choisissez la province et l\'antenne.');
          return;
        }
        const body = {
          email: fiche.email,
          name: fiche.name,
          profil_id: Number(fiche.profil_id),
          poste_comptable: fiche.poste_comptable || null,
          etat: fiche.etat || 'actif',
          province_rattachement_id: Number(fiche.province_rattachement_id),
          antenne_id: Number(fiche.antenne_id),
          direction_id: fiche.direction_id ? Number(fiche.direction_id) : null,
        };
        if (fiche.password) body.password = fiche.password;
        if (peutGererAuth && fiche.auth_mode) body.auth_mode = fiche.auth_mode;
        if (fiche.id) {
          await apiRequest(`/parametrage/utilisateurs/${fiche.id}`, { method: 'PUT', body: JSON.stringify(body) });
        } else {
          await apiRequest('/parametrage/utilisateurs', { method: 'POST', body: JSON.stringify(body) });
        }
      }
      if (fiche.type === 'profil') {
        const body = {
          libelle: fiche.libelle,
          niveau_validation: Number(fiche.niveau_validation || 0),
          habilitations: (fiche.habilitations || [])
            .filter((row) => row.creer || row.lire || row.modifier || row.valider || row.supprimer)
            .map((row) => ({
              id: row.id,
              creer: Boolean(row.creer),
              lire: Boolean(row.lire),
              modifier: Boolean(row.modifier),
              valider: Boolean(row.valider),
              supprimer: Boolean(row.supprimer),
            })),
        };
        if (fiche.id) {
          await apiRequest(`/parametrage/profils/${fiche.id}`, { method: 'PUT', body: JSON.stringify(body) });
        } else {
          await apiRequest('/parametrage/profils', { method: 'POST', body: JSON.stringify(body) });
        }
      }
      if (fiche.type === 'habilitation') {
        const body = { libelle: fiche.libelle, module: fiche.module };
        if (fiche.id) {
          await apiRequest(`/parametrage/habilitations/${fiche.id}`, { method: 'PUT', body: JSON.stringify(body) });
        } else {
          await apiRequest('/parametrage/habilitations', { method: 'POST', body: JSON.stringify({ ...body, code: fiche.code }) });
        }
      }
      setFiche(null);
      setMessage('Enregistrement effectué.');
      pushToast(
        etaitCreation ? 'Ajout avec succès.' : 'Modification enregistrée avec succès.',
        'success'
      );
      await charger();
    } catch (err) {
      setErreur(err?.backendUnavailable ? '' : err.message);
    }
  }

  async function desactiver(utilisateur) {
    const ok = await askConfirm({
      message: `Désactiver ${utilisateur.name} ? Le compte ne pourra plus se connecter.`,
      confirmLabel: 'Désactiver',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await apiRequest(`/parametrage/utilisateurs/${utilisateur.id}`, { method: 'DELETE' });
      setMessage('Compte passé en inactif.');
      pushToast(`${utilisateur.name} est désactivé.`, 'warning');
      await charger();
    } catch (err) {
      setErreur(err?.backendUnavailable ? '' : err.message);
    }
  }

  async function changerAuthMode(utilisateurCible, authMode) {
    const mode = authMode || 'simple';
    if ((utilisateurCible.auth_mode || 'simple') === mode) return;
    setAuthEnCours(utilisateurCible.id);
    setErreur('');
    try {
      const res = await apiRequest(`/parametrage/utilisateurs/${utilisateurCible.id}`, {
        method: 'PUT',
        priority: true,
        body: JSON.stringify({ auth_mode: mode }),
      });
      const maj = res?.utilisateur;
      setUtilisateurs((liste) => liste.map((u) => (
        u.id === utilisateurCible.id
          ? { ...u, auth_mode: maj?.auth_mode || mode, totp_confirmed: maj?.totp_confirmed ?? u.totp_confirmed }
          : u
      )));
      pushToast(`Auth de ${utilisateurCible.name} : ${LIBELLES_AUTH_MODE[mode] || mode}`, 'success');
    } catch (err) {
      setErreur(err?.backendUnavailable ? '' : (err?.message || 'Modification auth impossible.'));
    } finally {
      setAuthEnCours(null);
    }
  }

  async function supprimerProfil(profil) {
    const ok = await askConfirm({
      message: `Supprimer le profil ${profil.libelle} ?`,
      confirmLabel: 'Supprimer',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await apiRequest(`/parametrage/profils/${profil.id}`, { method: 'DELETE' });
      setMessage('Profil supprimé.');
      pushToast(`Profil ${profil.libelle} supprimé.`, 'warning');
      await charger();
    } catch (err) {
      setErreur(err?.backendUnavailable ? '' : err.message);
    }
  }

  const utilisateursFiltres = utilisateurs.filter((item) => filtreProfil === 'tous' || String(item.profil_id) === String(filtreProfil));
  const utilisateursListe = useMemo(() => {
    const terme = rechercheUtilisateur.trim().toLowerCase();
    return utilisateurs.filter((item) => {
      if (filtreProfilListe === 'sans' && item.profil_id) return false;
      if (filtreProfilListe !== 'tous' && filtreProfilListe !== 'sans' && String(item.profil_id) !== String(filtreProfilListe)) return false;
      if (filtreEtat !== 'tous' && item.etat !== filtreEtat) return false;
      const aDirection = Boolean(item.direction);
      const aAntenne = Boolean(item.antenne);
      if (filtrePoste === 'direction' && !aDirection) return false;
      if (filtrePoste === 'antenne' && !aAntenne) return false;
      if (filtrePoste === 'sans' && (aDirection || aAntenne)) return false;
      if (!terme) return true;
      return `${item.email} ${item.name} ${item.profil || ''} ${item.poste_comptable || ''} ${item.province || ''} ${item.antenne || ''} ${item.direction || ''}`.toLowerCase().includes(terme);
    });
  }, [utilisateurs, rechercheUtilisateur, filtreProfilListe, filtreEtat, filtrePoste]);
  const pagesUtilisateur = Math.max(1, Math.ceil(utilisateursListe.length / tailleUtilisateur));
  const pageUtilisateurCourante = Math.min(pageUtilisateur, pagesUtilisateur);
  const utilisateursPage = utilisateursListe.slice((pageUtilisateurCourante - 1) * tailleUtilisateur, pageUtilisateurCourante * tailleUtilisateur);

  const renduMatrice = (agrandi) => (
    <div className={agrandi ? 'flex flex-col h-full min-h-0 gap-3' : 'space-y-3'}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          {[['access', 'Access'], ['autres', 'Autres'], ['tous', 'Tous']].map(([id, label]) => (
            <button key={id} type="button" onClick={() => { setFiltreMatrice(id); setPageMatrice(1); }} className={`px-3 py-1.5 text-xs rounded ${filtreMatrice === id ? 'bg-slate-800 text-white' : 'border border-slate-200'}`}>{label}</button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {!agrandi && (
            <button type="button" onClick={() => setMatricePleine(true)} className="px-3 py-1.5 text-xs font-bold rounded border border-[#2E68B4] text-[#2E68B4]">Agrandir</button>
          )}
          {peutGererParametrage && <button type="button" disabled={enregistrement} onClick={enregistrerMatrice} className="px-3 py-1.5 text-xs font-bold rounded bg-[#00A651] text-white disabled:opacity-60">{enregistrement ? 'Enregistrement…' : 'Enregistrer la matrice'}</button>}
        </div>
      </div>
      <input value={rechercheMatrice} onChange={(event) => { setRechercheMatrice(event.target.value); setPageMatrice(1); }} placeholder="Rechercher par code ou libellé…" className="w-full border border-slate-200 rounded px-3 py-2 text-sm" />
      <p className="text-[11px] text-slate-500">Access : une case. Gestion : C créer, L lire, M modifier, V valider, S supprimer.</p>
      <div className={agrandi ? 'flex-1 min-h-0 overflow-auto border border-slate-200 rounded' : 'overflow-x-auto'}>
        <table className={`${agrandi ? 'text-sm' : 'text-xs'} min-w-max w-full border-separate border-spacing-0`}>
          <thead className="sticky top-0 z-20 bg-white">
            <tr className="text-left text-slate-500 align-bottom">
              <th className={`sticky left-0 z-30 bg-white border-b border-slate-200 ${agrandi ? 'min-w-[18rem] py-3 pr-4' : 'min-w-[14rem] py-2 pr-3'}`}>Habilitation</th>
              {profils.map((profil) => (
                <th key={profil.id} className={`border-b border-slate-200 bg-white ${agrandi ? 'py-3 px-3 min-w-[11rem]' : 'py-2 px-2 min-w-[8rem]'}`}>
                  <div className="font-semibold text-slate-800">{profil.libelle}</div>
                  {(profil.code === 'sa' || profil.code === 'dsi') && (
                    <label className="font-normal text-[10px] text-slate-500">
                      <input type="checkbox" className="mr-1" checked={Boolean(forceRetrait[profil.id])} onChange={(event) => setForceRetrait((actuel) => ({ ...actuel, [profil.id]: event.target.checked }))} /> Forcer le retrait
                    </label>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {chargement && <LigneChargementTableau colonnes={Math.max(1, profils.length + 1)} libelle="Chargement de la matrice…" />}
            {!chargement && lignesPage.map((habilitation) => (
              <tr key={habilitation.id}>
                <td className={`sticky left-0 z-10 bg-white border-b border-slate-100 ${agrandi ? 'py-3 pr-4' : 'py-2 pr-3'}`}>
                  <div className="font-medium text-slate-900">{habilitation.libelle}</div>
                  <div className="font-mono text-[10px] text-slate-400">{habilitation.code}</div>
                </td>
                {profils.map((profil) => {
                  const flags = droits[profil.id]?.[habilitation.id] || VIDE;
                  if (estAcces(habilitation.code)) {
                    return (
                      <td key={profil.id} className="px-3 border-b border-slate-100 text-center">
                        <input type="checkbox" className={agrandi ? 'w-4 h-4' : ''} disabled={!peutGererParametrage} checked={flags.lire} onChange={(event) => majDroit(profil.id, habilitation.id, 'lire', event.target.checked)} />
                      </td>
                    );
                  }
                  return (
                    <td key={profil.id} className="px-2 border-b border-slate-100 whitespace-nowrap text-center">
                      {DRAPEAUX_GESTION.map(([champ, libelle]) => (
                        <label key={champ} title={libelle} className={`inline-flex items-center uppercase text-slate-500 ${agrandi ? 'mr-2 text-xs' : 'mr-1 text-[10px]'}`}>
                          {champ[0]}
                          <input type="checkbox" disabled={!peutGererParametrage} className={agrandi ? 'ml-1 w-4 h-4' : 'ml-0.5'} checked={Boolean(flags[champ])} onChange={(event) => majDroit(profil.id, habilitation.id, champ, event.target.checked)} />
                        </label>
                      ))}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <label>
          Afficher
          <select value={tailleMatrice} onChange={(event) => { setTailleMatrice(Number(event.target.value)); setPageMatrice(1); }} className="mx-1 border rounded px-1 py-0.5">
            {[10, 20, 50].map((taille) => <option key={taille} value={taille}>{taille}</option>)}
          </select>
          par page · {lignesMatrice.length} habilitations
        </label>
        <div className="flex items-center gap-2">
          <button type="button" disabled={pageMatrice <= 1} onClick={() => setPageMatrice((page) => page - 1)} className="px-2 py-1 border rounded disabled:opacity-40">Précédent</button>
          <span>Page {Math.min(pageMatrice, pagesMatrice)} / {pagesMatrice}</span>
          <button type="button" disabled={pageMatrice >= pagesMatrice} onClick={() => setPageMatrice((page) => page + 1)} className="px-2 py-1 border rounded disabled:opacity-40">Suivant</button>
        </div>
      </div>
    </div>
  );

  return (
    <section className="space-y-4">
      <header>
        <h1 className="text-xl font-semibold text-[#0E2A4F]">Droits d'accès</h1>
        <p className="text-sm text-slate-600">Un utilisateur a un seul profil. Le profil porte les habilitations.</p>
        <p className="text-xs text-slate-500">Droits paramétrage : {libelleDroits(utilisateur, 'parametrage')}. Droits utilisateurs : {libelleDroits(utilisateur, 'utilisateurs')}.</p>
      </header>
      <div className="flex flex-wrap gap-2">
        {ONGLETS.map(([id, label]) => (
          <button key={id} type="button" onClick={() => setOnglet(id)} className={`px-3 py-1.5 text-xs font-semibold rounded ${onglet === id ? 'bg-[#0E2A4F] text-white' : 'bg-white border border-slate-200 text-slate-700'}`}>{label}</button>
        ))}
      </div>
      {message && <p className="text-sm text-emerald-700">{message}</p>}
      {erreur && <p className="text-sm text-rose-700">{erreur}</p>}

      {onglet === 'utilisateurs' && (
        <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-xs text-slate-600 flex-1 min-w-[220px]">
              Recherche
              <input value={rechercheUtilisateur} onChange={(event) => { setRechercheUtilisateur(event.target.value); setPageUtilisateur(1); }} placeholder="Email, nom, profil, antenne, direction…" className="mt-1 w-full border border-slate-200 rounded px-2 py-1.5 text-sm" />
            </label>
            <label className="text-xs text-slate-600 min-w-[160px]">
              Profil
              <ListeChoix
                valeur={filtreProfilListe}
                surChangement={(valeur) => { setFiltreProfilListe(valeur || 'tous'); setPageUtilisateur(1); }}
                texteVide="Tous"
                options={[
                  { value: 'tous', label: 'Tous' },
                  { value: 'sans', label: 'Sans profil' },
                  ...profils.map((profil) => ({ value: profil.id, label: profil.libelle })),
                ]}
              />
            </label>
            <label className="text-xs text-slate-600 min-w-[120px]">
              État
              <ListeChoix
                valeur={filtreEtat}
                surChangement={(valeur) => { setFiltreEtat(valeur || 'tous'); setPageUtilisateur(1); }}
                texteVide="Tous"
                options={[
                  { value: 'tous', label: 'Tous' },
                  { value: 'actif', label: 'Actif' },
                  { value: 'inactif', label: 'Inactif' },
                ]}
              />
            </label>
            <label className="text-xs text-slate-600 min-w-[160px]">
              Rattachement
              <ListeChoix
                valeur={filtrePoste}
                surChangement={(valeur) => { setFiltrePoste(valeur || 'tous'); setPageUtilisateur(1); }}
                texteVide="Tous"
                options={[
                  { value: 'tous', label: 'Tous' },
                  { value: 'antenne', label: 'Antenne' },
                  { value: 'direction', label: 'Direction' },
                  { value: 'sans', label: 'Sans rattachement' },
                ]}
              />
            </label>
            {peutCreerUtilisateur && <button type="button" onClick={() => setFiche({ type: 'utilisateur', email: '', name: '', profil_id: profils[0]?.id || '', poste_comptable: '', etat: 'actif', auth_mode: 'simple', password: '', province_rattachement_id: '', antenne_id: '', direction_id: '' })} className="px-3 py-1.5 text-xs font-bold rounded bg-[#00A651] text-white">+ Utilisateur</button>}
          </div>
          <table className="w-full text-xs">
            <thead><tr className="text-left text-slate-500 border-b"><th className="py-2">Email</th><th>Nom</th><th>Profil</th><th>Auth</th><th>Province</th><th>Antenne</th><th>Direction</th><th>État</th><th></th></tr></thead>
            <tbody>
              {chargement && <LigneChargementTableau colonnes={9} libelle="Chargement des utilisateurs…" />}
              {!chargement && utilisateursPage.length === 0 && (
                <tr><td colSpan={9} className="py-6 text-center text-slate-500">Aucun utilisateur.</td></tr>
              )}
              {!chargement && utilisateursPage.map((item) => (
                <tr key={item.id} className="border-b border-slate-100">
                  <td className="py-2 pr-2">{item.email}</td>
                  <td className="pr-2">{item.name}</td>
                  <td className="pr-2">{item.profil || '—'}</td>
                  <td className="pr-2 min-w-[10rem]">
                    {peutGererAuth ? (
                      <ListeChoix
                        valeur={item.auth_mode || 'simple'}
                        surChangement={(valeur) => {
                          if (authEnCours === item.id) return;
                          changerAuthMode(item, valeur || 'simple');
                        }}
                        texteVide="Simple"
                        options={[
                          { value: 'simple', label: 'Simple (mot de passe)' },
                          { value: 'otp_email', label: 'OTP par e-mail' },
                          { value: 'totp', label: 'Google Authenticator' },
                        ]}
                      />
                    ) : (
                      LIBELLES_AUTH_MODE[item.auth_mode] || 'Simple'
                    )}
                  </td>
                  <td className="pr-2">{item.province || '—'}</td>
                  <td className="pr-2">{item.antenne || '—'}</td>
                  <td className="pr-2">{item.direction || '—'}</td>
                  <td className="pr-2">{item.etat}</td>
                  <td className="whitespace-nowrap">
                    {peutModifierUtilisateur && <BoutonModifier onClick={() => setFiche({ type: 'utilisateur', ...item, auth_mode: item.auth_mode || 'simple', password: '' })} />}
                    {peutModifierUtilisateur && item.etat !== 'inactif' && <button type="button" className="text-rose-700" onClick={() => desactiver(item)}>Désactiver</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
            <label>
              Afficher
              <select value={tailleUtilisateur} onChange={(event) => { setTailleUtilisateur(Number(event.target.value)); setPageUtilisateur(1); }} className="mx-1 border rounded px-1 py-0.5">
                {[5, 10, 15, 20, 50].map((taille) => <option key={taille} value={taille}>{taille}</option>)}
              </select>
              par page · {utilisateursListe.length} utilisateurs
            </label>
            <div className="flex items-center gap-2">
              <button type="button" disabled={pageUtilisateurCourante <= 1} onClick={() => setPageUtilisateur((page) => page - 1)} className="px-2 py-1 border rounded disabled:opacity-40">Précédent</button>
              <span>Page {pageUtilisateurCourante} / {pagesUtilisateur}</span>
              <button type="button" disabled={pageUtilisateurCourante >= pagesUtilisateur} onClick={() => setPageUtilisateur((page) => page + 1)} className="px-2 py-1 border rounded disabled:opacity-40">Suivant</button>
            </div>
          </div>
        </div>
      )}

      {onglet === 'par-profil' && (
        <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
          {chargement && <SpinnerPourcentage libelle="Chargement des utilisateurs…" />}
          <select value={filtreProfil} onChange={(event) => setFiltreProfil(event.target.value)} className="border border-slate-200 rounded px-2 py-1 text-xs">
            <option value="tous">Tous les profils</option>
            {profils.map((profil) => <option key={profil.id} value={profil.id}>{profil.libelle}</option>)}
          </select>
          {!chargement && profils.filter((profil) => filtreProfil === 'tous' || String(profil.id) === String(filtreProfil)).map((profil) => (
            <div key={profil.id}>
              <h2 className="text-sm font-semibold text-[#0E2A4F]">{profil.libelle}</h2>
              <ul className="text-xs text-slate-700">
                {utilisateursFiltres.filter((item) => item.profil_id === profil.id).map((item) => (
                  <li key={item.id}>{item.name} — {item.email} — {item.etat}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {onglet === 'profils' && (
        <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
          <div className="flex justify-end">
            {peutGererParametrage && <button type="button" onClick={() => setFiche({ type: 'profil', libelle: '', niveau_validation: 0, habilitations: habilitations.map((item) => ({ id: item.id, code: item.code, ...VIDE })) })} className="px-3 py-1.5 text-xs font-bold rounded bg-[#00A651] text-white">+ Profil</button>}
          </div>
          <table className="w-full text-xs">
            <thead><tr className="text-left text-slate-500 border-b"><th className="py-2">Code</th><th>Libellé</th><th>Niveau</th><th>Attributions</th><th></th></tr></thead>
            <tbody>
              {chargement && <LigneChargementTableau colonnes={5} libelle="Chargement des profils…" />}
              {!chargement && profils.map((profil) => (
                <tr key={profil.id} className="border-b border-slate-100">
                  <td className="py-2 pr-2 font-mono">{profil.code}</td>
                  <td className="pr-2">{profil.libelle}</td>
                  <td className="pr-2">{profil.niveau_validation}</td>
                  <td className="pr-2">{profil.utilisateurs_count}</td>
                  <td>
                    {peutGererParametrage && <BoutonModifier onClick={() => setFiche({ type: 'profil', id: profil.id, libelle: profil.libelle, niveau_validation: profil.niveau_validation })} />}
                    {peutGererParametrage && !profil.systeme && <BoutonSupprimer onClick={() => supprimerProfil(profil)} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {onglet === 'habilitations' && (
        <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
          <div className="flex justify-end">
            {peutGererParametrage && <button type="button" onClick={() => setFiche({ type: 'habilitation', code: '', libelle: '', module: 'acces' })} className="px-3 py-1.5 text-xs font-bold rounded bg-[#00A651] text-white">+ Habilitation</button>}
          </div>
          <table className="w-full text-xs">
            <thead><tr className="text-left text-slate-500 border-b"><th className="py-2">Code</th><th>Libellé</th><th>Module</th><th></th></tr></thead>
            <tbody>
              {chargement && <LigneChargementTableau colonnes={4} libelle="Chargement des habilitations…" />}
              {!chargement && habilitations.map((item) => (
                <tr key={item.id} className="border-b border-slate-100">
                  <td className="py-2 pr-2 font-mono">{item.code}</td>
                  <td className="pr-2">{item.libelle}</td>
                  <td className="pr-2">{item.module}</td>
                  <td>{peutGererParametrage && <BoutonModifier onClick={() => setFiche({ type: 'habilitation', ...item })} />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {onglet === 'matrice' && (
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          {renduMatrice(false)}
        </div>
      )}

      {matricePleine && createPortal(
        <div className="fixed inset-0 z-[120] bg-slate-900/50 p-2 sm:p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full h-full flex flex-col min-h-0 p-4">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <h2 className="text-lg font-semibold text-[#0E2A4F]">Matrice des habilitations</h2>
                <p className="text-xs text-slate-500">Access : une case. Gestion : créer, lire, modifier, valider, supprimer.</p>
              </div>
              <button type="button" onClick={() => setMatricePleine(false)} className="px-3 py-1.5 text-xs font-bold rounded border border-slate-300">Fermer</button>
            </div>
            {renduMatrice(true)}
          </div>
        </div>,
        document.body
      )}

      {fiche && (
        <div className="fixed inset-0 z-[80] bg-black/40 flex items-start justify-center pt-24 px-4">
          <form onSubmit={sauverFiche} className="bg-white rounded-lg shadow-xl w-full max-w-lg p-4 space-y-3 max-h-[70vh] overflow-y-auto">
            <h2 className="font-semibold text-[#0E2A4F]">
              {fiche.type === 'utilisateur' && (fiche.id ? 'Modifier l’utilisateur' : 'Nouvel utilisateur')}
              {fiche.type === 'profil' && (fiche.id ? 'Modifier le profil' : 'Nouveau profil')}
              {fiche.type === 'habilitation' && (fiche.id ? 'Modifier l’habilitation' : 'Nouvelle habilitation')}
            </h2>
            {fiche.type === 'utilisateur' && (
              <>
                <input required type="email" value={fiche.email} onChange={(event) => setFiche({ ...fiche, email: event.target.value })} placeholder="Email" className="w-full border rounded px-2 py-1.5 text-sm" />
                <input required value={fiche.name} onChange={(event) => setFiche({ ...fiche, name: event.target.value })} placeholder="Nom" className="w-full border rounded px-2 py-1.5 text-sm" />
                <label className="block text-xs text-slate-600">
                  Profil *
                  <ListeChoix
                    valeur={fiche.profil_id || ''}
                    surChangement={(valeur) => setFiche({ ...fiche, profil_id: valeur })}
                    texteVide="Choisir un profil"
                    options={profils.map((profil) => ({ value: profil.id, label: profil.libelle }))}
                  />
                </label>
                <label className="block text-xs text-slate-600">
                  Province *
                  <ListeChoix
                    valeur={fiche.province_rattachement_id || ''}
                    surChangement={(provinceId) => setFiche({ ...fiche, province_rattachement_id: provinceId, antenne_id: '' })}
                    texteVide={territoire.provinces.length ? 'Choisir une province' : 'Aucune province chargée — actualisez'}
                    options={territoire.provinces.map((province) => ({ value: province.id, label: province.nom }))}
                  />
                  {!territoire.provinces.length && (
                    <button type="button" onClick={() => charger()} className="mt-1 text-[11px] font-semibold text-[#2E68B4] underline">
                      Recharger les provinces
                    </button>
                  )}
                </label>
                <label className="block text-xs text-slate-600">
                  Antenne
                  <ListeChoix
                    valeur={fiche.antenne_id || ''}
                    surChangement={(antenneId) => {
                      const antenne = territoire.antennes.find((item) => String(item.id) === String(antenneId));
                      setFiche({
                        ...fiche,
                        antenne_id: antenneId,
                        province_rattachement_id: antenne?.province_id || fiche.province_rattachement_id,
                        direction_id: '',
                      });
                    }}
                    texteVide="Choisir une antenne"
                    options={antennesProposees(fiche.province_rattachement_id)}
                  />
                </label>
                <label className="block text-xs text-slate-600">
                  Direction (optionnelle)
                  <ListeChoix
                    valeur={fiche.direction_id || ''}
                    surChangement={(directionId) => setFiche({ ...fiche, direction_id: directionId })}
                    texteVide="Aucune direction"
                    options={[
                      { value: '', label: 'Aucune direction' },
                      ...territoire.directions
                        .filter((direction) => !direction.antenne_id || String(direction.antenne_id) === String(fiche.antenne_id))
                        .map((direction) => ({ value: direction.id, label: direction.nom })),
                    ]}
                  />
                </label>
                <label className="block text-xs text-slate-600">
                  État
                  <ListeChoix
                    valeur={fiche.etat || 'actif'}
                    surChangement={(valeur) => setFiche({ ...fiche, etat: valeur || 'actif' })}
                    texteVide="Actif"
                    options={[
                      { value: 'actif', label: 'Actif' },
                      { value: 'inactif', label: 'Inactif' },
                    ]}
                  />
                </label>
                {peutGererAuth ? (
                  <label className="block text-xs text-slate-600">
                    Mode d&apos;authentification
                    <ListeChoix
                      valeur={fiche.auth_mode || 'simple'}
                      surChangement={(valeur) => setFiche({ ...fiche, auth_mode: valeur || 'simple' })}
                      texteVide="Simple"
                      options={[
                        { value: 'simple', label: 'Simple — mot de passe uniquement' },
                        { value: 'otp_email', label: 'OTP envoyé par e-mail' },
                        { value: 'totp', label: 'Google Authenticator (QR à la 1ʳᵉ connexion)' },
                      ]}
                    />
                    {fiche.auth_mode === 'totp' && fiche.totp_confirmed === false && (
                      <span className="block mt-1 text-[11px] text-amber-700">QR non encore scanné — demandé à la prochaine connexion.</span>
                    )}
                  </label>
                ) : (
                  <p className="text-xs text-slate-500">Auth : {LIBELLES_AUTH_MODE[fiche.auth_mode] || 'Simple'} (modifiable par Super Admin / Admin Métier)</p>
                )}
                <input type="password" value={fiche.password || ''} onChange={(event) => setFiche({ ...fiche, password: event.target.value })} placeholder={fiche.id ? 'Nouveau mot de passe (optionnel)' : 'Mot de passe'} className="w-full border rounded px-2 py-1.5 text-sm" />
              </>
            )}
            {fiche.type === 'profil' && (
              <>
                <label className="block text-xs text-slate-600">
                  Libellé du profil *
                  <input
                    required
                    value={fiche.libelle}
                    onChange={(event) => setFiche({ ...fiche, libelle: event.target.value })}
                    placeholder="Ex. Demandeur — Pharmacie"
                    className="mt-1 w-full border rounded px-2 py-1.5 text-sm text-slate-900"
                  />
                </label>
                <label className="block text-xs text-slate-600">
                  Niveau de validation
                  <select
                    value={Number(fiche.niveau_validation ?? 0)}
                    onChange={(event) => setFiche({ ...fiche, niveau_validation: Number(event.target.value) })}
                    className="mt-1 w-full border rounded px-2 py-1.5 text-sm text-slate-900 bg-white"
                  >
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((niveau) => (
                      <option key={niveau} value={niveau}>{niveau}</option>
                    ))}
                  </select>
                  <span className="mt-1 block text-[11px] text-slate-400">De 0 (aucun) à 9 (maximum). Le code technique du profil est généré automatiquement.</span>
                </label>
                {!fiche.id && (fiche.habilitations || []).map((row, index) => (
                  <div key={row.id} className="flex flex-wrap items-center gap-2 text-xs border-b border-slate-100 py-1">
                    <span className="w-40 font-mono">{row.code}</span>
                    {(estAcces(row.code) ? ['lire'] : DRAPEAUX_GESTION.map(([champ]) => champ)).map((champ) => (
                      <label key={champ} className="uppercase text-[10px] text-slate-500">
                        {estAcces(row.code) ? 'Oui' : champ[0]}
                        <input type="checkbox" className="ml-1" checked={Boolean(row[champ])} onChange={(event) => {
                          const copie = [...fiche.habilitations];
                          copie[index] = { ...row, [champ]: event.target.checked };
                          setFiche({ ...fiche, habilitations: copie });
                        }} />
                      </label>
                    ))}
                  </div>
                ))}
              </>
            )}
            {fiche.type === 'habilitation' && (
              <>
                <input required disabled={Boolean(fiche.id)} value={fiche.code} onChange={(event) => setFiche({ ...fiche, code: event.target.value })} placeholder="Code" className="w-full border rounded px-2 py-1.5 text-sm font-mono disabled:bg-slate-100" />
                <input required value={fiche.libelle} onChange={(event) => setFiche({ ...fiche, libelle: event.target.value })} placeholder="Libellé" className="w-full border rounded px-2 py-1.5 text-sm" />
                <input required value={fiche.module} onChange={(event) => setFiche({ ...fiche, module: event.target.value })} placeholder="Module" className="w-full border rounded px-2 py-1.5 text-sm" />
              </>
            )}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setFiche(null)} className="px-3 py-1.5 text-xs border rounded">Annuler</button>
              <button type="submit" className="px-3 py-1.5 text-xs font-bold rounded bg-[#0E2A4F] text-white">Enregistrer</button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
