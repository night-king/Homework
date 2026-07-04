using System.Threading.Tasks;
using Homework.Permissions;
using Volo.Abp.Authorization.Permissions;
using Volo.Abp.DependencyInjection;
using Volo.Abp.Data;
using Volo.Abp.PermissionManagement;

namespace Homework.Data;

/// <summary>把家长后台权限授予内置 admin 角色，家长开箱即用（幂等）。</summary>
public class ParentPermissionDataSeedContributor : IDataSeedContributor, ITransientDependency
{
    private readonly IPermissionDataSeeder _permissionDataSeeder;

    public ParentPermissionDataSeedContributor(IPermissionDataSeeder permissionDataSeeder)
        => _permissionDataSeeder = permissionDataSeeder;

    public async Task SeedAsync(DataSeedContext context)
    {
        await _permissionDataSeeder.SeedAsync(
            RolePermissionValueProvider.ProviderName, // "R"
            "admin",                                   // built-in admin role name
            new[] { HomeworkPermissions.ParentAdmin },
            context.TenantId
        );
    }
}
