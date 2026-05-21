import { Navigate } from 'react-router-dom';

/** Legacy route — redirects to Compliance Center landing. */
const ComplianceDashboard = () => <Navigate to="/compliance-center" replace />;

export default ComplianceDashboard;
