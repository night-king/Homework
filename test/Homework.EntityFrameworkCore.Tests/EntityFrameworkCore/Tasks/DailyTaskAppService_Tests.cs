using System;
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
public class DailyTaskAppService_Tests : HomeworkEntityFrameworkCoreTestBase
{
    private readonly IDailyTaskAppService _service;
    private readonly IWeeklyTaskTemplateAppService _templates;
    private readonly IRepository<DailyTask, Guid> _dailyTaskRepository;
    private readonly IRepository<ChildProfile, Guid> _childRepo;
    private readonly IGuidGenerator _guid;
    private readonly ICurrentPrincipalAccessor _principal;

    public DailyTaskAppService_Tests()
    {
        _service = GetRequiredService<IDailyTaskAppService>();
        _templates = GetRequiredService<IWeeklyTaskTemplateAppService>();
        _dailyTaskRepository = GetRequiredService<IRepository<DailyTask, Guid>>();
        _childRepo = GetRequiredService<IRepository<ChildProfile, Guid>>();
        _guid = GetRequiredService<IGuidGenerator>();
        _principal = GetRequiredService<ICurrentPrincipalAccessor>();
    }

    private static ClaimsPrincipal Parent(Guid id) => new(new ClaimsIdentity(new[]
    {
        new Claim(AbpClaimTypes.UserId, id.ToString())
    }, "test"));

    // simulate a child checking a task off (Phase 4 has the real check-in service; here go straight to the domain)
    private Task CompleteViaRepositoryAsync(Guid taskId) => WithUnitOfWorkAsync(async () =>
    {
        var t = await _dailyTaskRepository.GetAsync(taskId);
        t.Complete(new DateTime(2026, 7, 6, 18, 0, 0));
        await _dailyTaskRepository.UpdateAsync(t);
    });

    [Fact]
    public async Task GetBoard_Generates_From_Template_And_Settles()
    {
        var pid = _guid.Create();
        var childId = _guid.Create();
        await WithUnitOfWorkAsync(async () => await _childRepo.InsertAsync(new ChildProfile(childId, pid, "娃", 3)));
        var monday = new DateOnly(2026, 7, 6);

        using (_principal.Change(Parent(pid)))
        {
            await _templates.CreateAsync(new() { ChildId = childId, DayOfWeek = DayOfWeek.Monday, Title = "语文", Order = 0 });
            await _templates.CreateAsync(new() { ChildId = childId, DayOfWeek = DayOfWeek.Monday, Title = "数学", Order = 1 });

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
        var childId = _guid.Create();
        await WithUnitOfWorkAsync(async () => await _childRepo.InsertAsync(new ChildProfile(childId, pid, "娃", 3)));
        var date = new DateOnly(2026, 7, 6);

        using (_principal.Change(Parent(pid)))
        {
            await _templates.CreateAsync(new() { ChildId = childId, DayOfWeek = DayOfWeek.Monday, Title = "语文", Order = 0 });
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
        var childId = _guid.Create();
        await WithUnitOfWorkAsync(async () => await _childRepo.InsertAsync(new ChildProfile(childId, pid, "娃", 3)));
        var date = new DateOnly(2026, 7, 6);

        using (_principal.Change(Parent(pid)))
        {
            await _templates.CreateAsync(new() { ChildId = childId, DayOfWeek = DayOfWeek.Monday, Title = "语文", Order = 0 });
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
