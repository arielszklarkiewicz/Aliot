namespace Donaciones.Api.Authorization;

[AttributeUsage(AttributeTargets.Method | AttributeTargets.Class, AllowMultiple = false)]
public class RequirePermissionAttribute(Permission permission) : Attribute
{
    public Permission Permission { get; } = permission;
}
