using System;
using System.Linq;
using System.Threading.Tasks;
using Homework.Catalog;
using Homework.Children;
using Homework.Journeys;
using Homework.Tasks;
using Shouldly;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Guids;
using Volo.Abp.Timing;
using Xunit;

namespace Homework.EntityFrameworkCore.Tasks;

[Collection(HomeworkTestConsts.CollectionDefinitionName)]
public class DailyTaskGenerator_Tests : HomeworkEntityFrameworkCoreTestBase
{
    private readonly DailyTaskGenerator _generator;
    private readonly IRepository<Journey, Guid> _journeyRepo;
    private readonly IRepository<JourneyTaskTemplateItem, Guid> _templateRepo;
    private readonly IRepository<DailyTask, Guid> _dailyRepo;
    private readonly IRepository<RewardItem, Guid> _rewardRepo;
    private readonly IRepository<Homework.Scoring.DailyScore, Guid> _dailyScoreRepository;
    private readonly IGuidGenerator _guid;

    public DailyTaskGenerator_Tests()
    {
        _generator = GetRequiredService<DailyTaskGenerator>();
        _journeyRepo = GetRequiredService<IRepository<Journey, Guid>>();
        _templateRepo = GetRequiredService<IRepository<JourneyTaskTemplateItem, Guid>>();
        _dailyRepo = GetRequiredService<IRepository<DailyTask, Guid>>();
        _rewardRepo = GetRequiredService<IRepository<RewardItem, Guid>>();
        _dailyScoreRepository = GetRequiredService<IRepository<Homework.Scoring.DailyScore, Guid>>();
        _guid = GetRequiredService<IGuidGenerator>();
    }

    private async Task<(Guid childId, Guid journeyId)> SeedActiveJourneyAsync(DateOnly start)
    {
        var childId = _guid.Create();
        var journeyId = _guid.Create();
        await WithUnitOfWorkAsync(async () =>
        {
            var reward = new RewardItem(_guid.Create(), "能量果实", 12, 1); reward.Activate();
            await _rewardRepo.InsertAsync(reward, autoSave: true);
            // SharedJourneyId = journeyId：模板也挂在这个键上，生成器才找得到（本 chunk 语义约束）
            var j = new Journey(journeyId, journeyId, _guid.Create(), childId, "旅程", start, start.AddDays(60), _guid.Create());
            j.Start(_guid.Create(), new (int, int?)[] { (1, 20), (2, 40), (3, 60), (4, 80), (5, null) });
            await _journeyRepo.InsertAsync(j, autoSave: true);
        });
        return (childId, journeyId);
    }

    [Fact]
    public async Task EnsureDay_Generates_From_Active_Journey_Templates_With_Resolved_Reward()
    {
        var monday = new DateOnly(2026, 7, 6);
        var (childId, journeyId) = await SeedActiveJourneyAsync(monday);
        await WithUnitOfWorkAsync(async () =>
        {
            var t = new JourneyTaskTemplateItem(_guid.Create(), journeyId, DayOfWeek.Monday, "语文", order: 0);
            // RewardIsRandom = true by default → resolver picks the one active RewardItem
            await _templateRepo.InsertAsync(t, autoSave: true);
        });

        var tasks = await WithUnitOfWorkAsync(async () => await _generator.EnsureDayAsync(childId, monday));
        tasks.Count.ShouldBe(1);
        tasks[0].JourneyId.ShouldBe(journeyId);
        tasks[0].RewardItemId.ShouldNotBeNull();
    }

    [Fact]
    public async Task EnsureDay_Reconciles_Newly_Added_Template_For_Today()
    {
        var clock = GetRequiredService<IClock>();
        var today = DateOnly.FromDateTime(clock.Now);
        var (childId, journeyId) = await SeedActiveJourneyAsync(today.AddDays(-3)); // 旅程已开始，今天在区间内

        // 先加一个「今天这个星期几」的模板并生成今天 → 1 个任务
        await WithUnitOfWorkAsync(async () =>
            await _templateRepo.InsertAsync(
                new JourneyTaskTemplateItem(_guid.Create(), journeyId, today.DayOfWeek, "语文", order: 0), autoSave: true));
        var first = await WithUnitOfWorkAsync(async () => await _generator.EnsureDayAsync(childId, today));
        first.Count.ShouldBe(1);

        // 旅程进行中，家长又加了一个今天的模板
        await WithUnitOfWorkAsync(async () =>
            await _templateRepo.InsertAsync(
                new JourneyTaskTemplateItem(_guid.Create(), journeyId, today.DayOfWeek, "数学", order: 1), autoSave: true));

        // 再次 EnsureDay（相当于孩子刷新看板）→ 应补齐第 2 个任务
        var second = await WithUnitOfWorkAsync(async () => await _generator.EnsureDayAsync(childId, today));
        second.Count.ShouldBe(2);
        second.Select(t => t.Title).ShouldContain("数学");
    }

    [Fact]
    public async Task EnsureDay_Does_Not_Backfill_Past_Days()
    {
        var clock = GetRequiredService<IClock>();
        var today = DateOnly.FromDateTime(clock.Now);
        var pastSameDow = today.AddDays(-7); // 上周同一星期几（过去且已进入旅程）
        var (childId, journeyId) = await SeedActiveJourneyAsync(today.AddDays(-14));

        await WithUnitOfWorkAsync(async () =>
            await _templateRepo.InsertAsync(
                new JourneyTaskTemplateItem(_guid.Create(), journeyId, pastSameDow.DayOfWeek, "语文", order: 0), autoSave: true));
        var first = await WithUnitOfWorkAsync(async () => await _generator.EnsureDayAsync(childId, pastSameDow));
        first.Count.ShouldBe(1);

        // 事后又加一个同星期几的模板
        await WithUnitOfWorkAsync(async () =>
            await _templateRepo.InsertAsync(
                new JourneyTaskTemplateItem(_guid.Create(), journeyId, pastSameDow.DayOfWeek, "数学", order: 1), autoSave: true));

        // 过去的日子冻结：仍是 1 个，不追溯改历史
        var second = await WithUnitOfWorkAsync(async () => await _generator.EnsureDayAsync(childId, pastSameDow));
        second.Count.ShouldBe(1);
    }

    [Fact]
    public async Task EnsureDay_No_Active_Journey_Generates_Nothing()
    {
        var childId = _guid.Create();
        var tasks = await WithUnitOfWorkAsync(async () => await _generator.EnsureDayAsync(childId, new DateOnly(2026, 7, 6)));
        tasks.ShouldBeEmpty();
    }

    [Fact]
    public async Task EnsureDay_Is_Idempotent()
    {
        var monday = new DateOnly(2026, 7, 6);
        var (childId, journeyId) = await SeedActiveJourneyAsync(monday);
        await WithUnitOfWorkAsync(async () =>
            await _templateRepo.InsertAsync(new JourneyTaskTemplateItem(_guid.Create(), journeyId, DayOfWeek.Monday, "语文"), autoSave: true));
        await WithUnitOfWorkAsync(async () => await _generator.EnsureDayAsync(childId, monday));
        await WithUnitOfWorkAsync(async () => await _generator.EnsureDayAsync(childId, monday));
        var count = await WithUnitOfWorkAsync(async () => (await _dailyRepo.GetListAsync(x => x.ChildId == childId && x.Date == monday)).Count);
        count.ShouldBe(1);
    }

    [Fact]
    public async Task SettlePastDays_Backfills_A_GapFree_Ledger()
    {
        var monday = new DateOnly(2026, 7, 6);
        var (childId, journeyId) = await SeedActiveJourneyAsync(monday);
        var mon = new DateOnly(2026, 7, 6);
        var tue = new DateOnly(2026, 7, 7);
        var wed = new DateOnly(2026, 7, 8);
        var thu = new DateOnly(2026, 7, 9);
        var fri = new DateOnly(2026, 7, 10);
        var sun = new DateOnly(2026, 7, 12);

        await WithUnitOfWorkAsync(async () =>
        {
            // 周一~周三：吃饱（各 2 个已完成任务）
            await SeedFedDayAsync(childId, journeyId, mon, 2);
            await SeedFedDayAsync(childId, journeyId, tue, 2);
            await SeedFedDayAsync(childId, journeyId, wed, 2);
            // 周四：整天没做 —— 不建 DailyTask，但当天有 2 个启用模板
            await _templateRepo.InsertAsync(new JourneyTaskTemplateItem(_guid.Create(), journeyId, DayOfWeek.Thursday, "语文", order: 0), autoSave: true);
            await _templateRepo.InsertAsync(new JourneyTaskTemplateItem(_guid.Create(), journeyId, DayOfWeek.Thursday, "数学", order: 1), autoSave: true);
            // 周五：做完
            await SeedFedDayAsync(childId, journeyId, fri, 2);
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
        var monday = new DateOnly(2026, 7, 6);
        var (childId, journeyId) = await SeedActiveJourneyAsync(monday);
        var mon = new DateOnly(2026, 7, 6);
        var wed = new DateOnly(2026, 7, 8);

        await WithUnitOfWorkAsync(async () => await SeedFedDayAsync(childId, journeyId, mon, 2));

        await WithUnitOfWorkAsync(async () => await _generator.SettlePastDaysAsync(childId, mon, wed));
        await WithUnitOfWorkAsync(async () => await _generator.SettlePastDaysAsync(childId, mon, wed)); // 再跑一次

        await WithUnitOfWorkAsync(async () =>
        {
            var ledger = await _dailyScoreRepository.GetListAsync(s => s.ChildId == childId);
            ledger.Count.ShouldBe(3); // Mon..Wed，每天一行，不重复
            ledger.Single(s => s.Date == mon).IsFull.ShouldBeTrue();
        });
    }

    [Fact]
    public async Task SettleDay_Settles_A_Single_Day_From_Its_DailyTasks()
    {
        var date = new DateOnly(2026, 7, 6);
        var (childId, journeyId) = await SeedActiveJourneyAsync(date);

        await WithUnitOfWorkAsync(async () =>
        {
            // 2 tasks, one completed -> C=1/N=2 -> stars=ceil(1/2*5)=3, not full
            var t1 = new DailyTask(_guid.Create(), childId, journeyId, date, "语文", order: 0);
            t1.Complete(new DateTime(2026, 7, 6, 18, 0, 0));
            await _dailyRepo.InsertAsync(t1);
            await _dailyRepo.InsertAsync(new DailyTask(_guid.Create(), childId, journeyId, date, "数学", order: 1));
        });

        await WithUnitOfWorkAsync(async () => await _generator.SettleDayAsync(childId, date));

        await WithUnitOfWorkAsync(async () =>
        {
            var score = await _dailyScoreRepository.GetAsync(s => s.ChildId == childId && s.Date == date);
            score.TasksTotal.ShouldBe(2);
            score.TasksCompleted.ShouldBe(1);
            score.Stars.ShouldBe(3);
            score.IsFull.ShouldBeFalse();
        });
    }

    [Fact]
    public async Task ReadRange_Reports_Template_Count_For_Ungenerated_Days_And_Never_Generates()
    {
        var monday = new DateOnly(2026, 7, 6);
        var (childId, journeyId) = await SeedActiveJourneyAsync(monday);
        await WithUnitOfWorkAsync(async () =>
        {
            await _templateRepo.InsertAsync(
                new JourneyTaskTemplateItem(_guid.Create(), journeyId, DayOfWeek.Monday, "语文", order: 0), autoSave: true);
            await _templateRepo.InsertAsync(
                new JourneyTaskTemplateItem(_guid.Create(), journeyId, DayOfWeek.Monday, "数学", order: 1), autoSave: true);
            // 周二无模板 → 休息日
        });

        var days = await WithUnitOfWorkAsync(async () =>
            await _generator.ReadRangeAsync(childId, monday, monday.AddDays(1)));

        days.Count.ShouldBe(2);
        days[0].Date.ShouldBe(monday);
        days[0].TasksTotal.ShouldBe(2);       // 来自模板，任务尚未生成
        days[0].TasksCompleted.ShouldBe(0);
        days[0].IsRestDay.ShouldBeFalse();
        days[0].IsFull.ShouldBeFalse();
        days[1].IsRestDay.ShouldBeTrue();     // 周二没有模板

        // 最要紧的一条：读区间不许生成任何任务
        var generated = await WithUnitOfWorkAsync(async () =>
            await _dailyRepo.CountAsync(t => t.ChildId == childId));
        generated.ShouldBe(0);
    }

    [Fact]
    public async Task ReadRange_Uses_Real_Task_Counts_Once_Generated()
    {
        var monday = new DateOnly(2026, 7, 6);
        var (childId, journeyId) = await SeedActiveJourneyAsync(monday);
        await WithUnitOfWorkAsync(async () =>
        {
            await _templateRepo.InsertAsync(
                new JourneyTaskTemplateItem(_guid.Create(), journeyId, DayOfWeek.Monday, "语文", order: 0), autoSave: true);
            await _templateRepo.InsertAsync(
                new JourneyTaskTemplateItem(_guid.Create(), journeyId, DayOfWeek.Monday, "数学", order: 1), autoSave: true);
        });

        // 走真实生成路径
        var tasks = await WithUnitOfWorkAsync(async () => await _generator.EnsureDayAsync(childId, monday));
        await WithUnitOfWorkAsync(async () =>
        {
            var t = await _dailyRepo.GetAsync(tasks[0].Id);
            t.Complete(new DateTime(2026, 7, 6, 20, 0, 0, DateTimeKind.Utc));
            await _dailyRepo.UpdateAsync(t, autoSave: true);
        });

        var days = await WithUnitOfWorkAsync(async () => await _generator.ReadRangeAsync(childId, monday, monday));
        days[0].TasksTotal.ShouldBe(2);
        days[0].TasksCompleted.ShouldBe(1);
        days[0].IsFull.ShouldBeFalse();
    }

    [Fact]
    public async Task ReadRange_No_Active_Journey_Is_All_Rest_Days()
    {
        var childId = _guid.Create();
        var monday = new DateOnly(2026, 7, 6);

        var days = await WithUnitOfWorkAsync(async () =>
            await _generator.ReadRangeAsync(childId, monday, monday.AddDays(6)));

        days.Count.ShouldBe(7);
        days.ShouldAllBe(d => d.IsRestDay);
    }

    [Fact]
    public async Task ReadRange_Days_Before_Journey_Start_Are_Rest_Days()
    {
        var monday = new DateOnly(2026, 7, 6);
        var (childId, journeyId) = await SeedActiveJourneyAsync(monday);
        await WithUnitOfWorkAsync(async () =>
            await _templateRepo.InsertAsync(
                new JourneyTaskTemplateItem(_guid.Create(), journeyId, DayOfWeek.Monday, "语文", order: 0), autoSave: true));

        // 旅程开始前的那个周一：有模板、有 DayOfWeek 匹配，但不该算数
        var earlier = monday.AddDays(-7);
        var days = await WithUnitOfWorkAsync(async () => await _generator.ReadRangeAsync(childId, earlier, earlier));
        days[0].IsRestDay.ShouldBeTrue();
    }

    private async Task SeedFedDayAsync(Guid childId, Guid journeyId, DateOnly date, int count)
    {
        for (var i = 0; i < count; i++)
        {
            var task = new DailyTask(_guid.Create(), childId, journeyId, date, $"任务{i}", order: i);
            task.Complete(new DateTime(2026, 7, 6, 18, 0, 0));
            await _dailyRepo.InsertAsync(task);
        }
    }

    [Fact]
    public async Task EnsureDay_Copies_EstimatedMinutes_From_Template()
    {
        var monday = new DateOnly(2026, 7, 6);
        var (childId, journeyId) = await SeedActiveJourneyAsync(monday);
        await WithUnitOfWorkAsync(async () =>
        {
            await _templateRepo.InsertAsync(new JourneyTaskTemplateItem(
                _guid.Create(), journeyId, DayOfWeek.Monday, "数学作业本",
                subject: "math", order: 0, estimatedMinutes: 25), autoSave: true);
            await _templateRepo.InsertAsync(new JourneyTaskTemplateItem(
                _guid.Create(), journeyId, DayOfWeek.Monday, "朗读课文",
                subject: "chinese", order: 1), autoSave: true);   // 不填时长
        });

        var tasks = await WithUnitOfWorkAsync(async () => await _generator.EnsureDayAsync(childId, monday));

        tasks.Count.ShouldBe(2);
        tasks[0].EstimatedMinutes.ShouldBe(25);
        tasks[1].EstimatedMinutes.ShouldBeNull();   // 模板没填 → 保持 null,不许兜底成 0
    }
}
