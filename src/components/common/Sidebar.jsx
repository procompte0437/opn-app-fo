import React, { useEffect, useRef } from 'react';
import { 
  LayoutDashboard, 
  Pill, 
  Truck, 
  MessageSquare, 
  AlertTriangle, 
  FolderOpen, 
  ShieldCheck,
  Settings, 
  Briefcase, 
  QrCode, 
  ShoppingCart, 
  FileCheck, 
  Video, 
  Navigation,
  Building2,
  Globe,
  Award,
  Receipt,
  Warehouse,
  Compass,
  TrendingUp,
  HeartHandshake,
  UserCheck,
  Wrench,
  Users,
  ClipboardCheck,
  Landmark,
  Sparkles,
  Route,
  Boxes,
  LifeBuoy,
  Database,
  ChevronsLeft,
  ChevronsRight,
  PanelLeftClose
} from 'lucide-react';
import { getCodeRole, getVisibleModules } from '../../data/rbacMatrix';
import OpnLogo from './OpnLogo';

const ICON_BY_MODULE = {
  admin: ShieldCheck,
  admin_helpdesk: ShieldCheck,
  admin_users: ShieldCheck,
  dashboard: LayoutDashboard,
  prospection: Users,
  gross_margin: TrendingUp,
  debt_public: Landmark,
  inventory_waste: ClipboardCheck,
  planning: TrendingUp,
  distribution: Compass,
  citizen: HeartHandshake,
  hr: UserCheck,
  gmao: Wrench,
  wms: Warehouse,
  billing: Receipt,
  workspace: Briefcase,
  pharmacy: Pill,
  supply: Truck,
  purchases: Globe,
  quality: Award,
  logistics: Navigation,
  antenna: Building2,
  emergency: AlertTriangle,
  collaborative: Video,
  documents: FolderOpen,
  flux_appro: Route,
  referentiel: Database,
  patrimoine: Boxes,
  centre_services: LifeBuoy,
  parametrage: Settings,
};

export default function Sidebar({ 
  currentView, 
  setCurrentView, 
  currentUser,
  activePersona,
  collapsed = false,
  onCollapse,
  onExpand,
  onHide,
}) {
  const user = currentUser || activePersona;
  const codeRole = getCodeRole(user);
  const navRef = useRef(null);
  const menuItems = getVisibleModules(user).map((item) => ({
    ...item,
    label: (codeRole === 'DEMANDEUR_PHARMACIEN' || codeRole === 'DEMANDEUR_STRUCTURE') && item.id === 'flux_appro'
      ? 'Mes demandes'
      : codeRole === 'VENDEUR' && item.id === 'flux_appro'
      ? 'Suivi commandes clients'
      : codeRole === 'VENDEUR' && item.id === 'referentiel'
      ? 'Référentiel (catalogue & territoires)'
      : item.label,
    icon: codeRole === 'CONVOYEUR' && item.id === 'workspace'
      ? QrCode
      : codeRole === 'ACHATS' && item.id === 'workspace'
      ? ShoppingCart
      : (codeRole === 'DG' || codeRole === 'DIR' || codeRole === 'DAF') && item.id === 'workspace'
      ? FileCheck
      : ICON_BY_MODULE[item.id] || Briefcase,
  }));

  useEffect(() => {
    if (navRef.current) navRef.current.scrollTop = 0;
  }, [user?.email, user?.id, codeRole]);

  const btnChrome = 'p-1 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-[#0E2A4F] shadow-sm';

  return (
    <aside
      className={`${collapsed ? 'w-[4.75rem]' : 'w-64'} bg-[#F4F7FB] border-r border-slate-200/80 flex flex-col shrink-0 h-full min-h-0 overflow-hidden transition-[width] duration-200`}
    >
      <div className={`h-16 shrink-0 border-b border-slate-200/80 flex items-center ${collapsed ? 'justify-center px-1' : 'justify-between gap-2 px-3'}`}>
        <button
          type="button"
          onClick={() => setCurrentView(menuItems[0]?.id || 'flux_appro')}
          className="min-w-0"
          title="Office Pharmaceutique National"
        >
          {collapsed ? (
            <OpnLogo variant="symbol" className="h-9 w-9" />
          ) : (
            <OpnLogo theme="default" className="h-11 max-w-[11.5rem]" />
          )}
        </button>
        {!collapsed && (
          <div className="flex flex-col gap-1 shrink-0">
            <button
              type="button"
              onClick={onCollapse}
              className={btnChrome}
              title="Réduire la barre latérale"
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onHide}
              className={btnChrome}
              title="Cacher la barre latérale"
            >
              <PanelLeftClose className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {collapsed && (
        <div className="shrink-0 flex items-center justify-center gap-1 py-1.5 border-b border-slate-200/80">
          <button
            type="button"
            onClick={onExpand}
            className={btnChrome}
            title="Agrandir la barre latérale"
          >
            <ChevronsRight className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onHide}
            className={btnChrome}
            title="Cacher la barre latérale"
          >
            <PanelLeftClose className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <nav ref={navRef} className={`flex-1 min-h-0 overflow-y-auto space-y-0.5 ${collapsed ? 'p-2' : 'p-3'}`}>
        {!collapsed && (
          <div className="px-2.5 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between gap-2">
            <span>Modules autorisés</span>
            <span className="text-[9px] font-mono bg-white text-[#2E68B4] border border-slate-200 px-1.5 py-0.5 rounded-md shrink-0">
              {user.scope || 'PROVINCE'} · {menuItems.length}
            </span>
          </div>
        )}
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={`${item.id}-${item.label}`}
              onClick={() => setCurrentView(item.id)}
              title={item.label}
              className={`w-full flex items-center ${collapsed ? 'justify-center px-2' : 'px-3'} py-2.5 rounded-xl text-xs transition-all ${
                isActive
                  ? 'bg-[#E8F1FA] text-[#0E2A4F] border border-[#0E2A4F]/25 font-bold shadow-sm'
                  : 'text-slate-600 border border-transparent hover:bg-white hover:text-[#0E2A4F] font-semibold'
              }`}
            >
              <div className={`flex items-center min-w-0 ${collapsed ? '' : 'gap-2.5'}`}>
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#2E68B4]' : 'text-[#2E68B4]/80'}`} strokeWidth={isActive ? 2.25 : 1.75} />
                {!collapsed && <span className="min-w-0 text-left truncate">{item.label}</span>}
              </div>
            </button>
          );
        })}
      </nav>

      {!collapsed && (
        <div className="shrink-0 border-t border-slate-200/80 p-3">
          <div className="bg-white rounded-xl p-2.5 border border-slate-200 text-xs shadow-sm">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="flex items-center gap-1.5 font-semibold text-[11px] text-[#0E2A4F]">
                <span className="w-2 h-2 rounded-full bg-[#00A651] animate-pulse" />
                Réseau National
              </span>
              <span className="font-bold text-[#00A651] text-[11px]">9/9 Antennes</span>
            </div>
            <p className="text-[10px] text-slate-500 leading-snug">
              {user.provinceId === 'G1' || user.scope === 'GLOBAL' || user.scope === 'NATIONAL' 
                ? (codeRole === 'SUPER_ADMIN' ? 'Supervision SI — hors exécution Appro' : 'Vision Nationale Centrale OPN')
                : `Périmètre : Zone Provinciale ${user.provinceId}`}
            </p>
          </div>
        </div>
      )}
    </aside>
  );
}
