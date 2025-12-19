"use client";

/**
 * APPLICATION DE GESTION ATELIER 3D - VERSION FUSION (DESIGN ULTIMATE + DONNÉES RÉELLES)
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Papa from 'papaparse';
import { 
  LayoutDashboard, ShoppingCart, Printer, Package, Users, 
  Settings, Search, Menu, TrendingUp, X, 
  CheckCircle, AlertCircle, RefreshCw, Download, Eye, ChevronRight,
  CreditCard, MapPin, Moon, Sun, Mail, Send, Inbox, DollarSign
} from 'lucide-react';

// --- CONFIGURATION ---
const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRcYQCI6W3JQDsGT3Sn0P1n5r8tiOEsYrnT08kOxyW_ZsFZvT3DR5WeaUshn_1Qtp6lWuTsW4HpdWPj/pub?output=csv';
const APP_NAME = "Atelier 3D"; 

// --- TYPES ---
type OrderStatus = 'À préparer' | 'En cours' | 'À emballer' | 'Expédiée' | 'Livrée' | 'Annulée';

interface Order {
  uniqueId: number;
  id: string;
  date: string;
  client: string;
  email: string;
  phone: string;
  address: string;
  itemName: string;
  count: number;
  material: string;
  color: string;
  amount: number;
  paymentMode: string;
  method: string;
  status: OrderStatus;
  urgent: boolean;
  originalStatus: string;
}

interface Message {
  id: number;
  from: string;
  to: string;
  subject: string;
  content: string;
  date: string;
  read: boolean;
  type: 'received' | 'sent';
}

// --- UTILS ---
const formatCurrency = (value: number) => 
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);

const calculateProfit = (amount: number) => {
  const fixedCost = 3.00;
  const net = amount - fixedCost;
  return { fixedCost, net, profit: net * 0.50 };
};

// --- COMPOSANTS UI ---
const Card = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm ${className}`}>
    {children}
  </div>
);

const Badge = ({ children, color = "slate" }: { children: React.ReactNode, color?: string }) => {
  const colors: Record<string, string> = {
    slate: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300",
    indigo: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300",
    green: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
    red: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
    amber: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
    white: "bg-white text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600"
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border border-transparent ${colors[color] || colors.slate}`}>
      {children}
    </span>
  );
};

// --- TOASTS ---
const ToastContainer = ({ toasts, removeToast }: { toasts: any[], removeToast: (id: number) => void }) => (
  <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
    {toasts.map(toast => (
      <div key={toast.id} className="bg-slate-900 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-in slide-in-from-right fade-in duration-300 max-w-sm">
        {toast.type === 'success' ? <CheckCircle className="text-emerald-400" size={20}/> : <AlertCircle className="text-red-400" size={20}/>}
        <p className="text-sm font-medium">{toast.message}</p>
        <button onClick={() => removeToast(toast.id)} className="ml-auto text-slate-400 hover:text-white"><X size={16}/></button>
      </div>
    ))}
  </div>
);

// --- MESSAGERIE ---
const MessagingSystem = ({ activeFolder }: { activeFolder: 'received' | 'sent' }) => {
  const messages: Message[] = [
    { id: 1, type: 'received', from: 'Castronovo Enzo', to: 'Atelier', subject: 'Question commande #PX3D...', date: '10:30', content: 'Bonjour, est-il possible de changer la couleur en Noir ?', read: false },
    { id: 2, type: 'received', from: 'Francis C.', to: 'Atelier', subject: 'Adresse de livraison', date: 'Hier', content: 'Je serai absent vendredi, merci de livrer en point relais.', read: true },
    { id: 3, type: 'sent', from: 'Atelier', to: 'Enzo', subject: 'RE: Question commande', date: '10:45', content: 'Bonjour, c\'est noté pour le changement en Noir !', read: true },
  ];
  const filteredMessages = messages.filter(m => m.type === activeFolder);

  return (
    <div className="h-[600px] flex bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="w-full md:w-1/3 border-r border-slate-200 dark:border-slate-700 overflow-y-auto">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
          <h3 className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
            {activeFolder === 'received' ? <Inbox size={18}/> : <Send size={18}/>}
            {activeFolder === 'received' ? 'Boîte de réception' : 'Éléments envoyés'}
          </h3>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-700">
          {filteredMessages.map(msg => (
            <div key={msg.id} className={`p-4 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer transition-colors ${!msg.read && activeFolder === 'received' ? 'bg-indigo-50 dark:bg-indigo-900/10' : ''}`}>
              <div className="flex justify-between mb-1">
                <span className={`font-semibold text-sm ${!msg.read ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>
                  {activeFolder === 'received' ? msg.from : `À: ${msg.to}`}
                </span>
                <span className="text-xs text-slate-400">{msg.date}</span>
              </div>
              <p className="text-sm text-slate-800 dark:text-slate-300 font-medium truncate">{msg.subject}</p>
              <p className="text-xs text-slate-500 dark:text-slate-500 truncate mt-1">{msg.content}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="hidden md:flex flex-1 flex-col items-center justify-center text-slate-400 bg-slate-50/50 dark:bg-slate-900/20 p-8 text-center">
        <Mail size={48} className="mb-4 opacity-20"/>
        <h3 className="text-lg font-medium text-slate-600 dark:text-slate-300">Sélectionnez un message</h3>
      </div>
    </div>
  );
};

// --- APP PRINCIPALE ---

export default function App() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [toasts, setToasts] = useState<any[]>([]);
  const [localStatusOverrides, setLocalStatusOverrides] = useState<Record<string, OrderStatus>>({});

  // CHARGEMENT STATUTS LOCAUX
  useEffect(() => {
    const savedStatus = localStorage.getItem('localStatusOverrides');
    if (savedStatus) setLocalStatusOverrides(JSON.parse(savedStatus));
  }, []);

  // FETCH DATA AVEC MAPPING EXACT DE TES COLONNES
  const fetchData = useCallback(() => {
    setLoading(true);
    Papa.parse(SHEET_CSV_URL, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const mappedData = results.data.map((row: any, index: number) => {
          // Nettoyage montant (ex: "9,40 €")
          const rawAmount = row['Total payé'] || row['Montant'] || '0';
          const cleanAmount = parseFloat(rawAmount.toString().replace(/[^\d,-]/g, '').replace(',', '.'));
          
          const id = row['Numéro de commande'] || `CMD-${index}`;
          // Priorité au statut local (mémoire navigateur), sinon statut Google Sheet, sinon 'À préparer'
          const currentStatus = localStatusOverrides[id] || row['Statut'] || 'À préparer';

          return {
            uniqueId: index,
            id: id,
            date: row['Horodateur'] || new Date().toLocaleDateString(),
            client: row['Nom / Prénom'] || 'Inconnu',
            email: row['Adresse e-mail'] || '',
            phone: row['Téléphone'] || '',
            address: row['Adresse de livraison'] || '',
            
            // Tes colonnes spécifiques Produits
            itemName: row['Nom de l’article'] || 'Article 3D',
            count: parseInt(row['Quantité'] || '1'),
            material: row['Matière'] || 'PLA',
            color: row['couleur'] || 'N/A', // Attention à la casse "couleur"
            
            amount: isNaN(cleanAmount) ? 0 : cleanAmount,
            paymentMode: row['Mode de paiement'] || 'Non précisé',
            method: row['Livraison'] || 'Standard',
            
            status: currentStatus,
            originalStatus: row['Statut'],
            urgent: (row['Urgent'] || '').toLowerCase() === 'oui'
          };
        });
        setOrders(mappedData.reverse()); // Plus récents en premier
        setLoading(false);
        addToast('Données synchronisées', 'success');
      },
      error: () => {
        setLoading(false);
        addToast('Erreur chargement CSV', 'error');
      }
    });
  }, [localStatusOverrides]);

  useEffect(() => { fetchData(); }, []);

  // ACTIONS
  const addToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  const handleStatusChange = (orderId: string, newStatus: OrderStatus) => {
    const updatedOverrides = { ...localStatusOverrides, [orderId]: newStatus };
    setLocalStatusOverrides(updatedOverrides);
    localStorage.setItem('localStatusOverrides', JSON.stringify(updatedOverrides));
    
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    
    addToast(`Statut changé : ${newStatus}`, 'success');
    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder({ ...selectedOrder, status: newStatus });
    }
  };

  const handleExport = () => {
    const csv = Papa.unparse(orders.map(({uniqueId, originalStatus, ...o}) => o));
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `export_atelier_${new Date().toLocaleDateString().replace(/\//g, '-')}.csv`;
    link.click();
  };

  // STATS ET FILTRES
  const stats = useMemo(() => {
    return {
      revenue: orders.reduce((acc, o) => acc + o.amount, 0),
      profit: orders.reduce((acc, o) => acc + calculateProfit(o.amount).profit, 0),
      pending: orders.filter(o => o.status.includes('préparer')).length,
      packing: orders.filter(o => o.status.includes('emballer')).length,
    };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    return orders.filter(o => 
      o.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.itemName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [orders, searchTerm]);

  // UI HELPERS
  const SidebarItem = ({ id, label, icon: Icon, count }: any) => (
    <button 
      onClick={() => setView(id)}
      className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-xl transition-all ${
        view === id 
        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' 
        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
      }`}
    >
      <div className="flex items-center gap-3"><Icon size={20}/> {label}</div>
      {count !== undefined && count > 0 && (
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
          view === id ? 'bg-indigo-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600'
        }`}>{count}</span>
      )}
    </button>
  );

  return (
    <div className={`min-h-screen font-sans ${darkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      <ToastContainer toasts={toasts} removeToast={(id) => setToasts(prev => prev.filter(t => t.id !== id))} />

      <div className="flex h-screen overflow-hidden">
        
        {/* SIDEBAR */}
        <aside className="w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex-col hidden md:flex z-20">
          <div className="p-6 flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Printer className="text-white" size={20}/>
            </div>
            <span className="text-xl font-bold tracking-tight">{APP_NAME}</span>
          </div>

          <div className="px-4 flex-1 overflow-y-auto space-y-1">
            <p className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 mt-4">Gestion</p>
            <SidebarItem id="dashboard" label="Vue Globale" icon={LayoutDashboard} />
            <SidebarItem id="orders" label="Toutes les commandes" icon={ShoppingCart} />
            
            <p className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 mt-6">Production</p>
            <SidebarItem id="production" label="À préparer" icon={Printer} count={stats.pending} />
            <SidebarItem id="packing" label="À emballer" icon={Package} count={stats.packing} />
            
            <p className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 mt-6">Messagerie</p>
            <SidebarItem id="inbox" label="Boîte de réception" icon={Inbox} count={2} />
            <SidebarItem id="sent" label="Éléments envoyés" icon={Send} />
          </div>

          <div className="p-4 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold">A</div>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-bold truncate">Admin</p>
                <p className="text-xs text-slate-500 truncate">Gestionnaire</p>
              </div>
            </div>
          </div>
        </aside>

        {/* MAIN */}
        <main className="flex-1 flex flex-col relative overflow-hidden">
          <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between z-10">
            <h2 className="text-lg font-bold capitalize">{view.replace('dashboard', 'Tableau de bord')}</h2>
            <div className="flex items-center gap-3">
               <div className="relative group hidden sm:block mr-4">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500" />
                <input type="text" placeholder="Rechercher..." className="pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm focus:outline-none w-64" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>
              <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">{darkMode ? <Sun size={20}/> : <Moon size={20}/>}</button>
              <button onClick={handleExport} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"><Download size={20}/></button>
              <button onClick={() => fetchData()} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"><RefreshCw size={20}/></button>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
              
              {/* DASHBOARD */}
              {view === 'dashboard' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in">
                   <Card className="p-6 border-l-4 border-l-emerald-500">
                      <p className="text-slate-500 text-sm font-medium">Chiffre d'Affaires</p>
                      <h3 className="text-3xl font-bold mt-2 text-slate-800 dark:text-white">{formatCurrency(stats.revenue)}</h3>
                   </Card>
                   <Card className="p-6 border-l-4 border-l-indigo-500">
                      <p className="text-slate-500 text-sm font-medium">Bénéfice Net</p>
                      <h3 className="text-3xl font-bold mt-2 text-slate-800 dark:text-white">{formatCurrency(stats.profit)}</h3>
                   </Card>
                   <Card className="p-6 border-l-4 border-l-amber-500">
                      <p className="text-slate-500 text-sm font-medium">À Préparer</p>
                      <h3 className="text-3xl font-bold mt-2 text-slate-800 dark:text-white">{stats.pending}</h3>
                   </Card>
                   <Card className="p-6 border-l-4 border-l-purple-500">
                      <p className="text-slate-500 text-sm font-medium">À Emballer</p>
                      <h3 className="text-3xl font-bold mt-2 text-slate-800 dark:text-white">{stats.packing}</h3>
                   </Card>
                </div>
              )}

              {/* MESSAGERIE */}
              {(view === 'inbox' || view === 'sent') && (
                 <MessagingSystem activeFolder={view as 'received' | 'sent'} />
              )}

              {/* LISTES (PRODUCTION / ORDERS) */}
              {['production', 'packing', 'orders'].includes(view) && (
                <>
                {view === 'production' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in">
                        {filteredOrders.filter(o => o.status.includes('préparer') || o.status.includes('cours')).map(order => (
                            <div key={order.uniqueId} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm hover:shadow-lg transition-all group" onClick={() => setSelectedOrder(order)}>
                                <div className="flex justify-between mb-2">
                                    <span className="text-xs bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded font-mono text-slate-500">{order.id}</span>
                                    <span className="text-xs text-slate-400">{order.date.split(' ')[0]}</span>
                                </div>
                                <h3 className="font-bold text-lg mb-1 dark:text-white truncate">{order.client}</h3>
                                <div className="flex gap-2 mb-3">
                                    <Badge color="indigo">{order.material}</Badge>
                                    <Badge color="slate">{order.color}</Badge>
                                    <Badge>x{order.count}</Badge>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700 mb-3">
                                    <p className="text-sm font-medium line-clamp-2 dark:text-slate-200">{order.itemName}</p>
                                </div>
                                <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-700">
                                    <span className="text-xs text-slate-500">Marge: {formatCurrency(calculateProfit(order.amount).profit)}</span>
                                    <button className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg">Détails</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {(view === 'orders' || view === 'packing') && (
                    <Card className="overflow-hidden animate-in fade-in">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase text-xs">
                                <tr>
                                    <th className="p-4">Ref</th>
                                    <th className="p-4">Date</th>
                                    <th className="p-4">Client</th>
                                    <th className="p-4">Statut</th>
                                    <th className="p-4">Produit</th>
                                    <th className="p-4 text-right">Montant</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {filteredOrders.filter(o => view === 'orders' ? true : o.status.includes('emballer')).map(order => (
                                    <tr key={order.uniqueId} className="hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer" onClick={() => setSelectedOrder(order)}>
                                        <td className="p-4 font-mono text-indigo-500">{order.id}</td>
                                        <td className="p-4 text-slate-500">{order.date.split(' ')[0]}</td>
                                        <td className="p-4 font-medium dark:text-slate-200">{order.client}</td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                order.status.includes('préparer') ? 'bg-amber-100 text-amber-800' : 
                                                order.status.includes('emballer') ? 'bg-purple-100 text-purple-800' :
                                                order.status.includes('Expédiée') ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-800'
                                            }`}>{order.status}</span>
                                        </td>
                                        <td className="p-4 dark:text-slate-300">
                                            <div className="truncate max-w-xs">{order.itemName}</div>
                                            <div className="text-xs text-slate-400">{order.material} - {order.color}</div>
                                        </td>
                                        <td className="p-4 text-right font-bold dark:text-slate-200">{formatCurrency(order.amount)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </Card>
                )}
                </>
              )}

            </div>
          </div>
        </main>
      </div>

      {/* MODAL DETAIL */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
           <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden max-h-[90vh] flex flex-col">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between">
                 <h3 className="text-xl font-bold dark:text-white">Commande {selectedOrder.id}</h3>
                 <button onClick={() => setSelectedOrder(null)}><X className="dark:text-white"/></button>
              </div>
              <div className="p-6 overflow-y-auto space-y-6">
                 {/* Changement Statut */}
                 <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl">
                    <p className="text-xs font-bold text-slate-400 uppercase mb-2">Changer Statut</p>
                    <div className="flex flex-wrap gap-2">
                        {['À préparer', 'En cours', 'À emballer', 'Expédiée'].map(s => (
                            <button key={s} onClick={() => handleStatusChange(selectedOrder.id, s as OrderStatus)}
                                className={`px-3 py-1 rounded border text-xs font-medium ${selectedOrder.status === s ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-slate-700 dark:text-white dark:border-slate-600'}`}>
                                {s}
                            </button>
                        ))}
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-6">
                    <div>
                        <h4 className="flex items-center gap-2 text-sm font-bold text-indigo-500 mb-2"><Users size={16}/> Client</h4>
                        <div className="dark:text-slate-300">
                            <p className="font-bold">{selectedOrder.client}</p>
                            <p className="text-sm">{selectedOrder.email}</p>
                            <p className="text-sm">{selectedOrder.phone}</p>
                        </div>
                    </div>
                    <div>
                        <h4 className="flex items-center gap-2 text-sm font-bold text-indigo-500 mb-2"><MapPin size={16}/> Livraison</h4>
                        <p className="text-sm dark:text-slate-300 whitespace-pre-line">{selectedOrder.address}</p>
                        <p className="text-xs text-slate-500 mt-1">Via {selectedOrder.method}</p>
                    </div>
                 </div>

                 <div>
                    <h4 className="flex items-center gap-2 text-sm font-bold text-indigo-500 mb-2"><Package size={16}/> Article</h4>
                    <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800">
                        <p className="text-lg font-bold dark:text-indigo-100">{selectedOrder.itemName}</p>
                        <div className="flex gap-3 mt-2">
                             <Badge color="white">Matière: {selectedOrder.material}</Badge>
                             <Badge color="white">Couleur: {selectedOrder.color}</Badge>
                             <Badge color="white">Qté: {selectedOrder.count}</Badge>
                        </div>
                    </div>
                 </div>

                 <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <p className="text-xs text-slate-500">Total ({selectedOrder.paymentMode})</p>
                        <p className="text-xl font-bold dark:text-white">{formatCurrency(selectedOrder.amount)}</p>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <p className="text-xs text-slate-500">Coût Fixe</p>
                        <p className="text-xl font-bold text-red-500">- 3,00 €</p>
                    </div>
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-lg">
                        <p className="text-xs text-emerald-600 font-bold">Bénéfice</p>
                        <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(calculateProfit(selectedOrder.amount).profit)}</p>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}