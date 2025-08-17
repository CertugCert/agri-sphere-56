import { Route, Routes } from 'react-router-dom';
import { RequireAuthMaster } from '@/guards/RequireAuthMaster';
import { RequireAuthTenant } from '@/guards/RequireAuthTenant';

// Landing & Auth
import Landing from '@/pages/Landing';

// Master Admin
import AdminLogin from '@/pages/admin/AdminLogin';
import AdminTenants from '@/pages/admin/AdminTenants';

// Tenant
import TenantLogin from '@/pages/tenant/TenantLogin';
import TenantHome from '@/pages/tenant/TenantHome';

// Tenant Suporte
import SuporteHome from '@/pages/tenant/suporte/SuporteHome';
import NewTicket from '@/pages/support/NewTicket';
import SupportList from '@/pages/support/SupportList';
import SupportDetail from '@/pages/support/SupportDetail';

// Other modules (placeholders)
import NotFound from '@/pages/NotFound';

function PlaceholderModule({ title }: { title: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-4">{title}</h1>
        <p className="text-muted-foreground">Módulo em desenvolvimento</p>
      </div>
    </div>
  );
}

export default function MultitenantRoutes() {
  return (
    <Routes>
      {/* Landing */}
      <Route path="/" element={<Landing />} />
      
      {/* Master Admin */}
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin/tenants" element={
        <RequireAuthMaster>
          <AdminTenants />
        </RequireAuthMaster>
      } />
      
      {/* Tenant Auth */}
      <Route path="/t/:slug/login" element={<TenantLogin />} />
      
      {/* Tenant Home */}
      <Route path="/t/:slug/home" element={
        <RequireAuthTenant>
          <TenantHome />
        </RequireAuthTenant>
      } />
      
      {/* Tenant Suporte */}
      <Route path="/t/:slug/suporte" element={
        <RequireAuthTenant>
          <SuporteHome />
        </RequireAuthTenant>
      } />
      <Route path="/t/:slug/suporte/novo" element={
        <RequireAuthTenant>
          <NewTicket />
        </RequireAuthTenant>
      } />
      <Route path="/t/:slug/suporte/meus" element={
        <RequireAuthTenant>
          <SupportList />
        </RequireAuthTenant>
      } />
      <Route path="/t/:slug/suporte/inbox" element={
        <RequireAuthTenant>
          <SupportList />
        </RequireAuthTenant>
      } />
      <Route path="/t/:slug/suporte/ticket/:id" element={
        <RequireAuthTenant>
          <SupportDetail />
        </RequireAuthTenant>
      } />
      
      {/* Other Tenant Modules (placeholders) */}
      <Route path="/t/:slug/solo" element={
        <RequireAuthTenant>
          <PlaceholderModule title="Solo & Adubação" />
        </RequireAuthTenant>
      } />
      <Route path="/t/:slug/hibridos" element={
        <RequireAuthTenant>
          <PlaceholderModule title="Híbridos de Milho" />
        </RequireAuthTenant>
      } />
      <Route path="/t/:slug/pragas-doencas" element={
        <RequireAuthTenant>
          <PlaceholderModule title="Pragas & Doenças" />
        </RequireAuthTenant>
      } />
      <Route path="/t/:slug/fungos-ndvi" element={
        <RequireAuthTenant>
          <PlaceholderModule title="Fungos & NDVI" />
        </RequireAuthTenant>
      } />
      <Route path="/t/:slug/economico" element={
        <RequireAuthTenant>
          <PlaceholderModule title="Econômico" />
        </RequireAuthTenant>
      } />
      
      {/* Fallback */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
