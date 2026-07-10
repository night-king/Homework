using System;
using System.Security.Claims;
using System.Threading.Tasks;
using Homework.Children;
using Homework.Children.Dtos;
using Homework.Tasks;
using Homework.Tasks.Dtos;
using Shouldly;
using Volo.Abp.Domain.Entities;
using Volo.Abp.Guids;
using Volo.Abp.Security.Claims;
using Xunit;

namespace Homework.EntityFrameworkCore.Accounts;

[Collection(HomeworkTestConsts.CollectionDefinitionName)]
public class OwnershipIsolation_Tests : HomeworkEntityFrameworkCoreTestBase
{
    private readonly IChildProfileAppService _children;
    private readonly IWeeklyTaskTemplateAppService _templates;
    private readonly IDailyTaskAppService _dailyTasks;
    private readonly IGuidGenerator _guid;
    private readonly ICurrentPrincipalAccessor _principal;

    public OwnershipIsolation_Tests()
    {
        _children = GetRequiredService<IChildProfileAppService>();
        _templates = GetRequiredService<IWeeklyTaskTemplateAppService>();
        _dailyTasks = GetRequiredService<IDailyTaskAppService>();
        _guid = GetRequiredService<IGuidGenerator>();
        _principal = GetRequiredService<ICurrentPrincipalAccessor>();
    }

    private static ClaimsPrincipal Parent(Guid id) => new(new ClaimsIdentity(new[]
    {
        new Claim(AbpClaimTypes.UserId, id.ToString())
    }, "test"));

    [Fact]
    public async Task Parent_B_Cannot_Touch_Parent_A_Data()
    {
        var pA = _guid.Create();
        var pB = _guid.Create();
        var monday = new DateOnly(2026, 7, 6); // a Monday

        Guid childOfA, templateOfA, taskOfA;
        using (_principal.Change(Parent(pA)))
        {
            childOfA = (await _children.CreateAsync(new() { DisplayName = "A娃", Grade = 3 })).Id;
            templateOfA = (await _templates.CreateAsync(new() { ChildId = childOfA, DayOfWeek = DayOfWeek.Monday, Title = "语文", Order = 0 })).Id;
            var board = await _dailyTasks.GetBoardAsync(new() { ChildId = childOfA, Date = monday }); // lazily generates from the template
            taskOfA = board.Tasks[0].Id;
        }

        using (_principal.Change(Parent(pB)))
        {
            await Should.ThrowAsync<EntityNotFoundException>(async () => await _children.GetAsync(childOfA));
            await Should.ThrowAsync<EntityNotFoundException>(async () => await _templates.GetListAsync(new() { ChildId = childOfA }));
            await Should.ThrowAsync<EntityNotFoundException>(async () => await _templates.UpdateAsync(templateOfA, new() { Title = "改", Order = 0, IsActive = true }));
            await Should.ThrowAsync<EntityNotFoundException>(async () => await _dailyTasks.GetBoardAsync(new() { ChildId = childOfA, Date = monday }));
            await Should.ThrowAsync<EntityNotFoundException>(async () => await _dailyTasks.UpdateAsync(taskOfA, new() { Title = "改", Order = 0 }));
        }
    }
}
