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
/// 播种 Child 角色和两个孩子（哥哥/三年级、弟弟/一年级），幂等可重复运行。
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
        if (await _roleManager.FindByNameAsync(HomeworkRoles.Child) == null)
        {
            CheckResult(await _roleManager.CreateAsync(
                new IdentityRole(_guidGenerator.Create(), HomeworkRoles.Child)));
        }

        // 占位姓名，家长后续可在后台改成真实名字
        await EnsureChildAsync("gege", "哥哥", 3);
        await EnsureChildAsync("didi", "弟弟", 1);
    }

    private async Task EnsureChildAsync(string userName, string displayName, int grade)
    {
        var user = await _userManager.FindByNameAsync(userName);
        if (user == null)
        {
            // Phase 1: 不设密码（孩子登录在后续阶段实现），只需其出现在 Identity 且带 Child 角色
            user = new IdentityUser(_guidGenerator.Create(), userName, $"{userName}@homework.local");
            CheckResult(await _userManager.CreateAsync(user));
            CheckResult(await _userManager.AddToRoleAsync(user, HomeworkRoles.Child));
        }

        if (await _childRepository.FindAsync(c => c.IdentityUserId == user.Id) == null)
        {
            await _childRepository.InsertAsync(
                new ChildProfile(_guidGenerator.Create(), user.Id, displayName, grade), autoSave: true);
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
