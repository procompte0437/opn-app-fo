import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronRight, FileText, Info, Loader2, Plus, Receipt, RefreshCw, Search, X } from 'lucide-react';
import { BoutonModifier, BoutonSupprimer, BoutonVoir } from '../common/BoutonsActionsTableau';
import { apiRequest } from '../../services/api';
import { askConfirm, pushToast } from '../../services/toastBus';
import { droit, getCodeRole, getFluxStage, libelleDroits } from '../../data/rbacMatrix';
import { PRODUCT_FAMILIES_LIST } from '../../data/pharmaceuticalData';
import SignaturePad, { signatureVide } from '../common/SignaturePad';
import FluxDocumentsPanel from './FluxDocumentsPanel';
import FluxPiecePdfModal from './FluxPiecePdfModal';

const STATUTS = {
  BROUILLON: 'Brouillon',
  SOUMISE_ANTENNE: 'Reçue par l\'antenne',
  EFFECTUEE_CHEF_ANTENNE: 'Effectuée par le chef d\'antenne',
  PARTIELLEMENT_ANTENNE: 'Prise partielle stock antenne',
  SATISFAITE_ANTENNE: 'Servie depuis le stock antenne',
  EN_BC_GLOBAL: 'Incluse dans le BC global',
  TRANSFEREE_SIEGE: 'Transférée au siège',
  PARTIELLEMENT_TRANSMISE: 'Prise en charge partielle',
  PARTIELLEMENT_ARCHIVEE: 'Reliquat (prise partielle)',
  TRANSMISE_SIEGE: 'Prise en charge au siège',
  PARTIELLEMENT_DISPERSEE: 'Dispersion partielle',
  DISPERSEE: 'Satisfaite (dispersée)',
  REJETEE_ANTENNE: 'Rejetée par l\'antenne',
  REJETEE_SIEGE: 'Rejetée par le siège',
};

const KITS_DEFAUT = [
  'Kit urgence maternité',
  'Kit antipaludique ACT',
  'Kit réanimation',
  'Kit froid / vaccins',
  'Kit chirurgie de base',
  'Kit solutés massifs',
  'Sans kit (libre)',
];

const CATEGORIES_VITRINE = PRODUCT_FAMILIES_LIST.filter((f) => f !== 'TOUTES LES FAMILLES');

const ACTIONS = {
  CREATION: 'Commande enregistrée',
  MODIFICATION: 'Demande modifiée',
  TRANSFERT: 'Transfert antenne → siège',
  PRISE_EN_CHARGE: 'Prise en charge siège',
  TRANSMISSION: 'Prise en charge / transmission',
  DISPERSION: 'Dispersion',
  REJET: 'Rejetée',
};

const FILTRES_ANTENNE = [
  { id: 'tous', label: 'Toutes' },
  { id: 'BROUILLON', label: 'Brouillons' },
  { id: 'RECUE', label: 'À traiter' },
  { id: 'SIEGE', label: 'Transférées' },
  { id: 'DISPERSEE', label: 'Satisfaites' },
  { id: 'REJETEE', label: 'Rejetées' },
];

const FILTRES_SIEGE = [
  { id: 'tous', label: 'Toutes' },
  { id: 'EN_ATTENTE', label: 'En attente' },
  { id: 'RELIQUAT', label: 'Reliquats' },
  { id: 'SATISFAITE', label: 'Satisfaites' },
  { id: 'PRISE', label: 'Prises en charge' },
  { id: 'REJETEE', label: 'Rejetées' },
];

const STATUT_STYLE = {
  BROUILLON: 'bg-slate-100 text-slate-700 border-slate-300',
  SOUMISE_ANTENNE: 'bg-blue-50 text-blue-800 border-blue-200',
  EFFECTUEE_CHEF_ANTENNE: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  PARTIELLEMENT_ANTENNE: 'bg-teal-50 text-teal-800 border-teal-200',
  SATISFAITE_ANTENNE: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  EN_BC_GLOBAL: 'bg-cyan-50 text-cyan-900 border-cyan-200',
  TRANSFEREE_SIEGE: 'bg-amber-50 text-amber-900 border-amber-300',
  PARTIELLEMENT_TRANSMISE: 'bg-sky-50 text-sky-800 border-sky-200',
  PARTIELLEMENT_ARCHIVEE: 'bg-violet-50 text-violet-800 border-violet-200',
  TRANSMISE_SIEGE: 'bg-sky-50 text-sky-900 border-sky-300',
  PARTIELLEMENT_DISPERSEE: 'bg-orange-50 text-orange-800 border-orange-200',
  DISPERSEE: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  REJETEE_ANTENNE: 'bg-rose-50 text-rose-800 border-rose-200',
  REJETEE_SIEGE: 'bg-rose-50 text-rose-800 border-rose-200',
};

const STEPS = [
  { id: 'commande', titre: '1. Commande', texte: 'Le demandeur initie la commande. Son statut est « Commande envoyée à l\'antenne ».' },
  { id: 'antenne', titre: '2. Antenne', texte: 'Le chef d\'antenne voit toutes les demandes de sa circonscription. Au transfert, le statut reçu est marqué « quitté » et le statut devient « Commande transférée par l\'antenne ». Le demandeur voit la même évolution sur ses propres commandes.' },
  { id: 'siege', titre: '3. Siège (Direction générale)', texte: 'Le siège voit d\'abord « Commande envoyée à l\'antenne » (ou « Commande générée par l\'antenne »), puis « Commande transférée par l\'antenne ».' },
  { id: 'prise', titre: '4. Prise en charge', texte: 'Le siège engage les quantités disponibles. Le reliquat reste ouvert pour un prochain arrivage.' },
  { id: 'dispersion', titre: '5. Dispersion', texte: 'Le siège envoie les quantités prises en charge. Le demandeur et le chef d\'antenne voient alors le bon de commande et la facture, avec le statut « Commande dispersée ».' },
];

/** Explications des filtres / statuts visibles sur la page siège. */
const EXPLICATIONS_FILTRES_SIEGE = [
  { id: 'tous', titre: 'Toutes', texte: 'Toutes les commandes visibles au siège, quel que soit leur avancement.' },
  { id: 'EN_ATTENTE', titre: 'En attente', texte: 'Commandes transférées par l\'antenne et pas encore prises en charge par le siège. Elles attendent une décision (prise en charge ou rejet).' },
  { id: 'RELIQUAT', titre: 'Reliquats', texte: 'Commandes partiellement prises en charge : une partie des quantités a été engagée, le reste (reliquat) reste à traiter au prochain arrivage.' },
  { id: 'SATISFAITE', titre: 'Satisfaites', texte: 'Commandes entièrement dispersées : toutes les quantités prises en charge ont été envoyées. Le cycle est terminé.' },
  { id: 'PRISE', titre: 'Prises en charge', texte: 'Commandes déjà engagées par le siège (totale ou partielle), y compris celles encore à disperser ou avec un reliquat ouvert.' },
  { id: 'REJETEE', titre: 'Rejetées', texte: 'Commandes refusées par le siège. Elles ne seront pas honorées dans cet état.' },
];

/** Explications des filtres / statuts visibles côté antenne / demandeur. */
const EXPLICATIONS_FILTRES_ANTENNE = [
  { id: 'tous', titre: 'Toutes', texte: 'Toutes vos commandes / demandes, quel que soit leur avancement.' },
  { id: 'RECUE', titre: 'À transférer', texte: 'Demandes reçues à l\'antenne (ou générées par le chef) et pas encore envoyées au siège.' },
  { id: 'SIEGE', titre: 'Transférées', texte: 'Commandes déjà transmises au siège. Elles sont en cours de traitement national (attente, prise en charge, dispersion…).' },
  { id: 'DISPERSEE', titre: 'Satisfaites', texte: 'Commandes entièrement dispersées par le siège : les quantités ont été livrées / envoyées.' },
  { id: 'REJETEE', titre: 'Rejetées', texte: 'Commandes refusées (par l\'antenne ou par le siège).' },
];

/** La commande a été créée par le chef d'antenne, pas par un demandeur. */
function genereeParAntenne(commande) {
  return Boolean(commande?.initiee_par_antenne) || commande?.partenaire_type === 'ANTENNE' || commande?.statut === 'EFFECTUEE_CHEF_ANTENNE';
}

/** La commande a été passée par la Direction générale. */
function deLaDirectionGenerale(commande) {
  return Boolean(commande?.initiee_par_direction_generale) || commande?.partenaire_type === 'DIRECTION_GENERALE';
}

function nomAntenneCommande(commande) {
  return commande?.antenne?.nom || '';
}

function rangOrigine(type) {
  if (type === 'direction_generale') return '0';
  if (type === 'antenne') return '1';
  return '2';
}

const STATUTS_PRISE = ['TRANSMISE_SIEGE', 'PARTIELLEMENT_TRANSMISE', 'PARTIELLEMENT_ARCHIVEE', 'PARTIELLEMENT_DISPERSEE', 'DISPERSEE'];
const STATUTS_DISPERSION = ['PARTIELLEMENT_DISPERSEE', 'DISPERSEE'];

function quantitesCommande(commande) {
  const q = commande?.quantites || {};
  return {
    prise: Number(q.prise ?? q.pris ?? 0),
    dispersee: Number(q.dispersee ?? 0),
    reliquat: Number(q.reliquat ?? q.archive ?? 0),
  };
}

function commandeDispersee(commande) {
  const { dispersee } = quantitesCommande(commande);
  return dispersee > 0 || STATUTS_DISPERSION.includes(commande?.statut);
}

function piecesCommande(commande) {
  if (Array.isArray(commande?.pieces) && commande.pieces.length) return commande.pieces;
  return [...(commande?.bons_commande || []), ...(commande?.factures || [])];
}

/**
 * Le statut suit le cheminement, pour le demandeur, l'antenne et le siège.
 * Chaque étape atteinte reste affichée.
 */
function parcoursStatut(commande, stage) {
  const parAntenne = genereeParAntenne(commande);
  const parDg = deLaDirectionGenerale(commande);
  const transferee = STATUTS_AU_SIEGE.includes(commande?.statut)
    || commande?.statut === 'REJETEE_SIEGE'
    || Boolean(commande?.transferee_au_siege_at);
  const antenneNom = nomAntenneCommande(commande);
  const { prise, reliquat } = quantitesCommande(commande);
  const priseFaite = prise > 0
    || Boolean(commande?.prise_en_charge_siege_at)
    || STATUTS_PRISE.includes(commande?.statut);
  const dispersee = commandeDispersee(commande);

  const styleDg = 'bg-[#0E2A4F]/10 text-[#0E2A4F] border-[#0E2A4F]/30';
  const creeeLe = commande?.created_at;
  const envoyee = { id: 'envoi', label: 'Commande envoyée à l\'antenne', style: STATUT_STYLE.SOUMISE_ANTENNE, quand: creeeLe };
  const recue = { id: 'recue', label: 'Commande reçue du demandeur', style: STATUT_STYLE.SOUMISE_ANTENNE, quand: creeeLe };
  const generee = { id: 'generee', label: 'Commande générée par l\'antenne', style: STATUT_STYLE.EFFECTUEE_CHEF_ANTENNE, quand: creeeLe };
  const dg = { id: 'dg', label: 'Commande de la Direction générale', style: styleDg, quand: creeeLe };
  const recueDg = { id: 'recue-dg', label: 'Commande reçue de la Direction générale', style: styleDg, quand: creeeLe };
  const transfert = {
    id: 'transfert',
    label: antenneNom ? `Commande transférée par l'antenne ${antenneNom}` : 'Commande transférée par l\'antenne',
    style: STATUT_STYLE.TRANSFEREE_SIEGE,
    quand: commande?.transferee_au_siege_at,
  };
  const priseEtape = {
    id: 'prise',
    label: reliquat > 0 ? 'Prise en charge partielle au siège' : 'Prise en charge au siège',
    style: reliquat > 0 ? STATUT_STYLE.PARTIELLEMENT_ARCHIVEE : STATUT_STYLE.TRANSMISE_SIEGE,
    quand: commande?.prise_en_charge_siege_at,
  };
  const dispersionEtape = {
    id: 'dispersion',
    label: commande?.statut === 'DISPERSEE' && reliquat <= 0 ? 'Commande dispersée' : 'Dispersion partielle',
    style: commande?.statut === 'DISPERSEE' && reliquat <= 0 ? STATUT_STYLE.DISPERSEE : STATUT_STYLE.PARTIELLEMENT_DISPERSEE,
    quand: commande?.dispersee_at,
  };

  let etapes;
  if (stage === 'commande') {
    etapes = [envoyee];
  } else if (stage === 'antenne') {
    etapes = [parDg ? recueDg : (parAntenne ? generee : recue)];
  } else {
    etapes = [parDg ? dg : (parAntenne ? generee : envoyee)];
  }

  if (transferee) etapes.push({ ...transfert });
  if (priseFaite) etapes.push(priseEtape);
  if (dispersee) etapes.push(dispersionEtape);

  if (commande?.statut === 'REJETEE_ANTENNE' || commande?.statut === 'REJETEE_SIEGE') {
    const rejet = [...(commande.journal || [])].reverse().find((evt) => evt.action === 'REJET');
    etapes.push({
      id: commande.statut,
      label: STATUTS[commande.statut] || commande.statut,
      style: STATUT_STYLE[commande.statut],
      quand: rejet?.created_at,
    });
  }

  if (etapes.length > 1) {
    etapes = etapes.map((etape, index) => ({ ...etape, label: `${index + 1}. ${etape.label}` }));
  }

  return etapes;
}

function PastillesStatut({ commande, stage, compact = false }) {
  const etapes = parcoursStatut(commande, stage);
  return (
    <ol className="flex flex-col items-end gap-0 max-w-[16rem]">
      {etapes.map((etape, index) => {
        const actuel = index === etapes.length - 1;
        return (
          <li key={etape.id} className="flex flex-col items-end">
            {index > 0 && (
              <span className="text-[9px] font-bold uppercase tracking-wide text-slate-400 py-0.5">quitté →</span>
            )}
            <span className={`inline-flex flex-col items-end px-2 py-0.5 rounded border leading-tight text-right ${compact ? 'text-[10px]' : 'text-xs'} ${actuel ? `font-bold ${etape.style || ''}` : 'font-semibold bg-slate-50 text-slate-500 border-slate-200'}`}>
              <span className={actuel ? '' : 'line-through decoration-slate-400'}>{etape.label}</span>
              <span className={`font-semibold normal-case ${actuel ? 'opacity-80' : 'text-slate-400 no-underline'}`} style={{ textDecoration: 'none' }}>
                {actuel ? 'Statut actuel' : 'Statut quitté'}
                {etape.quand ? ` · ${formaterDate(etape.quand)}` : ''}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

const STATUTS_A_TRANSFERER = ['SOUMISE_ANTENNE', 'EFFECTUEE_CHEF_ANTENNE', 'PARTIELLEMENT_ANTENNE'];
const STATUTS_PRISE_ANTENNE = ['SOUMISE_ANTENNE', 'EFFECTUEE_CHEF_ANTENNE', 'PARTIELLEMENT_ANTENNE'];
const STATUTS_AU_SIEGE = ['TRANSFEREE_SIEGE', 'TRANSMISE_SIEGE', 'PARTIELLEMENT_DISPERSEE', 'PARTIELLEMENT_TRANSMISE', 'PARTIELLEMENT_ARCHIVEE', 'DISPERSEE'];
const STATUTS_PRISE_SIEGE = ['TRANSFEREE_SIEGE', 'TRANSMISE_SIEGE', 'PARTIELLEMENT_ARCHIVEE', 'PARTIELLEMENT_TRANSMISE', 'PARTIELLEMENT_DISPERSEE'];

function reliquatLigne(row) {
  const demandee = Number(row.quantite_demandee || 0);
  const priseAntenne = Number(row.quantite_prise_antenne || 0);
  const prise = Number(row.quantite_prise_en_charge || 0);
  return Math.max(0, Number(row.quantite_reliquat ?? (demandee - priseAntenne - prise)));
}

function resteDispersionLigne(row) {
  return Math.max(0, Number(row.quantite_prise_en_charge || 0) - Number(row.quantite_dispersee || 0));
}

/** Totaux demandé / pris antenne / pris siège / reliquat d'une commande. */
function suiviQuantites(commande) {
  return (commande.lignes || []).reduce((totaux, row) => {
    totaux.demande += Number(row.quantite_demandee || 0);
    totaux.pris_antenne += Number(row.quantite_prise_antenne || 0);
    totaux.pris += Number(row.quantite_prise_en_charge || 0);
    totaux.archive += reliquatLigne(row);
    totaux.reliquat += reliquatLigne(row);
    totaux.dispersee += Number(row.quantite_dispersee || 0);
    return totaux;
  }, { demande: 0, pris_antenne: 0, pris: 0, archive: 0, reliquat: 0, dispersee: 0 });
}

/** Tailles de page pour la liste en cartes (tous profils). */
const TAILLES_PAGE = [5, 10, 20, 50];

/** Liste conservée quand on quitte la page, pour ne pas la recharger au retour. */
const cacheFlux = new Map();

function cleFlux(persona) {
  return String(persona?.email || persona?.id || persona?.user_id || 'invite');
}

const LIBELLES_MOIS = [
  '', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

/** Date de la commande : le jour où elle a été passée. */
function instantCommande(commande) {
  const ref = commande?.created_at || commande?.date_commande;
  const date = ref ? new Date(ref) : null;
  if (!date || Number.isNaN(date.getTime())) return new Date(0);
  return date;
}

/** Plus récent en premier. À date égale, l’identifiant le plus élevé passe devant. */
function comparerCommandesRecentes(a, b) {
  const delta = instantCommande(b).getTime() - instantCommande(a).getTime();
  if (delta !== 0) return delta;
  return Number(b?.id || 0) - Number(a?.id || 0);
}

/** Hiérarchie année → mois → jour → antenne → demandeur. Même disposition pour tous les profils. */
/**
 * Hiérarchie : année → mois → jour → demandeur (nom complet + profil) → commandes tabulées.
 */
function construireHierarchieCommandes(liste) {
  const aujourdhui = new Date();
  const parAnnee = new Map();

  (liste || []).forEach((commande) => {
    const date = instantCommande(commande);
    const annee = date.getTime() ? date.getFullYear() : aujourdhui.getFullYear();
    const mois = date.getTime() ? date.getMonth() + 1 : aujourdhui.getMonth() + 1;
    const jour = date.getTime() ? date.getDate() : aujourdhui.getDate();

    if (!parAnnee.has(annee)) parAnnee.set(annee, new Map());
    const parMois = parAnnee.get(annee);
    if (!parMois.has(mois)) parMois.set(mois, new Map());
    const parJour = parMois.get(mois);
    if (!parJour.has(jour)) parJour.set(jour, new Map());
    const parDemandeur = parJour.get(jour);

    const parDg = deLaDirectionGenerale(commande);
    const parAntenneCmd = !parDg && ((commande.partenaire_type || '') === 'ANTENNE' || commande.initiee_par_antenne);
    const cle = parDg
      ? 'direction_generale'
      : (parAntenneCmd
        ? `antenne:${commande.antenne_id || commande.antenne?.id || 0}:${commande.demandeur_user_id || commande.demandeur_nom || 'antenne'}`
        : `demandeur:${commande.demandeur_user_id || String(commande.demandeur_nom || 'n/a').toLowerCase()}`);

    if (!parDemandeur.has(cle)) {
      const nomComplet = parDg
        ? 'Direction générale'
        : (commande.demandeur_nom || (parAntenneCmd ? (commande.transferee_au_siege_par_nom || commande.partenaire_nom || 'Chef d\'antenne') : 'Demandeur'));
      parDemandeur.set(cle, {
        cle,
        type: parDg ? 'direction_generale' : (parAntenneCmd ? 'antenne' : 'demandeur'),
        nom_complet: nomComplet,
        profil: commande.demandeur_role || (parDg ? 'Direction générale' : (parAntenneCmd ? 'Chef d\'antenne' : 'Demandeur')),
        partenaire_nom: commande.partenaire_nom || '',
        antenne_nom: commande.antenne?.nom || '',
        antenne_chef_lieu: commande.antenne?.chef_lieu || '',
        commandes: [],
      });
    }
    parDemandeur.get(cle).commandes.push(commande);
  });

  return [...parAnnee.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([annee, parMois]) => {
      const mois = [...parMois.entries()]
        .sort((a, b) => b[0] - a[0])
        .map(([moisNum, parJour]) => {
          const jours = [...parJour.entries()]
            .sort((a, b) => b[0] - a[0])
            .map(([jourNum, parDemandeur]) => {
              const demandeurs = [...parDemandeur.values()]
                .map((d) => ({
                  ...d,
                  commandes: [...d.commandes].sort(comparerCommandesRecentes),
                  nb_commandes: d.commandes.length,
                }))
                .sort((a, b) => rangOrigine(a.type).localeCompare(rangOrigine(b.type))
                  || a.nom_complet.localeCompare(b.nom_complet, 'fr'));
              const estAujourdhui = annee === aujourdhui.getFullYear()
                && moisNum === aujourdhui.getMonth() + 1
                && jourNum === aujourdhui.getDate();
              return {
                jour: jourNum,
                libelle: `${jourNum} ${(LIBELLES_MOIS[moisNum] || '').toLowerCase()}`,
                estAujourdhui,
                nb_commandes: demandeurs.reduce((n, d) => n + d.nb_commandes, 0),
                demandeurs,
              };
            });
          return {
            mois: moisNum,
            libelle: LIBELLES_MOIS[moisNum] || String(moisNum),
            nb_commandes: jours.reduce((n, j) => n + j.nb_commandes, 0),
            jours,
          };
        });
      return {
        annee,
        nb_commandes: mois.reduce((n, m) => n + m.nb_commandes, 0),
        mois,
      };
    });
}

/** Formate un montant en francs CFA. */
function formaterMontant(valeur) {
  return `${Number(valeur || 0).toLocaleString('fr-FR')} F`;
}

/** Formate une date d'enregistrement, de transmission ou de dispersion. */
function formaterDate(valeur) {
  if (!valeur) return '—';
  const date = new Date(valeur);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('fr-FR');
}

/** Une ligne du détail : libellé au-dessus de la valeur. */
function ChampDetail({ libelle, valeur, large = false }) {
  return (
    <div className={large ? 'sm:col-span-2' : ''}>
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{libelle}</p>
      <p className="text-sm text-slate-800 whitespace-pre-wrap">{valeur || '—'}</p>
    </div>
  );
}

/**
 * Liste déroulante avec recherche intégrée.
 * La barre de recherche est dans le panneau, pas au-dessus du champ.
 */
function ListeDeroulante({ valeur, surChangement, options, texteVide = 'Choisir' }) {
  const [ouvert, setOuvert] = useState(false);
  const [rechercheOption, setRechercheOption] = useState('');
  const [position, setPosition] = useState(null);
  const boutonRef = useRef(null);
  const panneauRef = useRef(null);
  const champRechercheRef = useRef(null);

  /* Recale le panneau sous le bouton, ou au-dessus s'il n'y a pas la place. */
  useLayoutEffect(() => {
    if (!ouvert) return undefined;
    const placer = () => {
      const cadre = boutonRef.current?.getBoundingClientRect();
      if (!cadre) return;
      const espaceBas = window.innerHeight - cadre.bottom - 12;
      const espaceHaut = cadre.top - 12;
      const ouvrirVersLeHaut = espaceBas < 220 && espaceHaut > espaceBas;
      const hauteurMax = Math.max(180, Math.min(320, ouvrirVersLeHaut ? espaceHaut : espaceBas));
      setPosition({
        left: cadre.left,
        width: Math.max(cadre.width, 260),
        top: ouvrirVersLeHaut ? Math.max(8, cadre.top - hauteurMax - 4) : cadre.bottom + 4,
        hauteurMax,
      });
    };
    placer();
    window.addEventListener('resize', placer);
    window.addEventListener('scroll', placer, true);
    return () => {
      window.removeEventListener('resize', placer);
      window.removeEventListener('scroll', placer, true);
    };
  }, [ouvert]);

  /* Ferme la liste au clic extérieur ou avec Échap, et place le curseur dans la recherche. */
  useEffect(() => {
    if (!ouvert) return undefined;
    setRechercheOption('');
    champRechercheRef.current?.focus();
    const surDocument = (evenement) => {
      if (boutonRef.current?.contains(evenement.target) || panneauRef.current?.contains(evenement.target)) return;
      setOuvert(false);
    };
    const surClavier = (evenement) => {
      if (evenement.key === 'Escape') setOuvert(false);
    };
    document.addEventListener('mousedown', surDocument);
    document.addEventListener('keydown', surClavier);
    return () => {
      document.removeEventListener('mousedown', surDocument);
      document.removeEventListener('keydown', surClavier);
    };
  }, [ouvert]);

  const optionChoisie = options.find((option) => String(option.value) === String(valeur));
  const terme = rechercheOption.trim().toLowerCase();
  const optionsFiltrees = options.filter((option) => option.label.toLowerCase().includes(terme));

  return (
    <>
      <button
        type="button"
        ref={boutonRef}
        onClick={() => setOuvert((etat) => !etat)}
        className="mt-1 w-full border border-slate-200 rounded px-2 py-1.5 text-sm bg-white text-left flex items-center justify-between gap-2"
        aria-haspopup="listbox"
        aria-expanded={ouvert}
      >
        <span className={`truncate ${optionChoisie ? 'text-slate-900' : 'text-slate-500'}`}>
          {optionChoisie ? optionChoisie.label : texteVide}
        </span>
        <span className="text-[10px] text-slate-400 shrink-0">{ouvert ? '▴' : '▾'}</span>
      </button>
      {ouvert && position && createPortal(
        <div
          ref={panneauRef}
          className="fixed z-[120] bg-white border border-slate-200 rounded shadow-xl overflow-hidden"
          style={{ top: position.top, left: position.left, width: position.width, maxHeight: position.hauteurMax }}
        >
          <label className="relative block border-b border-slate-100 p-2">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              ref={champRechercheRef}
              value={rechercheOption}
              onChange={(evenement) => setRechercheOption(evenement.target.value)}
              placeholder="Rechercher…"
              className="w-full border border-slate-200 rounded pl-8 pr-2 py-1.5 text-sm"
            />
          </label>
          <ul role="listbox" className="overflow-y-auto py-1" style={{ maxHeight: position.hauteurMax - 52 }}>
            {optionsFiltrees.length === 0 && <li className="px-2 py-1.5 text-xs text-slate-500">Aucun résultat</li>}
            {optionsFiltrees.map((option) => {
              const active = String(option.value) === String(valeur);
              return (
                <li key={option.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => {
                      surChangement(String(option.value));
                      setOuvert(false);
                    }}
                    className={`w-full text-left px-2 py-1.5 text-sm hover:bg-blue-50 ${active ? 'bg-blue-50 font-semibold text-[#2E68B4]' : 'text-slate-800'}`}
                  >
                    {option.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>,
        document.body
      )}
    </>
  );
}

export default function FluxApprovisionnement({ activePersona }) {
  const role = getCodeRole(activePersona);
  const localStage = getFluxStage(role);
  const conserve = cacheFlux.get(cleFlux(activePersona));
  const [stage, setStage] = useState(conserve?.stage || localStage);
  const [commandes, setCommandes] = useState(conserve?.commandes || []);
  const [compteurs, setCompteurs] = useState(conserve?.compteurs || {
    total: 0, recues: 0, transmises: 0, dispersees: 0, archivees: 0,
    en_attente: 0, satisfaites: 0, reliquats: 0, transferees: 0,
  });
  /** Années repliées (tout déplié par défaut — seul l’année se plie). */
  const [anneesRepliees, setAnneesRepliees] = useState(() => new Set());
  const [ongletFlux, setOngletFlux] = useState('commandes'); // commandes | bons | factures
  const [transfertEnCours, setTransfertEnCours] = useState(null);
  const [antenneCompte, setAntenneCompte] = useState(conserve?.antenneCompte || null);
  const [structureCompte, setStructureCompte] = useState(conserve?.structureCompte || '');
  const [antennes, setAntennes] = useState(conserve?.antennes || []);
  const [produits, setProduits] = useState(conserve?.produits || []);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(!conserve);
  const [rafraichit, setRafraichit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [partenaire, setPartenaire] = useState('');
  const [antenneId, setAntenneId] = useState('');
  const [motif, setMotif] = useState('');
  const [selections, setSelections] = useState({}); // { [produit_id]: quantite }
  const [rechercheMed, setRechercheMed] = useState('');
  const [modalOuvert, setModalOuvert] = useState(false);
  const [commandeEdition, setCommandeEdition] = useState(null);
  const [recherche, setRecherche] = useState('');
  const [filtre, setFiltre] = useState('tous');
  const [ligneOuverte, setLigneOuverte] = useState(null);
  const [taillePage, setTaillePage] = useState(20);
  const [pageCourante, setPageCourante] = useState(1);
  const [aideOuverte, setAideOuverte] = useState(false);
  const [peutSupprimer, setPeutSupprimer] = useState(Boolean(conserve?.peutSupprimer));
  const [modalAction, setModalAction] = useState(null); // { type: 'prise'|'dispersion', commande }
  const [quantitesAction, setQuantitesAction] = useState({});
  const [noteAction, setNoteAction] = useState('');
  const [savingAction, setSavingAction] = useState(false);
  const [piecePdf, setPiecePdf] = useState(null);
  const [docsRefreshKey, setDocsRefreshKey] = useState(0);
  const [filtreCategorie, setFiltreCategorie] = useState('');
  const [kitMedical, setKitMedical] = useState('Sans kit (libre)');
  const [categories, setCategories] = useState(CATEGORIES_VITRINE);
  const [kits, setKits] = useState(KITS_DEFAUT);
  const [parDemandeurs, setParDemandeurs] = useState([]);
  const [alertesRupture, setAlertesRupture] = useState([]);
  const [lotsStock, setLotsStock] = useState([]);
  const [dateLivraisonPrevue, setDateLivraisonPrevue] = useState('');
  const [dateLivraisonReliquatAction, setDateLivraisonReliquatAction] = useState('');
  const [selectionBc, setSelectionBc] = useState(() => new Set());
  const [bcGlobaux, setBcGlobaux] = useState([]);
  const [vueChef, setVueChef] = useState('demandeurs'); // demandeurs | chronologie | bc | stock
  const [modalSignatureBl, setModalSignatureBl] = useState(null);
  const [entreeStock, setEntreeStock] = useState({ produit_id: '', quantite: '', numero_lot: '', date_peremption: '' });
  const [savingStock, setSavingStock] = useState(false);

  const codeRoleCompte = role || activePersona?.codeRole || activePersona?.code_role;
  const estChefAntenne = ['CHEF_ANTENNE_PROVINCIALE', 'PHARMACIEN_CHEF_ANTENNE'].includes(codeRoleCompte);
  // Id numérique d'antenne uniquement (pas le code G2 / G8 du persona).
  const antenneDuCompte = (() => {
    const candidats = [activePersona?.antenne_id, activePersona?.antenneId, activePersona?.province_id];
    const num = candidats.find((v) => v !== undefined && v !== null && v !== '' && !Number.isNaN(Number(v)) && String(v) === String(Number(v)));
    return num !== undefined ? Number(num) : null;
  })();
  const antenneImposee = Boolean(antenneDuCompte) && !['SUPER_ADMIN', 'ADMIN_METIER'].includes(codeRoleCompte);
  const estDirectionGenerale = codeRoleCompte === 'DG';
  const estSupervision = ['SUPER_ADMIN', 'ADMIN_METIER'].includes(codeRoleCompte);
  const titreMenu = (codeRoleCompte === 'DEMANDEUR_PHARMACIEN' || codeRoleCompte === 'DEMANDEUR_STRUCTURE')
    ? 'Mes demandes'
    : estDirectionGenerale
      ? 'Siège — Direction générale'
      : estSupervision
        ? 'Siège — toutes les antennes'
        : 'Chaîne d\'approvisionnement';
  const estDemandeur = stage === 'commande';
  const estVueSiege = stage === 'siege' || stage === 'supervision';
  const peutCommander = estDemandeur
    || estDirectionGenerale
    || estChefAntenne
    || ((stage === 'antenne' || stage === 'supervision') && droit(activePersona, 'flux', 'creer'));
  const peutTransferer = (stage === 'antenne' || stage === 'supervision')
    && (estChefAntenne || estSupervision || droit(activePersona, 'flux', 'modifier'));
  const peutPrendreCharge = estVueSiege && (droit(activePersona, 'flux', 'modifier') || droit(activePersona, 'flux', 'valider'));
  const peutDisperser = estVueSiege && droit(activePersona, 'flux', 'valider');
  const nomChef = activePersona?.nom || activePersona?.name || '';
  const FILTRES = estVueSiege ? FILTRES_SIEGE : FILTRES_ANTENNE;

  const loadEnCours = useRef(false);
  const aDejaUneListe = useRef(Boolean(conserve));
  const cleCompte = cleFlux(activePersona);
  const load = useCallback(async (silent = false) => {
    if (loadEnCours.current) return;
    loadEnCours.current = true;
    const garderLaListe = silent || aDejaUneListe.current;
    if (!garderLaListe) {
      setLoading(true);
      setError('');
    } else if (!silent) {
      setRafraichit(true);
      setError('');
    }
    try {
      const flux = await apiRequest('/flux/commandes');
      const suivant = {
        stage: flux.stage || localStage,
        commandes: flux.commandes || [],
        compteurs: flux.compteurs || {},
        antenneCompte: flux.antenne_compte || null,
        structureCompte: flux.structure_compte || '',
        peutSupprimer: Boolean(flux.peut_supprimer),
      };
      setStage(suivant.stage);
      setCommandes(suivant.commandes);
      setCompteurs(suivant.compteurs);
      setParDemandeurs(flux.par_demandeurs || []);
      setAntenneCompte(suivant.antenneCompte);
      setStructureCompte(suivant.structureCompte);
      setPeutSupprimer(suivant.peutSupprimer);
      setError('');
      let antennesSuivantes;
      let produitsSuivants;
      if (!silent) {
        const [ants, meds, cats, stock, bc] = await Promise.allSettled([
          apiRequest('/antennes'),
          apiRequest('/pharmacy/produits'),
          apiRequest('/flux/categories'),
          apiRequest('/flux/stock-antenne'),
          apiRequest('/flux/bc-globaux'),
        ]);
        if (ants.status === 'fulfilled') {
          antennesSuivantes = ants.value.antennes || [];
          setAntennes(antennesSuivantes);
        }
        if (meds.status === 'fulfilled') {
          produitsSuivants = meds.value.produits || [];
          setProduits(produitsSuivants);
        }
        if (cats.status === 'fulfilled') {
          if (cats.value.categories?.length) setCategories(cats.value.categories);
          if (cats.value.kits_medicaux?.length) setKits(cats.value.kits_medicaux);
        }
        if (stock.status === 'fulfilled') {
          setAlertesRupture(stock.value.alertes_rupture || []);
          setLotsStock(stock.value.lots || []);
          if (stock.value.date_livraison_prevue) {
            setDateLivraisonPrevue(String(stock.value.date_livraison_prevue).slice(0, 10));
          }
        }
        if (bc.status === 'fulfilled') {
          setBcGlobaux(bc.value.bc_globaux || []);
        }
      }
      const precedent = cacheFlux.get(cleCompte) || {};
      cacheFlux.set(cleCompte, {
        ...precedent,
        ...suivant,
        antennes: antennesSuivantes || precedent.antennes || [],
        produits: produitsSuivants || precedent.produits || [],
      });
      aDejaUneListe.current = true;
    } catch (err) {
      if (!silent && !err?.skipped) setError(err?.backendUnavailable ? '' : (err.message || 'Impossible de charger le flux.'));
    } finally {
      loadEnCours.current = false;
      if (!silent) {
        setLoading(false);
        setRafraichit(false);
      }
    }
  }, [localStage, cleCompte]);

  /* Au retour sur la page, la liste déjà vue reste affichée. Seule l'icône d'actualisation relance le chargement. */
  useEffect(() => {
    if (cacheFlux.has(cleCompte)) return;
    load();
  }, [load, cleCompte]);

  useEffect(() => {
    if (!ligneOuverte) return undefined;
    const surClavier = (evenement) => {
      if (evenement.key === 'Escape') setLigneOuverte(null);
    };
    document.addEventListener('keydown', surClavier);
    return () => document.removeEventListener('keydown', surClavier);
  }, [ligneOuverte]);

  useEffect(() => {
    const timer = window.setInterval(() => load(true), 15000);
    return () => window.clearInterval(timer);
  }, [load]);

  useEffect(() => {
    if (!antennes.length || antenneId) return;
    const propre = antennes.find((antenne) => String(antenne.id) === String(antenneDuCompte));
    setAntenneId(String((propre || antennes[0]).id));
  }, [antennes, antenneId, antenneDuCompte]);

  const antenneChoisie = antennes.find((antenne) => String(antenne.id) === String(antenneId));
  const antenneParDefaut = (antenneCompte && String(antenneCompte.id) === String(antenneId || antenneCompte.id) ? antenneCompte : null)
    || antennes.find((antenne) => String(antenne.id) === String(antenneDuCompte || antenneCompte?.id))
    || antenneCompte;
  const antenneVerrouillee = !estDirectionGenerale && Boolean(antenneParDefaut) && (estDemandeur || estChefAntenne || antenneImposee);
  const libelleAntenneDefaut = antenneParDefaut
    ? [antenneParDefaut.nom, antenneParDefaut.chef_lieu].filter(Boolean).join(' — ')
    : '';

  function fermerDemande() {
    setCommandeEdition(null);
    setModalOuvert(false);
  }

  /** Le demandeur corrige sa demande tant qu'elle n'a pas quitté l'antenne. */
  function demandeEditable(commande) {
    return estDemandeur && commande?.statut === 'SOUMISE_ANTENNE';
  }

  function ouvrirModification(commande) {
    const selectionsInit = {};
    const manquants = [];
    (commande.lignes || []).forEach((row) => {
      if (!row.produit_id) return;
      selectionsInit[row.produit_id] = row.quantite_demandee;
      if (!produits.some((p) => String(p.id) === String(row.produit_id))) {
        manquants.push({ id: row.produit_id, designation: row.designation });
      }
    });
    if (manquants.length) setProduits((prev) => [...manquants, ...prev]);
    setSelections(selectionsInit);
    setMotif(commande.motif || '');
    setPartenaire(commande.partenaire_nom || structureCompte || activePersona?.entite || '');
    setRechercheMed('');
    setError('');
    setCommandeEdition(commande);
    setModalOuvert(true);
  }

  /** Demandeur = sa structure ; chef = à son nom ; Direction générale = vers l'antenne choisie. */
  function ouvrirDemande() {
    setCommandeEdition(null);
    if (estDirectionGenerale) {
      setPartenaire('Direction générale');
    } else if (estChefAntenne) {
      setPartenaire(nomChef);
    } else {
      const structure = structureCompte || activePersona?.entite || activePersona?.structure || '';
      setPartenaire(structure);
    }
    const idAntenne = antenneCompte?.id || antenneDuCompte;
    if (idAntenne) setAntenneId(String(idAntenne));
    setSelections({});
    setRechercheMed('');
    setError('');
    setModalOuvert(true);
  }

  /** Coche / décoche un médicament. Si coché, initialise la quantité à 1. */
  function toggleSelection(produitId) {
    setSelections((prev) => {
      if (prev[produitId] !== undefined) {
        const next = { ...prev };
        delete next[produitId];
        return next;
      }
      return { ...prev, [produitId]: 1 };
    });
  }

  /** Met à jour la quantité d'un médicament sélectionné. */
  function majQuantite(produitId, valeur) {
    const qte = Math.max(1, Number(valeur) || 1);
    setSelections((prev) => ({ ...prev, [produitId]: qte }));
  }

  async function envoyerCommande(event, options = {}) {
    event?.preventDefault?.();
    const enBrouillon = Boolean(options.brouillon);
    const lignesSelections = Object.entries(selections)
      .filter(([, qte]) => qte > 0)
      .map(([produitId, qte]) => {
        const p = produits.find((prod) => String(prod.id) === String(produitId));
        const deja = (commandeEdition?.lignes || []).find((row) => String(row.produit_id) === String(produitId));
        return {
          produit_id: Number(produitId),
          quantite_demandee: qte,
          designation: p?.designation || deja?.designation || 'Médicament',
          categorie: p?.categorie || filtreCategorie || null,
        };
      });
    if (!lignesSelections.length) {
      setError('Sélectionnez au moins un médicament.');
      return;
    }
    setSaving(true);
    setError('');
    const edition = commandeEdition;
    try {
      if (edition?.statut === 'BROUILLON' && !enBrouillon && options.envoyer) {
        await apiRequest(`/flux/commandes/${edition.id}`, {
          method: 'PUT',
          body: JSON.stringify({ motif, lignes: lignesSelections }),
        });
        await apiRequest(`/flux/commandes/${edition.id}/envoyer`, { method: 'POST', body: JSON.stringify({}) });
        pushToast(`Demande ${edition.numero_commande} envoyée au chef d'antenne.`);
      } else {
        await apiRequest(edition ? `/flux/commandes/${edition.id}` : '/flux/commandes', {
          method: edition ? 'PUT' : 'POST',
          body: JSON.stringify(edition
            ? { motif, lignes: lignesSelections }
            : {
              antenne_id: Number(estDirectionGenerale ? antenneId : (antenneCompte?.id || antenneDuCompte || antenneId)),
              partenaire_nom: estDirectionGenerale ? 'Direction générale' : (estChefAntenne ? nomChef : partenaire),
              partenaire_type: estDirectionGenerale ? 'DIRECTION_GENERALE' : (estChefAntenne ? 'ANTENNE' : 'PHARMACIE'),
              motif,
              categorie: filtreCategorie || null,
              kit_medical: kitMedical || null,
              brouillon: enBrouillon && estDemandeur,
              date_livraison_prevue: dateLivraisonPrevue || null,
              lignes: lignesSelections,
            }),
        });
        if (edition) {
          pushToast(`Demande ${edition.numero_commande} modifiée.`);
        } else if (enBrouillon) {
          pushToast('Demande enregistrée en brouillon.');
        } else if (estChefAntenne) {
          pushToast('Bon enregistré et transféré à la Direction générale.');
        } else {
          pushToast('Demande envoyée au chef d\'antenne.');
        }
      }
      setSelections({});
      setRechercheMed('');
      setMotif('');
      setPartenaire('');
      setFiltreCategorie('');
      setKitMedical('Sans kit (libre)');
      setCommandeEdition(null);
      setModalOuvert(false);
      await load();
    } catch (err) {
      setError(err?.backendUnavailable ? '' : err.message);
    } finally {
      setSaving(false);
    }
  }

  async function envoyerBrouillonExistant(commande) {
    try {
      await apiRequest(`/flux/commandes/${commande.id}/envoyer`, { method: 'POST', body: JSON.stringify({}) });
      pushToast(`${commande.numero_commande} envoyée au chef d'antenne.`);
      await load();
    } catch (err) {
      setError(err?.backendUnavailable ? '' : err.message);
    }
  }

  async function constituerBcGlobal() {
    const ids = [...selectionBc];
    if (!ids.length) {
      pushToast('Sélectionnez au moins une demande.');
      return;
    }
    try {
      const res = await apiRequest('/flux/bc-globaux', {
        method: 'POST',
        body: JSON.stringify({
          commande_ids: ids,
          date_livraison_prevue: dateLivraisonPrevue || undefined,
        }),
      });
      pushToast(`BC global ${res.bc_global?.numero} constitué (${res.bc_global?.nb_demandeurs || 0} demandeurs).`);
      setSelectionBc(new Set());
      await load();
    } catch (err) {
      setError(err?.backendUnavailable ? '' : err.message);
    }
  }

  async function transfererBcGlobal(bc) {
    const ok = await askConfirm({
      message: `Transférer ${bc.numero} au siège ? Le détail par demandeur reste à l'antenne.`,
      confirmLabel: 'Transférer',
    });
    if (!ok) return;
    try {
      await apiRequest(`/flux/bc-globaux/${bc.id}/transferer`, {
        method: 'POST',
        body: JSON.stringify({ date_livraison_prevue: dateLivraisonPrevue || undefined }),
      });
      pushToast(`${bc.numero} transmis au siège (agrégé).`);
      await load();
    } catch (err) {
      setError(err?.backendUnavailable ? '' : err.message);
    }
  }

  async function genererBlSigne(commande) {
    setModalSignatureBl({
      commande,
      mode: 'NUMERIQUE',
      signataire: activePersona?.nom || activePersona?.name || '',
      signature: '',
    });
  }

  /** Transfert simple antenne → siège (reste après stock local). */
  async function transfererAuSiege(commande) {
    const reste = (commande.lignes || []).reduce(
      (n, row) => n + Math.max(0, Number(row.quantite_demandee || 0) - Number(row.quantite_prise_antenne || 0)),
      0
    );
    const dateReliquat = dateLivraisonPrevue || commande.date_livraison_reliquat || commande.date_livraison_prevue || '';
    if (reste > 0 && !dateReliquat) {
      setError('Indiquez d’abord la date de livraison prévue du reliquat (champ « Prochaine livraison »).');
      return;
    }
    const ok = await askConfirm({
      message: reste > 0
        ? `Transférer ${commande.numero_commande} au siège (${reste} unité(s) restantes) — livraison prévue ${dateReliquat} ?`
        : `Transférer ${commande.numero_commande} au siège OPN ?`,
      confirmLabel: 'Transférer',
    });
    if (!ok) return;
    setTransfertEnCours(commande.id);
    setError('');
    try {
      await apiRequest(`/flux/commandes/${commande.id}/transferer`, {
        method: 'POST',
        body: JSON.stringify({
          date_livraison_prevue: dateReliquat || undefined,
          date_livraison_reliquat: dateReliquat || undefined,
        }),
      });
      pushToast(`${commande.numero_commande} transférée au siège.`);
      await load();
    } catch (err) {
      setError(err?.backendUnavailable ? '' : err.message);
    } finally {
      setTransfertEnCours(null);
    }
  }

  /** Ouvre le modal de prise en charge (siège) ou de dispersion (siège). */
  function maxActionLigne(type, row) {
    if (type === 'prise_antenne') {
      return Math.max(0, Number(row.quantite_demandee || 0) - Number(row.quantite_prise_antenne || 0));
    }
    if (type === 'prise') return reliquatLigne(row);
    return resteDispersionLigne(row);
  }

  function ouvrirAction(type, commande) {
    const initial = {};
    (commande.lignes || []).forEach((row) => {
      const max = maxActionLigne(type, row);
      initial[row.id] = max > 0 ? max : 0;
    });
    setQuantitesAction(initial);
    setNoteAction('');
    setDateLivraisonReliquatAction(
      String(commande.date_livraison_reliquat || commande.date_livraison_prevue || dateLivraisonPrevue || '').slice(0, 10)
    );
    setError('');
    setModalAction({ type, commande });
  }

  function majQuantiteAction(ligneId, max, valeur) {
    const qte = Math.max(0, Math.min(max, Number(valeur) || 0));
    setQuantitesAction((prev) => ({ ...prev, [ligneId]: qte }));
  }

  function toutPrendreAction() {
    if (!modalAction) return;
    const initial = {};
    (modalAction.commande.lignes || []).forEach((row) => {
      initial[row.id] = maxActionLigne(modalAction.type, row);
    });
    setQuantitesAction(initial);
  }

  function toutZeroAction() {
    if (!modalAction) return;
    const initial = {};
    (modalAction.commande.lignes || []).forEach((row) => {
      initial[row.id] = 0;
    });
    setQuantitesAction(initial);
  }

  async function confirmerAction() {
    if (!modalAction) return;
    const { type, commande } = modalAction;
    const lignes = (commande.lignes || [])
      .map((row) => ({
        id: row.id,
        quantite: Number(quantitesAction[row.id] || 0),
      }))
      .filter((ligne) => ligne.quantite > 0);

    if (!lignes.length) {
      setError('Indiquez au moins une quantité supérieure à 0.');
      return;
    }

    const resteApres = (commande.lignes || []).reduce((n, row) => {
      const max = maxActionLigne(type, row);
      const prisMaintenant = Number(quantitesAction[row.id] || 0);
      if (type === 'prise_antenne') {
        return n + Math.max(0, max - prisMaintenant);
      }
      if (type === 'prise') {
        return n + Math.max(0, max - prisMaintenant);
      }
      return n;
    }, 0);
    if ((type === 'prise_antenne' || type === 'prise') && resteApres > 0 && !dateLivraisonReliquatAction) {
      setError('Indiquez la date de livraison prévue du reliquat.');
      return;
    }

    setSavingAction(true);
    setError('');
    try {
      if (type === 'prise') {
        const res = await apiRequest(`/flux/commandes/${commande.id}/transmettre`, {
          method: 'POST',
          body: JSON.stringify({
            lignes,
            note: noteAction || undefined,
            date_livraison_reliquat: dateLivraisonReliquatAction || undefined,
            date_livraison_prevue: dateLivraisonReliquatAction || undefined,
          }),
        });
        const bc = res?.bon_commande?.numero;
        const fac = res?.facture?.numero;
        pushToast(
          bc && fac
            ? `Prise en charge OK — BC ${bc} et facture ${fac} générés.`
            : `Prise en charge enregistrée pour ${commande.numero_commande}.`
        );
        setDocsRefreshKey((k) => k + 1);
      } else if (type === 'prise_antenne') {
        await apiRequest(`/flux/commandes/${commande.id}/prise-antenne`, {
          method: 'POST',
          body: JSON.stringify({
            lignes,
            note: noteAction || undefined,
            date_livraison_reliquat: dateLivraisonReliquatAction || undefined,
            date_livraison_prevue: dateLivraisonReliquatAction || undefined,
          }),
        });
        pushToast(`Prise en charge stock antenne pour ${commande.numero_commande}.`);
      } else {
        const res = await apiRequest(`/flux/commandes/${commande.id}/disperser`, {
          method: 'POST',
          body: JSON.stringify({
            lignes: lignes.map((l) => ({ id: l.id, quantite: l.quantite })),
            note_dispersion: noteAction || undefined,
          }),
        });
        const docs = piecesCommande(res?.commande);
        const bc = docs.find((piece) => piece.type === 'BON_COMMANDE')?.numero;
        const fac = docs.find((piece) => piece.type === 'FACTURE')?.numero;
        pushToast(
          bc && fac
            ? `Dispersion enregistrée. Bon ${bc} et facture ${fac} visibles par le demandeur et le chef d'antenne.`
            : `Dispersion enregistrée pour ${commande.numero_commande}.`
        );
        setDocsRefreshKey((k) => k + 1);
        setModalAction(null);
        await load();
        setModalSignatureBl({
          commande: res?.commande || commande,
          mode: 'NUMERIQUE',
          signataire: activePersona?.nom || activePersona?.name || '',
          signature: '',
        });
        return;
      }
      setModalAction(null);
      await load();
    } catch (err) {
      setError(err?.backendUnavailable ? '' : err.message);
    } finally {
      setSavingAction(false);
    }
  }

  async function supprimerCommande(commande) {
    const ok = await askConfirm({
      message: `Supprimer la demande ${commande.numero_commande} ?`,
      confirmLabel: 'Supprimer',
      tone: 'danger',
    });
    if (!ok) return;
    setError('');
    try {
      await apiRequest(`/flux/commandes/${commande.id}`, { method: 'DELETE' });
      if (ligneOuverte === commande.id) setLigneOuverte(null);
      pushToast(`Commande ${commande.numero_commande} supprimée.`, 'warning');
      await load();
    } catch (err) {
      setError(err?.backendUnavailable ? '' : err.message);
    }
  }

  async function rejeter(commande) {
    const decision = await askConfirm({
      message: `Rejeter la commande ${commande.numero_commande} ?`,
      confirmLabel: 'Rejeter',
      tone: 'danger',
      reasonLabel: 'Motif du rejet',
      reasonRequired: true,
    });
    if (!decision) return;
    const motif = decision.reason;
    setError('');
    try {
      await apiRequest(`/flux/commandes/${commande.id}/rejeter`, {
        method: 'POST',
        body: JSON.stringify({ motif }),
      });
      pushToast(`Commande ${commande.numero_commande} rejetée.`, 'warning');
      await load();
    } catch (err) {
      setError(err?.backendUnavailable ? '' : err.message);
    }
  }

  const commandesVisibles = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return commandes.filter((commande) => {
      if (filtre === 'REJETEE' && !String(commande.statut || '').startsWith('REJETEE')) return false;
      if (filtre === 'BROUILLON' && commande.statut !== 'BROUILLON') return false;
      if (filtre === 'RECUE' && !STATUTS_A_TRANSFERER.includes(commande.statut)) return false;
      if (filtre === 'SIEGE' && !STATUTS_AU_SIEGE.includes(commande.statut)) return false;
      if (filtre === 'EN_ATTENTE' && commande.statut !== 'TRANSFEREE_SIEGE') return false;
      if (filtre === 'RELIQUAT' && commande.statut !== 'PARTIELLEMENT_ARCHIVEE') return false;
      if (filtre === 'SATISFAITE' && commande.statut !== 'DISPERSEE') return false;
      if (filtre === 'PRISE' && !['TRANSMISE_SIEGE', 'PARTIELLEMENT_DISPERSEE', 'PARTIELLEMENT_ARCHIVEE'].includes(commande.statut)) return false;
      if (filtre === 'DISPERSEE' && commande.statut !== 'DISPERSEE') return false;
      if (!q) return true;
      const texte = [
        commande.numero_commande,
        commande.demandeur_nom,
        commande.demandeur_role,
        commande.partenaire_nom,
        commande.antenne?.nom,
        commande.antenne?.chef_lieu,
        commande.motif,
        commande.transferee_au_siege_par_nom,
        commande.prise_en_charge_siege_par_nom,
        commande.partenaire_type,
        commande.note_dispersion,
        STATUTS[commande.statut],
        ...parcoursStatut(commande, stage).map((etape) => etape.label),
        ...(commande.lignes || []).map((row) => row.designation),
      ].filter(Boolean).join(' ').toLowerCase();
      return texte.includes(q);
    }).sort(comparerCommandesRecentes);
  }, [commandes, recherche, filtre, stage]);

  /* Revenir à la première page dès que le filtre, la recherche ou la taille changent. */
  useEffect(() => {
    setPageCourante(1);
  }, [recherche, filtre, taillePage, ongletFlux]);

  const nombrePages = Math.max(1, Math.ceil(commandesVisibles.length / taillePage));
  const pageAffichee = Math.min(pageCourante, nombrePages);
  const commandesPage = commandesVisibles.slice((pageAffichee - 1) * taillePage, pageAffichee * taillePage);

  const commandeDetail = commandes.find((commande) => commande.id === ligneOuverte) || null;

  /** Même disposition pour siège, chef d’antenne et demandeur — sur la page courante. */
  const hierarchiePage = useMemo(
    () => construireHierarchieCommandes(commandesPage),
    [commandesPage],
  );

  function compteFiltre(id) {
    if (id === 'tous') return commandes.length;
    if (id === 'REJETEE') return commandes.filter((c) => String(c.statut || '').startsWith('REJETEE')).length;
    if (id === 'BROUILLON') return commandes.filter((c) => c.statut === 'BROUILLON').length;
    if (id === 'RECUE') return commandes.filter((c) => STATUTS_A_TRANSFERER.includes(c.statut)).length;
    if (id === 'SIEGE') return commandes.filter((c) => STATUTS_AU_SIEGE.includes(c.statut)).length;
    if (id === 'EN_ATTENTE') return commandes.filter((c) => c.statut === 'TRANSFEREE_SIEGE').length;
    if (id === 'RELIQUAT') return commandes.filter((c) => c.statut === 'PARTIELLEMENT_ARCHIVEE').length;
    if (id === 'SATISFAITE' || id === 'DISPERSEE') return commandes.filter((c) => c.statut === 'DISPERSEE').length;
    if (id === 'PRISE') return commandes.filter((c) => ['TRANSMISE_SIEGE', 'PARTIELLEMENT_DISPERSEE', 'PARTIELLEMENT_ARCHIVEE'].includes(c.statut)).length;
    return commandes.filter((c) => c.statut === id).length;
  }

  function actionsCommande(commande) {
    const lignes = commande.lignes || [];
    const aTransferer = peutTransferer && STATUTS_A_TRANSFERER.includes(commande.statut);
    const aPrendreAntenne = estChefAntenne
      && STATUTS_PRISE_ANTENNE.includes(commande.statut)
      && lignes.some((row) => Math.max(0, Number(row.quantite_demandee || 0) - Number(row.quantite_prise_antenne || 0)) > 0);
    const aEnvoyerBrouillon = estDemandeur && commande.statut === 'BROUILLON';
    const aPrendre = peutPrendreCharge
      && STATUTS_PRISE_SIEGE.includes(commande.statut)
      && lignes.some((row) => reliquatLigne(row) > 0);
    const aDisperser = peutDisperser
      && STATUTS_PRISE_SIEGE.includes(commande.statut)
      && lignes.some((row) => resteDispersionLigne(row) > 0);
    const aRejeter = aTransferer || aPrendre || (peutDisperser && STATUTS_AU_SIEGE.includes(commande.statut) && !String(commande.statut).startsWith('REJETEE'));
    const aBl = commandeDispersee(commande) || commande.statut === 'SATISFAITE_ANTENNE';
    return { aTransferer, aPrendreAntenne, aEnvoyerBrouillon, aPrendre, aDisperser, aRejeter, aBl };
  }

  function basculerAnnee(annee) {
    setAnneesRepliees((prev) => {
      const next = new Set(prev);
      if (next.has(annee)) next.delete(annee);
      else next.add(annee);
      return next;
    });
  }

  function CarteCommande({ commande }) {
    const lignes = commande.lignes || [];
    const suivi = commande.quantites || suiviQuantites(commande);
    const act = actionsCommande(commande);
    return (
      <div className="flex flex-wrap items-start justify-between gap-2 px-3 py-2.5 border border-slate-200 rounded-md bg-white text-xs hover:bg-slate-50/80">
        <div className="min-w-0 space-y-0.5 flex-1">
          <p className="font-bold text-slate-900">{commande.numero_commande}</p>
          <p className="text-slate-700">
            {deLaDirectionGenerale(commande)
              ? `Commande de la Direction générale, passée à l’antenne ${nomAntenneCommande(commande) || 'de réception'}`
              : genereeParAntenne(commande)
                ? `Commande générée par l’antenne ${nomAntenneCommande(commande) || ''}`.trim()
                : `Commande de ${commande.demandeur_nom || 'demandeur'}, passée à l’antenne ${nomAntenneCommande(commande) || 'de réception'}`}
          </p>
          {commande.transferee_au_siege_par_nom && (
            <p className="text-[10px] text-amber-700">
              Transférée à la Direction générale par {commande.transferee_au_siege_par_nom}
              {nomAntenneCommande(commande) ? ` (${nomAntenneCommande(commande)})` : ''}
            </p>
          )}
          <p className="text-[10px] text-slate-500 truncate max-w-xl">
            {lignes.map((row) => `${row.designation} (${row.quantite_demandee})`).join(', ') || '—'}
          </p>
          <p className="text-[10px] text-slate-600">
            Dem. <span className="font-semibold">{suivi.demandee ?? suivi.demande}</span>
            {' · '}Pris <span className="font-semibold text-emerald-800">{suivi.prise ?? suivi.pris}</span>
            {(suivi.pris_antenne > 0 || Number(commande.quantites?.prise_antenne || 0) > 0) && (
              <>
                {' · '}Ant. <span className="font-semibold text-teal-800">{suivi.pris_antenne || commande.quantites?.prise_antenne || 0}</span>
              </>
            )}
            {' · '}Rel. <span className="font-semibold text-violet-800">{suivi.reliquat ?? suivi.archive}</span>
            {(commande.date_livraison_reliquat || commande.date_livraison_prevue) && (suivi.reliquat ?? suivi.archive) > 0 && (
              <span className="text-[10px] text-amber-700"> · livr. reliquat {String(commande.date_livraison_reliquat || commande.date_livraison_prevue).slice(0, 10)}</span>
            )}
            {' · '}Disp. <span className="font-semibold text-emerald-900">{suivi.dispersee ?? 0}</span>
          </p>
          {commandeDispersee(commande) && piecesCommande(commande).length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {piecesCommande(commande).map((piece) => (
                <button
                  key={piece.id}
                  type="button"
                  onClick={async () => {
                    try {
                      if (piece.lignes?.length) {
                        setPiecePdf(piece);
                        return;
                      }
                      const res = await apiRequest(`/flux/documents/${piece.id}`);
                      setPiecePdf(res.piece || piece);
                    } catch {
                      setPiecePdf(piece);
                    }
                  }}
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded border border-emerald-200 bg-emerald-50 text-emerald-900"
                >
                  {piece.type === 'FACTURE' ? <Receipt className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                  {piece.type === 'FACTURE' ? 'Facture' : 'Bon de commande'} {piece.numero}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <PastillesStatut commande={commande} stage={stage} compact />
          <div className="flex flex-wrap justify-end gap-1">
            <BoutonVoir titre="Voir le détail" onClick={() => setLigneOuverte(commande.id)} />
            {demandeEditable(commande) && (
              <BoutonModifier titre="Modifier la demande" onClick={() => ouvrirModification(commande)} />
            )}
            {(demandeEditable(commande) || peutSupprimer) && (
              <BoutonSupprimer titre="Supprimer la demande" onClick={() => supprimerCommande(commande)} />
            )}
            {act.aEnvoyerBrouillon && (
              <button type="button" onClick={() => envoyerBrouillonExistant(commande)} className="px-2 py-1 font-bold rounded bg-[#00A651] text-white">
                Envoyer au chef
              </button>
            )}
            {act.aPrendreAntenne && (
              <button type="button" onClick={() => ouvrirAction('prise_antenne', commande)} className="px-2 py-1 font-bold rounded bg-teal-700 text-white">
                Stock antenne
              </button>
            )}
            {estChefAntenne && STATUTS_A_TRANSFERER.includes(commande.statut) && (
              <label className="inline-flex items-center gap-1 px-1.5 text-[10px] text-slate-600">
                <input
                  type="checkbox"
                  checked={selectionBc.has(commande.id)}
                  onChange={(e) => {
                    setSelectionBc((prev) => {
                      const next = new Set(prev);
                      if (e.target.checked) next.add(commande.id);
                      else next.delete(commande.id);
                      return next;
                    });
                  }}
                />
                BC global
              </label>
            )}
            {act.aTransferer && (
              <button
                type="button"
                disabled={transfertEnCours === commande.id}
                onClick={() => transfererAuSiege(commande)}
                className="px-2 py-1 font-bold rounded bg-amber-600 text-white disabled:opacity-60"
              >
                {transfertEnCours === commande.id ? 'Transfert…' : 'Transférer au siège'}
              </button>
            )}
            {act.aPrendre && (
              <button type="button" onClick={() => ouvrirAction('prise', commande)} className="px-2 py-1 font-bold rounded bg-[#2E68B4] text-white">Prendre en charge</button>
            )}
            {act.aDisperser && (
              <button type="button" onClick={() => ouvrirAction('dispersion', commande)} className="px-2 py-1 font-bold rounded bg-[#0E2A4F] text-white">Disperser</button>
            )}
            {act.aBl && (
              <button type="button" onClick={() => genererBlSigne(commande)} className="px-2 py-1 font-bold rounded border border-slate-400 text-slate-700">
                BL signé
              </button>
            )}
            {act.aRejeter && (
              <button type="button" onClick={() => rejeter(commande)} className="px-2 py-1 font-bold rounded border border-rose-300 text-rose-700">Rejeter</button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-4">
      {error && !modalOuvert && !modalAction && <p className="shrink-0 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded px-3 py-2">{error}</p>}

      <section className="flex-1 min-h-0 flex flex-col bg-white border border-slate-200 rounded-md overflow-hidden">
        <div className="shrink-0 p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black text-slate-900">{titreMenu}</h1>
              <button type="button" onClick={() => setAideOuverte(true)} className="w-6 h-6 rounded-full border border-slate-300 text-[#2E68B4] inline-flex items-center justify-center" title="Explications" aria-label="Explications">
                <Info className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {commandesVisibles.length} affichée{commandesVisibles.length > 1 ? 's' : ''} sur {commandes.length}
              {estDemandeur ? ' — brouillon puis envoi au chef d\'antenne' : ''}
              {estChefAntenne ? ' — organisées par demandeur · stock local · BC global' : ''}
              {(estDirectionGenerale || estSupervision) && estVueSiege ? ' — année, mois, jour, les plus récentes en haut' : ''}
            </p>
            {alertesRupture.length > 0 && estChefAntenne && (
              <p className="mt-1 text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded px-2 py-1 inline-block">
                {alertesRupture.length} alerte{alertesRupture.length > 1 ? 's' : ''} rupture / stock critique
                {dateLivraisonPrevue ? ` · prochaine livraison ${dateLivraisonPrevue}` : ''}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(estVueSiege
              ? [
                ['Commandes', compteurs.total],
                ['En attente', compteurs.en_attente],
                ['Reliquats', compteurs.reliquats],
                ['Satisfaites', compteurs.satisfaites],
              ]
              : [
                ['Commandes', compteurs.total],
                ['À transférer', compteurs.recues],
                ['Transférées', compteurs.transferees ?? compteurs.transmises],
                ['Satisfaites', compteurs.dispersees],
              ]
            ).map(([label, value]) => (
              <div key={label} className="px-2.5 py-1 rounded border border-slate-200 bg-slate-50">
                <p className="text-[10px] uppercase tracking-wide text-slate-500 leading-none">{label}</p>
                {loading ? (
                  <Loader2 className="w-3.5 h-3.5 mt-1 animate-spin text-[#2E68B4]" />
                ) : (
                  <p className="text-sm font-black text-slate-900 leading-tight">{value ?? 0}</p>
                )}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => load()} disabled={loading || rafraichit} className="w-8 h-8 inline-flex items-center justify-center rounded border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-60" title="Actualiser les commandes" aria-label="Actualiser les commandes">
              <RefreshCw className={`w-3.5 h-3.5 ${(loading || rafraichit) ? 'animate-spin' : ''}`} />
            </button>
            {estChefAntenne && selectionBc.size > 0 && (
              <button type="button" onClick={constituerBcGlobal} className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded bg-cyan-700 text-white">
                BC global ({selectionBc.size})
              </button>
            )}
            {peutCommander && (
              <button type="button" onClick={ouvrirDemande} className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded bg-[#0E2A4F] text-white">
                <Plus className="w-3.5 h-3.5" />
                {estDemandeur || estChefAntenne ? 'Nouvelle demande' : 'Nouvelle commande'}
              </button>
            )}
          </div>
        </div>

        {estChefAntenne && ongletFlux === 'commandes' && (
          <div className="shrink-0 px-4 pt-2 flex flex-wrap gap-1">
            {[
              { id: 'demandeurs', label: 'Par demandeur' },
              { id: 'chronologie', label: 'Chronologie' },
              { id: 'bc', label: `BC globaux (${bcGlobaux.length})` },
              { id: 'stock', label: `Stock (${lotsStock.length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setVueChef(tab.id)}
                className={`px-2.5 py-1 rounded text-[11px] font-bold border ${vueChef === tab.id ? 'bg-[#0E2A4F] text-white border-[#0E2A4F]' : 'bg-white text-slate-600 border-slate-200'}`}
              >
                {tab.label}
              </button>
            ))}
            <label className="ml-auto text-[11px] text-slate-600 flex items-center gap-1">
              Prochaine livraison
              <input
                type="date"
                value={dateLivraisonPrevue}
                onChange={(e) => setDateLivraisonPrevue(e.target.value)}
                className="border border-slate-200 rounded px-2 py-0.5 text-[11px]"
              />
            </label>
          </div>
        )}

        <div className="shrink-0 px-4 pt-3 border-b border-slate-100">
          <div className="flex flex-wrap gap-1 p-0.5 rounded-md bg-slate-100 border border-slate-200 w-fit">
            {[
              { id: 'commandes', label: 'Commandes', icon: FileText },
              { id: 'bons', label: 'Bons de commande', icon: FileText },
              { id: 'factures', label: 'Factures', icon: Receipt },
            ].map((tab) => {
              const Icone = tab.icon;
              const actif = ongletFlux === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setOngletFlux(tab.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded ${
                    actif ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  <Icone className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {ongletFlux === 'commandes' && (
          <>
            <div className="shrink-0 px-4 py-3 border-b border-slate-100 flex flex-wrap items-center gap-2">
              <label className="relative flex-1 min-w-[220px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  value={recherche}
                  onChange={(e) => setRecherche(e.target.value)}
                  placeholder="Rechercher un numéro, un demandeur, une pharmacie, un médicament…"
                  className="w-full border border-slate-200 rounded pl-8 pr-2 py-1.5 text-sm"
                />
              </label>
              <div className="flex flex-wrap gap-1.5">
                {FILTRES.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setFiltre(item.id)}
                    className={`px-2.5 py-1 rounded text-[11px] font-bold border ${filtre === item.id ? 'bg-[#0E2A4F] text-white border-[#0E2A4F]' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                  >
                    {item.label} ({loading ? '…' : compteFiltre(item.id)})
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-auto flex flex-col">
              <div className="flex-1 min-h-0 overflow-auto">
                {loading && (
                  <p className="p-6 text-xs text-slate-500 flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Chargement des commandes…
                  </p>
                )}

                {!loading && commandesVisibles.length === 0 && !(estChefAntenne && (vueChef === 'stock' || vueChef === 'bc')) && (
                  <p className="text-xs text-slate-500 text-center py-8">
                    {commandes.length === 0
                      ? (estDemandeur ? 'Aucune demande enregistrée. Utilisez Nouvelle demande pour commander auprès de votre antenne.' : 'Aucune commande pour ce profil.')
                      : 'Aucune commande ne correspond à cette recherche.'}
                  </p>
                )}

                {!loading && estChefAntenne && vueChef === 'demandeurs' && (
                  <div className="p-3 space-y-3">
                    <p className="text-[11px] text-slate-500 px-1">
                      Par demandeur : nom complet et profil visibles, puis commandes tabulées en dessous.
                    </p>
                    {(parDemandeurs.length ? parDemandeurs : []).map((bloc) => (
                      <div key={bloc.demandeur_user_id || bloc.demandeur_nom} className="border border-slate-200 rounded-md bg-white overflow-hidden">
                        <div className="px-3 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-900 leading-snug">{bloc.demandeur_nom || 'Demandeur'}</p>
                            <p className="mt-0.5 text-[11px] text-slate-600">
                              {[bloc.demandeur_role, bloc.partenaire_nom].filter(Boolean).join(' · ') || 'Profil demandeur'}
                            </p>
                          </div>
                          <p className="text-[10px] font-semibold text-amber-800 shrink-0">
                            {bloc.a_transferer} à traiter · {bloc.nb_commandes} demande{bloc.nb_commandes > 1 ? 's' : ''}
                          </p>
                        </div>
                        <div className="ml-3 border-l-2 border-slate-200 pl-3 py-2 space-y-1.5">
                          {(bloc.commandes || [])
                            .filter((c) => commandesVisibles.some((v) => v.id === c.id))
                            .map((commande) => (
                              <CarteCommande key={commande.id} commande={commande} />
                            ))}
                        </div>
                      </div>
                    ))}
                    {!parDemandeurs.length && (
                      <p className="text-xs text-slate-500 text-center py-6">Aucune demande regroupée pour l’instant.</p>
                    )}
                  </div>
                )}

                {!loading && estChefAntenne && vueChef === 'bc' && (
                  <div className="p-3 space-y-3">
                    <p className="text-[11px] text-slate-500 px-1">
                      BC global antenne : détail demandeurs visible ici. Au transfert siège, seul l’agrégat produit est envoyé.
                    </p>
                    {bcGlobaux.map((bc) => (
                      <div key={bc.id} className="border border-slate-200 rounded-md bg-white p-3 space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-bold font-mono text-slate-900">{bc.numero}</p>
                            <p className="text-[11px] text-slate-500">
                              {bc.nb_demandes} demandes · {bc.nb_demandeurs} demandeurs · {bc.quantite_totale} u. · {Number(bc.montant_total_xaf || 0).toLocaleString('fr-FR')} XAF
                            </p>
                            <p className="text-[10px] text-slate-500">Statut {bc.statut}{bc.date_livraison_prevue ? ` · livraison prévue ${bc.date_livraison_prevue}` : ''}</p>
                          </div>
                          {bc.statut !== 'TRANSFERE_SIEGE' && (
                            <button type="button" onClick={() => transfererBcGlobal(bc)} className="px-2.5 py-1.5 text-[11px] font-bold rounded bg-amber-600 text-white">
                              Transférer au siège
                            </button>
                          )}
                        </div>
                        <ul className="text-[11px] space-y-1 border-t border-slate-100 pt-2">
                          {(bc.lignes || []).map((l) => (
                            <li key={l.id} className="flex flex-col gap-0.5">
                              <span className="font-semibold text-slate-800">{l.designation} × {l.quantite}</span>
                              {(l.details_demandeurs || []).length > 0 && (
                                <span className="text-[10px] text-slate-500 pl-2">
                                  {(l.details_demandeurs || []).map((d) => `${d.demandeur_nom} (${d.quantite})`).join(' · ')}
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                    {!bcGlobaux.length && (
                      <p className="text-xs text-slate-500 text-center py-6">Aucun BC global. Cochez des demandes puis « BC global ».</p>
                    )}
                  </div>
                )}

                {!loading && estChefAntenne && vueChef === 'stock' && (
                  <div className="p-3 space-y-3">
                    <p className="text-[11px] text-slate-500 px-1">
                      Gestion du stock antenne (lots FEFO). En cas de reliquat sur une demande, renseignez la date de livraison prévue.
                    </p>
                    <form
                      className="border border-slate-200 rounded-md bg-white p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 items-end"
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (!entreeStock.produit_id || !Number(entreeStock.quantite)) {
                          setError('Choisissez un produit et une quantité.');
                          return;
                        }
                        setSavingStock(true);
                        setError('');
                        try {
                          await apiRequest('/flux/stock-antenne/entree', {
                            method: 'POST',
                            body: JSON.stringify({
                              produit_id: Number(entreeStock.produit_id),
                              quantite: Number(entreeStock.quantite),
                              numero_lot: entreeStock.numero_lot || undefined,
                              date_peremption: entreeStock.date_peremption || undefined,
                            }),
                          });
                          pushToast('Entrée de stock enregistrée.');
                          setEntreeStock({ produit_id: '', quantite: '', numero_lot: '', date_peremption: '' });
                          await load();
                        } catch (err) {
                          setError(err?.message || 'Entrée stock impossible.');
                        } finally {
                          setSavingStock(false);
                        }
                      }}
                    >
                      <label className="text-[11px] text-slate-600 lg:col-span-2">
                        Produit
                        <select
                          value={entreeStock.produit_id}
                          onChange={(e) => setEntreeStock((p) => ({ ...p, produit_id: e.target.value }))}
                          className="mt-1 w-full border border-slate-200 rounded px-2 py-1.5 text-xs"
                        >
                          <option value="">Choisir…</option>
                          {(produits || []).slice(0, 200).map((p) => (
                            <option key={p.id} value={p.id}>{p.designation || p.nom}</option>
                          ))}
                        </select>
                      </label>
                      <label className="text-[11px] text-slate-600">
                        Quantité
                        <input type="number" min="1" value={entreeStock.quantite} onChange={(e) => setEntreeStock((p) => ({ ...p, quantite: e.target.value }))} className="mt-1 w-full border border-slate-200 rounded px-2 py-1.5 text-xs" />
                      </label>
                      <label className="text-[11px] text-slate-600">
                        N° lot
                        <input value={entreeStock.numero_lot} onChange={(e) => setEntreeStock((p) => ({ ...p, numero_lot: e.target.value }))} className="mt-1 w-full border border-slate-200 rounded px-2 py-1.5 text-xs" placeholder="Optionnel" />
                      </label>
                      <button type="submit" disabled={savingStock} className="px-3 py-2 text-xs font-bold rounded bg-teal-700 text-white disabled:opacity-60">
                        {savingStock ? 'Enregistrement…' : '+ Entrée stock'}
                      </button>
                    </form>
                    <div className="overflow-x-auto border border-slate-200 rounded-md bg-white">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                          <tr>
                            <th className="px-2 py-1.5">Produit</th>
                            <th className="px-2 py-1.5">Lot</th>
                            <th className="px-2 py-1.5">Péremption</th>
                            <th className="px-2 py-1.5">Dispo</th>
                            <th className="px-2 py-1.5">Ajuster</th>
                          </tr>
                        </thead>
                        <tbody>
                          {lotsStock.map((lot) => (
                            <tr key={lot.id} className={`border-t border-slate-100 ${lot.rupture ? 'bg-rose-50' : lot.critique ? 'bg-amber-50' : ''}`}>
                              <td className="px-2 py-1.5 font-semibold text-slate-800">{lot.designation}</td>
                              <td className="px-2 py-1.5 font-mono text-[10px]">{lot.numero_lot}</td>
                              <td className="px-2 py-1.5">{lot.date_peremption ? String(lot.date_peremption).slice(0, 10) : '—'}</td>
                              <td className="px-2 py-1.5 font-bold">{lot.quantite_disponible}</td>
                              <td className="px-2 py-1.5">
                                <input
                                  type="number"
                                  min="0"
                                  defaultValue={lot.quantite_disponible}
                                  className="w-20 border border-slate-200 rounded px-1.5 py-0.5 text-xs"
                                  onBlur={async (e) => {
                                    const qte = Number(e.target.value);
                                    if (Number.isNaN(qte) || qte === Number(lot.quantite_disponible)) return;
                                    try {
                                      await apiRequest(`/flux/stock-antenne/${lot.id}`, {
                                        method: 'PUT',
                                        body: JSON.stringify({ quantite_disponible: qte, motif: 'Ajustement inventaire' }),
                                      });
                                      pushToast(`Lot ${lot.numero_lot} ajusté à ${qte}.`);
                                      await load();
                                    } catch (err) {
                                      setError(err?.message || 'Ajustement impossible.');
                                    }
                                  }}
                                />
                              </td>
                            </tr>
                          ))}
                          {!lotsStock.length && (
                            <tr>
                              <td colSpan={5} className="px-2 py-6 text-center text-slate-500">Aucun lot en stock. Ajoutez une entrée ci-dessus.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {!loading && hierarchiePage.length > 0 && (!estChefAntenne || vueChef === 'chronologie') && (
                  <div className="p-3 space-y-3">
                    <p className="text-[11px] text-slate-500 px-1">
                      Classement année → mois → jour → demandeur (nom + profil), puis commandes tabulées. Seul le bandeau année se plie / déplie.
                    </p>
                    {hierarchiePage.map((anneeBloc) => {
                      const ouverte = !anneesRepliees.has(anneeBloc.annee);
                      return (
                        <div key={anneeBloc.annee} className="border border-slate-200 rounded-md overflow-hidden bg-white">
                          <button
                            type="button"
                            onClick={() => basculerAnnee(anneeBloc.annee)}
                            className="w-full flex items-center justify-between gap-2 px-3 py-2.5 bg-[#0E2A4F] text-white text-left"
                          >
                            <span className="inline-flex items-center gap-2">
                              {ouverte ? <ChevronDown className="w-4 h-4 opacity-80" /> : <ChevronRight className="w-4 h-4 opacity-80" />}
                              <span className="text-sm font-black tracking-wide">{anneeBloc.annee}</span>
                            </span>
                            <span className="text-[11px] font-semibold">{anneeBloc.nb_commandes} commande{anneeBloc.nb_commandes > 1 ? 's' : ''}</span>
                          </button>
                          {ouverte && (
                            <div className="ml-4 border-l-2 border-slate-300 pl-3 py-3 space-y-4 bg-slate-50/30">
                              {(anneeBloc.mois || []).map((moisBloc) => (
                                <div key={moisBloc.mois} className="space-y-2">
                                  <p className="text-xs font-bold text-slate-800">
                                    {moisBloc.libelle} {anneeBloc.annee}
                                    <span className="ml-2 font-semibold text-slate-500">— {moisBloc.nb_commandes} commande{moisBloc.nb_commandes > 1 ? 's' : ''}</span>
                                  </p>
                                  <div className="ml-3 border-l-2 border-slate-200 pl-3 space-y-3">
                                    {(moisBloc.jours || []).map((jourBloc) => (
                                      <div key={jourBloc.jour} className="space-y-2">
                                        <p className={`text-[11px] font-bold ${jourBloc.estAujourdhui ? 'text-[#0E2A4F]' : 'text-slate-700'}`}>
                                          {jourBloc.libelle}
                                          {jourBloc.estAujourdhui && (
                                            <span className="ml-2 inline-flex items-center rounded bg-[#0E2A4F] px-1.5 py-0.5 text-[10px] font-bold text-white">Aujourd&apos;hui</span>
                                          )}
                                          <span className="ml-2 font-semibold text-slate-500">— {jourBloc.nb_commandes} commande{jourBloc.nb_commandes > 1 ? 's' : ''}</span>
                                        </p>
                                        <div className="ml-3 border-l-2 border-blue-200 pl-3 space-y-3">
                                          {(jourBloc.demandeurs || []).map((demandeur) => {
                                            const parDg = demandeur.type === 'direction_generale';
                                            const parAntenne = demandeur.type === 'antenne';
                                            const profilLigne = [
                                              demandeur.profil,
                                              demandeur.partenaire_nom,
                                              demandeur.antenne_nom
                                                ? `passée à l’antenne ${demandeur.antenne_nom}${demandeur.antenne_chef_lieu ? ` — ${demandeur.antenne_chef_lieu}` : ''}`
                                                : null,
                                            ].filter(Boolean).join(' · ');
                                            return (
                                              <div key={demandeur.cle} className="space-y-1.5">
                                                <div className="rounded-md bg-white border border-slate-200 px-3 py-2">
                                                  <p className={`text-sm font-bold leading-snug ${parDg ? 'text-[#0E2A4F]' : parAntenne ? 'text-indigo-900' : 'text-slate-900'}`}>
                                                    {demandeur.nom_complet}
                                                    <span className="ml-2 text-[11px] font-semibold text-slate-500">— {demandeur.nb_commandes}</span>
                                                  </p>
                                                  {profilLigne && (
                                                    <p className="mt-0.5 text-[11px] text-slate-600">{profilLigne}</p>
                                                  )}
                                                </div>
                                                <div className="ml-4 border-l-2 border-slate-200 pl-3 space-y-1.5">
                                                  {(demandeur.commandes || []).map((commande) => (
                                                    <CarteCommande key={commande.id} commande={commande} />
                                                  ))}
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {!loading && commandesVisibles.length > 0 && (
                <div className="shrink-0 px-4 py-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 bg-white">
                  <label className="flex items-center gap-2">
                    Afficher
                    <select value={taillePage} onChange={(evenement) => setTaillePage(Number(evenement.target.value))} className="border border-slate-200 rounded px-2 py-1">
                      {TAILLES_PAGE.map((taille) => <option key={taille} value={taille}>{taille}</option>)}
                    </select>
                    <span className="text-slate-400">sur {commandesVisibles.length}</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <button type="button" disabled={pageAffichee <= 1} onClick={() => setPageCourante(pageAffichee - 1)} className="px-2 py-1 rounded border border-slate-200 disabled:opacity-40">Précédent</button>
                    <span>Page {pageAffichee} / {nombrePages}</span>
                    <button type="button" disabled={pageAffichee >= nombrePages} onClick={() => setPageCourante(pageAffichee + 1)} className="px-2 py-1 rounded border border-slate-200 disabled:opacity-40">Suivant</button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {ongletFlux === 'bons' && (
          <FluxDocumentsPanel key={`bons-${docsRefreshKey}`} stage={stage} typeForce="BON_COMMANDE" embed />
        )}
        {ongletFlux === 'factures' && (
          <FluxDocumentsPanel key={`fac-${docsRefreshKey}`} stage={stage} typeForce="FACTURE" embed />
        )}
      </section>

      {commandeDetail && (
        <div className="fixed inset-0 z-[85] bg-slate-900/50 flex items-center justify-center p-4" onMouseDown={() => setLigneOuverte(null)}>
          <div onMouseDown={(evenement) => evenement.stopPropagation()} className="w-full max-w-3xl bg-white border border-slate-200 rounded-md p-4 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Détail — {commandeDetail.numero_commande}</h2>
                <p className="mt-1 flex flex-wrap items-center gap-2">
                  <PastillesStatut commande={commandeDetail} stage={stage} compact />
                  <span className="text-[11px] text-slate-600">
                    {suiviQuantites(commandeDetail).pris} pris en charge · {suiviQuantites(commandeDetail).archive} archivé{suiviQuantites(commandeDetail).archive > 1 ? 's' : ''}, en attente du prochain arrivage
                  </span>
                </p>
              </div>
              <button type="button" onClick={() => setLigneOuverte(null)} className="p-1 rounded text-slate-500 hover:bg-slate-100" aria-label="Fermer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <ChampDetail libelle="N° demande" valeur={commandeDetail.numero_commande} />
              <ChampDetail
                libelle="Origine"
                valeur={deLaDirectionGenerale(commandeDetail)
                  ? 'Commande de la Direction générale'
                  : genereeParAntenne(commandeDetail)
                    ? 'Commande générée par l’antenne'
                    : `Commande de ${commandeDetail.demandeur_nom || 'demandeur'}`}
              />
              <ChampDetail libelle="Passée par" valeur={commandeDetail.demandeur_nom} />
              <ChampDetail libelle="Fonction" valeur={commandeDetail.demandeur_role} />
              <ChampDetail libelle="Partenaire / structure" valeur={commandeDetail.partenaire_nom} />
              <ChampDetail libelle="Antenne de réception" valeur={[commandeDetail.antenne?.nom, commandeDetail.antenne?.chef_lieu].filter(Boolean).join(' — ')} />
              <ChampDetail libelle="Montant" valeur={formaterMontant(commandeDetail.montant_total_xaf)} />
              <ChampDetail libelle="Enregistrée le" valeur={formaterDate(commandeDetail.created_at)} />
              <ChampDetail
                libelle="Transférée à la Direction générale"
                valeur={commandeDetail.transferee_au_siege_at
                  ? `${formaterDate(commandeDetail.transferee_au_siege_at)}${commandeDetail.transferee_au_siege_par_nom ? ` par ${commandeDetail.transferee_au_siege_par_nom}` : ''}${commandeDetail.antenne?.nom ? ` (${commandeDetail.antenne.nom})` : ''}`
                  : ''}
              />
              <ChampDetail
                libelle="Prise en charge siège"
                valeur={commandeDetail.prise_en_charge_siege_at
                  ? `${formaterDate(commandeDetail.prise_en_charge_siege_at)}${commandeDetail.prise_en_charge_siege_par_nom ? ` par ${commandeDetail.prise_en_charge_siege_par_nom}` : ''}`
                  : ''}
              />
              <ChampDetail libelle="Dispersée le" valeur={commandeDetail.dispersee_at ? `${formaterDate(commandeDetail.dispersee_at)}${commandeDetail.dispersee_par_nom ? ` par ${commandeDetail.dispersee_par_nom}` : ''}` : ''} />
              <ChampDetail
                libelle="Quantités"
                valeur={`Demandée ${commandeDetail.quantites?.demandee ?? suiviQuantites(commandeDetail).demande} · Prise ${commandeDetail.quantites?.prise ?? suiviQuantites(commandeDetail).pris} · Reliquat ${commandeDetail.quantites?.reliquat ?? suiviQuantites(commandeDetail).archive} · Dispersée ${commandeDetail.quantites?.dispersee ?? 0}`}
                large
              />
              <ChampDetail libelle="Motif" valeur={commandeDetail.motif} large />
              <ChampDetail libelle="Note de dispersion" valeur={commandeDetail.note_dispersion} large />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">Médicaments</p>
              <div className="overflow-x-auto border border-slate-200 rounded">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-2 py-1.5 font-bold">Désignation</th>
                      <th className="px-2 py-1.5 font-bold">Demandé</th>
                      <th className="px-2 py-1.5 font-bold">Pris en charge</th>
                      <th className="px-2 py-1.5 font-bold">Archivé</th>
                      <th className="px-2 py-1.5 font-bold">Dispersé</th>
                      <th className="px-2 py-1.5 font-bold">Prix</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(commandeDetail.lignes || []).map((row) => (
                      <tr key={row.id} className="border-t border-slate-100">
                        <td className="px-2 py-1.5 font-semibold text-slate-800">{row.designation}</td>
                        <td className="px-2 py-1.5">{row.quantite_demandee}</td>
                        <td className="px-2 py-1.5">{row.quantite_prise_en_charge || 0}</td>
                        <td className="px-2 py-1.5">{reliquatLigne(row)}</td>
                        <td className="px-2 py-1.5">{row.quantite_dispersee || 0}</td>
                        <td className="px-2 py-1.5 whitespace-nowrap">{formaterMontant(row.prix_unitaire_xaf)}</td>
                      </tr>
                    ))}
                    {(commandeDetail.lignes || []).length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-2 py-3 text-center text-slate-500">Aucun médicament</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            {((commandeDetail.pieces || commandeDetail.bons_commande || commandeDetail.factures || []).length > 0) && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">Bons de commande &amp; factures</p>
                <div className="flex flex-wrap gap-2">
                  {(commandeDetail.pieces || [
                    ...(commandeDetail.bons_commande || []),
                    ...(commandeDetail.factures || []),
                  ]).map((piece) => (
                    <button
                      key={piece.id}
                      type="button"
                      onClick={async () => {
                        try {
                          if (piece.lignes?.length) {
                            setPiecePdf(piece);
                            return;
                          }
                          const res = await apiRequest(`/flux/documents/${piece.id}`);
                          setPiecePdf(res.piece || piece);
                        } catch {
                          setPiecePdf(piece);
                        }
                      }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold rounded border border-slate-200 hover:bg-slate-50 text-slate-800"
                    >
                      {piece.type === 'FACTURE'
                        ? <Receipt className="w-3.5 h-3.5 text-slate-500" />
                        : <FileText className="w-3.5 h-3.5 text-slate-500" />}
                      <span className="font-mono">{piece.numero}</span>
                      <span className="text-slate-500">· pris {piece.quantite_prise_totale} · reliquat {piece.quantite_reliquat_totale}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {commandeDetail.journal?.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">Journal</p>
                <ol className="border-l border-slate-200 pl-3 space-y-1.5">
                  {commandeDetail.journal.map((evt) => (
                    <li key={evt.id} className="text-[11px] text-slate-600">
                      <span className="font-semibold text-slate-800">{ACTIONS[evt.action] || evt.action}</span>
                      {' '}par {evt.auteur_nom}
                      {evt.created_at ? ` · ${formaterDate(evt.created_at)}` : ''}
                      {evt.detail ? ` — ${evt.detail}` : ''}
                    </li>
                  ))}
                </ol>
              </div>
            )}
            <div className="flex flex-wrap justify-end gap-2">
              {demandeEditable(commandeDetail) && (
                <>
                  <BoutonModifier titre="Modifier la demande" onClick={() => { setLigneOuverte(null); ouvrirModification(commandeDetail); }} />
                  <BoutonSupprimer titre="Supprimer la demande" onClick={() => supprimerCommande(commandeDetail)} />
                </>
              )}
              {actionsCommande(commandeDetail).aTransferer && (
                <button
                  type="button"
                  disabled={transfertEnCours === commandeDetail.id}
                  onClick={() => { setLigneOuverte(null); transfererAuSiege(commandeDetail); }}
                  className="px-3 py-2 text-xs font-bold rounded bg-amber-600 text-white disabled:opacity-60"
                >
                  {transfertEnCours === commandeDetail.id ? 'Transfert…' : 'Transférer au siège'}
                </button>
              )}
              {actionsCommande(commandeDetail).aPrendre && (
                <button type="button" onClick={() => { setLigneOuverte(null); ouvrirAction('prise', commandeDetail); }} className="px-3 py-2 text-xs font-bold rounded bg-[#2E68B4] text-white">Prendre en charge</button>
              )}
              {actionsCommande(commandeDetail).aDisperser && (
                <button type="button" onClick={() => { setLigneOuverte(null); ouvrirAction('dispersion', commandeDetail); }} className="px-3 py-2 text-xs font-bold rounded bg-[#0E2A4F] text-white">Disperser</button>
              )}
              {actionsCommande(commandeDetail).aRejeter && (
                <button type="button" onClick={() => { setLigneOuverte(null); rejeter(commandeDetail); }} className="px-3 py-2 text-xs font-bold rounded border border-rose-300 text-rose-700">Rejeter</button>
              )}
              <button type="button" onClick={() => setLigneOuverte(null)} className="px-3 py-2 text-xs font-bold rounded border border-slate-300 text-slate-700">Fermer</button>
            </div>
          </div>
        </div>
      )}

      {aideOuverte && (
        <div className="fixed inset-0 z-[80] bg-slate-900/50 flex items-center justify-center p-4" onMouseDown={() => setAideOuverte(false)}>
          <div onMouseDown={(evenement) => evenement.stopPropagation()} className="w-full max-w-xl bg-white border border-slate-200 rounded-md p-4 shadow-xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-bold text-slate-900">Explications — chaîne &amp; statuts</h2>
              <button type="button" onClick={() => setAideOuverte(false)} className="p-1 rounded text-slate-500 hover:bg-slate-100" aria-label="Fermer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-slate-600">
              L&apos;OPN achète les médicaments. Chaque antenne reçoit les commandes de ses pharmacies, les transfère au siège, puis le siège prend en charge et disperse.
            </p>
            <p className="text-xs text-slate-500">Droits sur cette page : {libelleDroits(activePersona, 'flux')}.</p>

            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-2">Déroulement</h3>
              <ul className="space-y-2">
                {STEPS.map((etape) => (
                  <li key={etape.id} className="text-xs text-slate-700">
                    <span className="font-bold text-slate-900">{etape.titre}. </span>
                    {etape.texte}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-2">
                Filtres de statut {estVueSiege ? '(siège)' : '(antenne / demandeur)'}
              </h3>
              <ul className="space-y-2.5">
                {(estVueSiege ? EXPLICATIONS_FILTRES_SIEGE : EXPLICATIONS_FILTRES_ANTENNE).map((item) => (
                  <li key={item.id} className="rounded border border-slate-200 bg-slate-50 px-3 py-2">
                    <p className="text-xs font-bold text-slate-900">{item.titre}</p>
                    <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">{item.texte}</p>
                  </li>
                ))}
              </ul>
            </div>

            {estVueSiege && (
              <div>
                <h3 className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-2">Pastilles sur une commande</h3>
                <ul className="space-y-1.5 text-[11px] text-slate-600">
                  <li><span className="font-semibold text-slate-800">Commande générée / envoyée à l&apos;antenne</span> — origine de la demande.</li>
                  <li><span className="font-semibold text-slate-800">Commande transférée par l&apos;antenne</span> — arrivée au siège, en attente de prise en charge.</li>
                  <li><span className="font-semibold text-slate-800">Prise en charge au siège</span> — quantités engagées (totale ou partielle).</li>
                  <li><span className="font-semibold text-slate-800">Reliquat / partiellement archivée</span> — solde à traiter plus tard.</li>
                  <li><span className="font-semibold text-slate-800">Dispersée</span> — quantités envoyées ; commande satisfaite si tout est dispersé.</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {modalAction && (
        <div className="fixed inset-0 z-[85] bg-slate-900/50 flex items-center justify-center p-4" onMouseDown={() => !savingAction && setModalAction(null)}>
          <div onMouseDown={(e) => e.stopPropagation()} className="w-full max-w-2xl bg-white border border-slate-200 rounded-md p-4 space-y-3 max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  {modalAction.type === 'prise_antenne'
                    ? 'Prise stock antenne'
                    : (modalAction.type === 'prise' ? 'Prise en charge siège' : 'Dispersion')}
                  {' — '}{modalAction.commande.numero_commande}
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {modalAction.type === 'prise_antenne'
                    ? 'Servez depuis le stock de votre antenne. Le reliquat pourra entrer dans le BC global vers le siège.'
                    : (modalAction.type === 'prise'
                      ? 'Indiquez la quantité à engager maintenant. Le reste est archivé et pourra être pris en charge au prochain arrivage.'
                      : 'Dispersez tout ou une partie des quantités déjà prises en charge. Un bon de livraison signé sera proposé ensuite.')}
                </p>
              </div>
              <button type="button" disabled={savingAction} onClick={() => setModalAction(null)} className="p-1 rounded text-slate-500 hover:bg-slate-100" aria-label="Fermer">
                <X className="w-4 h-4" />
              </button>
            </div>
            {error && <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded px-3 py-2">{error}</p>}
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={toutPrendreAction} className="px-2.5 py-1 text-[11px] font-bold rounded border border-[#2E68B4] text-[#2E68B4]">
                Tout sélectionner
              </button>
              <button type="button" onClick={toutZeroAction} className="px-2.5 py-1 text-[11px] font-bold rounded border border-slate-300 text-slate-600">
                Tout à zéro
              </button>
            </div>
            <ul className="border border-slate-200 rounded divide-y divide-slate-100">
              {(modalAction.commande.lignes || []).map((row) => {
                const max = maxActionLigne(modalAction.type, row);
                const disabled = max <= 0;
                return (
                  <li key={row.id} className={`flex flex-wrap items-center gap-3 px-3 py-2.5 ${disabled ? 'bg-slate-50 opacity-70' : ''}`}>
                    <div className="flex-1 min-w-[180px]">
                      <p className="text-xs font-semibold text-slate-800">{row.designation}</p>
                      <p className="text-[10px] text-slate-500">
                        Demandé {row.quantite_demandee}
                        {' · '}antenne {row.quantite_prise_antenne || 0}
                        {' · '}siège {row.quantite_prise_en_charge || 0}
                        {' · '}reliquat {reliquatLigne(row)}
                        {' · '}dispersé {row.quantite_dispersee || 0}
                        {disabled ? ' — rien à traiter' : ` — max cette vague : ${max}`}
                      </p>
                    </div>
                    <label className="flex items-center gap-1.5 shrink-0 text-[10px] text-slate-500">
                      Qté maintenant
                      <input
                        type="number"
                        min="0"
                        max={max}
                        disabled={disabled || savingAction}
                        value={quantitesAction[row.id] ?? 0}
                        onChange={(e) => majQuantiteAction(row.id, max, e.target.value)}
                        className="w-20 border border-slate-200 rounded px-2 py-1 text-xs text-center bg-white disabled:bg-slate-100"
                      />
                    </label>
                  </li>
                );
              })}
            </ul>
            {(modalAction.type === 'prise_antenne' || modalAction.type === 'prise') && (
              <label className="block text-xs text-slate-600">
                Date de livraison du reliquat
                <input
                  type="date"
                  value={dateLivraisonReliquatAction}
                  onChange={(e) => setDateLivraisonReliquatAction(e.target.value)}
                  disabled={savingAction}
                  className="mt-1 w-full border border-slate-200 rounded px-2 py-1.5 text-sm"
                />
                <span className="mt-1 block text-[10px] text-slate-400">
                  Obligatoire si le stock ne couvre pas toute la demande (reliquat).
                </span>
              </label>
            )}
            <label className="block text-xs text-slate-600">
              Note (optionnel)
              <input
                value={noteAction}
                onChange={(e) => setNoteAction(e.target.value)}
                disabled={savingAction}
                placeholder={modalAction.type === 'prise' ? 'Ex. stock partiel, reste à l\'arrivage prévu' : 'Ex. dispersion selon stock Owendo'}
                className="mt-1 w-full border border-slate-200 rounded px-2 py-1.5 text-sm"
              />
            </label>
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" disabled={savingAction} onClick={() => setModalAction(null)} className="px-3 py-2 text-xs font-bold rounded border border-slate-300 text-slate-700">Annuler</button>
              <button type="button" disabled={savingAction} onClick={confirmerAction} className="px-3 py-2 text-xs font-bold rounded bg-[#0E2A4F] text-white">
                {savingAction
                  ? 'Enregistrement…'
                  : (modalAction.type === 'prise_antenne'
                    ? 'Confirmer (stock antenne)'
                    : (modalAction.type === 'prise' ? 'Confirmer la prise en charge' : 'Confirmer la dispersion'))}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalOuvert && (
        <div className="fixed inset-0 z-[80] bg-slate-900/50 flex items-center justify-center p-4" onMouseDown={fermerDemande}>
          <form onSubmit={envoyerCommande} onMouseDown={(e) => e.stopPropagation()} className="w-full max-w-2xl bg-white border border-slate-200 rounded-md p-4 space-y-3 max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-bold text-slate-900">
                {commandeEdition
                  ? `Modifier ${commandeEdition.numero_commande}`
                  : (estDirectionGenerale ? 'Nouvelle commande — Direction générale' : (estChefAntenne ? 'Nouvelle demande (chef d\'antenne)' : (estDemandeur ? 'Nouvelle demande' : 'Nouvelle commande')))}
              </h2>
              <button type="button" onClick={fermerDemande} className="p-1 rounded text-slate-500 hover:bg-slate-100" aria-label="Fermer">
                <X className="w-4 h-4" />
              </button>
            </div>
            {estDirectionGenerale && (
              <p className="text-[11px] text-[#0E2A4F] bg-slate-50 border border-slate-200 rounded px-3 py-2">
                Cette commande est celle de la Direction générale. Choisissez l’antenne de réception : elle la verra, puis la transférera au siège.
              </p>
            )}
            {estChefAntenne && (
              <p className="text-[11px] text-indigo-800 bg-indigo-50 border border-indigo-100 rounded px-3 py-2">
                Ce bon est enregistré à votre nom et transféré tout de suite à la Direction générale. Les demandes des pharmacies de votre antenne restent à transférer par vous.
              </p>
            )}
            {error && <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded px-3 py-2">{error}</p>}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="text-xs text-slate-600">
                Qui commande
                <input value={activePersona?.nom || activePersona?.name || ''} readOnly className="mt-1 w-full border border-slate-200 rounded px-2 py-1.5 text-sm bg-slate-50" />
              </label>
              <label className="text-xs text-slate-600">
                {estDirectionGenerale ? 'Origine' : (estChefAntenne ? 'Demande au nom de' : (estDemandeur ? 'Structure' : 'Pharmacie ou partenaire'))}
                <input
                  value={estDirectionGenerale ? 'Direction générale' : (estChefAntenne ? nomChef : partenaire)}
                  onChange={(e) => setPartenaire(e.target.value)}
                  readOnly={estDirectionGenerale || estDemandeur || estChefAntenne || antenneVerrouillee}
                  className={`mt-1 w-full border border-slate-200 rounded px-2 py-1.5 text-sm ${(estDirectionGenerale || estDemandeur || estChefAntenne || antenneVerrouillee) ? 'bg-slate-50' : ''}`}
                  required
                  placeholder="Nom de la pharmacie"
                />
              </label>
              <label className="text-xs text-slate-600 md:col-span-2">
                {estDirectionGenerale ? 'Antenne de réception' : 'Antenne'}
                {antenneVerrouillee ? (
                  <input value={libelleAntenneDefaut || (antenneChoisie ? `${antenneChoisie.nom} — ${antenneChoisie.chef_lieu}` : '')} readOnly className="mt-1 w-full border border-slate-200 rounded px-2 py-1.5 text-sm bg-slate-50" />
                ) : (
                  <ListeDeroulante
                    valeur={antenneId}
                    surChangement={setAntenneId}
                    texteVide="Choisir une antenne"
                    options={antennes.map((a) => ({ value: a.id, label: `${a.nom} — ${a.chef_lieu}` }))}
                  />
                )}
              </label>
            </div>
            <label className="text-xs text-slate-600 block">
              Motif
              <input value={motif} onChange={(e) => setMotif(e.target.value)} className="mt-1 w-full border border-slate-200 rounded px-2 py-1.5 text-sm" />
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="text-xs text-slate-600">
                Catégorie (vitrine produits)
                <select
                  value={filtreCategorie}
                  onChange={(e) => setFiltreCategorie(e.target.value)}
                  className="mt-1 w-full border border-slate-200 rounded px-2 py-1.5 text-sm bg-white"
                >
                  <option value="">Toutes les catégories</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs text-slate-600">
                Kit médical
                <select
                  value={kitMedical}
                  onChange={(e) => setKitMedical(e.target.value)}
                  className="mt-1 w-full border border-slate-200 rounded px-2 py-1.5 text-sm bg-white"
                >
                  {kits.map((kit) => (
                    <option key={kit} value={kit}>{kit}</option>
                  ))}
                </select>
              </label>
            </div>
            {/* ── Sélection multi-médicaments ── */}
            {(() => {
              const termeMed = rechercheMed.trim().toLowerCase();
              const produitsFiltres = produits.filter((p) => {
                const okTexte = !termeMed || (p.designation || '').toLowerCase().includes(termeMed)
                  || (p.categorie || '').toLowerCase().includes(termeMed);
                const okCat = !filtreCategorie
                  || (p.categorie || '').toLowerCase() === filtreCategorie.toLowerCase()
                  || (p.famille || '').toLowerCase() === filtreCategorie.toLowerCase();
                return okTexte && okCat;
              });
              const nbSelectionnes = Object.keys(selections).length;
              return (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-slate-600 font-semibold">
                      Médicaments
                      {nbSelectionnes > 0 && (
                        <span className="ml-2 px-1.5 py-0.5 rounded bg-[#2E68B4] text-white text-[10px] font-bold">
                          {nbSelectionnes} sélectionné{nbSelectionnes > 1 ? 's' : ''}
                        </span>
                      )}
                    </p>
                    {nbSelectionnes > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelections({})}
                        className="text-[10px] text-rose-600 hover:underline"
                      >
                        Tout déselectionner
                      </button>
                    )}
                  </div>
                  {/* Barre de recherche */}
                  <label className="relative block">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      value={rechercheMed}
                      onChange={(e) => setRechercheMed(e.target.value)}
                      placeholder="Rechercher un médicament…"
                      className="w-full border border-slate-200 rounded pl-8 pr-2 py-1.5 text-sm"
                    />
                  </label>
                  {/* Liste scrollable */}
                  <div className="border border-slate-200 rounded overflow-y-auto" style={{ maxHeight: 240 }}>
                    {produitsFiltres.length === 0 && (
                      <p className="px-3 py-4 text-center text-xs text-slate-500">Aucun médicament trouvé.</p>
                    )}
                    {produitsFiltres.map((p) => {
                      const estCoche = selections[p.id] !== undefined;
                      return (
                        <label
                          key={p.id}
                          className={`flex items-center gap-2 px-3 py-2 cursor-pointer border-b border-slate-100 last:border-0 hover:bg-blue-50/60 transition-colors ${estCoche ? 'bg-blue-50' : ''}`}
                        >
                          <input
                            type="checkbox"
                            checked={estCoche}
                            onChange={() => toggleSelection(p.id)}
                            className="w-4 h-4 rounded accent-[#2E68B4] shrink-0"
                          />
                          <span className={`flex-1 text-xs truncate ${estCoche ? 'font-semibold text-[#2E68B4]' : 'text-slate-800'}`}>
                            {p.designation}
                          </span>
                          {estCoche && (
                            <label className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                              <span className="text-[10px] text-slate-500 whitespace-nowrap">Qté</span>
                              <input
                                type="number"
                                min="1"
                                value={selections[p.id]}
                                onChange={(e) => majQuantite(p.id, e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                className="w-16 border border-[#2E68B4] rounded px-1.5 py-0.5 text-xs text-center bg-white"
                              />
                            </label>
                          )}
                        </label>
                      );
                    })}
                  </div>
                  {/* Récapitulatif des sélectionnés */}
                  {nbSelectionnes > 0 && (
                    <ul className="text-[11px] text-slate-600 space-y-0.5 pt-1 pl-1">
                      {Object.entries(selections).map(([pid, qte]) => {
                        const p = produits.find((prod) => String(prod.id) === String(pid));
                        return (
                          <li key={pid} className="flex items-center gap-1">
                            <span className="text-[#2E68B4]">✓</span>
                            <span className="truncate">{p?.designation || pid}</span>
                            <span className="ml-auto shrink-0 font-semibold">× {qte}</span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            })()}
            <div className="flex flex-wrap justify-end gap-2 pt-1">
              <button type="button" onClick={fermerDemande} className="px-3 py-2 text-xs font-bold rounded border border-slate-300 text-slate-700">Annuler</button>
              {estDemandeur && !commandeEdition && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={(e) => envoyerCommande(e, { brouillon: true })}
                  className="px-3 py-2 text-xs font-bold rounded border border-slate-400 text-slate-800"
                >
                  {saving ? '…' : 'Enregistrer brouillon'}
                </button>
              )}
              <button
                type="button"
                disabled={saving}
                onClick={(e) => envoyerCommande(e, {
                  brouillon: false,
                  envoyer: commandeEdition?.statut === 'BROUILLON',
                })}
                className="px-3 py-2 text-xs font-bold rounded bg-[#0E2A4F] text-white"
              >
                {saving
                  ? 'Envoi…'
                  : (commandeEdition
                    ? (commandeEdition.statut === 'BROUILLON' ? 'Modifier & envoyer au chef' : 'Enregistrer les modifications')
                    : (estDemandeur ? 'Envoyer au chef d\'antenne' : 'Enregistrer la demande'))}
              </button>
            </div>
          </form>
        </div>
      )}

      {modalSignatureBl && (
        <div className="fixed inset-0 z-[95] bg-slate-900/50 flex items-center justify-center p-4" onMouseDown={() => setModalSignatureBl(null)}>
          <div onMouseDown={(e) => e.stopPropagation()} className="w-full max-w-lg bg-white border border-slate-200 rounded-md p-4 space-y-3 shadow-xl">
            <h2 className="text-sm font-bold text-slate-900">Bon de livraison — signature</h2>
            <p className="text-[11px] text-slate-500">
              Signez directement dans l’application après dispersion / livraison pour {modalSignatureBl.commande?.numero_commande || 'la commande'}.
            </p>
            <label className="block text-xs text-slate-600">
              Mode
              <select
                value={modalSignatureBl.mode}
                onChange={(e) => setModalSignatureBl((prev) => ({ ...prev, mode: e.target.value, signature: '' }))}
                className="mt-1 w-full border border-slate-200 rounded px-2 py-1.5 text-sm"
              >
                <option value="NUMERIQUE">Signature manuscrite (pad)</option>
                <option value="MANUSCRITE">Visa texte (saisie)</option>
              </select>
            </label>
            <label className="block text-xs text-slate-600">
              Signataire
              <input
                value={modalSignatureBl.signataire}
                onChange={(e) => setModalSignatureBl((prev) => ({ ...prev, signataire: e.target.value }))}
                className="mt-1 w-full border border-slate-200 rounded px-2 py-1.5 text-sm"
                placeholder="Nom du réceptionnaire"
              />
            </label>
            {modalSignatureBl.mode === 'NUMERIQUE' ? (
              <SignaturePad
                key={`pad-${modalSignatureBl.commande?.id || 'bl'}`}
                height={180}
                label="Dessinez votre signature (souris ou doigt)"
                onChange={(dataUrl) => setModalSignatureBl((prev) => ({ ...prev, signature: dataUrl }))}
              />
            ) : (
              <label className="block text-xs text-slate-600">
                Texte du visa
                <textarea
                  value={modalSignatureBl.signature}
                  onChange={(e) => setModalSignatureBl((prev) => ({ ...prev, signature: e.target.value }))}
                  rows={3}
                  className="mt-1 w-full border border-slate-200 rounded px-2 py-1.5 text-sm"
                  placeholder="Visa manuscrit du réceptionnaire…"
                />
              </label>
            )}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setModalSignatureBl(null)} className="px-3 py-2 text-xs font-bold rounded border border-slate-300">Plus tard</button>
              <button
                type="button"
                onClick={async () => {
                  if (!modalSignatureBl.signataire?.trim()) {
                    setError('Indiquez le nom du signataire.');
                    return;
                  }
                  if (modalSignatureBl.mode === 'NUMERIQUE' && signatureVide(modalSignatureBl.signature)) {
                    setError('Signez dans le cadre avant de générer le BL.');
                    return;
                  }
                  if (modalSignatureBl.mode === 'MANUSCRITE' && !(modalSignatureBl.signature || '').trim()) {
                    setError('Saisissez le texte du visa.');
                    return;
                  }
                  try {
                    const res = await apiRequest('/flux/bons-livraison', {
                      method: 'POST',
                      body: JSON.stringify({
                        commande_id: modalSignatureBl.commande?.id,
                        mode_signature: modalSignatureBl.mode,
                        signataire_nom: modalSignatureBl.signataire,
                        signature_data: modalSignatureBl.signature || undefined,
                      }),
                    });
                    pushToast(`BL ${res.bon_livraison?.numero} généré et signé.`);
                    setModalSignatureBl(null);
                    setDocsRefreshKey((k) => k + 1);
                    await load();
                  } catch (err) {
                    setError(err?.message || 'Impossible de générer le BL.');
                  }
                }}
                className="px-3 py-2 text-xs font-bold rounded bg-[#0E2A4F] text-white"
              >
                Générer le BL
              </button>
            </div>
          </div>
        </div>
      )}

      <FluxPiecePdfModal
        isOpen={!!piecePdf}
        piece={piecePdf}
        onClose={() => setPiecePdf(null)}
      />
    </div>
  );
}
