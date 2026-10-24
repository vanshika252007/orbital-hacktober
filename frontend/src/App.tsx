import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { NetworkOverview } from './components/dashboard/NetworkOverview';
import { DevicesPage } from './components/devices/DevicesPage';
import { AlertsPage } from './components/alerts/AlertsPage';
import { DeviceDetailPage } from './components/devices/DeviceDetailPage';
import { InvestigationWorkspace } from './components/investigation/InvestigationWorkspace';
import { api, registerBackendStatusListener } from './services/api';
import {
  ActivePage,
  NetworkStats,
  DeviceListItem,
  Alert,
  Device,
  TimelineEntry,
  Investigation
} from './types';
import { Info, CheckCircle2, AlertOctagon } from 'lucide-react';

export default function App() {
  const [activePage, setActivePage] = useState<ActivePage>('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);

  // Core Data State
  const [stats, setStats] = useState<NetworkStats>({
    total_devices: 42,
    active_anomalies: 0,
    critical_count: 0,
    total_events: 7056,
    network_health: 'HEALTHY',
  });
  const [devices, setDevices] = useState<DeviceListItem[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);

  // Selected State for Deep-Dive Views
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [selectedDeviceTimeline, setSelectedDeviceTimeline] = useState<TimelineEntry[]>([]);
  const [investigation, setInvestigation] = useState<Investigation | null>(null);

  // System & Connection State
  const [isSimulationActive, setIsSimulationActive] = useState<boolean>(false);
  const [isBackendOnline, setIsBackendOnline] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [loadingAction, setLoadingAction] = useState<boolean>(false);
  const [isRegeneratingInv, setIsRegeneratingInv] = useState<boolean>(false);

  // Toast feedback
  const [toast, setToast] = useState<{ message: string; type: 'info' | 'healthy' | 'critical' } | null>(null);

  const showToast = (message: string, type: 'info' | 'healthy' | 'critical' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Register status listener
  useEffect(() => {
    registerBackendStatusListener((online: boolean) => {
      setIsBackendOnline(online);
    });
  }, []);

  // Central data loader
  const refreshData = useCallback(async (showIndicator = false) => {
    if (showIndicator) setIsRefreshing(true);
    try {
      const [healthRes, statsRes, devicesRes, alertsRes, timelineRes] = await Promise.all([
        api.getHealth(),
        api.getStats(),
        api.getDevices(),
        api.getAlerts(),
        api.getDeviceTimeline('192.168.1.23'),
      ]);

      const active =
        (healthRes && healthRes.simulation_active) ||
        (statsRes && statsRes.critical_count > 0) ||
        (alertsRes && alertsRes.length > 0) ||
        api.isSimulationActiveLocally();

      setIsSimulationActive(Boolean(active));
      setStats(statsRes);
      setDevices(devicesRes);
      setAlerts(alertsRes);
      setTimeline(timelineRes);

      // Preload hero investigation if active and none selected
      if (active && alertsRes.length > 0 && !investigation) {
        api.getInvestigation(alertsRes[0].id).then((inv) => setInvestigation(inv)).catch(() => {});
      }
    } catch (err: any) {
      console.warn("Telemetry refresh warning:", err.message);
    } finally {
      if (showIndicator) {
        setTimeout(() => setIsRefreshing(false), 250);
      }
    }
  }, [investigation]);

  // Initial load
  useEffect(() => {
    refreshData(true);
  }, [refreshData]);

  // Periodic polling every 3.5s
  useEffect(() => {
    const interval = setInterval(() => {
      refreshData(false);
    }, 3500);
    return () => clearInterval(interval);
  }, [refreshData]);

  // Start Simulation
  const handleStartSimulation = async () => {
    setLoadingAction(true);
    try {
      await api.startSimulation();
      setIsSimulationActive(true);
      showToast("Hero scenario injected: Student-Laptop breached baseline at 03:17 AM (Risk: 94/100)", "critical");
      await refreshData(true);
      // Pre-fetch investigation
      const inv = await api.getInvestigation('alert_hero_001');
      setInvestigation(inv);
    } catch (err: any) {
      showToast("Simulation trigger failed: " + err.message, "critical");
    } finally {
      setLoadingAction(false);
    }
  };

  // Reset Simulation
  const handleResetSimulation = async () => {
    setLoadingAction(true);
    try {
      await api.resetSimulation();
      setIsSimulationActive(false);
      showToast("Simulation reset: All 42 subnet nodes restored to baseline", "healthy");
      await refreshData(true);
      if (activePage === 'investigation') {
        setActivePage('overview');
      }
    } catch (err: any) {
      showToast("Reset failed: " + err.message, "critical");
    } finally {
      setLoadingAction(false);
    }
  };

  // Navigate to device detail
  const handleSelectDevice = async (deviceId: string) => {
    try {
      const [dev, devTimeline] = await Promise.all([
        api.getDevice(deviceId),
        api.getDeviceTimeline(deviceId),
      ]);
      setSelectedDevice(dev);
      setSelectedDeviceTimeline(devTimeline);
      setActivePage('device-detail');
    } catch (err: any) {
      showToast("Failed loading device details: " + err.message, "critical");
    }
  };

  // Navigate to investigation
  const handleOpenInvestigation = async (alertId: string) => {
    try {
      const inv = await api.getInvestigation(alertId);
      setInvestigation(inv);
      setActivePage('investigation');
    } catch (err: any) {
      showToast("Unable to load investigation: " + err.message, "critical");
    }
  };

  // Regenerate investigation
  const handleRegenerateInvestigation = async () => {
    if (!investigation) return;
    setIsRegeneratingInv(true);
    try {
      const updated = await api.generateInvestigation(investigation.alert_id);
      setInvestigation(updated);
      showToast("Investigation report regenerated via SOC Intelligence Engine", "info");
    } catch (err: any) {
      showToast("Regeneration failed: " + err.message, "critical");
    } finally {
      setIsRegeneratingInv(false);
    }
  };

  // Page title & breadcrumb helpers
  const getPageMeta = () => {
    switch (activePage) {
      case 'overview':
        return { title: 'Network Overview', breadcrumb: 'Overview' };
      case 'devices':
        return { title: 'Monitored Devices', breadcrumb: 'Endpoints' };
      case 'alerts':
        return { title: 'Security Alerts', breadcrumb: 'Alerts' };
      case 'device-detail':
        return { title: `Device: ${selectedDevice?.name || 'Endpoint'}`, breadcrumb: 'Endpoints / Detail' };
      case 'investigation':
        return { title: 'Investigation Workspace', breadcrumb: 'SOC / Investigation' };
      default:
        return { title: 'Network Anomaly Spotter', breadcrumb: undefined };
    }
  };

  const { title, breadcrumb } = getPageMeta();
  const criticalCount = alerts.filter((a) => a.severity === 'CRITICAL').length;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-app)' }}>
      
      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 9999,
            padding: '0.85rem 1.25rem',
            borderRadius: '10px',
            backgroundColor: toast.type === 'critical' ? '#FF657A' : (toast.type === 'healthy' ? '#42D6A0' : '#17211C'),
            color: toast.type === 'healthy' ? '#080B0D' : '#FFFFFF',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '0 8px 30px rgba(0,0,0,0.7)',
            fontSize: '0.84rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          {toast.type === 'critical' ? <AlertOctagon size={18} /> : (toast.type === 'healthy' ? <CheckCircle2 size={18} /> : <Info size={18} />)}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Left Application Sidebar */}
      <Sidebar
        activePage={activePage}
        onNavigate={(page) => setActivePage(page)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        criticalAlertCount={criticalCount}
        isBackendOnline={isBackendOnline}
      />

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        
        {/* Sticky Top Header */}
        <Header
          activePage={activePage}
          pageTitle={title}
          breadcrumb={breadcrumb}
          isSimulationActive={isSimulationActive}
          isBackendOnline={isBackendOnline}
          onStartSimulation={handleStartSimulation}
          onResetSimulation={handleResetSimulation}
          onQuickInvestigate={() => handleOpenInvestigation('alert_hero_001')}
          onRefresh={() => refreshData(true)}
          isRefreshing={isRefreshing}
          loadingAction={loadingAction}
          hasActiveAlert={alerts.length > 0}
        />

        {/* Page Content View */}
        <main style={{ flex: 1, padding: '2rem', maxWidth: '1440px', width: '100%', margin: '0 auto' }}>
          {activePage === 'overview' && (
            <NetworkOverview
              stats={stats}
              devices={devices}
              alerts={alerts}
              timeline={timeline}
              isSimulationActive={isSimulationActive}
              onSelectDevice={handleSelectDevice}
              onOpenInvestigation={handleOpenInvestigation}
              onStartSimulation={handleStartSimulation}
              onResetSimulation={handleResetSimulation}
              loadingAction={loadingAction}
            />
          )}

          {activePage === 'devices' && (
            <DevicesPage
              devices={devices}
              onSelectDevice={handleSelectDevice}
            />
          )}

          {activePage === 'alerts' && (
            <AlertsPage
              alerts={alerts}
              onOpenInvestigation={handleOpenInvestigation}
              onInspectDevice={handleSelectDevice}
            />
          )}

          {activePage === 'device-detail' && selectedDevice && (
            <DeviceDetailPage
              device={selectedDevice}
              timeline={selectedDeviceTimeline}
              onBack={() => setActivePage('devices')}
              onOpenInvestigation={handleOpenInvestigation}
            />
          )}

          {activePage === 'investigation' && (
            <InvestigationWorkspace
              investigation={investigation}
              onRegenerate={handleRegenerateInvestigation}
              isRegenerating={isRegeneratingInv}
              onNavigateToDevice={handleSelectDevice}
            />
          )}
        </main>

        {/* Minimal Footer */}
        <footer
          style={{
            padding: '1.25rem 2rem',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.74rem',
            color: 'var(--text-dim)',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <div>
            Network Anomaly Spotter &bull; Hacktober Team Edition &bull; Teammate 3 (Frontend UI)
          </div>
          <div style={{ display: 'flex', gap: '1.25rem' }}>
            <span>Detect the deviation</span>
            <span>Explain the evidence</span>
            <span>Prioritize the investigation</span>
          </div>
        </footer>

      </div>

    </div>
  );
}
