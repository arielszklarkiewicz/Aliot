import React, { useState } from 'react';
import axios from '../api/client';

export default function SystemAdmin() {
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupError, setBackupError] = useState('');
  const [backupSuccess, setBackupSuccess] = useState('');
  
  const [excelLoading, setExcelLoading] = useState(false);
  const [excelError, setExcelError] = useState('');

  const createBackup = async () => {
    if (!window.confirm('¿Está seguro de que desea crear un respaldo completo de la base de datos?')) {
      return;
    }

    setBackupLoading(true);
    setBackupError('');
    setBackupSuccess('');

    try {
      const response = await axios.post('/api/admin/backup', {}, {
        responseType: 'blob'
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
      link.setAttribute('download', `backup_${timestamp}.sql`);
      
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      setBackupSuccess('Respaldo creado exitosamente');
    } catch (e) {
      console.error('Backup error:', e);
      setBackupError('Error al crear el respaldo de la base de datos');
    } finally {
      setBackupLoading(false);
    }
  };

  const exportToExcel = async () => {
    if (!window.confirm('¿Está seguro de que desea exportar todos los datos a Excel?')) {
      return;
    }

    setExcelLoading(true);
    setExcelError('');

    try {
      const response = await axios.get('/api/admin/export-excel', {
        responseType: 'blob'
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
      link.setAttribute('download', `datos_${timestamp}.xlsx`);
      
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      alert('Datos exportados exitosamente');
    } catch (e) {
      console.error('Excel export error:', e);
      setExcelError('Error al exportar los datos a Excel');
    } finally {
      setExcelLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">Administración del Sistema</h1>
          <p className="hero-subtitle">Herramientas avanzadas para administradores del sistema</p>
        </div>
      </div>

      <div className="content-wrapper">
        {/* Database Backup Section */}
        <div className="form-section" style={{ marginBottom: 24 }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 12, 
            marginBottom: 16,
            paddingBottom: 12,
            borderBottom: '2px solid #e5e7eb'
          }}>
            <span style={{ fontSize: '1.5rem' }}>💾</span>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>Respaldo de Base de Datos</h2>
          </div>

          <p style={{ marginBottom: 16, color: '#64748b' }}>
            Crea un respaldo completo de la base de datos en formato SQL. El archivo se descargará automáticamente.
          </p>

          {backupSuccess && (
            <div style={{ 
              padding: 12, 
              background: '#d1fae5', 
              border: '1px solid #10b981', 
              borderRadius: 6, 
              marginBottom: 16,
              color: '#065f46'
            }}>
              ✅ {backupSuccess}
            </div>
          )}

          {backupError && (
            <div style={{ 
              padding: 12, 
              background: '#fee2e2', 
              border: '1px solid #ef4444', 
              borderRadius: 6, 
              marginBottom: 16,
              color: '#991b1b'
            }}>
              ❌ {backupError}
            </div>
          )}

          <button 
            className="btn btn-primary"
            onClick={createBackup}
            disabled={backupLoading}
            style={{ minWidth: 200 }}
          >
            {backupLoading ? '⏳ Creando respaldo...' : '💾 Crear Respaldo Completo'}
          </button>

          <div style={{ 
            marginTop: 16, 
            padding: 12, 
            background: '#fef3c7', 
            border: '1px solid #f59e0b', 
            borderRadius: 6 
          }}>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#92400e' }}>
              ⚠️ <strong>Importante:</strong> Guarde el archivo de respaldo en un lugar seguro. Contiene todos los datos del sistema.
            </p>
          </div>
        </div>

        {/* Excel Export Section */}
        <div className="form-section">
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 12, 
            marginBottom: 16,
            paddingBottom: 12,
            borderBottom: '2px solid #e5e7eb'
          }}>
            <span style={{ fontSize: '1.5rem' }}>📊</span>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>Exportar a Excel</h2>
          </div>

          <p style={{ marginBottom: 16, color: '#64748b' }}>
            Exporta todos los datos del sistema a un archivo Excel con múltiples hojas (Donantes, Donaciones, Pagos).
          </p>

          {excelError && (
            <div style={{ 
              padding: 12, 
              background: '#fee2e2', 
              border: '1px solid #ef4444', 
              borderRadius: 6, 
              marginBottom: 16,
              color: '#991b1b'
            }}>
              ❌ {excelError}
            </div>
          )}

          <button 
            className="btn btn-success"
            onClick={exportToExcel}
            disabled={excelLoading}
            style={{ minWidth: 200 }}
          >
            {excelLoading ? '⏳ Exportando...' : '📊 Exportar a Excel'}
          </button>

          <div style={{ 
            marginTop: 16, 
            padding: 12, 
            background: '#dbeafe', 
            border: '1px solid #3b82f6', 
            borderRadius: 6 
          }}>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#1e40af' }}>
              ℹ️ <strong>Información:</strong> El archivo Excel incluirá todas las tablas principales del sistema con formato y filtros.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
