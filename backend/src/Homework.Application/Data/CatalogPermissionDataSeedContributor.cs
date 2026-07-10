using System.Threading.Tasks;
using Homework.Permissions;
using Volo.Abp.Authorization.Permissions;
using Volo.Abp.Data;
using Volo.Abp.DependencyInjection;
using Volo.Abp.PermissionManagement;

namespace Homework.Data;

/// <summary>把图鉴维护权限授予内置 admin 角色（幂等）。</summary>
public class CatalogPermissionDataSeedContributor : IDataSeedContributor, ITransientDependency
{
    private readonly IPermissionDataSeeder _permissionDataSeeder;

    public CatalogPermissionDataSeedContributor(IPermissionDataSeeder permissionDataSeeder)
        => _permissionDataSeeder = permissionDataSeeder;

    public async Task SeedAsync(DataSeedContext context)
    {
        await _permissionDataSeeder.SeedAsync(
            RolePermissionValueProvider.ProviderName,
            "admin",
            new[]
            {
                HomeworkPermissions.Catalog.Default,
                HomeworkPermissions.Catalog.Pets,
                HomeworkPermissions.Catalog.RewardItems,
                HomeworkPermissions.Catalog.Medals,
            },
            context.TenantId);
    }
}
