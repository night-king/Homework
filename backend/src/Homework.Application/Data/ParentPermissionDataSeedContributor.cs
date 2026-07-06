using System.Threading.Tasks;
using Homework.Permissions;
using Volo.Abp.Authorization.Permissions;
using Volo.Abp.DependencyInjection;
using Volo.Abp.Data;
using Volo.Abp.PermissionManagement;

namespace Homework.Data;

/// <summary>
/// 把 ParentAdmin 权限授予 Parent 角色和内置 admin 角色（幂等）。
/// Parent 角色：自注册家长自动获得权限；admin 角色：运营后台保留访问权。
/// </summary>
public class ParentPermissionDataSeedContributor : IDataSeedContributor, ITransientDependency
{
    private readonly IPermissionDataSeeder _permissionDataSeeder;

    public ParentPermissionDataSeedContributor(IPermissionDataSeeder permissionDataSeeder)
        => _permissionDataSeeder = permissionDataSeeder;

    public async Task SeedAsync(DataSeedContext context)
    {
        foreach (var role in new[] { HomeworkRoles.Parent, "admin" })
        {
            await _permissionDataSeeder.SeedAsync(
                RolePermissionValueProvider.ProviderName,
                role,
                new[] { HomeworkPermissions.ParentAdmin },
                context.TenantId);
        }
    }
}
