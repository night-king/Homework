using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Homework.Children;
using Homework.Tasks;
using Homework.Tasks.Dtos;
using Shouldly;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Guids;
using Volo.Abp.Security.Claims;
using Xunit;

namespace Homework.EntityFrameworkCore.Tasks;

[Collection(HomeworkTestConsts.CollectionDefinitionName)]
public class WeeklyTaskTemplateAppService_Tests : HomeworkEntityFrameworkCoreTestBase
{
    private readonly IWeeklyTaskTemplateAppService _service;
    private readonly IRepository<ChildProfile, Guid> _childRepo;
    private readonly IGuidGenerator _guid;
    private readonly ICurrentPrincipalAccessor _principal;

    public WeeklyTaskTemplateAppService_Tests()
    {
        _service = GetRequiredService<IWeeklyTaskTemplateAppService>();
        _childRepo = GetRequiredService<IRepository<ChildProfile, Guid>>();
        _guid = GetRequiredService<IGuidGenerator>();
        _principal = GetRequiredService<ICurrentPrincipalAccessor>();
    }

    private static ClaimsPrincipal Parent(Guid id) => new(new ClaimsIdentity(new[]
    {
        new Claim(AbpClaimTypes.UserId, id.ToString())
    }, "test"));

    [Fact]
    public async Task Create_Then_List_Returns_Item_Sorted()
    {
        var pid = _guid.Create();
        var childId = _guid.Create();
        await WithUnitOfWorkAsync(async () => await _childRepo.InsertAsync(new ChildProfile(childId, pid, "娃", 3)));

        using (_principal.Change(Parent(pid)))
        {
            await _service.CreateAsync(new() { ChildId = childId, DayOfWeek = DayOfWeek.Monday, Title = "语文", Order = 1 });
            await _service.CreateAsync(new() { ChildId = childId, DayOfWeek = DayOfWeek.Monday, Title = "数学", Order = 0 });

            var list = await _service.GetListAsync(new() { ChildId = childId });
            list.Items.Count.ShouldBe(2);
            list.Items.Select(i => i.Title).ShouldBe(new[] { "数学", "语文" }); // by Order
        }
    }

    [Fact]
    public async Task List_Filters_By_DayOfWeek()
    {
        var pid = _guid.Create();
        var childId = _guid.Create();
        await WithUnitOfWorkAsync(async () => await _childRepo.InsertAsync(new ChildProfile(childId, pid, "娃", 3)));

        using (_principal.Change(Parent(pid)))
        {
            await _service.CreateAsync(new() { ChildId = childId, DayOfWeek = DayOfWeek.Monday, Title = "周一", Order = 0 });
            await _service.CreateAsync(new() { ChildId = childId, DayOfWeek = DayOfWeek.Tuesday, Title = "周二", Order = 0 });

            var mon = await _service.GetListAsync(new() { ChildId = childId, DayOfWeek = DayOfWeek.Monday });
            mon.Items.Count.ShouldBe(1);
            mon.Items[0].Title.ShouldBe("周一");
        }
    }

    [Fact]
    public async Task Update_Changes_Title_And_IsActive()
    {
        var pid = _guid.Create();
        var childId = _guid.Create();
        await WithUnitOfWorkAsync(async () => await _childRepo.InsertAsync(new ChildProfile(childId, pid, "娃", 3)));

        using (_principal.Change(Parent(pid)))
        {
            var created = await _service.CreateAsync(new() { ChildId = childId, DayOfWeek = DayOfWeek.Monday, Title = "旧", Order = 0 });
            var updated = await _service.UpdateAsync(created.Id,
                new() { Title = "新", Order = 0, IsActive = false });
            updated.Title.ShouldBe("新");
            updated.IsActive.ShouldBeFalse();
        }
    }

    [Fact]
    public async Task Delete_Removes_Item()
    {
        var pid = _guid.Create();
        var childId = _guid.Create();
        await WithUnitOfWorkAsync(async () => await _childRepo.InsertAsync(new ChildProfile(childId, pid, "娃", 3)));

        using (_principal.Change(Parent(pid)))
        {
            var created = await _service.CreateAsync(new() { ChildId = childId, DayOfWeek = DayOfWeek.Monday, Title = "删", Order = 0 });
            await _service.DeleteAsync(created.Id);
            (await _service.GetListAsync(new() { ChildId = childId })).Items.Count.ShouldBe(0);
        }
    }
}
