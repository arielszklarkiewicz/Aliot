namespace Donaciones.Api.Authorization;

[AttributeUsage(AttributeTargets.Method | AttributeTargets.Class, AllowMultiple = false)]
public class RequirePermissionAttribute : Attribute
{
    public Permission Permission { get; }

    public RequirePermissionAttribute(Permission permission)
    {
        Permission = permission;
    }
}
