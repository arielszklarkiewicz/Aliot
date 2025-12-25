using Donaciones.Api.Models;
using System.Security.Claims;

namespace Donaciones.Api.Authorization;

public static class AuthorizationExtensions
{
    public static IEndpointConventionBuilder RequirePermission(
        this IEndpointConventionBuilder builder, 
        Permission permission)
    {
        return builder.AddEndpointFilter(async (context, next) =>
        {
            var httpContext = context.HttpContext;
            
            // Check if user is authenticated
            if (!httpContext.User.Identity?.IsAuthenticated ?? true)
            {
                return Results.Unauthorized();
            }

            // Get user role from claims
            var roleClaim = httpContext.User.FindFirst(ClaimTypes.Role)?.Value;
            if (!Enum.TryParse<UserRole>(roleClaim, out var userRole))
            {
                return Results.Forbid();
            }

            // Check permission
            if (!userRole.HasPermission(permission))
            {
                return Results.Forbid();
            }

            return await next(context);
        });
    }

    public static UserRole? GetUserRole(this ClaimsPrincipal user)
    {
        var roleClaim = user.FindFirst(ClaimTypes.Role)?.Value;
        return Enum.TryParse<UserRole>(roleClaim, out var role) ? role : null;
    }

    public static Guid? GetUserId(this ClaimsPrincipal user)
    {
        var idClaim = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(idClaim, out var id) ? id : null;
    }

    public static string? GetUsername(this ClaimsPrincipal user)
    {
        return user.FindFirst(ClaimTypes.Email)?.Value;
    }
}
