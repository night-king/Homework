using System;
using System.Security.Claims;
using System.Threading.Tasks;
using Homework.Catalog;
using Homework.Children;
using Homework.Journeys;
using Homework.Tasks;
using Homework.Tasks.Dtos;
using Shouldly;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Guids;
using Volo.Abp.Security.Claims;
using Xunit;

namespace Homework.EntityFrameworkCore.Tasks;

[Collection(HomeworkTestConsts.CollectionDefinitionName)]
public class DailyTaskAppService_Tests : HomeworkEntityFrameworkCoreTestBase
{
    private readonly IDailyTaskAppService _service;
    private readonly IRepository<DailyTask, Guid> _dailyTaskRepository;
    private readonly IRepository<ChildProfile, Guid> _childRepo;
    private readonly IRepository<Journey, Guid> _journeyRepo;
    private readonly IRepository<JourneyTaskTemplateItem, Guid> _templateRepo;
    private readonly IRepository<RewardItem, Guid> _rewardRepo;
    private readonly IGuidGenerator _guid;
    private readonly ICurrentPrincipalAccessor _principal;

    public DailyTaskAppService_Tests()
    {
        _service = GetRequiredService<IDailyTaskAppService>();
        _dailyTaskRepository = GetRequiredService<IRepository<DailyTask, Guid>>();
        _childRepo = GetRequiredService<IRepository<ChildProfile, Guid>>();
        _journeyRepo = GetRequiredService<IRepository<Journey, Guid>>();
        _templateRepo = GetRequiredService<IRepository<JourneyTaskTemplateItem, Guid>>();
        _rewardRepo = GetRequiredService<IRepository<RewardItem, Guid>>();
        _guid = GetRequiredService<IGuidGenerator>();
        _principal = GetRequiredService<ICurrentPrincipalAccessor>();
    }

    private static ClaimsPrincipal Parent(Guid id) => new(new ClaimsIdentity(new[]
    {
        new Claim(AbpClaimTypes.UserId, id.ToString())
    }, "test"));

    private Task CompleteViaRepositoryAsync(Guid taskId) => WithUnitOfWorkAsync(async () =>
    {
        var t = await _dailyTaskRepository.GetAsync(taskId);
        t.Complete(new DateTime(2026, 7, 6, 18, 0, 0));
        await _dailyTaskRepository.UpdateAsync(t);
    });

    private async Task<(Guid childId, Guid journeyId)> SeedChildWithActiveJourneyAsync(Guid parentId, DateOnly start)
    {
        var childId = _guid.Create();
        var journeyId = _guid.Create();
        await WithUnitOfWorkAsync(async () =>
        {
            await _childRepo.InsertAsync(new ChildProfile(childId, parentId, "娃", 3), autoSave: true);
            var reward = new RewardItem(_guid.Create(), "能量果实", 12, 1); reward.Activate();
            await _rewardRepo.InsertAsync(reward, autoSave: true);
            // SharedJourneyId = journeyId：模板挂同一键，生成器才找得到
            var j = new Journey(journeyId, journeyId, parentId, childId, "旅程", start, start.AddDays(60), _guid.Create());
            j.Start(_guid.Create(), new (int, int?)[] { (1, 20), (2, 40), (3, 60), (4, 80), (5, null) });
            await _journeyRepo.InsertAsync(j, autoSave: true);
        });
        return (childId, journeyId);
    }

    [Fact]
    public async Task GetBoard_Generates_From_Template_And_Settles()
    {
        var pid = _guid.Create();
        var monday = new DateOnly(2026, 7, 6);
        var (childId, journeyId) = await SeedChildWithActiveJourneyAsync(pid, monday);

        await WithUnitOfWorkAsync(async () =>
        {
            await _templateRepo.InsertAsync(new JourneyTaskTemplateItem(_guid.Create(), journeyId, DayOfWeek.Monday, "语文", order: 0), autoSave: true);
            await _templateRepo.InsertAsync(new JourneyTaskTemplateItem(_guid.Create(), journeyId, DayOfWeek.Monday, "数学", order: 1), autoSave: true);
        });

        using (_principal.Change(Parent(pid)))
        {
            var board = await _service.GetBoardAsync(new() { ChildId = childId, Date = monday });

            board.Tasks.Count.ShouldBe(2);
            board.TasksTotal.ShouldBe(2);
            board.TasksCompleted.ShouldBe(0);
            board.Stars.ShouldBe(0);
            board.IsRestDay.ShouldBeFalse();
        }
    }

    [Fact]
    public async Task Revoke_Recomputes_DailyScore_Down()
    {
        var pid = _guid.Create();
        var date = new DateOnly(2026, 7, 6);
        var (childId, journeyId) = await SeedChildWithActiveJourneyAsync(pid, date);

        await WithUnitOfWorkAsync(async () =>
            await _templateRepo.InsertAsync(new JourneyTaskTemplateItem(_guid.Create(), journeyId, DayOfWeek.Monday, "语文", order: 0), autoSave: true));

        using (_principal.Change(Parent(pid)))
        {
            var board = await _service.GetBoardAsync(new() { ChildId = childId, Date = date });
            var taskId = board.Tasks[0].Id;
            await CompleteViaRepositoryAsync(taskId);
            (await _service.GetBoardAsync(new() { ChildId = childId, Date = date })).IsFull.ShouldBeTrue();

            await _service.RevokeAsync(taskId);

            var after = await _service.GetBoardAsync(new() { ChildId = childId, Date = date });
            after.TasksCompleted.ShouldBe(0);
            after.IsFull.ShouldBeFalse();
            after.Stars.ShouldBe(0);
        }
    }

    [Fact]
    public async Task Create_AdHoc_Task_Raises_Total_And_Breaks_Full()
    {
        var pid = _guid.Create();
        var date = new DateOnly(2026, 7, 6);
        var (childId, journeyId) = await SeedChildWithActiveJourneyAsync(pid, date);

        await WithUnitOfWorkAsync(async () =>
            await _templateRepo.InsertAsync(new JourneyTaskTemplateItem(_guid.Create(), journeyId, DayOfWeek.Monday, "语文", order: 0), autoSave: true));

        using (_principal.Change(Parent(pid)))
        {
            var board = await _service.GetBoardAsync(new() { ChildId = childId, Date = date });
            await CompleteViaRepositoryAsync(board.Tasks[0].Id);
            (await _service.GetBoardAsync(new() { ChildId = childId, Date = date })).IsFull.ShouldBeTrue();

            await _service.CreateAsync(new() { ChildId = childId, Date = date, Title = "临时加练", Order = 5 });

            var after = await _service.GetBoardAsync(new() { ChildId = childId, Date = date });
            after.TasksTotal.ShouldBe(2);
            after.IsFull.ShouldBeFalse();
        }
    }
}
