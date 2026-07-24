using System;
using System.Security.Claims;
using System.Threading.Tasks;
using Homework.Catalog;
using Homework.Children;
using Homework.Children.Dtos;
using Homework.Journeys;
using Homework.Tasks;
using Homework.Tasks.Dtos;
using Shouldly;
using Volo.Abp.Domain.Entities;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Guids;
using Volo.Abp.Security.Claims;
using Xunit;

namespace Homework.EntityFrameworkCore.Accounts;

[Collection(HomeworkTestConsts.CollectionDefinitionName)]
public class OwnershipIsolation_Tests : HomeworkEntityFrameworkCoreTestBase
{
    private readonly IChildProfileAppService _children;
    private readonly IDailyTaskAppService _dailyTasks;
    private readonly IRepository<Journey, Guid> _journeyRepo;
    private readonly IRepository<JourneyTaskTemplateItem, Guid> _journeyTemplateRepo;
    private readonly IRepository<RewardItem, Guid> _rewardRepo;
    private readonly IGuidGenerator _guid;
    private readonly ICurrentPrincipalAccessor _principal;

    public OwnershipIsolation_Tests()
    {
        _children = GetRequiredService<IChildProfileAppService>();
        _dailyTasks = GetRequiredService<IDailyTaskAppService>();
        _journeyRepo = GetRequiredService<IRepository<Journey, Guid>>();
        _journeyTemplateRepo = GetRequiredService<IRepository<JourneyTaskTemplateItem, Guid>>();
        _rewardRepo = GetRequiredService<IRepository<RewardItem, Guid>>();
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

        Guid childOfA, taskOfA;
        using (_principal.Change(Parent(pA)))
        {
            childOfA = (await _children.CreateAsync(new() { DisplayName = "A娃", Grade = 3 })).Id;

            // Set up an Active Journey + JourneyTaskTemplateItem so GetBoard generates a task
            var journeyId = _guid.Create();
            await WithUnitOfWorkAsync(async () =>
            {
                var reward = new RewardItem(_guid.Create(), "能量果实", 12, 1); reward.Activate();
                await _rewardRepo.InsertAsync(reward, autoSave: true);
                var j = new Journey(journeyId, journeyId, pA, childOfA, "旅程", monday, monday.AddDays(60), _guid.Create());
                j.Start(_guid.Create(), new (int, int?)[] { (1, 20), (2, 40), (3, 60), (4, 80), (5, null) });
                await _journeyRepo.InsertAsync(j, autoSave: true);
                await _journeyTemplateRepo.InsertAsync(
                    new JourneyTaskTemplateItem(_guid.Create(), journeyId, DayOfWeek.Monday, "语文", order: 0),
                    autoSave: true);
            });

            var board = await _dailyTasks.GetBoardAsync(new() { ChildId = childOfA, Date = monday }); // lazily generates from the journey template
            taskOfA = board.Tasks[0].Id;
        }

        using (_principal.Change(Parent(pB)))
        {
            await Should.ThrowAsync<EntityNotFoundException>(async () => await _children.GetAsync(childOfA));
            await Should.ThrowAsync<EntityNotFoundException>(async () => await _dailyTasks.GetBoardAsync(new() { ChildId = childOfA, Date = monday }));
            await Should.ThrowAsync<EntityNotFoundException>(async () => await _dailyTasks.UpdateAsync(taskOfA, new() { Title = "改", Order = 0 }));
        }
    }
}
