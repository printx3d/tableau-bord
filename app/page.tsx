"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Package, TrendingUp, Clock, CheckCircle, XCircle, Truck, 
  User, Mail, Phone, MapPin, CreditCard, Calendar, RefreshCw, AlertCircle, DollarSign
} from 'lucide-react';

// --- CONFIGURATION ---
const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRcYQCI6W3JQDsGT3Sn0P1n5r8tiOEsYrnT08kOxyW_ZsFZvT3DR5WeaUshn_1Qtp6lWuTsW4HpdWPj/pub?output=csv';

const STORAGE_KEY = 'print3d_orders';
const STATUS_KEY = 'print3d_status';
const AUTH_KEY = 'print3d_auth';
// Lecture du secret depuis la variable d'environnement (accessible côté client)
const SECRET_PASSWORD = process.env.NEXT_PUBLIC_DASHBOARD_PASSWORD;

// COÛT FIXE ET BÉNÉFICE MARGE
const FIXED_COST = 3.00;
const PROFIT_MARGIN = 0.50;

// --- TYPESCRIPT INTERFACE ---
interface Order {
  id: string;
  timestamp: string;
  customerName: string;
  email: string;
  phone: string;
  address: string;
  product: string;
  quantity: number;
  color: string;
  material: string;
  delivery: string;
  total: number;
  paymentMethod: string;
  status: string;
  profit: number;
}

interface StatusItem {
    id: string;
    label: string;
    icon: React.ElementType;
    color: string;
}

const statuses: StatusItem[] = [
  { id: 'pending', label: 'En attente', icon: Clock, color: 'bg-yellow-500' },
  { id: 'in_production', label: 'En production', icon: Package, color: 'bg-blue-500' },
  { id: 'quality_check', label: 'Contrôle qualité', icon: CheckCircle, color: 'bg-purple-500' },
  { id: 'ready', label: 'Prêt', icon: TrendingUp, color: 'bg-green-500' },
  { id: 'shipped', label: 'Expédié', icon: Truck, color: 'bg-indigo-500' },
  { id: 'completed', label: 'Terminé', icon: CheckCircle, color: 'bg-gray-500' },
  { id: 'cancelled', label: 'Annulé', icon: XCircle, color: 'bg-red-500' }
];

// Fonction utilitaire pour nettoyer et convertir les totaux en nombre
const cleanAndParseTotal = (totalString: string): number => {
  if (!totalString) return 0;
  const cleaned = totalString.replace(/[^0-9,.]/g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
};

// Fonction de calcul de Bénéfice
const calculateProfit = (total: number): number => {
  const profit = (total - FIXED_COST) * PROFIT_MARGIN;
  return Math.max(0, profit); 
};

// --- Composant Principal ---
export default function Dashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [orders, setOrders] = useState<Order[]>([]); 
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null); 
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null); 
  const [syncError, setSyncError] = useState<string | null>(null); 

  // Charger l'authentification
  useEffect(() => {
    const authStatus = localStorage.getItem(AUTH_KEY);
    if (authStatus === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  // Fonction de parsing CSV
  const parseCSV = (csvText: string): Order[] => {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length <= 1) return [];

    const savedStatuses = JSON.parse(localStorage.getItem(STATUS_KEY) || '{}');
    const parsedOrders: Order[] = []; 

    for (let i = 1; i < lines.length; i++) {
        // Regex robuste pour gérer les valeurs entre guillemets contenant des virgules
        const values = lines[i].match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || [];
        const cleanValues = values.map(v => v.trim().replace(/^"|"$/g, ''));
        
        if (cleanValues.length >= 13 && cleanValues[1]) {
            const total = cleanAndParseTotal(cleanValues[11]);
            const orderId = cleanValues[1];

            const order: Order = {
                id: orderId,
                timestamp: cleanValues[0],
                customerName: cleanValues[2],
                email: cleanValues[3],
                phone: cleanValues[4],
                address: cleanValues[5],
                product: cleanValues[6],
                quantity: parseInt(cleanValues[7]) || 1,
                color: cleanValues[8],
                material: cleanValues[9],
                delivery: cleanValues[10],
                total: total, 
                paymentMethod: cleanValues[12],
                status: savedStatuses[orderId] || 'pending',
                profit: calculateProfit(total)
            };
            parsedOrders.push(order);
        }
    }
    // Retourne les commandes du plus récent au plus ancien (index du CSV croissant)
    return parsedOrders.reverse();
  };

  // Fonction pour charger les données depuis Google Sheets
  const loadFromGoogleSheets = async () => {
    setIsLoading(true);
    setSyncError(null);
    
    try {
      const response = await fetch(SHEET_CSV_URL);
      
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      
      const csvText = await response.text();
      
      if (!csvText || csvText.trim().length < 100) { 
        throw new Error('Aucune donnée reçue ou fichier vide.');
      }
      
      const newOrders = parseCSV(csvText);
      
      if (newOrders.length === 0) {
        throw new Error('Aucune commande trouvée ou format CSV invalide.');
      }
      
      setOrders(newOrders);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newOrders)); 
      setLastSync(new Date());
      
    } catch (error: any) { 
      console.error('Erreur de synchronisation:', error);
      setSyncError(`Erreur: ${error.message}. Vérifiez la publication du Google Sheet.`);
      
      const savedOrders = localStorage.getItem(STORAGE_KEY);
      if (savedOrders) {
        setOrders(JSON.parse(savedOrders));
        console.log(`📦 Commandes chargées depuis le cache local`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Chargement initial et intervalle
  useEffect(() => {
    if (isAuthenticated) {
      loadFromGoogleSheets(); 
      const interval = setInterval(loadFromGoogleSheets, 120000); 
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  const handleLogin = (e: React.FormEvent) => { 
    e.preventDefault();
    if (password === SECRET_PASSWORD) {
      setIsAuthenticated(true);
      localStorage.setItem(AUTH_KEY, 'true');
    } else {
      alert('Mot de passe incorrect');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem(AUTH_KEY);
    setPassword('');
  };

  const updateOrderStatus = (orderId: string, newStatus: string) => { 
    const updatedOrders = orders.map(order => 
      order.id === orderId ? { ...order, status: newStatus } : order
    );
    
    setOrders(updatedOrders);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedOrders));
    
    const savedStatuses = JSON.parse(localStorage.getItem(STATUS_KEY) || '{}');
    savedStatuses[orderId] = newStatus;
    localStorage.setItem(STATUS_KEY, JSON.stringify(savedStatuses));
  };

  // Filtres et Statistiques
  const filteredOrders = useMemo(() => orders.filter(order => {
    const matchesStatus = selectedStatus === 'all' || order.status === selectedStatus;
    const matchesSearch = order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          order.product.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  }), [orders, selectedStatus, searchTerm]);

  const stats = useMemo(() => {
    const counts = statuses.reduce((acc, status) => {
      acc[status.id] = orders.filter(o => o.status === status.id).length;
      return acc;
    }, {} as Record<string, number>); 
    
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
    const totalProfit = orders.reduce((sum, order) => sum + order.profit, 0);

    return { counts, totalOrders, totalRevenue, totalProfit };
  }, [orders]);


  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Print3D Dashboard</h1>
            <p className="text-gray-600">Gestion des Commandes E-commerce</p>
          </div>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin(e)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Entrez le mot de passe"
              />
            </div>
            <button
              onClick={handleLogin}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-105"
            >
              Se connecter
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        
        {/* NOUVELLE SECTION : Graphique des Statuts (Affiché seulement si totalOrders > 0) */}
        {stats.totalOrders > 0 && (
            <div className="p-4 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center space-x-2">
                    <TrendingUp className="w-4 h-4 text-purple-600" />
                    <span>Statut des Commandes ({stats.totalOrders})</span>
                </h3>
                <OrderCountChart counts={stats.counts} statuses={statuses} totalOrders={stats.totalOrders} />
            </div>
        )}
        
        {/* Sidebar Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <button
            onClick={() => setSelectedStatus('all')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
              selectedStatus === 'all' ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <span className="font-medium">Toutes les commandes</span>
            <span className="bg-gray-200 px-2 py-1 rounded-full text-xs font-semibold">{stats.totalOrders}</span>
          </button>

          {statuses.map(status => {
            const Icon = status.icon;
            return (
              <button
                key={status.id}
                onClick={() => setSelectedStatus(status.id)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
                  selectedStatus === status.id ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`${status.color} w-2 h-2 rounded-full`}></div>
                  <span className="text-sm font-medium">{status.label}</span>
                </div>
                <span className="bg-gray-200 px-2 py-1 rounded-full text-xs font-semibold">
                  {stats.counts[status.id] || 0}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Sync/Logout */}
        <div className="p-4 border-t border-gray-200 space-y-2">
          {lastSync && (
            <p className="text-xs text-gray-500 text-center">
              Dernière synchro: {lastSync.toLocaleTimeString()}
            </p>
          )}
          <button
            onClick={loadFromGoogleSheets}
            disabled={isLoading}
            className="w-full bg-blue-50 text-blue-600 py-2 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium flex items-center justify-center space-x-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Synchro...' : 'Synchroniser'}</span>
          </button>
          <button
            onClick={handleLogout}
            className="w-full bg-red-50 text-red-600 py-2 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
          >
            Déconnexion
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 p-6">
          {syncError && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <span className="text-sm text-red-700">{syncError}</span>
            </div>
          )}
          
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-800">Gestion des Commandes</h1>
            <input
              type="text"
              placeholder="Rechercher une commande..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg w-64 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard 
                title="Total Commandes" 
                value={stats.totalOrders} 
                icon={Package} 
                color="blue"
            />
            <StatCard 
                title="Chiffre d'affaires" 
                value={`${stats.totalRevenue.toFixed(2)}€`} 
                icon={DollarSign} 
                color="green"
            />
            <StatCard 
                title="Bénéfice Net" 
                value={`${stats.totalProfit.toFixed(2)}€`} 
                icon={TrendingUp} 
                color="purple"
                subtitle="(T-3€) x 50%"
            />
          </div>
        </header>

        {/* Orders List */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredOrders.map(order => {
              const status = statuses.find(s => s.id === order.status);
              const StatusIcon = status?.icon || Clock;
              
              return (
                <div
                  key={order.id}
                  onClick={() => setSelectedOrder(order)}
                  className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-800">{order.customerName}</h3>
                      <p className="text-sm text-gray-500">{order.id}</p>
                    </div>
                    <div className={`${status?.color} px-3 py-1 rounded-full flex items-center space-x-1`}>
                      <StatusIcon className="w-3 h-3 text-white" />
                      <span className="text-xs text-white font-medium">{status?.label}</span>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <p className="text-sm text-gray-700 font-medium">{order.product}</p>
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span className="flex items-center">
                        <span className="w-3 h-3 rounded-full mr-1 bg-gray-300"></span>
                        {order.color}
                      </span>
                      <span>{order.material}</span>
                      <span>Qty: {order.quantity}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div>
                        <span className="text-lg font-bold text-gray-800">{order.total.toFixed(2)}€</span>
                        <p className="text-xs font-semibold text-green-600">Bénéfice: {order.profit.toFixed(2)}€</p>
                    </div>
                    <span className="text-xs text-gray-500">{order.timestamp.split(' ')[0]}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredOrders.length === 0 && (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Aucune commande trouvée</p>
            </div>
          )}
        </div>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setSelectedOrder(null)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-t-2xl">
              <h2 className="text-2xl font-bold mb-2">Détails de la Commande</h2>
              <p className="opacity-90">{selectedOrder.id}</p>
            </div>

            <div className="p-6 space-y-6">
              {/* Client Info */}
              <DetailSection title="Informations Client" icon={User}>
                <p className="text-gray-700"><strong>Nom:</strong> {selectedOrder.customerName}</p>
                <DetailItem icon={Mail} value={selectedOrder.email} />
                <DetailItem icon={Phone} value={selectedOrder.phone} />
                <DetailItem icon={MapPin} value={selectedOrder.address} />
              </DetailSection>

              {/* Product Info */}
              <DetailSection title="Détails du Produit" icon={Package}>
                <p className="text-gray-700"><strong>Produit:</strong> {selectedOrder.product}</p>
                <p className="text-gray-700"><strong>Quantité:</strong> {selectedOrder.quantity}</p>
                <p className="text-gray-700"><strong>Couleur:</strong> {selectedOrder.color}</p>
                <p className="text-gray-700"><strong>Matière:</strong> {selectedOrder.material}</p>
                <p className="text-gray-700"><strong>Livraison:</strong> {selectedOrder.delivery}</p>
              </DetailSection>

              {/* Payment Info */}
              <DetailSection title="Paiement & Rentabilité" icon={CreditCard}>
                <p className="text-gray-700"><strong>Total Payé:</strong> <span className="text-2xl font-bold text-green-600">{selectedOrder.total.toFixed(2)}€</span></p>
                <p className="text-gray-700"><strong>Bénéfice Net:</strong> <span className="text-xl font-bold text-purple-600">{selectedOrder.profit.toFixed(2)}€</span></p>
                <p className="text-gray-700"><strong>Mode:</strong> {selectedOrder.paymentMethod}</p>
                <DetailItem icon={Calendar} value={selectedOrder.timestamp} />
              </DetailSection>

              {/* Status Update */}
              <div>
                <h3 className="font-semibold text-gray-800 mb-3">Modifier le Statut</h3>
                <div className="grid grid-cols-2 gap-2">
                  {statuses.map(status => {
                    const Icon = status.icon;
                    return (
                      <button
                        key={status.id}
                        onClick={() => {
                          updateOrderStatus(selectedOrder.id, status.id);
                          setSelectedOrder({ ...selectedOrder, status: status.id });
                        }}
                        className={`flex items-center justify-center space-x-2 px-4 py-3 rounded-lg transition-all ${
                          selectedOrder.status === status.id
                            ? `${status.color} text-white shadow-lg`
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-sm font-medium">{status.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="p-6 bg-gray-50 rounded-b-2xl">
              <button
                onClick={() => setSelectedOrder(null)}
                className="w-full bg-gray-800 text-white py-3 rounded-lg hover:bg-gray-900 transition-colors font-semibold"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- SOUS-COMPOSANTS ---

// Composant OrderCountChart modifié pour ne rien retourner si totalOrders est 0
function OrderCountChart({ counts, statuses, totalOrders }: { counts: Record<string, number>, statuses: StatusItem[], totalOrders: number }) {
    if (totalOrders === 0) {
        return null; // Retourne null pour ne rien afficher
    }

    const maxCount = Math.max(...Object.values(counts));

    return (
        <div className="space-y-3">
            {statuses.map(status => {
                const count = counts[status.id] || 0;
                // Calcul du pourcentage basé sur la commande la plus nombreuse pour la longueur de la barre (maxCount)
                const percentage = totalOrders > 0 ? (count / maxCount) * 100 : 0; 
                // Calcul du pourcentage basé sur le total des commandes pour l'affichage (totalOrders)
                const displayPercentage = totalOrders > 0 ? ((count / totalOrders) * 100).toFixed(0) : 0; 
                
                return (
                    <div key={status.id} className="text-xs">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-gray-700">{status.label}</span>
                            <span className="font-semibold text-gray-600">{count} ({displayPercentage}%)</span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                                className={`h-full ${status.color}`}
                                style={{ width: `${percentage}%`, transition: 'width 0.5s ease-in-out' }}
                            ></div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}


function StatCard({ title, value, icon: Icon, color, subtitle }: { title: string, value: string | number, icon: React.ElementType, color: string, subtitle?: string }) {
    const colorClasses: Record<string, string> = {
        blue: "from-blue-500 to-blue-600",
        green: "from-green-500 to-green-600",
        purple: "from-purple-500 to-purple-600",
    };
    
    return (
        <div className={`bg-gradient-to-br ${colorClasses[color]} rounded-xl p-4 text-white shadow-lg`}>
            <div className="flex justify-between items-start mb-1">
                <p className="text-sm opacity-90">{title}</p>
                <Icon className="w-5 h-5 opacity-80" />
            </div>
            <p className="text-3xl font-bold mt-1">{value}</p>
            {subtitle && <p className="text-xs opacity-70 mt-1">{subtitle}</p>}
        </div>
    );
}

function DetailSection({ title, icon: Icon, children }: { title: string, icon: React.ElementType, children: React.ReactNode }) {
    return (
        <div>
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
                <Icon className="w-5 h-5 mr-2 text-blue-600" />
                {title}
            </h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                {children}
            </div>
        </div>
    );
}

function DetailItem({ icon: Icon, value }: { icon: React.ElementType, value: string }) {
    return (
        <p className="text-gray-700 flex items-center">
            <Icon className="w-4 h-4 mr-2 text-gray-500 shrink-0" />
            {value}
        </p>
    );
}
