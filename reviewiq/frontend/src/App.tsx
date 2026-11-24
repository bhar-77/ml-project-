import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { LandingPage } from './pages/LandingPage';
import { OverviewDashboard } from './pages/OverviewDashboard';
import { LiveAnalyzerPage } from './pages/LiveAnalyzerPage';
import { DatasetUploadPage } from './pages/DatasetUploadPage';
import { SentimentAnalyticsPage } from './pages/SentimentAnalyticsPage';
import { ComplaintIntelligencePage } from './pages/ComplaintIntelligencePage';
import { ProductComparisonPage } from './pages/ProductComparisonPage';
import { ModelPerformancePage } from './pages/ModelPerformancePage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<OverviewDashboard />} />
          <Route path="/analyze" element={<LiveAnalyzerPage />} />
          <Route path="/upload" element={<DatasetUploadPage />} />
          <Route path="/analytics" element={<SentimentAnalyticsPage />} />
          <Route path="/complaints" element={<ComplaintIntelligencePage />} />
          <Route path="/products" element={<ProductComparisonPage />} />
          <Route path="/model" element={<ModelPerformancePage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

