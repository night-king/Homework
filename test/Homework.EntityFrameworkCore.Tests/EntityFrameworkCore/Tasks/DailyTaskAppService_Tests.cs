using System;
using System.Threading.Tasks;
using Homework.Tasks;
using Homework.Tasks.Dtos;
using Shouldly;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Guids;
using Xunit;

namespace Homework.EntityFrameworkCore.Tasks;

[Collection(HomeworkTestConsts.CollectionDefinitionName)]
public class DailyTaskAppService_Tests : HomeworkEntityFrameworkCoreTestBase
{
    private readonly IDailyTaskAppService _service;
    private readonly IWeeklyTaskTemplateAppService _templates;
    private readonly IRepository<DailyTask, Guid> _dailyTaskRepository;
    private readonly IGuidGenerator _guid;

    public DailyTaskAppService_Tests()
    {
        _service = GetRequiredService<IDailyTaskAppService>();
        _templates = GetRequiredService<IWeeklyTaskTemplateAppService>();
        _dailyTaskRepository = GetRequiredService<IRepository<DailyTask, Guid>>();
        _guid = GetRequiredService<IGuidGenerator>();
    }

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
        var child = _guid.Create();
        var monday = new DateOnly(2026, 7, 6);
        await _templates.CreateAsync(new() { ChildId = child, DayOfWeek = DayOfWeek.Monday, Title = "语文", Order = 0 });
        await _templates.CreateAsync(new() { ChildId = child, DayOfWeek = DayOfWeek.Monday, Title = "数学", Order = 1 });

        var board = await _service.GetBoardAsync(new() { ChildId = child, Date = monday });

        board.Tasks.Count.ShouldBe(2);
        board.TasksTotal.ShouldBe(2);
        board.TasksCompleted.ShouldBe(0);
        board.Stars.ShouldBe(0);
        board.IsRestDay.ShouldBeFalse();
    }

    [Fact]
    public async Task Revoke_Recomputes_DailyScore_Down()
    {
        var child = _guid.Create();
        var date = new DateOnly(2026, 7, 6);
        await _templates.CreateAsync(new() { ChildId = child, DayOfWeek = DayOfWeek.Monday, Title = "语文", Order = 0 });
        var board = await _service.GetBoardAsync(new() { ChildId = child, Date = date });
        var taskId = board.Tasks[0].Id;
        await CompleteViaRepositoryAsync(taskId);
        (await _service.GetBoardAsync(new() { ChildId = child, Date = date })).IsFull.ShouldBeTrue();

        await _service.RevokeAsync(taskId);

        var after = await _service.GetBoardAsync(new() { ChildId = child, Date = date });
        after.TasksCompleted.ShouldBe(0);
        after.IsFull.ShouldBeFalse();
        after.Stars.ShouldBe(0);
    }

    [Fact]
    public async Task Create_AdHoc_Task_Raises_Total_And_Breaks_Full()
    {
        var child = _guid.Create();
        var date = new DateOnly(2026, 7, 6);
        await _templates.CreateAsync(new() { ChildId = child, DayOfWeek = DayOfWeek.Monday, Title = "语文", Order = 0 });
        var board = await _service.GetBoardAsync(new() { ChildId = child, Date = date });
        await CompleteViaRepositoryAsync(board.Tasks[0].Id);
        (await _service.GetBoardAsync(new() { ChildId = child, Date = date })).IsFull.ShouldBeTrue();

        await _service.CreateAsync(new() { ChildId = child, Date = date, Title = "临时加练", Order = 5 });

        var after = await _service.GetBoardAsync(new() { ChildId = child, Date = date });
        after.TasksTotal.ShouldBe(2);
        after.IsFull.ShouldBeFalse();
    }
}
