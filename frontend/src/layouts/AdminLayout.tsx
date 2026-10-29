import { Outlet } from "react-router-dom";
import { Suspense } from 'react';
import PageLoading from '../components/ui/PageLoading';

const AdminLayout = () => {
  return (
    <div className="app-container">
        <Suspense fallback={<PageLoading />}><Outlet /></Suspense>
    </div>
  );
};

export default AdminLayout;