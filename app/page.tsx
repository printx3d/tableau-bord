import React, { useState, useEffect } from 'react';
import { Package, TrendingUp, Clock, CheckCircle, XCircle, Truck, User, Mail, Phone, MapPin, CreditCard, Calendar, RefreshCw, AlertCircle } from 'lucide-react';

const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRcYQCI6W3JQDsGT3Sn0P1n5r8tiOEsYrnT08kOxyW_ZsFZvT3DR5WeaUshn_1Qtp6lWuTsW4HpdWPj/pub?output=csv';

const STORAGE_KEY = 'print3d_orders';
const STATUS_KEY = 'print3d_status';
const AUTH_KEY = 'print3d_auth';
const SECRET_PASSWORD = 'PRINT3D2025';

const statuses = [
  { id: 'pending', label: 'En attente', icon: Clock, color: 'bg-yellow-500' },
  { id: 'in_production', label: 'En production', icon: Package, color: 'bg-blue-500' },
  { id: 'quality_check', label: 'Contrôle qualité', icon: CheckCircle, color: 'bg-purple-500' },
  { id: 'ready', label: 'Prêt', icon: TrendingUp, color: 'bg-green-500' },
  { id: 'shipped', label: 'Expédié', icon: Truck, color: 'bg-indigo-500' },
  { id: 'completed', label: 'Terminé', icon: CheckCircle, color: 'bg-gray-500' },
  { id: 'cancelled', label: 'Annulé', icon: XCircle, color: 'bg-red-500' }
];

export default function Dashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [orders, setOrders] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [syncError, setSyncError] = useState(null);

  // Charger l'authentification au démarrage
  useEffect(() => {
    const authStatus = localStorage.getItem(AUTH_KEY);
    if (authStatus === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  // Fonction pour parser le CSV
  const parseCSV = (csvText) => {
    const lines = csvText.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    
    const parsedOrders = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = [];
      let current = '';
      let insideQuotes = false;
      
      for (let char of lines[i]) {
        if (char === '"') {
          insideQuotes = !insideQuotes;
        } else if (char === ',' && !insideQuotes) {
          values.push(current.trim().replace(/"/g, ''));
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim().replace(/"/g, ''));
      
      if (values.length >= 13 && values[1]) {
        const order = {
          id: values[1],
          timestamp: values[0],
          customerName: values[2],
          email: values[3],
          phone: values[4],
          address: values[5],
          product: values[6],
          quantity: parseInt(values[7]) || 1,
          color: values[8],
          material: values[9],
          delivery: values[10],
          total: values[11],
          paymentMethod: values[12],
          status: 'pending'
        };
        parsedOrders.push(order);
      }
    }
    
    return parsedOrders;
  };

  // Fonction pour charger les données depuis Google Sheets
  const loadFromGoogleSheets = async () => {
    setIsLoading(true);
    setSyncError(null);
    
    try {
      // Méthode alternative avec CORS proxy
      const response = await fetch(SHEET_CSV_URL);
      
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      
      const csvText = await response.text();
      
      // Vérifier que nous avons bien reçu des données
      if (!csvText || csvText.trim().length === 0) {
        throw new Error('Aucune donnée reçue du Google Sheet');
      }
      
      const newOrders = parseCSV(csvText);
      
      if (newOrders.length === 0) {
        throw new Error('Aucune commande trouvée dans le Google Sheet');
      }
      
      // Récupérer les statuts sauvegardés
      const savedStatuses = JSON.parse(localStorage.getItem(STATUS_KEY) || '{}');
      
      // Appliquer les statuts sauvegardés
      const ordersWithStatus = newOrders.map(order => ({
        ...order,
        status: savedStatuses[order.id] || 'pending'
      }));
      
      setOrders(ordersWithStatus);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ordersWithStatus));
      setLastSync(new Date());
      
      console.log(`✅ ${newOrders.length} commandes chargées avec succès`);
      
    } catch (error) {
      console.error('Erreur de synchronisation:', error);
      setSyncError(`Erreur: ${error.message}. Vérifiez que le Google Sheet est publié sur le web.`);
      
      // Charger depuis localStorage en cas d'erreur
      const savedOrders = localStorage.getItem(STORAGE_KEY);
      if (savedOrders) {
        const parsed = JSON.parse(savedOrders);
        setOrders(parsed);
        console.log(`📦 ${parsed.length} commandes chargées depuis le cache local`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Charger les données au montage et toutes les 2 minutes
  useEffect(() => {
    if (isAuthenticated) {
      loadFromGoogleSheets();
      const interval = setInterval(loadFromGoogleSheets, 120000); // 2 minutes
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  const handleLogin = (e) => {
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

  const updateOrderStatus = (orderId, newStatus) => {
    const updatedOrders = orders.map(order => 
      order.id === orderId ? { ...order, status: newStatus } : order
    );
    
    setOrders(updatedOrders);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedOrders));
    
    // Sauvegarder le statut séparément
    const savedStatuses = JSON.parse(localStorage.getItem(STATUS_KEY) || '{}');
    savedStatuses[orderId] = newStatus;
    localStorage.setItem(STATUS_KEY, JSON.stringify(savedStatuses));
  };

  const filteredOrders = orders.filter(order => {
    const matchesStatus = selectedStatus === 'all' || order.status === selectedStatus;
    const matchesSearch = order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.product.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusCounts = () => {
    return statuses.reduce((acc, status) => {
      acc[status.id] = orders.filter(o => o.status === status.id).length;
      return acc;
    }, {});
  };

  const statusCounts = getStatusCounts();
  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, order) => {
    return sum + parseFloat(order.total.replace('€', '').replace(',', '.').trim());
  }, 0);

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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mot de passe
              </label>
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
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 w-10 h-10 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-gray-800">Print3D</h2>
              <p className="text-xs text-gray-500">Dashboard</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <button
            onClick={() => setSelectedStatus('all')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
              selectedStatus === 'all' ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <span className="font-medium">Toutes</span>
            <span className="bg-gray-200 px-2 py-1 rounded-full text-xs font-semibold">{totalOrders}</span>
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
                  {statusCounts[status.id] || 0}
                </span>
              </button>
            );
          })}
        </nav>

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
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white">
              <p className="text-sm opacity-90">Total Commandes</p>
              <p className="text-3xl font-bold mt-1">{totalOrders}</p>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white">
              <p className="text-sm opacity-90">Chiffre d'affaires</p>
              <p className="text-3xl font-bold mt-1">{totalRevenue.toFixed(2)}€</p>
            </div>
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white">
              <p className="text-sm opacity-90">En production</p>
              <p className="text-3xl font-bold mt-1">{statusCounts.in_production || 0}</p>
            </div>
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
                    <span className="text-lg font-bold text-gray-800">{order.total}</span>
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
              <div>
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
                  <User className="w-5 h-5 mr-2 text-blue-600" />
                  Informations Client
                </h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <p className="text-gray-700"><strong>Nom:</strong> {selectedOrder.customerName}</p>
                  <p className="text-gray-700 flex items-center">
                    <Mail className="w-4 h-4 mr-2 text-gray-500" />
                    {selectedOrder.email}
                  </p>
                  <p className="text-gray-700 flex items-center">
                    <Phone className="w-4 h-4 mr-2 text-gray-500" />
                    {selectedOrder.phone}
                  </p>
                  <p className="text-gray-700 flex items-center">
                    <MapPin className="w-4 h-4 mr-2 text-gray-500" />
                    {selectedOrder.address}
                  </p>
                </div>
              </div>

              {/* Product Info */}
              <div>
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
                  <Package className="w-5 h-5 mr-2 text-blue-600" />
                  Détails du Produit
                </h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <p className="text-gray-700"><strong>Produit:</strong> {selectedOrder.product}</p>
                  <p className="text-gray-700"><strong>Quantité:</strong> {selectedOrder.quantity}</p>
                  <p className="text-gray-700"><strong>Couleur:</strong> {selectedOrder.color}</p>
                  <p className="text-gray-700"><strong>Matière:</strong> {selectedOrder.material}</p>
                  <p className="text-gray-700"><strong>Livraison:</strong> {selectedOrder.delivery}</p>
                </div>
              </div>

              {/* Payment Info */}
              <div>
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
                  <CreditCard className="w-5 h-5 mr-2 text-blue-600" />
                  Paiement
                </h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <p className="text-gray-700"><strong>Total:</strong> <span className="text-2xl font-bold text-green-600">{selectedOrder.total}</span></p>
                  <p className="text-gray-700"><strong>Mode:</strong> {selectedOrder.paymentMethod}</p>
                  <p className="text-gray-700 flex items-center">
                    <Calendar className="w-4 h-4 mr-2 text-gray-500" />
                    {selectedOrder.timestamp}
                  </p>
                </div>
              </div>

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
