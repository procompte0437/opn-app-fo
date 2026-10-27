// Profils et Personas Gabonais de l'Office Pharmaceutique National (OPN)
// Hiérarchie Appro : Demandeur → Chef Antenne → Collaborateur Appro → APPRO_NATIONAL → Achats/DIR/DAF/DG
// SUPER_ADMIN = administration SI (hors exécution métier Appro)

export const USERS_PERSONAS = [
  {
    id: "OPN-ADM-001",
    nom: "Ing. Patrick ONDO MVE",
    role: "Super Administrateur National",
    codeRole: "SUPER_ADMIN",
    entite: "Gouvernance Centrale OPN - Libreville",
    provinceId: "G1",
    email: "superadmin@opn.ga",
    telephone: "+241 011 70 00 01",
    avatar: "https://images.unsplash.com/photo-1531384441138-2736e62e0919?w=200&h=200&fit=crop&crop=faces&auto=format&q=80",
    initiales: "POM",
    badgeColor: "bg-indigo-700",
    accentColor: "#4338ca",
    scope: "GLOBAL",
    droits: ["SYSTEM_SETTINGS", "USER_MANAGEMENT", "AUDIT_SUPERVISION", "DEMAND_SUPERVISE_READONLY", "SUPPLY_SUPERVISE_READONLY"],
    description: "Administration SI nationale (utilisateurs, antennes, catalogues techniques, paramètres ANINF). Ne valide ni n'instruit les demandes d'approvisionnement — supervision lecture seule."
  },
  {
    id: "OPN-MET-001",
    nom: "Admin Métier",
    role: "Configuration du workflow",
    codeRole: "ADMIN_METIER",
    entite: "Paramétrage métier OPN - Libreville",
    provinceId: "G1",
    email: "admin.metier@opn.ga",
    telephone: "+241 011 70 00 02",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=200&fit=crop&crop=faces&auto=format&q=80",
    initiales: "AM",
    badgeColor: "bg-stone-700",
    accentColor: "#44403c",
    scope: "NATIONAL",
    droits: ["PARAMETRAGE", "FLUX", "REFERENTIEL", "PATRIMOINE", "SERVICES"],
    description: "Configure le workflow en cours : approvisionnement, référentiel, patrimoine, centre de services et droits d'accès."
  },
  {
    id: "OPN-IT-002",
    nom: "Ing. Kevin MAVOUNGOU BIYOGHE",
    role: "Administrateur IT & Cyber-Sécurité",
    codeRole: "ADMIN_IT",
    entite: "Direction des Systèmes d'Information & ANINF - Libreville",
    provinceId: "G1",
    email: "admin.it@opn.ga",
    telephone: "+241 074 00 11 22",
    avatar: "https://images.unsplash.com/photo-1522529599102-193c0d76b5b6?w=200&h=200&fit=crop&crop=faces&auto=format&q=80",
    initiales: "KMB",
    badgeColor: "bg-slate-600",
    accentColor: "#475569",
    scope: "SERVICE",
    droits: ["USER_CREATE", "USER_DISABLE", "HELPDESK_MANAGE", "SESSION_LOGS", "CYBER_SECURITY"],
    description: "Support technique, gestion des comptes, réinitialisation de mots de passe verrouillée et journal des connexions."
  },
  {
    id: "OPN-VEN-001",
    nom: "M. Paul MEBIAME",
    role: "Vendeur / Commercial Terrain",
    codeRole: "VENDEUR",
    entite: "Direction Commerciale & Marketing — Antenne Woleu-Ntem (Oyem)",
    provinceId: "G9",
    email: "commercial.oyem@opn.ga",
    telephone: "+241 077 45 12 88",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=faces&auto=format&q=80",
    initiales: "PME",
    badgeColor: "bg-emerald-700",
    accentColor: "#047857",
    scope: "PROVINCIAL",
    droits: ["PROSPECTION", "FACTURATION", "MARGE", "RECOUVREMENT", "INVENTAIRES", "CATALOGUE", "REFERENTIEL", "CONNECT"],
    description: "Force de vente terrain : prospection des structures, devis, conversion clients, suivi marge et recouvrement. S'appuie sur le référentiel national (structures, médicaments, antennes)."
  },
  {
    id: "OPN-DIR-001",
    nom: "Dr. Jean-Bernard OBAME NDONG",
    role: "Directeur Général",
    codeRole: "DG",
    entite: "Direction Générale OPN - Libreville",
    provinceId: "G1",
    email: "jb.obame@opn.ga",
    telephone: "+241 011 70 20 01",
    avatar: "https://images.unsplash.com/photo-1463453091185-61582044d556?w=200&h=200&fit=crop&crop=faces&auto=format&q=80",
    initiales: "JBO",
    badgeColor: "bg-green-700",
    accentColor: "#15803d",
    scope: "NATIONAL",
    droits: ["DASHBOARD_NATIONAL", "VALIDATION_DG", "ARBITRAGE_BUDGETAIRE", "RAPPORTS_MINISTERIELS", "CONVENTIONS_OMS"],
    description: "Supervision globale, validation finale des commandes internationales > 20M XAF, arbitrages interprovinciaux et conventions OMS/UNICEF."
  },
  {
    id: "OPN-DIR-003",
    nom: "M. Alain KOUMBA BIVEGHE",
    role: "Directeur des Opérations & Pilotage",
    codeRole: "DIR",
    entite: "Direction des Opérations - Libreville",
    provinceId: "G1",
    email: "dir.operations@opn.ga",
    telephone: "+241 077 44 55 66",
    avatar: "https://images.unsplash.com/photo-1570158268183-d296b2892211?w=200&h=200&fit=crop&crop=faces&auto=format&q=80",
    initiales: "AKB",
    badgeColor: "bg-sky-800",
    accentColor: "#075985",
    scope: "NATIONAL",
    droits: ["PILOTAGE_DIRECTION", "VALIDATION_DIR", "CONTROLE_DOSSIERS", "SUIVI_STOCKS_NATIONAUX"],
    description: "Pilotage opérationnel, contrôle et validation des dossiers avant transmission au circuit institutionnel."
  },
  {
    id: "OPN-FIN-001",
    nom: "Mme Chantal NZENGUE OBIANG",
    role: "Directrice Administrative & Financière",
    codeRole: "DAF",
    entite: "Direction Administrative et Financière - Libreville",
    provinceId: "G1",
    email: "daf@opn.ga",
    telephone: "+241 011 70 20 05",
    avatar: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=200&h=200&fit=crop&crop=faces&auto=format&q=80",
    initiales: "CNO",
    badgeColor: "bg-yellow-700",
    accentColor: "#a16207",
    scope: "NATIONAL",
    droits: ["CONTROLE_FINANCIER", "VALIDATION_DAF", "ENGAGEMENTS_BUDGETAIRES", "GESTION_FOURNISSEURS"],
    description: "Contrôle budgétaire, visa d'engagement financier préalable et validation des paiements aux laboratoires."
  },
  {
    id: "OPN-APP-001",
    nom: "Mme Sylvie NTSAME ONDO",
    role: "Directrice des Approvisionnements Nationaux",
    codeRole: "APPRO_NATIONAL",
    entite: "Direction de la Logistique & Approvisionnement - Hub Owendo",
    provinceId: "G1",
    email: "s.ntsame@opn.ga",
    telephone: "+241 074 12 34 56",
    avatar: "https://images.unsplash.com/photo-1589156280159-27698a70f29e?w=200&h=200&fit=crop&crop=faces&auto=format&q=80",
    initiales: "SNO",
    badgeColor: "bg-blue-600",
    accentColor: "#2563eb",
    scope: "NATIONAL",
    droits: ["CALCUL_CMM", "CONSOLIDATION_BESOINS", "VALIDATION_APPRO_NATIONALE", "TRANSMISSION_ACHATS", "CLOTURE_LIVRAISONS_NATIONALE", "VOIR_TOUTES_DEMANDES"],
    description: "Valide nationalement les demandes instruites par ses collaborateurs Appro (toutes antennes), arbitre les dotations Owendo et transmet vers Achats / circuit de visas."
  },
  {
    id: "OPN-APP-002",
    nom: "Mme Grâce NDZIÉ OBAME",
    role: "Collaboratrice Approvisionnements",
    codeRole: "COLLABORATEUR_APPRO",
    entite: "Direction de la Logistique & Approvisionnement - Hub Owendo",
    provinceId: "G1",
    email: "g.ndzie@opn.ga",
    telephone: "+241 074 12 34 70",
    avatar: "https://images.unsplash.com/photo-1573497491765-dccce02b29df?w=200&h=200&fit=crop&crop=faces&auto=format&q=80",
    initiales: "GNO",
    badgeColor: "bg-sky-600",
    accentColor: "#0284c7",
    scope: "NATIONAL",
    droits: ["INSTRUCTION_DEMANDES", "AJUSTEMENT_QUANTITES", "COMMENTAIRE_METIER", "VOIR_DEMANDES_NATIONAL", "REJET_INSTRUCTION"],
    description: "Instruit et traite les demandes envoyées par les chefs d'antenne provinciaux avant transmission à la Directrice Appro nationale."
  },
  {
    id: "OPN-APP-003",
    nom: "M. Jean OBIANG ESSONO",
    role: "Collaborateur Approvisionnements",
    codeRole: "COLLABORATEUR_APPRO",
    entite: "Direction de la Logistique & Approvisionnement - Hub Owendo",
    provinceId: "G1",
    email: "j.obiang@opn.ga",
    telephone: "+241 074 12 34 71",
    avatar: "https://images.unsplash.com/photo-1565884280295-98eb83e41c65?w=200&h=200&fit=crop&crop=faces&auto=format&q=80",
    initiales: "JOE",
    badgeColor: "bg-indigo-500",
    accentColor: "#6366f1",
    scope: "NATIONAL",
    droits: ["INSTRUCTION_DEMANDES", "AJUSTEMENT_QUANTITES", "COMMENTAIRE_METIER", "VOIR_DEMANDES_NATIONAL", "REJET_INSTRUCTION"],
    description: "Traite la file nationale des demandes d'approvisionnement, ajuste les quantités selon stocks/CMM et prépare le dossier pour validation de la Directrice Appro."
  },
  {
    id: "OPN-ACH-001",
    nom: "M. Christian BIKORO MVE",
    role: "Responsable Achats & Marchés Fournisseurs",
    codeRole: "ACHATS",
    entite: "Service Achats & Relations Fabricants - Libreville",
    provinceId: "G1",
    email: "achats@opn.ga",
    telephone: "+241 066 11 22 33",
    avatar: "https://images.unsplash.com/photo-1587064712555-6e206484699b?w=200&h=200&fit=crop&crop=faces&auto=format&q=80",
    initiales: "CBM",
    badgeColor: "bg-yellow-600",
    accentColor: "#ca8a04",
    scope: "NATIONAL",
    droits: ["GESTION_FOURNISSEURS", "EMISSION_BONS_COMMANDE", "NEGOCIATION_PRIX", "APPELS_OFFRES_ACHATS"],
    description: "Gestion des catalogues fournisseurs (Sanofi, Zenufa, Fresenius...) et passage des commandes d'achat."
  },
  {
    id: "OPN-PHAR-001",
    nom: "Dr. François MBA ALLOGO",
    role: "Pharmacien Chef National",
    codeRole: "PHARMACIEN_CHEF_NATIONAL",
    entite: "Direction Pharmaceutique Nationale - Hub Owendo",
    provinceId: "G1",
    email: "pharmacien.national@opn.ga",
    telephone: "+241 077 90 80 70",
    avatar: "https://images.unsplash.com/photo-1506277886164-e25aa3f4ef7f?w=200&h=200&fit=crop&crop=faces&auto=format&q=80",
    initiales: "FMA",
    badgeColor: "bg-lime-700",
    accentColor: "#4d7c0f",
    scope: "NATIONAL",
    droits: ["CATALOGUE_DCI_NATIONAL", "SUPERVISION_FEFO", "HOMOLOGATION_PRODUITS", "QUALITE_PHARMACEUTIQUE"],
    description: "Supervision du catalogue national DCI, conformité FEFO et retraits de lots périmés ou non conformes."
  },
  {
    id: "OPN-PHAR-G2",
    nom: "Dr. Estelle MANFOUMBI",
    role: "Pharmacien Chef d'Antenne Haut-Ogooué",
    codeRole: "PHARMACIEN_CHEF_ANTENNE",
    entite: "Antenne Provinciale Haut-Ogooué - Franceville",
    provinceId: "G2",
    email: "pharmacie.frv@opn.ga",
    telephone: "+241 066 77 88 99",
    avatar: "https://images.unsplash.com/photo-1507152832244-10d45c7eda57?w=200&h=200&fit=crop&crop=faces&auto=format&q=80",
    initiales: "EM",
    badgeColor: "bg-lime-600",
    accentColor: "#65a30d",
    scope: "ANTENNA",
    droits: ["STOCK_LOCAL_PHARMACIE", "VERIFICATION_ORDONNANCES", "FEFO_LOCAL", "AVIS_TECHNIQUE_DEMANDES"],
    description: "Contrôle pharmaceutique des demandes des structures sanitaires du Haut-Ogooué et gestion des lots locaux."
  },
  // ——— Chefs d'antenne des 9 provinces (couleurs distinctes) ———
  {
    id: "OPN-ANT-G1",
    nom: "Mme Sylvie MINTSA NZIGOU",
    role: "Chef d'Antenne — Estuaire",
    codeRole: "CHEF_ANTENNE_PROVINCIALE",
    entite: "Antenne Provinciale Estuaire - Libreville / Owendo",
    provinceId: "G1",
    email: "chef.antenne.est@opn.ga",
    telephone: "+241 011 70 21 01",
    avatar: "https://images.unsplash.com/photo-1589156280159-27698a70f29e?w=200&h=200&fit=crop&crop=faces&auto=format&q=80",
    initiales: "SMN",
    badgeColor: "bg-blue-700",
    accentColor: "#1d4ed8",
    scope: "PROVINCE",
    droits: ["DASHBOARD_PROVINCIAL", "VALIDATION_PARTIELLE", "SIGNATURE_ANTENNE", "GESTION_STRUCTURES_LOCALES"],
    description: "Pilotage de l'antenne Estuaire (Owendo). Ne voit que les demandes de sa province."
  },
  {
    id: "OPN-ANT-G2",
    nom: "M. Brice ELLA MBA",
    role: "Chef d'Antenne — Haut-Ogooué",
    codeRole: "CHEF_ANTENNE_PROVINCIALE",
    entite: "Antenne Provinciale Haut-Ogooué - Franceville",
    provinceId: "G2",
    email: "chef.antenne.frv@opn.ga",
    telephone: "+241 066 45 88 12",
    avatar: "https://images.unsplash.com/photo-1605980776566-0486c3ac7617?w=200&h=200&fit=crop&crop=faces&auto=format&q=80",
    initiales: "BEM",
    badgeColor: "bg-emerald-700",
    accentColor: "#047857",
    scope: "PROVINCE",
    droits: ["DASHBOARD_PROVINCIAL", "VALIDATION_PARTIELLE", "SIGNATURE_ANTENNE", "GESTION_STRUCTURES_LOCALES"],
    description: "Pilotage de l'antenne Haut-Ogooué (Franceville). Ne voit que les demandes de sa province."
  },
  {
    id: "OPN-ANT-G3",
    nom: "Dr. Paulin ONDO METOU",
    role: "Chef d'Antenne — Moyen-Ogooué",
    codeRole: "CHEF_ANTENNE_PROVINCIALE",
    entite: "Antenne Provinciale Moyen-Ogooué - Lambaréné",
    provinceId: "G3",
    email: "chef.antenne.lam@opn.ga",
    telephone: "+241 062 18 90 44",
    avatar: "https://images.unsplash.com/photo-1463453091185-61582044d556?w=200&h=200&fit=crop&crop=faces&auto=format&q=80",
    initiales: "POM",
    badgeColor: "bg-amber-600",
    accentColor: "#d97706",
    scope: "PROVINCE",
    droits: ["DASHBOARD_PROVINCIAL", "VALIDATION_PARTIELLE", "SIGNATURE_ANTENNE", "GESTION_STRUCTURES_LOCALES"],
    description: "Pilotage de l'antenne Moyen-Ogooué (Lambaréné). Ne voit que les demandes de sa province."
  },
  {
    id: "OPN-ANT-G4",
    nom: "Mme Patricia BOUSSOUGOU",
    role: "Chef d'Antenne — Ngounié",
    codeRole: "CHEF_ANTENNE_PROVINCIALE",
    entite: "Antenne Provinciale Ngounié - Mouila",
    provinceId: "G4",
    email: "chef.antenne.mou@opn.ga",
    telephone: "+241 077 92 11 10",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=200&fit=crop&crop=faces&auto=format&q=80",
    initiales: "PB",
    badgeColor: "bg-violet-700",
    accentColor: "#6d28d9",
    scope: "PROVINCE",
    droits: ["DASHBOARD_PROVINCIAL", "VALIDATION_PARTIELLE", "SIGNATURE_ANTENNE", "GESTION_STRUCTURES_LOCALES"],
    description: "Pilotage de l'antenne Ngounié (Mouila). Ne voit que les demandes de sa province."
  },
  {
    id: "OPN-ANT-G5",
    nom: "M. Dieudonné MOUSSAVOU",
    role: "Chef d'Antenne — Nyanga",
    codeRole: "CHEF_ANTENNE_PROVINCIALE",
    entite: "Antenne Provinciale Nyanga - Tchibanga",
    provinceId: "G5",
    email: "chef.antenne.tch@opn.ga",
    telephone: "+241 066 33 21 89",
    avatar: "https://images.unsplash.com/photo-1565884280295-98eb83e41c65?w=200&h=200&fit=crop&crop=faces&auto=format&q=80",
    initiales: "DM",
    badgeColor: "bg-rose-700",
    accentColor: "#be123c",
    scope: "PROVINCE",
    droits: ["DASHBOARD_PROVINCIAL", "VALIDATION_PARTIELLE", "SIGNATURE_ANTENNE", "GESTION_STRUCTURES_LOCALES"],
    description: "Pilotage de l'antenne Nyanga (Tchibanga). Ne voit que les demandes de sa province."
  },
  {
    id: "OPN-ANT-G6",
    nom: "Dr. Serge MEZUI M'ELLA",
    role: "Chef d'Antenne — Ogooué-Ivindo",
    codeRole: "CHEF_ANTENNE_PROVINCIALE",
    entite: "Antenne Provinciale Ogooué-Ivindo - Makokou",
    provinceId: "G6",
    email: "chef.antenne.mak@opn.ga",
    telephone: "+241 074 81 09 33",
    avatar: "https://images.unsplash.com/photo-1522529599102-193c0d76b5b6?w=200&h=200&fit=crop&crop=faces&auto=format&q=80",
    initiales: "SME",
    badgeColor: "bg-cyan-700",
    accentColor: "#0e7490",
    scope: "PROVINCE",
    droits: ["DASHBOARD_PROVINCIAL", "VALIDATION_PARTIELLE", "SIGNATURE_ANTENNE", "GESTION_STRUCTURES_LOCALES"],
    description: "Pilotage de l'antenne Ogooué-Ivindo (Makokou). Ne voit que les demandes de sa province."
  },
  {
    id: "OPN-ANT-G7",
    nom: "Mme Clarisse MBOUMBA BIVEGHE",
    role: "Chef d'Antenne — Ogooué-Lolo",
    codeRole: "CHEF_ANTENNE_PROVINCIALE",
    entite: "Antenne Provinciale Ogooué-Lolo - Koula-Moutou",
    provinceId: "G7",
    email: "chef.antenne.klm@opn.ga",
    telephone: "+241 065 47 18 20",
    avatar: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=200&h=200&fit=crop&crop=faces&auto=format&q=80",
    initiales: "CMB",
    badgeColor: "bg-orange-700",
    accentColor: "#c2410c",
    scope: "PROVINCE",
    droits: ["DASHBOARD_PROVINCIAL", "VALIDATION_PARTIELLE", "SIGNATURE_ANTENNE", "GESTION_STRUCTURES_LOCALES"],
    description: "Pilotage de l'antenne Ogooué-Lolo (Koula-Moutou). Ne voit que les demandes de sa province."
  },
  {
    id: "OPN-ANT-G8",
    nom: "M. Marc ANGUILET",
    role: "Chef d'Antenne — Ogooué-Maritime",
    codeRole: "CHEF_ANTENNE_PROVINCIALE",
    entite: "Antenne Provinciale Ogooué-Maritime - Port-Gentil",
    provinceId: "G8",
    email: "chef.antenne.pog@opn.ga",
    telephone: "+241 077 14 55 90",
    avatar: "https://images.unsplash.com/photo-1605980776566-0486c3ac7617?w=200&h=200&fit=crop&crop=faces&auto=format&q=80",
    initiales: "MA",
    badgeColor: "bg-teal-700",
    accentColor: "#0f766e",
    scope: "PROVINCE",
    droits: ["DASHBOARD_PROVINCIAL", "VALIDATION_PARTIELLE", "SIGNATURE_ANTENNE", "GESTION_STRUCTURES_LOCALES"],
    description: "Pilotage de l'antenne Ogooué-Maritime (Port-Gentil). Ne voit que les demandes de sa province."
  },
  {
    id: "OPN-ANT-G9",
    nom: "Dr. Emmanuel NDONG ASSOUMOU",
    role: "Chef d'Antenne — Woleu-Ntem",
    codeRole: "CHEF_ANTENNE_PROVINCIALE",
    entite: "Antenne Provinciale Woleu-Ntem - Oyem",
    provinceId: "G9",
    email: "chef.antenne.oye@opn.ga",
    telephone: "+241 066 89 74 10",
    avatar: "https://images.unsplash.com/photo-1506277886164-e25aa3f4ef7f?w=200&h=200&fit=crop&crop=faces&auto=format&q=80",
    initiales: "ENA",
    badgeColor: "bg-fuchsia-700",
    accentColor: "#a21caf",
    scope: "PROVINCE",
    droits: ["DASHBOARD_PROVINCIAL", "VALIDATION_PARTIELLE", "SIGNATURE_ANTENNE", "GESTION_STRUCTURES_LOCALES"],
    description: "Pilotage de l'antenne Woleu-Ntem (Oyem). Ne voit que les demandes de sa province."
  },
  {
    id: "OPN-URG-001",
    nom: "Dr. Audrey MBOUMBA KOUMBA",
    role: "Coordonnatrice Nationale des Urgences Sanitaires",
    codeRole: "COORDINATEUR_URGENCES",
    entite: "Centre Opérationnel des Urgences (COD Libreville)",
    provinceId: "G1",
    email: "urgences@opn.ga",
    telephone: "+241 077 92 11 05",
    avatar: "https://images.unsplash.com/photo-1767249615394-c2f36d563a2d?w=200&h=200&fit=crop&crop=faces&auto=format&q=80",
    initiales: "AMK",
    badgeColor: "bg-red-700",
    accentColor: "#b91c1c",
    scope: "NATIONAL",
    droits: ["DECLENCHEMENT_URGENCE", "SUPERVISION_CRISES_COD", "AFFECTATION_EQUIPES_URGENCE", "REQUISITION_VITALE"],
    description: "Coordination des alertes sanitaires nationales, déploiement des convois d'urgence sérums antivenimeux et oxygène."
  },
  {
    id: "OPN-LOG-001",
    nom: "M. Rodrigue MAVOUNGOU",
    role: "Gestionnaire Logistique & Flotte Convois",
    codeRole: "GESTIONNAIRE_LOGISTIQUE",
    entite: "Direction des Transports & Flotte - Hub Owendo",
    provinceId: "G1",
    email: "logistique@opn.ga",
    telephone: "+241 062 99 44 11",
    avatar: "https://images.unsplash.com/photo-1654155427842-a4a249bf693e?w=200&h=200&fit=crop&crop=faces&auto=format&q=80",
    initiales: "RM",
    badgeColor: "bg-purple-700",
    accentColor: "#7e22ce",
    scope: "NATIONAL",
    droits: ["CREATION_MISSIONS", "AFFECTATION_VEHICULES", "CONTROLE_PREUVES_LIVRAISON", "VALIDATION_RAPPORTS_CONVOYAGE"],
    description: "Supervision des convois RN1/RN2, wagons Setrag et barges maritimes, contrôle de la chaîne du froid 2°C–8°C."
  },
  {
    id: "OPN-SEC-001",
    nom: "Capitaine Guy-Roger NGUEMA",
    role: "Chef de Convoi Sécurisé & Sûreté",
    codeRole: "CHEF_CONVOI_SECURITE",
    entite: "Escorte Sécurisée & Protection Convois RN1/RN2",
    provinceId: "G1",
    email: "securite.convois@opn.ga",
    telephone: "+241 065 12 34 56",
    avatar: "https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=200&h=200&fit=crop&crop=faces&auto=format&q=80",
    initiales: "GRN",
    badgeColor: "bg-zinc-700",
    accentColor: "#3f3f46",
    scope: "ASSIGNED_MISSIONS",
    droits: ["SURETE_CONVOIS", "CHECKPOINTS_ROUTE", "SIGNALEMENT_INCIDENTS_SECURITE", "VISA_ESCORTES"],
    description: "Protection physique des convois de médicaments sensibles, gestion des points de contrôle et incidents de route."
  },
  {
    id: "OPN-CVY-001",
    nom: "M. Jean-Paul MVE",
    role: "Convoyeur Opérationnel de Fret Pharmaceutique",
    codeRole: "CONVOYEUR",
    entite: "Équipe Convois Mobiles Owendo / Setrag",
    provinceId: "G1",
    email: "convoyeur@opn.ga",
    telephone: "+241 074 55 66 77",
    avatar: "https://images.unsplash.com/photo-1752650143052-fab46a8c2735?w=200&h=200&fit=crop&crop=faces&auto=format&q=80",
    initiales: "JPM",
    badgeColor: "bg-orange-600",
    accentColor: "#ea580c",
    scope: "ASSIGNED_MISSIONS",
    droits: ["SCANNER_QR_LIVRAISON", "POINTAGE_COLISAGE", "EMARGEMENT_BENEFICIAIRE", "SOUMISSION_RAPPORT_MISSION"],
    description: "Exécution des livraisons sur le terrain, scan du QR Code de livraison, recueil de la signature tactile du médecin."
  },
  // ——— Demandeurs pharmacie des 9 provinces (couleurs assorties aux chefs) ———
  {
    id: "OPN-DEM-G1",
    nom: "Dr. Patrick ESSONO MBA",
    role: "Demandeur — Pharmacie Estuaire",
    codeRole: "DEMANDEUR_PHARMACIEN",
    entite: "Pharmacie Centrale Owendo - Estuaire",
    provinceId: "G1",
    email: "pharmacie.est@opn.ga",
    telephone: "+241 066 10 21 01",
    avatar: "https://images.unsplash.com/photo-1531384441138-2736e62e0919?w=200&h=200&fit=crop&crop=faces&auto=format&q=80",
    initiales: "PEM",
    badgeColor: "bg-blue-500",
    accentColor: "#3b82f6",
    scope: "STRUCTURE",
    droits: ["EMISSION_DEMANDES_OFFICINE", "SUIVI_LIVRAISONS_OFFICINE", "RECEPTION_PRODUITS", "HELPDESK_AUTORISE"],
    description: "Commandes auprès de l'antenne Estuaire."
  },
  {
    id: "OPN-DEM-G2",
    nom: "Dr. Nadège MOUSSAVOU",
    role: "Demandeur — Pharmacie Haut-Ogooué",
    codeRole: "DEMANDEUR_PHARMACIEN",
    entite: "Pharmacie Centrale Franceville",
    provinceId: "G2",
    email: "pharmacie.demandeur.frv@opn.ga",
    telephone: "+241 066 45 88 20",
    avatar: "https://images.unsplash.com/photo-1573497491765-dccce02b29df?w=200&h=200&fit=crop&crop=faces&auto=format&q=80",
    initiales: "NM",
    badgeColor: "bg-emerald-500",
    accentColor: "#10b981",
    scope: "STRUCTURE",
    droits: ["EMISSION_DEMANDES_OFFICINE", "SUIVI_LIVRAISONS_OFFICINE", "RECEPTION_PRODUITS", "HELPDESK_AUTORISE"],
    description: "Commandes auprès de l'antenne Haut-Ogooué."
  },
  {
    id: "OPN-DEM-G3",
    nom: "Dr. Aline NZENGUE",
    role: "Demandeur — Pharmacie Moyen-Ogooué",
    codeRole: "DEMANDEUR_PHARMACIEN",
    entite: "Pharmacie Albert Schweitzer - Lambaréné",
    provinceId: "G3",
    email: "pharmacie.lam@opn.ga",
    telephone: "+241 062 18 90 50",
    avatar: "https://images.unsplash.com/photo-1589156280159-27698a70f29e?w=200&h=200&fit=crop&crop=faces&auto=format&q=80",
    initiales: "AN",
    badgeColor: "bg-amber-500",
    accentColor: "#f59e0b",
    scope: "STRUCTURE",
    droits: ["EMISSION_DEMANDES_OFFICINE", "SUIVI_LIVRAISONS_OFFICINE", "RECEPTION_PRODUITS", "HELPDESK_AUTORISE"],
    description: "Commandes auprès de l'antenne Moyen-Ogooué."
  },
  {
    id: "OPN-DEM-G4",
    nom: "Dr. Serge MBOUMBA",
    role: "Demandeur — Pharmacie Ngounié",
    codeRole: "DEMANDEUR_PHARMACIEN",
    entite: "Pharmacie Centrale Mouila",
    provinceId: "G4",
    email: "pharmacie.mou@opn.ga",
    telephone: "+241 077 92 11 20",
    avatar: "https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=200&h=200&fit=crop&crop=faces&auto=format&q=80",
    initiales: "SMB",
    badgeColor: "bg-violet-500",
    accentColor: "#8b5cf6",
    scope: "STRUCTURE",
    droits: ["EMISSION_DEMANDES_OFFICINE", "SUIVI_LIVRAISONS_OFFICINE", "RECEPTION_PRODUITS", "HELPDESK_AUTORISE"],
    description: "Commandes auprès de l'antenne Ngounié."
  },
  {
    id: "OPN-DEM-G5",
    nom: "Dr. Clarisse MOUSSAVOU",
    role: "Demandeur — Pharmacie Nyanga",
    codeRole: "DEMANDEUR_PHARMACIEN",
    entite: "Pharmacie Centrale Tchibanga",
    provinceId: "G5",
    email: "pharmacie.tch@opn.ga",
    telephone: "+241 066 33 21 95",
    avatar: "https://images.unsplash.com/photo-1763328728510-064ea03a1f8a?w=200&h=200&fit=crop&crop=faces&auto=format&q=80",
    initiales: "CM",
    badgeColor: "bg-rose-500",
    accentColor: "#f43f5e",
    scope: "STRUCTURE",
    droits: ["EMISSION_DEMANDES_OFFICINE", "SUIVI_LIVRAISONS_OFFICINE", "RECEPTION_PRODUITS", "HELPDESK_AUTORISE"],
    description: "Commandes auprès de l'antenne Nyanga."
  },
  {
    id: "OPN-DEM-G6",
    nom: "Dr. Hervé NDONG",
    role: "Demandeur — Pharmacie Ogooué-Ivindo",
    codeRole: "DEMANDEUR_PHARMACIEN",
    entite: "Pharmacie CHR Makokou",
    provinceId: "G6",
    email: "pharmacie.mak@opn.ga",
    telephone: "+241 074 81 09 40",
    avatar: "https://images.unsplash.com/photo-1587064712555-6e206484699b?w=200&h=200&fit=crop&crop=faces&auto=format&q=80",
    initiales: "HN",
    badgeColor: "bg-cyan-500",
    accentColor: "#06b6d4",
    scope: "STRUCTURE",
    droits: ["EMISSION_DEMANDES_OFFICINE", "SUIVI_LIVRAISONS_OFFICINE", "RECEPTION_PRODUITS", "HELPDESK_AUTORISE"],
    description: "Commandes auprès de l'antenne Ogooué-Ivindo."
  },
  {
    id: "OPN-DEM-G7",
    nom: "Dr. Yannick OBAME",
    role: "Demandeur — Pharmacie Ogooué-Lolo",
    codeRole: "DEMANDEUR_PHARMACIEN",
    entite: "Pharmacie Centrale Koula-Moutou",
    provinceId: "G7",
    email: "pharmacie.klm@opn.ga",
    telephone: "+241 065 47 18 30",
    avatar: "https://images.unsplash.com/photo-1654155427842-a4a249bf693e?w=200&h=200&fit=crop&crop=faces&auto=format&q=80",
    initiales: "YO",
    badgeColor: "bg-orange-500",
    accentColor: "#f97316",
    scope: "STRUCTURE",
    droits: ["EMISSION_DEMANDES_OFFICINE", "SUIVI_LIVRAISONS_OFFICINE", "RECEPTION_PRODUITS", "HELPDESK_AUTORISE"],
    description: "Commandes auprès de l'antenne Ogooué-Lolo."
  },
  {
    id: "OPN-DEM-G8",
    nom: "Dr. Marie-Claire OGANDAGA",
    role: "Demandeur — Pharmacie Ogooué-Maritime",
    codeRole: "DEMANDEUR_PHARMACIEN",
    entite: "Pharmacie Centrale du Littoral - Port-Gentil",
    provinceId: "G8",
    email: "pharmacien.pog@opn.ga",
    telephone: "+241 065 99 88 77",
    avatar: "https://images.unsplash.com/photo-1765607476283-ca2d8201ddd4?w=200&h=200&fit=crop&crop=faces&auto=format&q=80",
    initiales: "MCO",
    badgeColor: "bg-teal-500",
    accentColor: "#14b8a6",
    scope: "STRUCTURE",
    droits: ["EMISSION_DEMANDES_OFFICINE", "SUIVI_LIVRAISONS_OFFICINE", "RECEPTION_PRODUITS", "HELPDESK_AUTORISE"],
    description: "Commandes auprès de l'antenne Ogooué-Maritime."
  },
  {
    id: "OPN-DEM-G9",
    nom: "Dr. Lucie ASSOUMOU",
    role: "Demandeur — Pharmacie Woleu-Ntem",
    codeRole: "DEMANDEUR_PHARMACIEN",
    entite: "Pharmacie Centrale Oyem",
    provinceId: "G9",
    email: "pharmacie.oye@opn.ga",
    telephone: "+241 066 89 74 20",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=200&fit=crop&crop=faces&auto=format&q=80",
    initiales: "LA",
    badgeColor: "bg-fuchsia-500",
    accentColor: "#d946ef",
    scope: "STRUCTURE",
    droits: ["EMISSION_DEMANDES_OFFICINE", "SUIVI_LIVRAISONS_OFFICINE", "RECEPTION_PRODUITS", "HELPDESK_AUTORISE"],
    description: "Commandes auprès de l'antenne Woleu-Ntem."
  },
  {
    id: "OPN-DEM-ST01",
    nom: "Dr. Roger KOMBILA",
    role: "Demandeur — CHR Port-Gentil",
    codeRole: "DEMANDEUR_STRUCTURE",
    entite: "Centre Hospitalier Régional de Port-Gentil",
    provinceId: "G8",
    email: "structure.pog@opn.ga",
    telephone: "+241 077 14 00 11",
    avatar: "https://images.unsplash.com/photo-1596580817363-a4a8f67d4bc8?w=200&h=200&fit=crop&crop=faces&auto=format&q=80",
    initiales: "RK",
    badgeColor: "bg-sky-600",
    accentColor: "#0284c7",
    scope: "STRUCTURE",
    droits: ["EMISSION_DEMANDES_HOSPITALIERES", "SUIVI_DOTATIONS_CHR", "RECEPTION_COLIS_HOPITAL", "HELPDESK_AUTORISE"],
    description: "Gestion des approvisionnements hospitaliers du CHR Port-Gentil."
  },
  {
    id: "OPN-COM-001",
    nom: "Mme Léa BIGNHOUMBA",
    role: "Responsable Communication & Relations Extérieures",
    codeRole: "COMMUNICATION",
    entite: "Direction de la Communication - Libreville",
    provinceId: "G1",
    email: "communication@opn.ga",
    telephone: "+241 077 88 12 90",
    avatar: "https://images.unsplash.com/photo-1763328728510-064ea03a1f8a?w=200&h=200&fit=crop&crop=faces&auto=format&q=80",
    initiales: "LB",
    badgeColor: "bg-pink-600",
    accentColor: "#db2777",
    scope: "NATIONAL",
    droits: ["PORTAIL_CMS_PUBLIC", "PUBLICATION_APPELS_OFFRES", "COMMUNIQUES_PRESSE", "CAMPAGNES_SANTE"],
    description: "Édition du portail public OPN, publication des avis d'appels d'offres internationaux (AOI/AON) et relations médias."
  },
  {
    id: "OPN-AUD-001",
    nom: "Inspecteur Martial BOUNDA",
    role: "Auditeur Interne & Conformité Réglementaire",
    codeRole: "AUDITEUR_INTERNE",
    entite: "Inspection Générale & Audit interne - Libreville",
    provinceId: "G1",
    email: "audit.interne@opn.ga",
    telephone: "+241 011 70 20 10",
    avatar: "https://images.unsplash.com/photo-1584119164246-461d43e9bab3?w=200&h=200&fit=crop&crop=faces&auto=format&q=80",
    initiales: "MB",
    badgeColor: "bg-neutral-800",
    accentColor: "#262626",
    scope: "GLOBAL",
    droits: ["JOURNAL_AUDIT_ANINF", "INSPECTION_TIMELINES", "CONTROLE_FEFO_NATIONAL", "EXPORTS_CONFORMITE"],
    description: "Audit interne ANINF, traçabilité intégrale de chaque modification, signature et clôture d'opération."
  }
];

/** Tous les profils de connexion d'origine. Les deux profils protégés gardent leur libellé. */
const LIBELLES_PROFILS_PROTEGES = {
  'OPN-ADM-001': 'Super administrateur / Admin IT',
  'OPN-MET-001': 'Admin métier',
};

export const PROFILS_DEFAUT_IDS = USERS_PERSONAS.map((persona) => persona.id);

export const PROFILS_DEFAUT = USERS_PERSONAS.map((persona) => ({
  ...persona,
  role: LIBELLES_PROFILS_PROTEGES[persona.id] || persona.role,
}));

/** Ordre et libellés des 9 provinces pour l'affichage côte à côte chef / demandeur. */
export const PROVINCES_OPN = [
  { id: 'G1', nom: 'Estuaire' },
  { id: 'G2', nom: 'Haut-Ogooué' },
  { id: 'G3', nom: 'Moyen-Ogooué' },
  { id: 'G4', nom: 'Ngounié' },
  { id: 'G5', nom: 'Nyanga' },
  { id: 'G6', nom: 'Ogooué-Ivindo' },
  { id: 'G7', nom: 'Ogooué-Lolo' },
  { id: 'G8', nom: 'Ogooué-Maritime' },
  { id: 'G9', nom: 'Woleu-Ntem' },
];

function normaliserProvinceCle(profil) {
  const code = String(profil?.provinceId || '').toUpperCase();
  if (/^G[1-9]$/.test(code)) return code;
  const nom = String(profil?.province_nom || profil?.antenne || '').trim().toLowerCase();
  if (!nom) return null;
  const match = PROVINCES_OPN.find((p) => {
    const libelle = p.nom.toLowerCase();
    return nom.includes(libelle) || libelle.includes(nom);
  });
  if (match) return match.id;
  return `NOM:${nom}`;
}

/**
 * Sépare les profils nationaux des paires provinciales (chef + demandeur côte à côte).
 * Accepte les personas hardcodés OU les profils issus de la BDD.
 */
export function grouperProfilsDefaut(profils = PROFILS_DEFAUT) {
  const estChefProvince = (p) =>
    p.codeRole === 'CHEF_ANTENNE_PROVINCIALE'
    || (p.code_role === 'CHEF_ANTENNE_PROVINCIALE');
  const estDemandeurProvince = (p) =>
    p.codeRole === 'DEMANDEUR_PHARMACIEN'
    || p.code_role === 'DEMANDEUR_PHARMACIEN';

  const nationaux = profils.filter((p) => !estChefProvince(p) && !estDemandeurProvince(p));

  const chefs = profils.filter(estChefProvince);
  const demandeurs = profils.filter(estDemandeurProvince);
  const cles = new Set([
    ...chefs.map(normaliserProvinceCle).filter(Boolean),
    ...demandeurs.map(normaliserProvinceCle).filter(Boolean),
  ]);

  const paires = [...cles].map((cle) => {
    const meta = PROVINCES_OPN.find((p) => p.id === cle);
    const chef = chefs.find((p) => normaliserProvinceCle(p) === cle) || null;
    const demandeur = demandeurs.find((p) => normaliserProvinceCle(p) === cle) || null;
    return {
      id: cle,
      nom: meta?.nom || chef?.province_nom || chef?.antenne || demandeur?.province_nom || demandeur?.antenne || cle,
      chef,
      demandeur,
    };
  }).filter((paire) => paire.chef || paire.demandeur)
    .sort((a, b) => {
      const ia = PROVINCES_OPN.findIndex((p) => p.id === a.id);
      const ib = PROVINCES_OPN.findIndex((p) => p.id === b.id);
      if (ia >= 0 && ib >= 0) return ia - ib;
      if (ia >= 0) return -1;
      if (ib >= 0) return 1;
      return String(a.nom).localeCompare(String(b.nom), 'fr');
    });

  return { nationaux, paires };
}

/** Enrichit un profil BDD avec couleurs / initiales du catalogue local si email connu. */
export function enrichirProfilDemo(profilDb) {
  const local = USERS_PERSONAS.find((p) => p.email?.toLowerCase() === String(profilDb?.email || '').toLowerCase());
  if (!local) {
    return {
      ...profilDb,
      badgeColor: profilDb.badgeColor || 'bg-[#2E68B4]',
      accentColor: profilDb.accentColor || '#2E68B4',
      initiales: profilDb.initiales || 'OPN',
    };
  }
  return {
    ...profilDb,
    id: profilDb.id || local.id,
    initiales: local.initiales || profilDb.initiales,
    badgeColor: local.badgeColor,
    accentColor: local.accentColor,
    avatar: local.avatar,
    provinceId: profilDb.provinceId || local.provinceId,
  };
}
