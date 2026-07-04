using System;
using System.Linq;
using System.Threading.Tasks;
using Homework.Children;
using Microsoft.AspNetCore.Identity;
using Volo.Abp.Data;
using Volo.Abp.DependencyInjection;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Guids;
using Volo.Abp.Identity;

namespace Homework.Data;

/// <summary>
/// 播种角色和演示家庭数据（幂等可重复运行）：
/// - Parent 角色（IsDefault=true，自注册即获得）
/// - Child 角色（Phase 5 备用）
/// - 演示家长账号 demo + 两个孩子档案（哥哥/三年级、弟弟/一年级）
/// </summary>
public class ChildrenDataSeedContributor : IDataSeedContributor, ITransientDependency
{
    private readonly IdentityRoleManager _roleManager;
    private readonly IdentityUserManager _userManager;
    private readonly IGuidGenerator _guidGenerator;
    private readonly IRepository<ChildProfile, Guid> _childRepository;

    public ChildrenDataSeedContributor(
        IdentityRoleManager roleManager,
        IdentityUserManager userManager,
        IGuidGenerator guidGenerator,
        IRepository<ChildProfile, Guid> childRepository)
    {
        _roleManager = roleManager;
        _userManager = userManager;
        _guidGenerator = guidGenerator;
        _childRepository = childRepository;
    }

    public async Task SeedAsync(DataSeedContext context)
    {
        // Parent 角色：IsDefault=true，自注册用户自动获得
        if (await _roleManager.FindByNameAsync(HomeworkRoles.Parent) == null)
        {
            CheckResult(await _roleManager.CreateAsync(
                new IdentityRole(_guidGenerator.Create(), HomeworkRoles.Parent) { IsDefault = true }));
        }

        // Child 角色：暂未使用，Phase 5 复用
        if (await _roleManager.FindByNameAsync(HomeworkRoles.Child) == null)
        {
            CheckResult(await _roleManager.CreateAsync(
                new IdentityRole(_guidGenerator.Create(), HomeworkRoles.Child)));
        }

        // 演示家长账号（无孩子独立登录用户）
        var demo = await _userManager.FindByNameAsync("demo");
        if (demo == null)
        {
            demo = new IdentityUser(_guidGenerator.Create(), "demo", "demo@homework.today");
            CheckResult(await _userManager.CreateAsync(demo, "1q2w3E*"));
            CheckResult(await _userManager.AddToRoleAsync(demo, HomeworkRoles.Parent));
        }

        // 演示家长名下的两个孩子档案
        await EnsureChildAsync(demo.Id, "哥哥", 3);
        await EnsureChildAsync(demo.Id, "弟弟", 1);
    }

    private async Task EnsureChildAsync(Guid parentId, string displayName, int grade)
    {
        if (await _childRepository.FindAsync(c => c.ParentId == parentId && c.DisplayName == displayName) == null)
        {
            await _childRepository.InsertAsync(
                new ChildProfile(_guidGenerator.Create(), parentId, displayName, grade), autoSave: true);
        }
    }

    private static void CheckResult(IdentityResult result)
    {
        if (!result.Succeeded)
        {
            throw new Exception("Identity operation failed: " +
                string.Join("; ", result.Errors.Select(e => e.Description)));
        }
    }
}
