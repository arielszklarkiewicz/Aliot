namespace Donaciones.Api.Authorization;

public enum Permission
{
    // Donor permissions
    ViewDonors,
    CreateDonors,
    EditDonors,
    DeleteDonors,
    
    // Donation permissions
    ViewDonations,
    CreateDonations,
    EditDonations,
    DeleteDonations,
    CreateVirtualDonations,
    
    // Payment permissions
    ViewPayments,
    CreatePayments,
    EditPayments,
    DeletePayments,
    CreateVirtualPayments,
    
    // Admin permissions (Concepts, Destinations, Collectors)
    ViewConcepts,
    ManageConcepts,
    ViewDestinations,
    ManageDestinations,
    ViewCollectors,
    ManageCollectors,
    
    // User management
    ViewUsers,
    ManageUsers,
    
    // Reports
    ViewReports,
    
    // Summary
    ViewDonorSummary,
    
    // Audit Log
    ViewAuditLog
}
