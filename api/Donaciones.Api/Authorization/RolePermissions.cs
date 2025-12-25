using Donaciones.Api.Models;

namespace Donaciones.Api.Authorization;

public static class RolePermissions
{
    private static readonly Dictionary<UserRole, HashSet<Permission>> _rolePermissions = new()
    {
        [UserRole.Admin] = new HashSet<Permission>
        {
            // Full access to everything
            Permission.ViewDonors,
            Permission.CreateDonors,
            Permission.EditDonors,
            Permission.DeleteDonors,
            
            Permission.ViewDonations,
            Permission.CreateDonations,
            Permission.EditDonations,
            Permission.DeleteDonations,
            Permission.CreateVirtualDonations,
            
            Permission.ViewPayments,
            Permission.CreatePayments,
            Permission.EditPayments,
            Permission.DeletePayments,
            Permission.CreateVirtualPayments,
            
            Permission.ViewConcepts,
            Permission.ManageConcepts,
            Permission.ViewDestinations,
            Permission.ManageDestinations,
            Permission.ViewCollectors,
            Permission.ManageCollectors,
            
            Permission.ViewReports,
            Permission.ViewDonorSummary
        },
        
        [UserRole.DataEntry] = new HashSet<Permission>
        {
            // Can create, edit, delete and view everything except Concepts, Destinations, Collectors
            Permission.ViewDonors,
            Permission.CreateDonors,
            Permission.EditDonors,
            Permission.DeleteDonors,
            
            Permission.ViewDonations,
            Permission.CreateDonations,
            Permission.EditDonations,
            Permission.DeleteDonations,
            Permission.CreateVirtualDonations,
            
            Permission.ViewPayments,
            Permission.CreatePayments,
            Permission.EditPayments,
            Permission.DeletePayments,
            Permission.CreateVirtualPayments,
            
            // Can view but not manage admin entities
            Permission.ViewConcepts,
            Permission.ViewDestinations,
            Permission.ViewCollectors,
            
            Permission.ViewReports,
            Permission.ViewDonorSummary
        },
        
        [UserRole.ReadOnly] = new HashSet<Permission>
        {
            // Can only view donor summary, cannot create virtual records
            Permission.ViewDonorSummary,
            
            // Can view data for context
            Permission.ViewDonors,
            Permission.ViewDonations,
            Permission.ViewPayments,
            Permission.ViewConcepts,
            Permission.ViewDestinations,
            Permission.ViewCollectors
        }
    };

    public static bool HasPermission(this UserRole role, Permission permission)
    {
        return _rolePermissions.TryGetValue(role, out var permissions) && permissions.Contains(permission);
    }

    public static IEnumerable<Permission> GetPermissions(this UserRole role)
    {
        return _rolePermissions.TryGetValue(role, out var permissions) ? permissions : Enumerable.Empty<Permission>();
    }
}
