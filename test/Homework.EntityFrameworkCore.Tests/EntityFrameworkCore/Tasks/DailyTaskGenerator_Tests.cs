using System;
using System.Linq;
using System.Threading.Tasks;
using Homework.Tasks;
using Shouldly;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Guids;
using Xunit;

namespace Homework.EntityFrameworkCore.Tasks;

[Collection(HomeworkTestConsts.CollectionDefinitionName)]
public class DailyTaskGenerator_Tests : HomeworkEntityFrameworkCoreTestBase
{
    private readonly DailyTaskGenerator _generator;
    private readonly IRepository<WeeklyTaskTemplateItem, Guid> _templateRepository;
    private readonly IRepository<DailyTask, Guid> _dailyTaskRepository;
    private readonly IRepository<Homework.Scoring.DailyScore, Guid> _dailyScoreRepository;
    private readonly IGuidGenerator _guidGenerator;

    private static readonly DateOnly Monday = new(2026, 7, 6); // 周一
    private static readonly DateOnly Sunday = new(2026, 7, 5); // 周日（无模板）

    public DailyTaskGenerator_Tests()
    {
        _generator = GetRequiredService<DailyTaskGenerator>();
        _templateRepository = GetRequiredService<IRepository<WeeklyTaskTemplateItem, Guid>>();
        _dailyTaskRepository = GetRequiredService<IRepository<DailyTask, Guid>>();
        _dailyScoreRepository = GetRequiredService<IRepository<Homework.Scoring.DailyScore, Guid>>();
        _guidGenerator = GetRequiredService<IGuidGenerator>();
    }

    [Fact]
    public async Task EnsureDay_Generates_One_Task_Per_Active_Template_Item_In_Order()
    {
        var childId = _guidGenerator.Create();
        await WithUnitOfWorkAsync(async () =>
        {
            // 周一：2 个启用项（乱序 Order）+ 1 个停用项（应被跳过）
            await _templateRepository.InsertAsync(Template(childId, DayOfWeek.Monday, "语文", order: 1));
            await _templateRepository.InsertAsync(Template(childId, DayOfWeek.Monday, "数学", order: 0));
            await _templateRepository.InsertAsync(Template(childId, DayOfWeek.Monday, "停用课", order: 2, active: false));
        });

        await WithUnitOfWorkAsync(async () =>
        {
            var created = await _generator.EnsureDayAsync(childId, Monday);

            created.Count.ShouldBe(2); // 停用项被跳过
            created.Select(t => t.Title).ShouldBe(new[] { "数学", "语文" }); // 按 Order 升序
            created.ShouldAllBe(t => t.ChildId == childId && t.Date == Monday && !t.IsCompleted);
        });

        await WithUnitOfWorkAsync(async () =>
        {
            var rows = await _dailyTaskRepository.GetListAsync(t => t.ChildId == childId && t.Date == Monday);
            rows.Count.ShouldBe(2);
        });
    }

    [Fact]
    public async Task EnsureDay_Is_Idempotent()
    {
        var childId = _guidGenerator.Create();
        await WithUnitOfWorkAsync(async () =>
        {
            await _templateRepository.InsertAsync(Template(childId, DayOfWeek.Monday, "语文", order: 0));
            await _templateRepository.InsertAsync(Template(childId, DayOfWeek.Monday, "数学", order: 1));
        });

        await WithUnitOfWorkAsync(async () => await _generator.EnsureDayAsync(childId, Monday));
        await WithUnitOfWorkAsync(async () => await _generator.EnsureDayAsync(childId, Monday)); // 再次调用不应重复生成

        await WithUnitOfWorkAsync(async () =>
        {
            var rows = await _dailyTaskRepository.GetListAsync(t => t.ChildId == childId && t.Date == Monday);
            rows.Count.ShouldBe(2);
        });
    }

    [Fact]
    public async Task EnsureDay_With_No_Matching_Template_Generates_Nothing()
    {
        var childId = _guidGenerator.Create();
        await WithUnitOfWorkAsync(async () =>
        {
            // 只建了周一模板；周日没有模板
            await _templateRepository.InsertAsync(Template(childId, DayOfWeek.Monday, "语文", order: 0));
        });

        await WithUnitOfWorkAsync(async () =>
        {
            var created = await _generator.EnsureDayAsync(childId, Sunday);
            created.Count.ShouldBe(0);
        });
    }

    [Fact]
    public async Task SettlePastDays_Backfills_A_GapFree_Ledger()
    {
        var childId = _guidGenerator.Create();
        var mon = new DateOnly(2026, 7, 6);
        var tue = new DateOnly(2026, 7, 7);
        var wed = new DateOnly(2026, 7, 8);
        var thu = new DateOnly(2026, 7, 9);
        var fri = new DateOnly(2026, 7, 10);
        var sun = new DateOnly(2026, 7, 12);

        await WithUnitOfWorkAsync(async () =>
        {
            // 周一~周三：吃饱（各 2 个已完成任务）
            await SeedFedDayAsync(childId, mon, 2);
            await SeedFedDayAsync(childId, tue, 2);
            await SeedFedDayAsync(childId, wed, 2);
            // 周四：整天没做 —— 不建 DailyTask，但当天有 2 个启用模板
            await _templateRepository.InsertAsync(Template(childId, DayOfWeek.Thursday, "语文", order: 0));
            await _templateRepository.InsertAsync(Template(childId, DayOfWeek.Thursday, "数学", order: 1));
            // 周五：做完
            await SeedFedDayAsync(childId, fri, 2);
            // 周日：无模板无任务 → 休息日
        });

        await WithUnitOfWorkAsync(async () =>
            await _generator.SettlePastDaysAsync(childId, mon, sun));

        await WithUnitOfWorkAsync(async () =>
        {
            var ledger = await _dailyScoreRepository.GetListAsync(s => s.ChildId == childId);

            // 无缺口：07-06..07-12 共 7 天，每天恰好一行
            ledger.Count.ShouldBe(7);

            var thuScore = ledger.Single(s => s.Date == thu);
            thuScore.TasksTotal.ShouldBe(2);      // N 取自模板
            thuScore.TasksCompleted.ShouldBe(0);  // 缺档 = 漏做
            thuScore.IsRestDay.ShouldBeFalse();
            thuScore.IsFull.ShouldBeFalse();
            thuScore.Stars.ShouldBe(0);

            var sunScore = ledger.Single(s => s.Date == sun);
            sunScore.TasksTotal.ShouldBe(0);
            sunScore.IsRestDay.ShouldBeTrue();
            sunScore.Stars.ShouldBe(0);

            var monScore = ledger.Single(s => s.Date == mon);
            monScore.TasksTotal.ShouldBe(2);
            monScore.TasksCompleted.ShouldBe(2);
            monScore.IsFull.ShouldBeTrue();
            monScore.Stars.ShouldBe(5);
        });
    }

    [Fact]
    public async Task SettlePastDays_Is_Idempotent()
    {
        var childId = _guidGenerator.Create();
        var mon = new DateOnly(2026, 7, 6);
        var wed = new DateOnly(2026, 7, 8);

        await WithUnitOfWorkAsync(async () => await SeedFedDayAsync(childId, mon, 2));

        await WithUnitOfWorkAsync(async () => await _generator.SettlePastDaysAsync(childId, mon, wed));
        await WithUnitOfWorkAsync(async () => await _generator.SettlePastDaysAsync(childId, mon, wed)); // 再跑一次

        await WithUnitOfWorkAsync(async () =>
        {
            var ledger = await _dailyScoreRepository.GetListAsync(s => s.ChildId == childId);
            ledger.Count.ShouldBe(3); // Mon..Wed，每天一行，不重复
            ledger.Single(s => s.Date == mon).IsFull.ShouldBeTrue();
        });
    }

    private async Task SeedFedDayAsync(Guid childId, DateOnly date, int count)
    {
        for (var i = 0; i < count; i++)
        {
            var task = new DailyTask(_guidGenerator.Create(), childId, date, $"任务{i}", order: i);
            task.Complete(new DateTime(2026, 7, 6, 18, 0, 0));
            await _dailyTaskRepository.InsertAsync(task);
        }
    }

    private WeeklyTaskTemplateItem Template(Guid childId, DayOfWeek dayOfWeek, string title, int order, bool active = true)
    {
        var item = new WeeklyTaskTemplateItem(_guidGenerator.Create(), childId, dayOfWeek, title, order: order);
        if (!active)
        {
            item.Deactivate();
        }

        return item;
    }
}
