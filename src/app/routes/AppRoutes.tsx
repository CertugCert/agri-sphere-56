import { Route, Routes, Navigate } from 'react-router-dom';
import Login from '@/pages/Login';
import Home from '@/pages/Home';
import SupportList from '@/pages/support/SupportList';
import SupportDetail from '@/pages/support/SupportDetail';
import NewTicket from '@/pages/support/NewTicket';
import SoilSamplesList from '@/pages/solo/SoilSamplesList';
import NewSample from '@/pages/solo/NewSample';
import SampleDetail from '@/pages/solo/SampleDetail';
import NewRecommendation from '@/pages/solo/NewRecommendation';
import RecommendationDetail from '@/pages/solo/RecommendationDetail';
import NotFound from '@/pages/NotFound';
import { useAuth } from '@/store/auth';

function Protected({ children }: { children: JSX.Element }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <div className="p-8 text-center">Carregando…</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Protected><Home /></Protected>} />
      <Route path="/suporte" element={<Protected><SupportList /></Protected>} />
      <Route path="/suporte/novo" element={<Protected><NewTicket /></Protected>} />
      <Route path="/suporte/:id" element={<Protected><SupportDetail /></Protected>} />
      <Route path="/solo/amostras" element={<Protected><SoilSamplesList /></Protected>} />
      <Route path="/solo/amostras/nova" element={<Protected><NewSample /></Protected>} />
      <Route path="/solo/amostras/:id" element={<Protected><SampleDetail /></Protected>} />
      <Route path="/solo/recomendacoes/nova" element={<Protected><NewRecommendation /></Protected>} />
      <Route path="/solo/recomendacoes/:id" element={<Protected><RecommendationDetail /></Protected>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
